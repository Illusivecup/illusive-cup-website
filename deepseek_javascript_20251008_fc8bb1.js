// js/ui/ui-manager.js (продолжение)

export class UIManager {
    // ... предыдущие методы ...

    // === АДМИН ПАНЕЛЬ ===

    showAdminPanel() {
        if (!securityService.isAuthenticated) {
            this.showAuthModal();
            return;
        }

        this.openModal('adminPanel');
    }

    onAdminPanelOpen() {
        this.loadAdminPanelData();
        this.setupAdminPanelEvents();
    }

    onAdminPanelClose() {
        // Очистка временных данных админ панели
        AppState.set('adminUnsavedChanges', false);
    }

    async loadAdminPanelData() {
        try {
            // Загрузка данных для админ панели
            await this.loadAdminTeams();
            await this.loadAdminBracket();
            await this.loadAdminSchedule();
            await this.loadAdminGroupStage();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных админ панели:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка загрузки',
                message: 'Не удалось загрузить данные для управления'
            });
        }
    }

    async loadAdminTeams() {
        const teams = teamsManager.getAllTeams();
        this.updateAdminTeamsList(teams);
        
        // Обновляем количество команд
        const totalTeamsInput = document.getElementById('totalTeams');
        if (totalTeamsInput) {
            totalTeamsInput.value = teams.length;
        }
    }

    updateAdminTeamsList(teams) {
        const container = document.getElementById('adminTeamsList');
        if (!container) return;

        container.innerHTML = teams.map(team => `
            <div class="team-admin-item" role="listitem">
                <span class="team-name">${this.escapeHTML(team.name)}</span>
                <div class="team-actions">
                    <button class="btn btn--secondary btn--sm edit-team-admin" 
                            data-team-id="${team.id}"
                            aria-label="Редактировать ${this.escapeHTML(team.name)}">
                        ✏️ Редактировать
                    </button>
                    <button class="btn btn--danger btn--sm delete-team-admin" 
                            data-team-id="${team.id}"
                            aria-label="Удалить ${this.escapeHTML(team.name)}">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `).join('');

        // Добавляем обработчики для кнопок
        this.addAdminTeamsEventListeners();
    }

    addAdminTeamsEventListeners() {
        // Редактирование команды
        document.querySelectorAll('.edit-team-admin').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const teamId = e.target.closest('button').dataset.teamId;
                this.openEditTeamModal(teamId);
            });
        });

        // Удаление команды
        document.querySelectorAll('.delete-team-admin').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const teamId = e.target.closest('button').dataset.teamId;
                this.deleteTeam(teamId);
            });
        });
    }

    setupAdminPanelEvents() {
        // Вкладки админ панели
        document.querySelectorAll('.admin-tabs .tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchAdminTab(e.target.dataset.tab);
            });
        });

        // Управление командами
        this.addEventListener('applyTeamsCountBtn', 'click', () => this.applyTeamsCount());
        this.addEventListener('updateTeamsBtn', 'click', () => this.updateTeamsSettings());

        // Турнирная сетка
        this.addEventListener('saveBracketBtn', 'click', () => this.saveBracketChanges());

        // Расписание
        this.addEventListener('addScheduleMatchBtn', 'click', () => this.addScheduleMatch());
        this.addEventListener('saveScheduleBtn', 'click', () => this.saveScheduleChanges());

        // Групповой этап
        this.addEventListener('saveGroupStageBtn', 'click', () => this.saveGroupStageSettings());

        // Управление доступом
        this.addEventListener('generateAccessLink', 'click', () => this.generateAccessLink());
        this.addEventListener('copyLinkBtn', 'click', () => this.copyAccessLink());
        this.addEventListener('changePasswordBtn', 'click', () => this.changePassword());
    }

    switchAdminTab(tabName) {
        // Скрываем все вкладки
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.hidden = true;
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });

        // Показываем выбранную вкладку
        const tabPane = document.getElementById(tabName);
        const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (tabPane && tabBtn) {
            tabPane.hidden = false;
            tabBtn.classList.add('active');
            tabBtn.setAttribute('aria-selected', 'true');
            
            // Загружаем данные для вкладки если нужно
            this.loadAdminTabData(tabName);
        }
    }

    // === РЕДАКТИРОВАНИЕ КОМАНД ===

    openEditTeamModal(teamId) {
        const team = teamsManager.getTeam(teamId);
        if (!team) {
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка',
                message: 'Команда не найдена'
            });
            return;
        }

        AppState.set('editingTeamId', teamId);
        this.populateEditTeamForm(team);
        this.openModal('editTeamModal');
    }

    onEditTeamModalOpen() {
        // Дополнительная настройка при открытии
        const teamNameInput = document.getElementById('editTeamName');
        if (teamNameInput) {
            teamNameInput.focus();
        }
    }

    onEditTeamModalClose() {
        AppState.set('editingTeamId', null);
        this.clearEditTeamForm();
    }

    populateEditTeamForm(team) {
        // Заполняем основные поля
        const nameInput = document.getElementById('editTeamName');
        const sloganInput = document.getElementById('editTeamSlogan');
        
        if (nameInput) nameInput.value = team.name || '';
        if (sloganInput) sloganInput.value = team.slogan || '';

        // Заполняем игроков
        const playersContainer = document.getElementById('playersEditContainer');
        if (playersContainer) {
            playersContainer.innerHTML = '';
            (team.players || []).forEach(player => {
                this.addPlayerEditField(player.name, player.role, player.mmr);
            });
            
            // Добавляем пустое поле если нет игроков
            if (team.players.length === 0) {
                this.addPlayerEditField();
            }
        }

        // Настраиваем обработчики
        this.setupEditTeamFormEvents();
    }

    addPlayerEditField(name = '', role = '', mmr = 3000) {
        const container = document.getElementById('playersEditContainer');
        if (!container) return;

        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-edit-row';
        playerDiv.innerHTML = `
            <input type="text" 
                   class="form-input player-name" 
                   placeholder="Имя игрока" 
                   value="${this.escapeHTML(name)}"
                   required>
            <input type="text" 
                   class="form-input player-role" 
                   placeholder="Роль" 
                   value="${this.escapeHTML(role)}"
                   required>
            <input type="number" 
                   class="form-input player-mmr" 
                   placeholder="MMR" 
                   value="${mmr}"
                   min="0" 
                   max="10000"
                   required>
            <button type="button" 
                    class="btn btn--danger btn--sm remove-player"
                    aria-label="Удалить игрока">
                🗑️
            </button>
        `;

        container.appendChild(playerDiv);

        // Обработчик удаления игрока
        const removeBtn = playerDiv.querySelector('.remove-player');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                if (container.children.length > 1) {
                    playerDiv.remove();
                } else {
                    ErrorHandler.showNotification({
                        type: 'warning',
                        title: 'Нельзя удалить',
                        message: 'Команда должна иметь хотя бы одного игрока'
                    });
                }
            });
        }
    }

    setupEditTeamFormEvents() {
        // Кнопка добавления игрока
        this.addEventListener('addPlayerBtn', 'click', () => this.addPlayerEditField());

        // Сохранение команды
        this.addEventListener('saveTeamBtn', 'click', (e) => {
            e.preventDefault();
            this.saveTeamChanges();
        });

        // Отмена редактирования
        this.addEventListener('cancelEditTeamBtn', 'click', () => {
            this.closeModal('editTeamModal');
        });
    }

    async saveTeamChanges() {
        const teamId = AppState.get('editingTeamId');
        if (!teamId) return;

        try {
            const formData = this.getEditTeamFormData();
            await teamsManager.updateTeam(teamId, formData);
            this.closeModal('editTeamModal');
            
        } catch (error) {
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка сохранения',
                message: error.message
            });
        }
    }

    getEditTeamFormData() {
        const nameInput = document.getElementById('editTeamName');
        const sloganInput = document.getElementById('editTeamSlogan');
        const playersContainer = document.getElementById('playersEditContainer');

        const players = [];
        if (playersContainer) {
            playersContainer.querySelectorAll('.player-edit-row').forEach(row => {
                const name = row.querySelector('.player-name')?.value.trim();
                const role = row.querySelector('.player-role')?.value.trim();
                const mmr = parseInt(row.querySelector('.player-mmr')?.value) || 0;

                if (name && role) {
                    players.push({ name, role, mmr });
                }
            });
        }

        return {
            name: nameInput?.value.trim() || '',
            slogan: sloganInput?.value.trim() || '',
            players: players
        };
    }

    clearEditTeamForm() {
        const nameInput = document.getElementById('editTeamName');
        const sloganInput = document.getElementById('editTeamSlogan');
        const playersContainer = document.getElementById('playersEditContainer');

        if (nameInput) nameInput.value = '';
        if (sloganInput) sloganInput.value = '';
        if (playersContainer) playersContainer.innerHTML = '';
    }

    // === АУТЕНТИФИКАЦИЯ ===

    showAuthModal() {
        this.openModal('authModal');
    }

    onAuthModalOpen() {
        const passwordInput = document.getElementById('editorPassword');
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }

        this.setupAuthFormEvents();
    }

    onAuthModalClose() {
        // Очистка формы аутентификации
        const passwordInput = document.getElementById('editorPassword');
        if (passwordInput) {
            passwordInput.value = '';
        }
    }

    setupAuthFormEvents() {
        this.addEventListener('confirmAuth', 'click', (e) => {
            e.preventDefault();
            this.handleAuth();
        });

        this.addEventListener('cancelAuth', 'click', () => {
            this.closeModal('authModal');
        });

        // Обработка Enter в поле пароля
        const passwordInput = document.getElementById('editorPassword');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleAuth();
                }
            });
        }
    }

    async handleAuth() {
        const passwordInput = document.getElementById('editorPassword');
        const password = passwordInput?.value;

        if (!password) {
            ErrorHandler.showNotification({
                type: 'warning',
                title: 'Введите пароль',
                message: 'Поле пароля не может быть пустым'
            });
            return;
        }

        try {
            const isValid = await securityService.authenticate(password);
            if (isValid) {
                this.closeModal('authModal');
                this.updateAuthUI();
                ErrorHandler.showNotification({
                    type: 'success',
                    title: 'Успешный вход',
                    message: 'Режим редактора активирован'
                });
            }
        } catch (error) {
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка входа',
                message: error.message
            });
            
            // Очищаем поле пароля при ошибке
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
        }
    }

    updateAuthUI() {
        const adminBtn = document.getElementById('adminBtn');
        const connectionStatus = document.getElementById('connectionStatus');

        if (securityService.isAuthenticated) {
            if (adminBtn) adminBtn.classList.remove('hidden');
            if (connectionStatus) connectionStatus.classList.remove('hidden');
        } else {
            if (adminBtn) adminBtn.classList.add('hidden');
        }
    }

    // === УПРАВЛЕНИЕ ДОСТУПОМ ===

    async generateAccessLink() {
        try {
            const durationSelect = document.getElementById('accessDuration');
            const durationHours = parseInt(durationSelect?.value) || 24;

            const accessData = await securityService.generateTemporaryAccess(durationHours);
            
            // Показываем сгенерированную ссылку
            const linkContainer = document.getElementById('generatedLinkContainer');
            const linkInput = document.getElementById('generatedLink');
            const expiresSpan = document.getElementById('linkExpires');

            if (linkContainer && linkInput && expiresSpan) {
                linkInput.value = accessData.link;
                expiresSpan.textContent = accessData.expiresAt;
                linkContainer.classList.remove('hidden');
            }

            ErrorHandler.showNotification({
                type: 'success',
                title: 'Ссылка создана',
                message: `Доступ действителен ${durationHours} часов`
            });

        } catch (error) {
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка создания ссылки',
                message: error.message
            });
        }
    }

    async copyAccessLink() {
        const linkInput = document.getElementById('generatedLink');
        if (!linkInput) return;

        try {
            await navigator.clipboard.writeText(linkInput.value);
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Скопировано',
                message: 'Ссылка скопирована в буфер обмена'
            });
        } catch (error) {
            // Fallback для старых браузеров
            linkInput.select();
            document.execCommand('copy');
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Скопировано',
                message: 'Ссылка скопирована в буфер обмена'
            });
        }
    }

    async changePassword() {
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        if (!newPassword || !confirmPassword) {
            ErrorHandler.showNotification({
                type: 'warning',
                title: 'Заполните все поля',
                message: 'Введите новый пароль и подтверждение'
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Пароли не совпадают',
                message: 'Введенные пароли не совпадают'
            });
            return;
        }

        try {
            await securityService.changePassword(newPassword);
            
            // Очищаем поля
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';

        } catch (error) {
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка смены пароля',
                message: error.message
            });
        }
    }

    // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

    sortGroupTeams(teams) {
        return [...teams].sort((a, b) => {
            // Сначала по победам/поражениям
            if (a.losses === 0 && b.losses !== 0) return -1;
            if (a.losses !== 0 && b.losses === 0) return 1;
            
            // Затем по очкам
            const pointsA = a.points || 0;
            const pointsB = b.points || 0;
            
            if (pointsA !== pointsB) {
                return pointsB - pointsA;
            }
            
            // Затем по разнице побед/поражений
            const diffA = (a.wins || 0) - (a.losses || 0);
            const diffB = (b.wins || 0) - (b.losses || 0);
            
            return diffB - diffA;
        });
    }

    createGroupTeamRow(team, index) {
        const matchesPlayed = (team.wins || 0) + (team.losses || 0);
        let rowClass = '';
        
        if (team.losses === 0 && team.wins > 0) {
            rowClass = 'undefeated';
        } else if (team.wins === 0 && team.losses > 0) {
            rowClass = 'eliminated';
        } else if (team.wins === team.losses) {
            rowClass = 'equal';
        }

        return `
            <div class="table-row ${rowClass}" role="row">
                <div class="team-name" role="cell">${this.escapeHTML(team.name)}</div>
                <div role="cell">${matchesPlayed}</div>
                <div role="cell">${team.wins || 0}</div>
                <div role="cell">${team.losses || 0}</div>
                <div class="points" role="cell">${team.points || 0}</div>
            </div>
        `;
    }

    isMatchLive(match) {
        // Простая проверка - в реальном приложении здесь была бы логика
        // определения текущих матчей
        return match.time && new Date(match.time) <= new Date() && 
               !match.completed;
    }

    createErrorCard(message) {
        return `
            <div class="error-card card">
                <div class="error-icon">⚠️</div>
                <h3>Ошибка загрузки</h3>
                <p>${this.escapeHTML(message)}</p>
                <button class="btn btn--primary" onclick="location.reload()">
                    Обновить страницу
                </button>
            </div>
        `;
    }

    updateARIAForSection(sectionName) {
        // Обновляем ARIA атрибуты для доступности
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            const isActive = section.id === `${sectionName}Content`;
            section.setAttribute('aria-hidden', !isActive);
            
            if (isActive) {
                section.setAttribute('tabindex', '0');
                section.focus();
            } else {
                section.removeAttribute('tabindex');
            }
        });

        // Обновляем навигацию
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            const isActive = btn.id === `${sectionName}Btn`;
            btn.setAttribute('aria-current', isActive ? 'page' : 'false');
        });
    }

    // Методы для админ панели (заглушки)
    async applyTeamsCount() {
        // Реализация изменения количества команд
        console.log('Applying teams count...');
    }

    async updateTeamsSettings() {
        // Реализация обновления настроек команд
        console.log('Updating teams settings...');
    }

    async saveBracketChanges() {
        // Реализация сохранения изменений сетки
        console.log('Saving bracket changes...');
    }

    async addScheduleMatch() {
        // Реализация добавления матча в расписание
        console.log('Adding schedule match...');
    }

    async saveScheduleChanges() {
        // Реализация сохранения изменений расписания
        console.log('Saving schedule changes...');
    }

    async saveGroupStageSettings() {
        // Реализация сохранения настроек группового этапа
        console.log('Saving group stage settings...');
    }

    async deleteTeam(teamId) {
        if (!confirm('Вы уверены, что хотите удалить эту команду?')) {
            return;
        }

        try {
            await teamsManager.deleteTeam(teamId);
        } catch (error) {
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка удаления',
                message: error.message
            });
        }
    }

    // Инициализация выпадающих списков и вкладок
    initializeDropdowns() {
        const dropdownBtn = document.getElementById('teamsDropdownBtn');
        if (dropdownBtn) {
            dropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = dropdownBtn.closest('.dropdown');
                dropdown?.classList.toggle('active');
                
                // Обновляем ARIA атрибуты
                const isExpanded = dropdown?.classList.contains('active');
                dropdownBtn.setAttribute('aria-expanded', isExpanded);
            });
        }
    }

    initializeTabs() {
        // Базовая инициализация вкладок
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Общая логика переключения вкладок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });

        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        const activePane = document.getElementById(tabName);

        if (activeTab && activePane) {
            activeTab.classList.add('active');
            activePane.classList.add('active');
        }
    }

    async loadInitialUIData() {
        // Загрузка начальных данных для UI
        try {
            const teams = teamsManager.getAllTeams();
            this.updateTeamsDropdown(teams);
            
            // Показываем первую секцию по умолчанию
            if (!this.currentSection) {
                this.showSection('teams');
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки начальных UI данных:', error);
        }
    }
}

// Глобальный экземпляр
export const uiManager = new UIManager();
export default UIManager;