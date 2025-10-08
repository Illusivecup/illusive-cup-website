// js/ui/ui-manager.js
import { AppState } from '../utils/state-manager.js';
import { securityService } from '../services/security-service.js';
import { teamsManager } from '../managers/teams-manager.js';
import { tournamentManager } from '../managers/tournament-manager.js';
import ErrorHandler from '../utils/error-handler.js';
import PerformanceOptimizer from '../utils/performance-optimizer.js';

export class UIManager {
    constructor() {
        this.currentSection = null;
        this.modals = new Map();
        this.eventListeners = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Инициализация компонентов
            await this.initializeComponents();
            
            // Настройка навигации
            this.setupNavigation();
            
            // Настройка модальных окон
            this.setupModals();
            
            // Подписка на изменения состояния
            this.setupStateSubscriptions();
            
            // Настройка глобальных обработчиков UI
            this.setupGlobalUIHandlers();

            this.isInitialized = true;
            console.log('✅ UI Manager инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации UI Manager:', error);
            throw error;
        }
    }

    async initializeComponents() {
        // Создание анимированного фона
        this.createAnimatedBackground();
        
        // Инициализация выпадающих списков
        this.initializeDropdowns();
        
        // Инициализация вкладок
        this.initializeTabs();
        
        // Загрузка начальных данных UI
        await this.loadInitialUIData();
    }

    setupNavigation() {
        const navConfig = {
            'teamsDropdownBtn': () => this.showSection('teams'),
            'groupStageBtn': () => this.showSection('groupStage'),
            'bracketBtn': () => this.showSection('bracket'),
            'scheduleBtn': () => this.showSection('schedule'),
            'audienceAwardBtn': () => this.showSection('audienceAward'),
            'adminBtn': () => this.showAdminPanel()
        };

        Object.entries(navConfig).forEach(([elementId, handler]) => {
            this.addEventListener(elementId, 'click', handler);
        });

        // Обработка выбора команды из dropdown
        this.setupTeamsDropdown();
    }

    setupModals() {
        const modalConfig = {
            'editTeamModal': {
                openers: ['edit-team-triggers'],
                closers: ['closeEditTeamModal', 'cancelEditTeamBtn'],
                onOpen: () => this.onEditTeamModalOpen(),
                onClose: () => this.onEditTeamModalClose()
            },
            'adminPanel': {
                openers: ['adminBtn'],
                closers: ['closeAdminPanel'],
                onOpen: () => this.onAdminPanelOpen(),
                onClose: () => this.onAdminPanelClose()
            },
            'authModal': {
                openers: ['auth-triggers'],
                closers: ['cancelAuth'],
                onOpen: () => this.onAuthModalOpen(),
                onClose: () => this.onAuthModalClose()
            }
        };

        Object.entries(modalConfig).forEach(([modalId, config]) => {
            this.setupModal(modalId, config);
        });
    }

    setupModal(modalId, config) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        this.modals.set(modalId, {
            element: modal,
            isOpen: false,
            config
        });

        // Обработчики открытия
        config.openers.forEach(opener => {
            if (opener === 'edit-team-triggers') {
                // Динамические обработчики будут добавлены позже
                return;
            }
            this.addEventListener(opener, 'click', () => this.openModal(modalId));
        });

        // Обработчики закрытия
        config.closers.forEach(closer => {
            this.addEventListener(closer, 'click', () => this.closeModal(modalId));
        });

        // Закрытие по клику вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modalId);
            }
        });

        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modals.get(modalId)?.isOpen) {
                this.closeModal(modalId);
            }
        });
    }

    setupStateSubscriptions() {
        // Подписка на изменения команд
        AppState.subscribe('teams', (teams) => {
            this.updateTeamsDropdown(teams);
            this.updateTeamsContent(teams);
        }, { debounce: 100 });

        // Подписка на изменения турнирной сетки
        AppState.subscribe('bracket', (bracket) => {
            if (this.currentSection === 'bracket') {
                this.displayBracket(bracket);
            }
        });

        // Подписка на изменения расписания
        AppState.subscribe('schedule', (schedule) => {
            if (this.currentSection === 'schedule') {
                this.displaySchedule(schedule);
            }
        });

        // Подписка на изменения группового этапа
        AppState.subscribe('tournament', (tournament) => {
            if (this.currentSection === 'groupStage') {
                this.displayGroupStage(tournament);
            }
        });

        // Подписка на изменения призов
        AppState.subscribe('audienceAwards', (awards) => {
            if (this.currentSection === 'audienceAward') {
                this.displayAudienceAwards(awards);
            }
        });

        // Подписка на статус аутентификации
        AppState.subscribe('authStatus', (status) => {
            this.updateAuthUI(status);
        });
    }

    setupGlobalUIHandlers() {
        // Закрытие dropdown при клике вне
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                this.closeAllDropdowns();
            }
        });

        // Обработка глобальных клавиш
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.showSection('teams');
                        break;
                    case '2':
                        e.preventDefault();
                        this.showSection('groupStage');
                        break;
                    case '3':
                        e.preventDefault();
                        this.showSection('bracket');
                        break;
                    case '4':
                        e.preventDefault();
                        this.showSection('schedule');
                        break;
                }
            }
        });

        // Обработка изменения размера окна
        PerformanceOptimizer.throttle('window_resize', () => {
            this.handleWindowResize();
        }, AppConfig.PERFORMANCE.THROTTLE.RESIZE);

        window.addEventListener('resize', () => {
            PerformanceOptimizer.throttle('window_resize', () => {
                this.handleWindowResize();
            }, AppConfig.PERFORMANCE.THROTTLE.RESIZE);
        });
    }

    // === СЕКЦИИ И НАВИГАЦИЯ ===

    showSection(sectionName) {
        // Скрываем все секции
        this.hideAllSections();

        // Показываем выбранную секцию
        const section = document.getElementById(`${sectionName}Content`);
        if (section) {
            section.classList.remove('hidden');
            this.currentSection = sectionName;
            
            // Загружаем данные для секции
            this.loadSectionData(sectionName);
            
            // Обновляем ARIA атрибуты
            this.updateARIAForSection(sectionName);
            
            // Прокручиваем к началу
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            console.log(`📁 Открыта секция: ${sectionName}`);
        }

        // Закрываем dropdown если открыт
        this.closeAllDropdowns();
    }

    hideAllSections() {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
        });
        this.currentSection = null;
    }

    async loadSectionData(sectionName) {
        try {
            switch (sectionName) {
                case 'teams':
                    await this.loadTeamsData();
                    break;
                case 'groupStage':
                    await this.loadGroupStageData();
                    break;
                case 'bracket':
                    await this.loadBracketData();
                    break;
                case 'schedule':
                    await this.loadScheduleData();
                    break;
                case 'audienceAward':
                    await this.loadAudienceAwardsData();
                    break;
            }
        } catch (error) {
            console.error(`❌ Ошибка загрузки данных для секции ${sectionName}:`, error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка загрузки данных',
                message: `Не удалось загрузить данные для раздела ${sectionName}`
            });
        }
    }

    // === КОМАНДЫ ===

    async loadTeamsData() {
        const teams = teamsManager.getAllTeams();
        this.updateTeamsDropdown(teams);
        
        // Показываем первую команду по умолчанию
        if (teams.length > 0 && !AppState.get('currentDisplayedTeamId')) {
            this.showTeamCard(teams[0].id);
        }
    }

    updateTeamsDropdown(teams) {
        const dropdown = document.getElementById('teamsDropdown');
        if (!dropdown) return;

        PerformanceOptimizer.measurePerformance('update_teams_dropdown', () => {
            dropdown.innerHTML = '';

            teams.forEach(team => {
                const item = document.createElement('a');
                item.className = 'dropdown-item';
                item.textContent = team.name;
                item.setAttribute('role', 'menuitem');
                item.setAttribute('data-team-id', team.id);
                
                item.addEventListener('click', () => {
                    this.showTeamCard(team.id);
                    this.closeAllDropdowns();
                });

                dropdown.appendChild(item);
            });

            // Обновляем доступность dropdown
            const dropdownBtn = document.getElementById('teamsDropdownBtn');
            if (dropdownBtn) {
                dropdownBtn.disabled = teams.length === 0;
                if (teams.length === 0) {
                    dropdownBtn.title = 'Нет доступных команд';
                }
            }
        });
    }

    showTeamCard(teamId) {
        const container = document.getElementById('singleTeamCard');
        if (!container) return;

        const team = teamsManager.getTeam(teamId);
        if (!team) {
            container.innerHTML = this.createErrorCard('Команда не найдена');
            return;
        }

        PerformanceOptimizer.measurePerformance('render_team_card', () => {
            const card = this.createTeamCard(team);
            container.innerHTML = '';
            container.appendChild(card);
            
            AppState.set('currentDisplayedTeamId', teamId);
            
            // Прокручиваем к карточке
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    createTeamCard(team) {
        const card = document.createElement('div');
        card.className = 'team-visiting-card fade-in';
        card.setAttribute('data-team-id', team.id);

        const playersHTML = (team.players || [])
            .map(player => `
                <div class="player-card-bublas">
                    <div class="player-role-bublas">${this.escapeHTML(player.role)}</div>
                    <div class="player-name-bublas" 
                         data-mmr="${player.mmr || 0}"
                         title="MMR: ${player.mmr || 0}">
                        ${this.escapeHTML(player.name)}
                    </div>
                </div>
            `).join('');

        const editButton = securityService.isAuthenticated ? 
            `<button class="btn btn--primary edit-team-btn" 
                    data-team-id="${team.id}"
                    aria-label="Редактировать команду ${this.escapeHTML(team.name)}">
                ✏️ Редактировать
            </button>` : '';

        card.innerHTML = `
            <div class="card-header">
                <div class="header-highlight" aria-hidden="true"></div>
                <h3 class="team-name-bublas">${this.escapeHTML(team.name)}</h3>
                <p class="team-subtitle">${this.escapeHTML(team.slogan || 'Готовы к победе!')}</p>
            </div>
            
            <div class="team-card-content">
                <section class="players-section-bublas" aria-labelledby="players-title-${team.id}">
                    <h4 id="players-title-${team.id}" class="section-title-bublas">Состав команды</h4>
                    <div class="player-grid-bublas" role="list">
                        ${playersHTML}
                    </div>
                </section>
                
                <section class="stats-section-bublas">
                    <div class="mmr-display-bublas card">
                        <div class="mmr-label-bublas">Средний MMR</div>
                        <div class="mmr-value-bublas">${team.mmr || 0}</div>
                    </div>
                    
                    <div class="tournament-section-bublas card">
                        <div class="tournament-text-bublas">Участвует в</div>
                        <div class="tournament-badge-bublas">Illusive Cup</div>
                    </div>
                </section>
            </div>
            
            <footer class="team-footer-bublas">
                <p>Зарегистрирована для участия в турнире</p>
                ${editButton}
            </footer>
        `;

        // Добавляем обработчики для интерактивных элементов
        this.addTeamCardEventListeners(card, team);

        return card;
    }

    addTeamCardEventListeners(card, team) {
        // Подсветка MMR при наведении на имя игрока
        card.querySelectorAll('.player-name-bublas').forEach(playerName => {
            playerName.addEventListener('mouseenter', function() {
                const mmr = this.getAttribute('data-mmr');
                const originalText = this.textContent;
                this.setAttribute('data-original-text', originalText);
                this.textContent = `MMR: ${mmr}`;
            });
            
            playerName.addEventListener('mouseleave', function() {
                const originalText = this.getAttribute('data-original-text');
                if (originalText) {
                    this.textContent = originalText;
                }
            });
        });

        // Кнопка редактирования
        const editBtn = card.querySelector('.edit-team-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.openEditTeamModal(team.id);
            });
        }
    }

    // === ТУРНИРНАЯ СЕТКА ===

    async loadBracketData() {
        const bracket = AppState.get('bracket');
        this.displayBracket(bracket);
    }

    displayBracket(bracket) {
        const container = document.getElementById('bracketContainer');
        if (!container) return;

        if (!bracket || Object.keys(bracket).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <h3>Турнирная сетка пока не сформирована</h3>
                    <p>Сетка будет доступна после начала плей-офф этапа</p>
                    ${securityService.isAuthenticated ? 
                        '<button class="btn btn--primary" onclick="uiManager.generateBracket()">Сгенерировать сетку</button>' : 
                        ''
                    }
                </div>
            `;
            return;
        }

        PerformanceOptimizer.measurePerformance('render_bracket', () => {
            container.innerHTML = this.createBracketHTML(bracket);
            this.addBracketEventListeners(container);
        });
    }

    createBracketHTML(bracket) {
        const rounds = [
            { key: 'quarterfinals', name: 'Четвертьфиналы' },
            { key: 'semifinals', name: 'Полуфиналы' },
            { key: 'final', name: 'Финал' }
        ];

        return rounds.map(round => {
            const matches = bracket[round.key] || [];
            
            return `
                <section class="bracket-round" aria-labelledby="${round.key}-title">
                    <h3 id="${round.key}-title" class="round-title">${round.name}</h3>
                    <div class="matches-container">
                        ${matches.map((match, index) => this.createMatchHTML(match, round.key, index)).join('')}
                    </div>
                </section>
            `;
        }).join('');
    }

    createMatchHTML(match, round, index) {
        const team1 = match.team1 ? teamsManager.getTeam(match.team1) : null;
        const team2 = match.team2 ? teamsManager.getTeam(match.team2) : null;

        return `
            <div class="match ${round === 'final' ? 'final' : ''}" 
                 data-round="${round}" 
                 data-index="${index}"
                 role="listitem">
                <div class="team-info">
                    <div class="team ${match.score1 > match.score2 ? 'winner' : ''}">
                        <span class="team-name">${team1 ? this.escapeHTML(team1.name) : 'TBD'}</span>
                        ${team1 ? `<span class="team-mmr">${team1.mmr}</span>` : ''}
                    </div>
                    <div class="vs-separator">vs</div>
                    <div class="team ${match.score2 > match.score1 ? 'winner' : ''}">
                        <span class="team-name">${team2 ? this.escapeHTML(team2.name) : 'TBD'}</span>
                        ${team2 ? `<span class="team-mmr">${team2.mmr}</span>` : ''}
                    </div>
                </div>
                <div class="match-score">
                    <span class="score ${match.score1 > match.score2 ? 'winning-score' : ''}">
                        ${match.score1 !== null ? match.score1 : '-'}
                    </span>
                    <span class="score-separator">:</span>
                    <span class="score ${match.score2 > match.score1 ? 'winning-score' : ''}">
                        ${match.score2 !== null ? match.score2 : '-'}
                    </span>
                </div>
                ${match.completed ? '<div class="match-status completed">Завершен</div>' : ''}
            </div>
        `;
    }

    // === РАСПИСАНИЕ ===

    async loadScheduleData() {
        const schedule = AppState.get('schedule');
        this.displaySchedule(schedule);
    }

    displaySchedule(schedule) {
        const container = document.getElementById('scheduleList');
        if (!container) return;

        if (!schedule || schedule.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⏰</div>
                    <h3>Расписание матчей пока не опубликовано</h3>
                    <p>Расписание будет доступно ближе к началу турнира</p>
                </div>
            `;
            return;
        }

        PerformanceOptimizer.measurePerformance('render_schedule', () => {
            container.innerHTML = schedule.map((match, index) => 
                this.createScheduleItemHTML(match, index)
            ).join('');
        });
    }

    createScheduleItemHTML(match, index) {
        return `
            <div class="match-slot" role="listitem" aria-label="Матч ${index + 1}">
                <div class="time" aria-label="Время начала">
                    <span class="time-icon" aria-hidden="true">🕒</span>
                    ${match.time || 'TBD'}
                </div>
                <div class="match-info">
                    <div class="teams">${this.escapeHTML(match.match || 'Матч не назначен')}</div>
                    <div class="stage">${this.escapeHTML(match.stage || 'Групповой этап')}</div>
                </div>
                <div class="match-actions">
                    ${this.isMatchLive(match) ? 
                        '<span class="live-badge" aria-label="Матч в прямом эфире">LIVE</span>' : 
                        ''
                    }
                </div>
            </div>
        `;
    }

    // === ГРУППОВОЙ ЭТАП ===

    async loadGroupStageData() {
        const tournament = AppState.get('tournament');
        this.displayGroupStage(tournament);
    }

    displayGroupStage(tournament) {
        const container = document.getElementById('groupStageContainer');
        if (!container) return;

        if (!tournament?.groupStage) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📈</div>
                    <h3>Групповой этап пока не начался</h3>
                    <p>Таблица и результаты появятся после начала матчей</p>
                </div>
            `;
            return;
        }

        PerformanceOptimizer.measurePerformance('render_group_stage', () => {
            container.innerHTML = this.createGroupStageHTML(tournament.groupStage);
        });
    }

    createGroupStageHTML(groupStage) {
        return Object.entries(groupStage).map(([groupName, group]) => {
            const teams = group.teams || [];
            const sortedTeams = this.sortGroupTeams(teams);

            return `
                <section class="group-container" aria-labelledby="${groupName}-title">
                    <h3 id="${groupName}-title" class="group-title">${groupName}</h3>
                    <div class="group-table" role="table">
                        <div class="table-header" role="row">
                            <div role="columnheader">Команда</div>
                            <div role="columnheader">Матчи</div>
                            <div role="columnheader">Победы</div>
                            <div role="columnheader">Поражения</div>
                            <div role="columnheader">Очки</div>
                        </div>
                        ${sortedTeams.map((team, index) => this.createGroupTeamRow(team, index)).join('')}
                    </div>
                </section>
            `;
        }).join('');
    }

    // === МОДАЛЬНЫЕ ОКНА ===

    openModal(modalId) {
        const modal = this.modals.get(modalId);
        if (!modal || modal.isOpen) return;

        modal.element.classList.remove('hidden');
        modal.isOpen = true;

        // Вызываем callback открытия
        if (modal.config.onOpen) {
            modal.config.onOpen();
        }

        // Блокируем прокрутку body
        document.body.style.overflow = 'hidden';

        // Фокусируемся на первом интерактивном элементе
        this.focusFirstInteractive(modal.element);

        console.log(`📂 Открыто модальное окно: ${modalId}`);
    }

    closeModal(modalId) {
        const modal = this.modals.get(modalId);
        if (!modal || !modal.isOpen) return;

        modal.element.classList.add('hidden');
        modal.isOpen = false;

        // Вызываем callback закрытия
        if (modal.config.onClose) {
            modal.config.onClose();
        }

        // Восстанавливаем прокрутку
        document.body.style.overflow = '';

        console.log(`📂 Закрыто модальное окно: ${modalId}`);
    }

    // === УТИЛИТЫ ===

    addEventListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`⚠️ Элемент не найден: ${elementId}`);
            return;
        }

        const wrappedHandler = (e) => {
            try {
                handler(e);
            } catch (error) {
                console.error(`❌ Ошибка в обработчике ${event} для ${elementId}:`, error);
                ErrorHandler.logError(error, 'ui_event_handler');
            }
        };

        element.addEventListener(event, wrappedHandler);
        
        // Сохраняем для возможности удаления
        const key = `${elementId}_${event}`;
        this.eventListeners.set(key, { element, event, handler: wrappedHandler });
    }

    removeEventListener(elementId, event) {
        const key = `${elementId}_${event}`;
        const listener = this.eventListeners.get(key);
        
        if (listener) {
            listener.element.removeEventListener(listener.event, listener.handler);
            this.eventListeners.delete(key);
        }
    }

    escapeHTML(str) {
        if (typeof str !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    focusFirstInteractive(container) {
        const focusable = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusable.length > 0) {
            focusable[0].focus();
        }
    }

    closeAllDropdowns() {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    }

    handleWindowResize() {
        // Адаптация UI при изменении размера окна
        const isMobile = window.innerWidth < 768;
        document.body.classList.toggle('mobile-view', isMobile);
        
        // Обновляем видимость элементов в зависимости от размера
        this.updateResponsiveElements();
    }

    updateResponsiveElements() {
        // Логика для скрытия/показа элементов на разных размерах экрана
        const isMobile = window.innerWidth < 768;
        
        // Пример: скрываем сложные графики на мобильных
        document.querySelectorAll('.complex-chart').forEach(chart => {
            chart.style.display = isMobile ? 'none' : 'block';
        });
    }

    // === АНИМАЦИИ И ЭФФЕКТЫ ===

    createAnimatedBackground() {
        const bg = document.getElementById('animatedBg');
        if (!bg) return;

        const particleCount = Math.min(20, Math.floor(window.innerWidth / 50));
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const size = Math.random() * 8 + 3;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 20}s`;
            particle.style.animationDuration = `${15 + Math.random() * 10}s`;
            particle.style.opacity = Math.random() * 0.3 + 0.1;
            
            bg.appendChild(particle);
        }
    }

    // === ОЧИСТКА ===

    destroy() {
        // Удаляем все обработчики событий
        this.eventListeners.forEach((listener, key) => {
            listener.element.removeEventListener(listener.event, listener.handler);
        });
        this.eventListeners.clear();

        // Закрываем все модальные окна
        this.modals.forEach((modal, modalId) => {
            if (modal.isOpen) {
                this.closeModal(modalId);
            }
        });
        this.modals.clear();

        this.isInitialized = false;
        console.log('✅ UI Manager уничтожен');
    }

    // Вспомогательные методы будут добавлены в следующей части...
}

// Глобальный экземпляр
export const uiManager = new UIManager();

export default UIManager;