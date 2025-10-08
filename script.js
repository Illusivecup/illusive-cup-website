// === КОНФИГУРАЦИЯ FIREBASE ===
const firebaseConfig = {
    apiKey: "AIzaSyAjUOjB-mQTdI6G4jwsIXGOHGldGBmC6j4",
    authDomain: "illusive-cup.firebaseapp.com",
    databaseURL: "https://illusive-cup-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "illusive-cup",
    storageBucket: "illusive-cup.firebasestorage.app",
    messagingSenderId: "465786550229",
    appId: "1:465786550229:web:9a1d4a3015b9cb0a3caf5c"
};

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let database;
let teamsManager;
let securityManager;

// === СИСТЕМА БЕЗОПАСНОСТИ ===
class SecurityManager {
    constructor() {
        this.EDITOR_PASSWORD = 'IllusiveCup2025!';
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        this.checkExistingSession();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Кнопка админки
        document.getElementById('adminBtn').addEventListener('click', () => {
            this.handleAdminButtonClick();
        });

        // Модальное окно авторизации
        document.getElementById('confirmAuth').addEventListener('click', () => {
            this.handleAuthConfirm();
        });

        document.getElementById('cancelAuth').addEventListener('click', () => {
            this.hideAuthModal();
        });

        document.getElementById('closeAuthModal').addEventListener('click', () => {
            this.hideAuthModal();
        });

        // Закрытие админки
        document.getElementById('closeAdminPanel').addEventListener('click', () => {
            this.hideAdminPanel();
        });

        // Enter в поле пароля
        document.getElementById('editorPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleAuthConfirm();
            }
        });
    }

    handleAdminButtonClick() {
        if (this.isAuthenticated) {
            this.showAdminPanel();
        } else {
            this.showAuthModal();
        }
    }

    async handleAuthConfirm() {
        const passwordInput = document.getElementById('editorPassword');
        const password = passwordInput.value.trim();
        
        if (!password) {
            alert('❌ Введите пароль');
            return;
        }

        const isValid = await this.authenticate(password);
        
        if (isValid) {
            this.isAuthenticated = true;
            this.startSession();
            this.hideAuthModal();
            this.showAdminInterface();
            this.showAdminPanel();
            alert('✅ Успешная авторизация!');
        } else {
            alert('❌ Неверный пароль');
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    async authenticate(password) {
        // Имитация задержки для безопасности
        await new Promise(resolve => setTimeout(resolve, 500));
        return password === this.EDITOR_PASSWORD;
    }

    startSession() {
        const sessionData = {
            authenticated: true,
            timestamp: Date.now()
        };
        localStorage.setItem('editor_session', JSON.stringify(sessionData));
    }

    checkExistingSession() {
        try {
            const sessionData = localStorage.getItem('editor_session');
            if (!sessionData) return;

            const data = JSON.parse(sessionData);
            const sessionAge = Date.now() - data.timestamp;

            // Сессия действительна 8 часов
            if (data.authenticated && sessionAge < (8 * 60 * 60 * 1000)) {
                this.isAuthenticated = true;
                this.showAdminInterface();
                console.log('✅ Сессия восстановлена');
            } else {
                this.clearSession();
            }
        } catch (error) {
            this.clearSession();
        }
    }

    clearSession() {
        localStorage.removeItem('editor_session');
        this.isAuthenticated = false;
    }

    showAdminInterface() {
        const adminBtn = document.getElementById('adminBtn');
        adminBtn.classList.remove('hidden');
    }

    hideAdminInterface() {
        const adminBtn = document.getElementById('adminBtn');
        adminBtn.classList.add('hidden');
    }

    showAuthModal() {
        const modal = document.getElementById('authModal');
        modal.classList.remove('hidden');
        document.getElementById('editorPassword').focus();
    }

    hideAuthModal() {
        const modal = document.getElementById('authModal');
        modal.classList.add('hidden');
        document.getElementById('editorPassword').value = '';
    }

    showAdminPanel() {
        const panel = document.getElementById('adminPanel');
        panel.classList.remove('hidden');
        updateAdminTeamsList();
    }

    hideAdminPanel() {
        const panel = document.getElementById('adminPanel');
        panel.classList.add('hidden');
    }
}

// === МЕНЕДЖЕР КОМАНД ===
class TeamsManager {
    constructor(database) {
        this.database = database;
        this.teams = {};
    }

    async initialize() {
        await this.setupListeners();
    }

    async setupListeners() {
        return new Promise((resolve) => {
            this.database.ref('teams').on('value', (snapshot) => {
                this.handleTeamsUpdate(snapshot.val());
                resolve();
            });
        });
    }

    handleTeamsUpdate(teamsData) {
        this.teams = teamsData || {};
        console.log('📥 Обновлены данные команд:', this.teams);
        updateConnectionStatus(true);
        this.updateUI();
    }

    updateUI() {
        updateTeamsDropdown();
        updateAdminTeamsList();
        
        // Обновляем визитку если она открыта
        const appState = getAppState();
        if (appState.currentDisplayedTeamId) {
            showSingleTeamCard(appState.currentDisplayedTeamId);
        }
    }

    calculateTeamMMR(players) {
        if (!players || players.length === 0) return 0;
        
        const totalMMR = players.reduce((sum, player) => {
            return sum + (parseInt(player.mmr) || 0);
        }, 0);
        
        return Math.round(totalMMR / players.length);
    }

    async updateTeam(teamId, teamData) {
        teamData.mmr = this.calculateTeamMMR(teamData.players);
        await this.database.ref(`teams/${teamId}`).update(teamData);
        return teamId;
    }

    async createTeam(teamId, teamData) {
        teamData.mmr = this.calculateTeamMMR(teamData.players);
        await this.database.ref(`teams/${teamId}`).set(teamData);
        return teamId;
    }

    async deleteTeam(teamId) {
        await this.database.ref(`teams/${teamId}`).remove();
        delete this.teams[teamId];
    }

    getTeam(teamId) {
        return this.teams[teamId];
    }

    getAllTeams() {
        return { ...this.teams };
    }
}

// === ПРОСТОЕ УПРАВЛЕНИЕ СОСТОЯНИЕМ ===
const appState = {
    currentEditingTeamId: null,
    currentDisplayedTeamId: null
};

function getAppState() {
    return appState;
}

// === ОСНОВНЫЕ ФУНКЦИИ ИНТЕРФЕЙСА ===

// Навигация
function toggleDropdown() {
    const dropdown = document.querySelector('.dropdown');
    dropdown.classList.toggle('active');
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.classList.remove('active');
    });
}

function showSection(sectionName) {
    // Скрываем все секции
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Показываем нужную секцию
    const targetSection = document.getElementById(`${sectionName}Content`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    // Сбрасываем выбранную команду
    appState.currentDisplayedTeamId = null;
}

// Отображение данных
function updateTeamsDropdown() {
    const dropdown = document.getElementById('teamsDropdown');
    if (!dropdown || !teamsManager) return;
    
    const teams = teamsManager.getAllTeams();
    dropdown.innerHTML = '';
    
    Object.keys(teams).forEach(teamId => {
        const team = teams[teamId];
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = team.name || 'Без названия';
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showSingleTeamCard(teamId);
        });
        dropdown.appendChild(link);
    });
}

function showSingleTeamCard(teamId) {
    const container = document.getElementById('singleTeamCard');
    if (!container || !teamsManager) return;
    
    const team = teamsManager.getTeam(teamId);
    if (!team) return;
    
    const card = createTeamCard(teamId, team);
    container.innerHTML = '';
    container.appendChild(card);
    appState.currentDisplayedTeamId = teamId;
    
    // Показываем секцию команд
    hideAllSections();
    document.getElementById('teamsContent').classList.remove('hidden');
    closeAllDropdowns();
}

function hideAllSections() {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
}

function createTeamCard(teamId, team) {
    const card = document.createElement('div');
    card.className = 'team-visiting-card';
    card.setAttribute('data-team-id', teamId);
    
    const players = team.players || [];
    const playersHTML = players.map((player, index) => `
        <div class="player-card-bublas">
            <div class="player-role-bublas">${player.role || 'Игрок'}</div>
            <div class="player-name-bublas" data-mmr="${player.mmr || '0'}">
                ${player.name || 'Неизвестно'}
            </div>
        </div>
    `).join('');
    
    const editButton = securityManager.isAuthenticated ? 
        `<button class="edit-team-btn" onclick="editTeam('${teamId}')">✏️ Редактировать</button>` : '';
    
    card.innerHTML = `
        <div class="card-header">
            <div class="header-highlight"></div>
            <div class="team-name-bublas">${team.name || 'Без названия'}</div>
            <div class="team-subtitle">${team.slogan || 'Готовы к победе!'}</div>
        </div>
        <div class="team-card-content">
            <div class="players-section-bublas">
                <div class="section-title-bublas">Состав команды</div>
                <div class="player-grid-bublas">
                    ${playersHTML}
                </div>
            </div>
            <div class="stats-section-bublas">
                <div class="mmr-display-bublas">
                    <div class="mmr-label-bublas">Средний MMR</div>
                    <div class="mmr-value-bublas">${team.mmr || '0'}</div>
                </div>
                <div class="tournament-section-bublas">
                    <div class="tournament-text-bublas">играем на</div>
                    <div class="tournament-badge-bublas">Illusive Cup</div>
                </div>
            </div>
        </div>
        <div class="team-footer-bublas">
            Зарегистрирована для участия в турнире
            ${editButton}
        </div>
    `;
    
    // Обработчики для отображения MMR при наведении
    card.querySelectorAll('.player-name-bublas').forEach(playerName => {
        playerName.addEventListener('mouseenter', function() {
            const mmr = this.getAttribute('data-mmr');
            this.setAttribute('data-original-text', this.textContent);
            this.textContent = `MMR: ${mmr}`;
        });
        
        playerName.addEventListener('mouseleave', function() {
            const originalText = this.getAttribute('data-original-text');
            if (originalText) {
                this.textContent = originalText;
            }
        });
    });
    
    return card;
}

// Модальные окна
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

function closeEditTeamModal() {
    document.getElementById('editTeamModal').classList.add('hidden');
    appState.currentEditingTeamId = null;
}

// Админ-панель
function openAdminTab(tabName) {
    // Деактивируем все кнопки
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Скрываем все вкладки
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Активируем выбранную кнопку и вкладку
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

function updateAdminTeamsList() {
    const container = document.getElementById('adminTeamsList');
    if (!container || !teamsManager) return;
    
    const teams = teamsManager.getAllTeams();
    container.innerHTML = '';
    
    Object.keys(teams).forEach(teamId => {
        const team = teams[teamId];
        const teamElement = document.createElement('div');
        teamElement.className = 'admin-team-item';
        teamElement.innerHTML = `
            <div class="team-info">
                <strong>${team.name || 'Без названия'}</strong>
                <span>MMR: ${team.mmr || '0'}</span>
            </div>
            <button class="edit-btn" onclick="editTeam('${teamId}')">✏️</button>
        `;
        container.appendChild(teamElement);
    });
}

// Глобальные функции для вызова из HTML
window.editTeam = function(teamId) {
    if (!securityManager.isAuthenticated) {
        securityManager.showAuthModal();
        return;
    }
    
    if (!teamsManager) return;
    
    const team = teamsManager.getTeam(teamId);
    if (!team) return;
    
    const modal = document.getElementById('editTeamModal');
    if (!modal) return;
    
    appState.currentEditingTeamId = teamId;
    
    document.getElementById('editTeamName').value = team.name || '';
    document.getElementById('editTeamSlogan').value = team.slogan || '';
    
    const playersContainer = document.getElementById('playersEditContainer');
    playersContainer.innerHTML = '';
    
    const players = team.players || Array(5).fill().map(() => ({ name: '', role: '', mmr: 3000 }));
    
    players.forEach((player, index) => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player-edit-form';
        playerElement.innerHTML = `
            <h4>Игрок ${index + 1}</h4>
            <div class="player-fields">
                <input type="text" class="player-name" placeholder="Никнейм" value="${player.name || ''}">
                <input type="text" class="player-role" placeholder="Позиция" value="${player.role || ''}">
                <input type="number" class="player-mmr" placeholder="MMR" value="${player.mmr || 3000}" min="0" max="10000">
            </div>
        `;
        playersContainer.appendChild(playerElement);
    });
    
    modal.classList.remove('hidden');
};

window.saveTeamChanges = async function() {
    if (!securityManager.isAuthenticated || !teamsManager) return;
    
    const teamId = appState.currentEditingTeamId;
    if (!teamId) return;
    
    const name = document.getElementById('editTeamName').value.trim();
    const slogan = document.getElementById('editTeamSlogan').value.trim();
    
    const players = [];
    const playerForms = document.querySelectorAll('.player-edit-form');
    
    playerForms.forEach(form => {
        const nameInput = form.querySelector('.player-name');
        const roleInput = form.querySelector('.player-role');
        const mmrInput = form.querySelector('.player-mmr');
        
        players.push({
            name: nameInput?.value.trim() || '',
            role: roleInput?.value.trim() || '',
            mmr: parseInt(mmrInput?.value) || 3000
        });
    });
    
    if (!name) {
        alert('❌ Введите название команды');
        return;
    }
    
    const teamData = {
        name,
        slogan,
        players
    };
    
    try {
        await teamsManager.updateTeam(teamId, teamData);
        closeEditTeamModal();
        alert('✅ Команда успешно обновлена!');
    } catch (error) {
        console.error('❌ Ошибка сохранения команды:', error);
        alert('❌ Ошибка сохранения команды');
    }
};

window.updateTeamsCount = async function() {
    if (!securityManager.isAuthenticated || !teamsManager) return;
    
    const input = document.getElementById('totalTeams');
    const count = parseInt(input.value) || 4;
    
    if (count < 2 || count > 16) {
        alert('❌ Количество команд должно быть от 2 до 16');
        return;
    }
    
    const currentTeams = teamsManager.getAllTeams();
    const currentCount = Object.keys(currentTeams).length;
    
    try {
        if (count < currentCount) {
            // Удаляем лишние команды
            const teamIds = Object.keys(currentTeams);
            for (let i = count; i < currentCount; i++) {
                await teamsManager.deleteTeam(teamIds[i]);
            }
        } else if (count > currentCount) {
            // Добавляем новые команды
            for (let i = currentCount + 1; i <= count; i++) {
                const teamId = `team${i}`;
                const newTeam = {
                    name: `Новая команда ${i}`,
                    slogan: '',
                    players: Array(5).fill().map(() => ({
                        name: '',
                        role: '',
                        mmr: 3000
                    })),
                    mmr: 3000
                };
                await teamsManager.createTeam(teamId, newTeam);
            }
        }
        
        updateAdminTeamsList();
        alert(`✅ Количество команд обновлено: ${count}`);
    } catch (error) {
        console.error('❌ Ошибка обновления команд:', error);
        alert('❌ Ошибка обновления команд');
    }
};

// Утилиты
function updateConnectionStatus(connected) {
    const status = document.getElementById('connectionStatus');
    if (!status) return;
    
    const dot = status.querySelector('.status-dot');
    const text = status.querySelector('.status-text');
    
    if (connected) {
        status.classList.remove('hidden');
        dot.classList.add('connected');
        text.textContent = 'Подключено к турниру';
    } else {
        status.classList.remove('hidden');
        dot.classList.remove('connected');
        text.textContent = 'Нет подключения';
    }
}

// Инициализация приложения
async function initializeApp() {
    try {
        console.log('🚀 Инициализация Tournament App...');
        
        // Инициализация Firebase
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        window.database = database;
        console.log('🔥 Firebase успешно инициализирован');
        
        // Инициализация менеджеров
        securityManager = new SecurityManager();
        teamsManager = new TeamsManager(database);
        
        await teamsManager.initialize();
        
        // Настройка обработчиков событий
        setupEventListeners();
        
        console.log('✅ Tournament App успешно инициализирован');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
    }
}

function setupEventListeners() {
    // Навигация
    document.getElementById('teamsDropdownBtn').addEventListener('click', toggleDropdown);
    document.getElementById('scheduleBtn').addEventListener('click', () => showSection('schedule'));
    document.getElementById('groupStageBtn').addEventListener('click', () => showSection('groupStage'));
    document.getElementById('playoffBtn').addEventListener('click', () => showSection('playoff'));
    document.getElementById('audienceAwardBtn').addEventListener('click', () => showSection('audienceAward'));
    
    // Закрытие модальных окон
    document.getElementById('closeEditTeamModal').addEventListener('click', closeEditTeamModal);
    document.getElementById('cancelEditTeamBtn').addEventListener('click', closeEditTeamModal);
    
    // Вкладки админки
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            openAdminTab(this.getAttribute('data-tab'));
        });
    });
    
    // Глобальные обработчики
    document.addEventListener('click', (event) => {
        // Закрытие модальных окон при клике вне их
        if (event.target.classList.contains('modal')) {
            event.target.classList.add('hidden');
        }
        
        // Закрытие выпадающих списков при клике вне их
        if (!event.target.closest('.dropdown') && !event.target.closest('.nav-btn')) {
            closeAllDropdowns();
        }
    });
    
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initializeApp);