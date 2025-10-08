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

// === СИСТЕМА УПРАВЛЕНИЯ СОСТОЯНИЕМ ===
class AppState {
    static instance = null;
    
    static getInstance() {
        if (!this.instance) {
            this.instance = new AppState();
        }
        return this.instance;
    }
    
    constructor() {
        this.teamsManager = null;
        this.scheduleManager = null;
        this.currentEditingTeamId = null;
        this.currentDisplayedTeamId = null;
    }
    
    setTeamsManager(manager) { this.teamsManager = manager; }
    getTeamsManager() { return this.teamsManager; }
    
    setScheduleManager(manager) { this.scheduleManager = manager; }
    getScheduleManager() { return this.scheduleManager; }
    
    setCurrentEditingTeamId(id) { this.currentEditingTeamId = id; }
    getCurrentEditingTeamId() { return this.currentEditingTeamId; }
    
    setCurrentDisplayedTeamId(id) { this.currentDisplayedTeamId = id; }
    getCurrentDisplayedTeamId() { return this.currentDisplayedTeamId; }
}

// === СИСТЕМА БЕЗОПАСНОСТИ ===
class SecurityManager {
    static EDITOR_PASSWORD = 'IllusiveCup2025!';
    static isAuthenticated = false;
    
    static init() {
        this.checkExistingSession();
        this.setupEventListeners();
    }
    
    static setupEventListeners() {
        // Обработчики для модального окна авторизации
        document.getElementById('confirmAuth')?.addEventListener('click', () => this.handleAuthConfirm());
        document.getElementById('cancelAuth')?.addEventListener('click', () => this.handleAuthCancel());
        document.getElementById('closeAuthModal')?.addEventListener('click', () => this.handleAuthCancel());
        
        // Обработчик для кнопки админки
        document.getElementById('adminBtn')?.addEventListener('click', () => this.showAdminPanel());
    }
    
    static async handleAuthConfirm() {
        const passwordInput = document.getElementById('editorPassword');
        const password = passwordInput?.value || '';
        
        if (!password) {
            alert('❌ Введите пароль');
            return;
        }
        
        const success = await this.authenticate(password);
        
        if (success) {
            this.hideAuthModal();
            this.showAdminInterface();
            alert('✅ Успешная авторизация!');
        } else {
            alert('❌ Неверный пароль');
            passwordInput.value = '';
            passwordInput.focus();
        }
    }
    
    static handleAuthCancel() {
        this.hideAuthModal();
    }
    
    static async authenticate(password) {
        // Имитация задержки для безопасности
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        if (password === this.EDITOR_PASSWORD) {
            this.isAuthenticated = true;
            this.startSession();
            return true;
        }
        return false;
    }
    
    static startSession() {
        const sessionData = {
            authenticated: true,
            timestamp: Date.now()
        };
        localStorage.setItem('editor_session', JSON.stringify(sessionData));
    }
    
    static checkExistingSession() {
        try {
            const sessionData = localStorage.getItem('editor_session');
            if (!sessionData) return;
            
            const data = JSON.parse(sessionData);
            const sessionAge = Date.now() - data.timestamp;
            
            // Сессия действительна 30 минут
            if (data.authenticated && sessionAge < (30 * 60 * 1000)) {
                this.isAuthenticated = true;
                this.showAdminInterface();
            } else {
                this.clearSession();
            }
        } catch (error) {
            this.clearSession();
        }
    }
    
    static clearSession() {
        localStorage.removeItem('editor_session');
        this.isAuthenticated = false;
    }
    
    static requireAuth() {
        if (!this.isAuthenticated) {
            this.showAuthModal();
            return false;
        }
        return true;
    }
    
    static showAdminInterface() {
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            adminBtn.classList.remove('hidden');
        }
    }
    
    static hideAdminInterface() {
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            adminBtn.classList.add('hidden');
        }
    }
    
    static showAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('hidden');
            const editorPassword = document.getElementById('editorPassword');
            if (editorPassword) {
                editorPassword.value = '';
                editorPassword.focus();
            }
        }
    }
    
    static hideAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    static showAdminPanel() {
        if (!this.requireAuth()) return;
        
        const panel = document.getElementById('adminPanel');
        if (panel) {
            panel.classList.remove('hidden');
            updateAdminTeamsList();
        }
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
        
        const teamsContent = document.getElementById('teamsContent');
        if (teamsContent && !teamsContent.classList.contains('hidden')) {
            const appState = AppState.getInstance();
            if (appState.getCurrentDisplayedTeamId()) {
                showSingleTeamCard(appState.getCurrentDisplayedTeamId());
            }
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

// === ГЛАВНОЕ ПРИЛОЖЕНИЕ ===
class TournamentApp {
    constructor() {
        this.database = null;
        this.appState = AppState.getInstance();
    }
    
    async initialize() {
        try {
            console.log('🚀 Инициализация Tournament App...');
            
            await this.initializeFirebase();
            await this.initializeManagers();
            this.initializeSystems();
            this.initializeUI();
            
            console.log('✅ Tournament App успешно инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }
    }
    
    async initializeFirebase() {
        try {
            firebase.initializeApp(firebaseConfig);
            this.database = firebase.database();
            window.database = this.database;
            console.log('🔥 Firebase успешно инициализирован');
        } catch (error) {
            console.error('❌ Ошибка Firebase:', error);
            throw new Error('Не удалось подключиться к базе данных');
        }
    }
    
    async initializeManagers() {
        const teamsManager = new TeamsManager(this.database);
        this.appState.setTeamsManager(teamsManager);
        await teamsManager.initialize();
    }
    
    initializeSystems() {
        SecurityManager.init();
    }
    
    initializeUI() {
        this.createAnimatedBackground();
        this.setupEventListeners();
        this.setupGlobalHandlers();
    }
    
    setupEventListeners() {
        // Навигация
        document.getElementById('teamsDropdownBtn')?.addEventListener('click', toggleDropdown);
        document.getElementById('scheduleBtn')?.addEventListener('click', () => showSection('schedule'));
        document.getElementById('groupStageBtn')?.addEventListener('click', () => showSection('groupStage'));
        document.getElementById('playoffBtn')?.addEventListener('click', () => showSection('playoff'));
        document.getElementById('audienceAwardBtn')?.addEventListener('click', () => showSection('audienceAward'));
        
        // Модальные окна
        document.getElementById('closeEditTeamModal')?.addEventListener('click', closeEditTeamModal);
        document.getElementById('closeAdminPanel')?.addEventListener('click', closeAdminPanel);
        document.getElementById('saveTeamBtn')?.addEventListener('click', saveTeamChanges);
        document.getElementById('cancelEditTeamBtn')?.addEventListener('click', closeEditTeamModal);
        
        // Админ-панель
        document.getElementById('applyTeamsCountBtn')?.addEventListener('click', updateTeamsCount);
        
        // Вкладки админки
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                openAdminTab(this.getAttribute('data-tab'));
            });
        });
    }
    
    setupGlobalHandlers() {
        // Закрытие модальных окон при клике вне их
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.classList.add('hidden');
            }
            
            if (!event.target.closest('.dropdown') && !event.target.closest('.nav-btn')) {
                closeAllDropdowns();
            }
        });
        
        // Закрытие по ESC
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeAllModals();
            }
        });
    }
    
    createAnimatedBackground() {
        const bg = document.getElementById('animatedBg');
        if (!bg) return;
        
        const particleCount = 15;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            
            const size = Math.random() * 10 + 5;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 20}s`;
            particle.style.animationDuration = `${15 + Math.random() * 10}s`;
            
            bg.appendChild(particle);
        }
    }
}

// === ФУНКЦИИ ИНТЕРФЕЙСА ===

// Навигация
function toggleDropdown() {
    const dropdown = document.querySelector('.dropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.classList.remove('active');
    });
}

function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    const targetSection = document.getElementById(`${sectionName}Content`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    const appState = AppState.getInstance();
    appState.setCurrentDisplayedTeamId(null);
}

// Отображение данных
function updateTeamsDropdown() {
    const dropdown = document.getElementById('teamsDropdown');
    if (!dropdown) return;
    
    const appState = AppState.getInstance();
    const teamsManager = appState.getTeamsManager();
    if (!teamsManager) return;
    
    const teams = teamsManager.getAllTeams();
    dropdown.innerHTML = '';
    
    Object.keys(teams).forEach(teamId => {
        const team = teams[teamId];
        const link = document.createElement('a');
        link.textContent = team.name || 'Без названия';
        link.addEventListener('click', () => showSingleTeamCard(teamId));
        dropdown.appendChild(link);
    });
}

function showSingleTeamCard(teamId) {
    const container = document.getElementById('singleTeamCard');
    if (!container) return;
    
    const appState = AppState.getInstance();
    const teamsManager = appState.getTeamsManager();
    if (!teamsManager) return;
    
    const team = teamsManager.getTeam(teamId);
    if (team) {
        const card = createTeamCard(teamId, team);
        container.innerHTML = '';
        container.appendChild(card);
        appState.setCurrentDisplayedTeamId(teamId);
    }
    
    hideAllSections();
    const teamsContent = document.getElementById('teamsContent');
    if (teamsContent) {
        teamsContent.classList.remove('hidden');
    }
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
    
    const editButton = SecurityManager.isAuthenticated ? 
        `<button class="edit-team-btn" data-team-id="${teamId}">✏️ Редактировать</button>` : '';
    
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
    
    // Кнопка редактирования
    if (SecurityManager.isAuthenticated) {
        const editBtn = card.querySelector('.edit-team-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => editTeam(teamId));
        }
    }
    
    return card;
}

// Модальные окна
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

function closeEditTeamModal() {
    const modal = document.getElementById('editTeamModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function closeAdminPanel() {
    const panel = document.getElementById('adminPanel');
    if (panel) {
        panel.classList.add('hidden');
    }
}

// Админ-панель
function openAdminTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    document.getElementById(tabName)?.classList.add('active');
}

function updateAdminTeamsList() {
    const container = document.getElementById('adminTeamsList');
    if (!container) return;
    
    const appState = AppState.getInstance();
    const teamsManager = appState.getTeamsManager();
    if (!teamsManager) return;
    
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
            <button class="edit-btn" data-team-id="${teamId}">✏️</button>
        `;
        
        const editBtn = teamElement.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => editTeam(teamId));
        }
        
        container.appendChild(teamElement);
    });
}

async function updateTeamsCount() {
    if (!SecurityManager.requireAuth()) return;
    
    const input = document.getElementById('totalTeams');
    const count = parseInt(input?.value) || 4;
    
    const appState = AppState.getInstance();
    const teamsManager = appState.getTeamsManager();
    if (!teamsManager) return;
    
    const currentTeams = teamsManager.getAllTeams();
    const currentCount = Object.keys(currentTeams).length;
    
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
}

function editTeam(teamId) {
    if (!SecurityManager.requireAuth()) return;
    
    const appState = AppState.getInstance();
    const teamsManager = appState.getTeamsManager();
    if (!teamsManager) return;
    
    const team = teamsManager.getTeam(teamId);
    if (!team) return;
    
    const modal = document.getElementById('editTeamModal');
    if (!modal) return;
    
    appState.setCurrentEditingTeamId(teamId);
    
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
}

async function saveTeamChanges() {
    if (!SecurityManager.requireAuth()) return;
    
    const appState = AppState.getInstance();
    const teamsManager = appState.getTeamsManager();
    if (!teamsManager) return;
    
    const teamId = appState.getCurrentEditingTeamId();
    if (!teamId) return;
    
    const name = document.getElementById('editTeamName')?.value || '';
    const slogan = document.getElementById('editTeamSlogan')?.value || '';
    
    const players = [];
    const playerForms = document.querySelectorAll('.player-edit-form');
    
    playerForms.forEach(form => {
        const nameInput = form.querySelector('.player-name');
        const roleInput = form.querySelector('.player-role');
        const mmrInput = form.querySelector('.player-mmr');
        
        players.push({
            name: nameInput?.value || '',
            role: roleInput?.value || '',
            mmr: parseInt(mmrInput?.value) || 3000
        });
    });
    
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
}

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
        text.textContent = 'Подключение к турниру...';
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const app = new TournamentApp();
    app.initialize();
});