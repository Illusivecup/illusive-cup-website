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
        this.bracketManager = null;
        this.scheduleManager = null;
        this.tournamentData = {};
        this.currentEditingTeamId = null;
        this.currentDisplayedTeamId = null;
    }
    
    setTeamsManager(manager) { this.teamsManager = manager; }
    getTeamsManager() { return this.teamsManager; }
    
    setBracketManager(manager) { this.bracketManager = manager; }
    getBracketManager() { return this.bracketManager; }
    
    setScheduleManager(manager) { this.scheduleManager = manager; }
    getScheduleManager() { return this.scheduleManager; }
    
    setTournamentData(data) { this.tournamentData = data; }
    getTournamentData() { return this.tournamentData; }
    
    setCurrentEditingTeamId(id) { this.currentEditingTeamId = id; }
    getCurrentEditingTeamId() { return this.currentEditingTeamId; }
    
    setCurrentDisplayedTeamId(id) { this.currentDisplayedTeamId = id; }
    getCurrentDisplayedTeamId() { return this.currentDisplayedTeamId; }
}

// === СИСТЕМА КЭШИРОВАНИЯ ===
class CacheManager {
    static storage = new Map();
    static defaultTTL = 5 * 60 * 1000;
    
    static set(key, data, ttl = this.defaultTTL) {
        this.storage.set(key, {
            data,
            expiry: Date.now() + ttl,
            timestamp: Date.now()
        });
        this.cleanup();
    }
    
    static get(key) {
        const item = this.storage.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.storage.delete(key);
            return null;
        }
        
        return item.data;
    }
    
    static cleanup() {
        const now = Date.now();
        for (const [key, item] of this.storage.entries()) {
            if (now > item.expiry) {
                this.storage.delete(key);
            }
        }
    }
    
    static clear() {
        this.storage.clear();
    }
}

// === СИСТЕМА ОПТИМИЗАЦИИ ПРОИЗВОДИТЕЛЬНОСТИ ===
class PerformanceOptimizer {
    static debounceTimers = new Map();
    static throttleFlags = new Map();
    
    static init() {
        setInterval(() => {
            this.cleanup();
            CacheManager.cleanup();
        }, 10 * 60 * 1000);
    }
    
    static debounce(key, callback, delay = 300) {
        const existing = this.debounceTimers.get(key);
        if (existing) clearTimeout(existing);
        
        const timer = setTimeout(() => {
            callback();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timer);
    }
    
    static throttle(key, callback, delay = 1000) {
        if (this.throttleFlags.get(key)) return;
        
        callback();
        this.throttleFlags.set(key, true);
        
        setTimeout(() => {
            this.throttleFlags.delete(key);
        }, delay);
    }
    
    static setCachedData(key, data, ttl) {
        CacheManager.set(key, data, ttl);
    }
    
    static getCachedData(key) {
        return CacheManager.get(key);
    }
    
    static cleanup() {
        const now = Date.now();
        for (const [key, timer] of this.debounceTimers.entries()) {
            if (now - timer._idleStart > 60000) {
                clearTimeout(timer);
                this.debounceTimers.delete(key);
            }
        }
    }
}

// === СИСТЕМА ОБРАБОТКИ ОШИБОК ===
class ErrorHandler {
    static init() {
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    }
    
    static handleGlobalError(event) {
        console.error('🚨 Глобальная ошибка:', event.error);
        this.showError('Произошла непредвиденная ошибка');
    }
    
    static handleUnhandledRejection(event) {
        console.error('🚨 Необработанный Promise:', event.reason);
        this.showError('Ошибка загрузки данных');
    }
    
    static showError(message, isFatal = false) {
        console.error(`❌ ${message}`);
        this.createErrorNotification(message, isFatal);
        
        if (isFatal) {
            this.showFallbackUI();
        }
    }
    
    static createErrorNotification(message, isFatal) {
        this.removeExistingNotifications();
        
        const notification = document.createElement('div');
        notification.className = `error-notification ${isFatal ? 'fatal' : 'warning'}`;
        notification.innerHTML = `
            <div class="error-content">
                <span class="error-icon">${isFatal ? '🚨' : '⚠️'}</span>
                <span class="error-message">${message}</span>
                <button class="error-close">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        if (!isFatal) {
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
        
        notification.querySelector('.error-close').addEventListener('click', () => {
            notification.remove();
        });
    }
    
    static removeExistingNotifications() {
        document.querySelectorAll('.error-notification').forEach(notification => {
            notification.remove();
        });
    }
    
    static showFallbackUI() {
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="fallback-ui">
                    <h1>😔 Критическая ошибка</h1>
                    <p>Приложение временно недоступно. Пожалуйста, попробуйте обновить страницу.</p>
                    <button onclick="window.location.reload()">🔄 Обновить страницу</button>
                </div>
            `;
        }
    }
}

// === СИСТЕМА ВАЛИДАЦИИ ===
class ValidationSystem {
    static validateTeam(teamData) {
        const errors = [];
        
        if (!teamData.name || teamData.name.trim().length < 2) {
            errors.push('Название команды должно содержать минимум 2 символа');
        }
        
        if (!teamData.players || teamData.players.length === 0) {
            errors.push('Команда должна иметь хотя бы одного игрока');
        }
        
        if (teamData.players) {
            teamData.players.forEach((player, index) => {
                if (!player.name || player.name.trim().length === 0) {
                    errors.push(`Игрок ${index + 1}: имя обязательно`);
                }
                
                if (player.mmr < 0 || player.mmr > 10000) {
                    errors.push(`Игрок ${index + 1}: MMR должен быть от 0 до 10000`);
                }
                
                if (!player.role || player.role.trim().length === 0) {
                    errors.push(`Игрок ${index + 1}: роль обязательна`);
                }
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    static validateBracketMatch(match) {
        const errors = [];
        
        if (match.team1 && match.team2 && match.team1 === match.team2) {
            errors.push('Команда не может играть против себя');
        }
        
        if (match.score1 !== null && match.score2 !== null) {
            if (match.score1 < 0 || match.score2 < 0) {
                errors.push('Счет не может быть отрицательным');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// === СИСТЕМА ВРЕМЕННЫХ ДОСТУПОВ ===
class TemporaryAccess {
    static async generateTemporaryLink(durationHours = 24) {
        const token = this.generateToken();
        const expiresAt = Date.now() + (durationHours * 60 * 60 * 1000);
        
        await database.ref(`temporary_access/${token}`).set({
            expiresAt: expiresAt,
            createdAt: Date.now(),
            used: false
        });
        
        return `${window.location.origin}${window.location.pathname}?access_token=${token}`;
    }
    
    static generateToken() {
        return 'temp_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }
    
    static async validateToken(token) {
        try {
            const snapshot = await database.ref(`temporary_access/${token}`).once('value');
            const accessData = snapshot.val();
            
            if (!accessData) {
                throw new Error('Токен не найден');
            }
            
            if (accessData.used) {
                throw new Error('Токен уже использован');
            }
            
            if (Date.now() > accessData.expiresAt) {
                throw new Error('Срок действия токена истек');
            }
            
            await database.ref(`temporary_access/${token}`).update({ used: true });
            
            return true;
        } catch (error) {
            throw new Error(`Ошибка валидации токена: ${error.message}`);
        }
    }
}

// === СИСТЕМА БЕЗОПАСНОСТИ ===
class SecurityManager {
    static EDITOR_PASSWORD = 'IllusiveCup2025!';
    static isAuthenticated = false;
    static sessionTimeout = 30 * 60 * 1000;
    static sessionTimer = null;
    static eventListenersSetup = false;
    
    static init() {
        this.checkExistingSession();
        this.setupAutoLogout();
        this.setupActivityListeners();
    }
    
    static async authenticate(password) {
        await this.delay(500 + Math.random() * 1000);
        
        if (password === this.EDITOR_PASSWORD) {
            this.isAuthenticated = true;
            this.startSession();
            this.setupAutoLogout();
            return true;
        }
        return false;
    }
    
    static async authenticateWithToken(token) {
        try {
            const isValid = await TemporaryAccess.validateToken(token);
            if (isValid) {
                this.isAuthenticated = true;
                this.startSession();
                this.setupAutoLogout();
                return true;
            }
        } catch (error) {
            console.error('Ошибка аутентификации по токену:', error);
        }
        return false;
    }
    
    static startSession() {
        const sessionData = {
            authenticated: true,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            ipHash: this.generateIPHash()
        };
        
        localStorage.setItem('editor_session', JSON.stringify(sessionData));
        sessionStorage.setItem('editor_active', 'true');
    }
    
    static checkExistingSession() {
        try {
            const sessionData = localStorage.getItem('editor_session');
            if (!sessionData) return;
            
            const data = JSON.parse(sessionData);
            const sessionAge = Date.now() - data.timestamp;
            
            if (data.authenticated && 
                sessionAge < this.sessionTimeout && 
                data.userAgent === navigator.userAgent) {
                
                this.isAuthenticated = true;
                this.setupAutoLogout();
                this.showAdminInterface();
            } else {
                this.clearSession();
            }
        } catch (error) {
            this.clearSession();
        }
    }
    
    static setupAutoLogout() {
        this.clearAutoLogout();
        
        this.sessionTimer = setTimeout(() => {
            this.logout();
            ErrorHandler.showError('Сессия истекла из-за неактивности');
        }, this.sessionTimeout);
    }
    
    static setupActivityListeners() {
        const resetTimer = () => {
            if (this.isAuthenticated) {
                this.setupAutoLogout();
            }
        };
        
        ['click', 'keydown', 'mousemove', 'scroll'].forEach(event => {
            document.addEventListener(event, resetTimer, { passive: true });
        });
    }
    
    static clearAutoLogout() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }
    
    static logout() {
        this.isAuthenticated = false;
        this.clearSession();
        this.hideAdminInterface();
    }
    
    static clearSession() {
        localStorage.removeItem('editor_session');
        sessionStorage.removeItem('editor_active');
        this.clearAutoLogout();
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
        const connectionStatus = document.getElementById('connectionStatus');
        
        if (adminBtn) adminBtn.classList.remove('hidden');
        if (connectionStatus) connectionStatus.classList.remove('hidden');
        
        console.log('👑 Режим редактора активирован');
        
        if (!this.eventListenersSetup) {
            EventManager.setupAdminEventListeners();
            this.eventListenersSetup = true;
        }
    }
    
    static hideAdminInterface() {
        const adminBtn = document.getElementById('adminBtn');
        const connectionStatus = document.getElementById('connectionStatus');
        const adminPanel = document.getElementById('adminPanel');
        
        if (adminBtn) adminBtn.classList.add('hidden');
        if (connectionStatus) connectionStatus.classList.add('hidden');
        if (adminPanel) adminPanel.classList.add('hidden');
    }
    
    static showAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('hidden');
            
            const confirmAuth = document.getElementById('confirmAuth');
            const cancelAuth = document.getElementById('cancelAuth');
            const editorPassword = document.getElementById('editorPassword');
            
            if (confirmAuth) {
                confirmAuth.onclick = async () => {
                    const password = editorPassword ? editorPassword.value : '';
                    const isValid = await this.authenticate(password);
                    
                    if (isValid) {
                        modal.classList.add('hidden');
                        this.showAdminInterface();
                        showAdminPanel();
                    } else {
                        ErrorHandler.showError('Неверный пароль');
                    }
                };
            }
            
            if (cancelAuth) {
                cancelAuth.onclick = () => {
                    modal.classList.add('hidden');
                };
            }
            
            if (editorPassword) {
                editorPassword.focus();
            }
        }
    }
    
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    static generateIPHash() {
        return btoa(navigator.userAgent + navigator.language).slice(0, 16);
    }
}

// === СИСТЕМА УПРАВЛЕНИЯ СОБЫТИЯМИ ===
class EventManager {
    static handlers = new Map();
    
    static setupAdminEventListeners() {
        this.removeAdminEventListeners();
        
        const eventMap = [
            ['generateAccessLink', 'click', generateAccessLink],
            ['copyLinkBtn', 'click', copyAccessLink],
            ['changePasswordBtn', 'click', changePassword],
            ['applyTeamsCountBtn', 'click', updateTeamsCount],
            ['updateTeamsBtn', 'click', updateTeamsSettings],
            ['saveBracketBtn', 'click', saveBracketChanges],
            ['saveScheduleBtn', 'click', saveScheduleChanges],
            ['addScheduleMatchBtn', 'click', addScheduleMatch],
            ['saveGroupStageBtn', 'click', saveGroupStageSettings]
        ];
        
        eventMap.forEach(([id, event, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                const boundHandler = handler.bind(this);
                element.addEventListener(event, boundHandler);
                this.handlers.set(`${id}_${event}`, { element, event, handler: boundHandler });
            }
        });
    }
    
    static removeAdminEventListeners() {
        this.handlers.forEach(({ element, event, handler }, key) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, handler);
            }
            this.handlers.delete(key);
        });
    }
}

// === БАЗОВЫЙ КЛАСС МЕНЕДЖЕРА ===
class BaseManager {
    constructor(database, name) {
        this.database = database;
        this.name = name;
        this.isInitialized = false;
        this.data = null;
    }
    
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            await this.setupListeners();
            this.isInitialized = true;
            console.log(`✅ ${this.name} Manager инициализирован`);
        } catch (error) {
            console.error(`❌ Ошибка инициализации ${this.name} Manager:`, error);
            throw error;
        }
    }
    
    async setupListeners() {
        return Promise.resolve();
    }
    
    async loadData() {
        return Promise.resolve();
    }
    
    getData() {
        return this.data;
    }
    
    validateData(data) {
        return data !== null && data !== undefined;
    }
}

// === МЕНЕДЖЕР КОМАНД ===
class TeamsManager extends BaseManager {
    constructor(database) {
        super(database, 'Teams');
        this.teams = {};
    }
    
    async setupListeners() {
        return new Promise((resolve, reject) => {
            this.database.ref('teams').on('value', (snapshot) => {
                PerformanceOptimizer.debounce('teams_update', () => {
                    this.handleTeamsUpdate(snapshot.val());
                }, 250);
                resolve();
            }, reject);
        });
    }
    
    async loadData() {
        return Promise.resolve();
    }
    
    handleTeamsUpdate(teamsData) {
        this.teams = teamsData || {};
        PerformanceOptimizer.setCachedData('teams', this.teams, 10 * 60 * 1000);
        
        console.log('📥 Обновлены данные команд:', this.teams);
        updateConnectionStatus(true);
        
        this.updateUI();
    }
    
    updateUI() {
        updateTeamsDropdown();
        
        const teamsContent = document.getElementById('teamsContent');
        if (teamsContent && !teamsContent.classList.contains('hidden')) {
            const appState = AppState.getInstance();
            if (appState.getCurrentDisplayedTeamId()) {
                showTeamCard(appState.getCurrentDisplayedTeamId());
            } else {
                displayTeamsCards();
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
        if (!this.teams[teamId]) {
            throw new Error('Команда не найдена');
        }
        
        const validation = ValidationSystem.validateTeam(teamData);
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }
        
        teamData.mmr = this.calculateTeamMMR(teamData.players);
        
        await this.database.ref(`teams/${teamId}`).update(teamData);
        return teamId;
    }
    
    async deleteTeam(teamId) {
        if (!this.teams[teamId]) {
            throw new Error('Команда не найдена');
        }
        
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

// === МЕНЕДЖЕР СЕТКИ ===
class BracketManager extends BaseManager {
    constructor(database) {
        super(database, 'Bracket');
        this.bracket = {};
    }
    
    async setupListeners() {
        return new Promise((resolve, reject) => {
            this.database.ref('bracket').on('value', (snapshot) => {
                PerformanceOptimizer.throttle('bracket_display', () => {
                    this.handleBracketUpdate(snapshot.val());
                }, 500);
                resolve();
            }, reject);
        });
    }
    
    handleBracketUpdate(bracketData) {
        this.bracket = bracketData || {};
        PerformanceOptimizer.setCachedData('bracket', this.bracket);
        
        const bracketContent = document.getElementById('bracketContent');
        if (bracketContent && !bracketContent.classList.contains('hidden')) {
            displayBracket(this.bracket);
        }
    }
    
    async updateBracket(bracketData) {
        await this.database.ref('bracket').set(bracketData);
    }
}

// === МЕНЕДЖЕР РАСПИСАНИЯ ===
class ScheduleManager extends BaseManager {
    constructor(database) {
        super(database, 'Schedule');
        this.schedule = [];
    }
    
    async setupListeners() {
        return new Promise((resolve, reject) => {
            this.database.ref('schedule').on('value', (snapshot) => {
                this.handleScheduleUpdate(snapshot.val());
                resolve();
            }, reject);
        });
    }
    
    handleScheduleUpdate(scheduleData) {
        this.schedule = scheduleData || [];
        PerformanceOptimizer.setCachedData('schedule', this.schedule);
        
        const scheduleContent = document.getElementById('scheduleContent');
        if (scheduleContent && !scheduleContent.classList.contains('hidden')) {
            displaySchedule(this.schedule);
        }
    }
    
    async updateSchedule(scheduleData) {
        await this.database.ref('schedule').set(scheduleData);
    }
}

// === ГЛАВНОЕ ПРИЛОЖЕНИЕ ===
class TournamentApp {
    constructor() {
        this.database = null;
        this.isInitialized = false;
        this.appState = AppState.getInstance();
        
        this.handleGlobalClick = this.handleGlobalClick.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
    }
    
    async initialize() {
        try {
            console.log('🚀 Инициализация Tournament App...');
            
            await this.initializeFirebase();
            await this.initializeManagers();
            this.initializeSystems();
            this.initializeUI();
            await this.loadInitialData();
            await this.finalizeInitialization();
            
            this.isInitialized = true;
            console.log('✅ Tournament App успешно инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.handleFatalError(error);
        }
    }
    
    async initializeFirebase() {
        try {
            firebase.initializeApp(firebaseConfig);
            this.database = firebase.database();
            console.log('🔥 Firebase успешно инициализирован');
        } catch (error) {
            console.error('❌ Ошибка Firebase:', error);
            throw new Error('Не удалось подключиться к базе данных');
        }
    }
    
    async initializeManagers() {
        const teamsManager = new TeamsManager(this.database);
        const bracketManager = new BracketManager(this.database);
        const scheduleManager = new ScheduleManager(this.database);
        
        this.appState.setTeamsManager(teamsManager);
        this.appState.setBracketManager(bracketManager);
        this.appState.setScheduleManager(scheduleManager);
        
        await Promise.all([
            teamsManager.initialize(),
            bracketManager.initialize(),
            scheduleManager.initialize()
        ]);
    }
    
    initializeSystems() {
        SecurityManager.init();
        PerformanceOptimizer.init();
        ErrorHandler.init();
        this.setupRealTimeListeners();
    }
    
    initializeUI() {
        this.createAnimatedBackground();
        this.setupEventListeners();
        this.setupGlobalHandlers();
    }
    
    async loadInitialData() {
        const managers = [
            this.appState.getTeamsManager(),
            this.appState.getBracketManager(),
            this.appState.getScheduleManager()
        ];
        
        await Promise.all(managers.map(manager => 
            manager.loadData().catch(error => {
                console.warn(`⚠️ Ошибка загрузки данных ${manager.constructor.name}:`, error);
                return null;
            })
        ));
    }
    
    async finalizeInitialization() {
        await this.checkAccess();
        this.setupPeriodicCleanup();
    }
    
    setupRealTimeListeners() {
        const listeners = {
            'tournament': (snapshot) => {
                const data = snapshot.val() || {};
                this.appState.setTournamentData(data);
                PerformanceOptimizer.setCachedData('tournament', data);
                this.safeDisplayGroupStage();
            },
            'audienceAwards': (snapshot) => {
                const data = snapshot.val();
                PerformanceOptimizer.setCachedData('audienceAwards', data);
                this.safeDisplayAudienceAwards(data);
            }
        };
        
        Object.entries(listeners).forEach(([path, handler]) => {
            this.database.ref(path).on('value', handler);
        });
    }
    
    setupEventListeners() {
        const navElements = [
            ['teamsDropdownBtn', 'click', this.toggleDropdown],
            ['groupStageBtn', 'click', () => this.showSection('groupStage')],
            ['bracketBtn', 'click', () => this.showSection('bracket')],
            ['scheduleBtn', 'click', () => this.showSection('schedule')],
            ['audienceAwardBtn', 'click', () => this.showSection('audienceAward')],
            ['adminBtn', 'click', this.showAdminPanel]
        ];
        
        navElements.forEach(([id, event, handler]) => {
            this.addSafeEventListener(id, event, handler);
        });
        
        const modalElements = [
            ['closeEditTeamModal', 'click', this.closeEditTeamModal],
            ['closeAdminPanel', 'click', this.closeAdminPanel],
            ['addPlayerBtn', 'click', this.addPlayerField],
            ['saveTeamBtn', 'click', this.saveTeamChanges],
            ['cancelEditTeamBtn', 'click', this.closeEditTeamModal]
        ];
        
        modalElements.forEach(([id, event, handler]) => {
            this.addSafeEventListener(id, event, handler);
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                openAdminTab(this.getAttribute('data-tab'));
            });
        });
    }
    
    setupGlobalHandlers() {
        document.addEventListener('click', this.handleGlobalClick);
        document.addEventListener('keydown', this.handleKeydown);
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }
    
    setupPeriodicCleanup() {
        setInterval(() => {
            PerformanceOptimizer.cleanup();
            CacheManager.cleanup();
        }, 5 * 60 * 1000);
    }
    
    handleGlobalClick(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.add('hidden');
        }
        
        if (!event.target.closest('.dropdown') && !event.target.closest('.nav-btn')) {
            this.closeAllDropdowns();
        }
    }
    
    handleKeydown(event) {
        if (event.key === 'Escape') {
            this.closeAllModals();
        }
    }
    
    handleBeforeUnload(event) {
        if (SecurityManager.isAuthenticated) {
            SecurityManager.clearSession();
        }
    }
    
    handleFatalError(error) {
        console.error('💥 Фатальная ошибка:', error);
        ErrorHandler.showError('Критическая ошибка приложения', true);
        this.showFallbackInterface();
    }
    
    async checkAccess() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('access_token');
        
        if (token) {
            try {
                await SecurityManager.authenticateWithToken(token);
                window.history.replaceState({}, '', window.location.pathname);
            } catch (error) {
                ErrorHandler.showError('Неверная ссылка доступа');
            }
        } else if (urlParams.get('editor') === 'true') {
            SecurityManager.showAuthModal();
        }
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
    
    addSafeEventListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
        }
    }
    
    closeAllDropdowns() {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }
    
    showSection(sectionName) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        const targetSection = document.getElementById(`${sectionName}Content`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
        
        this.appState.setCurrentDisplayedTeamId(null);
    }
    
    showFallbackInterface() {
        document.body.innerHTML = `
            <div class="fallback-ui">
                <h1>😔 Критическая ошибка</h1>
                <p>Не удалось загрузить приложение. Пожалуйста, попробуйте обновить страницу.</p>
                <button onclick="window.location.reload()">🔄 Обновить страницу</button>
            </div>
        `;
    }
    
    safeDisplayGroupStage() {
        try {
            displayGroupStage();
        } catch (error) {
            console.error('Ошибка отображения группового этапа:', error);
        }
    }
    
    safeDisplayAudienceAwards(data) {
        try {
            displayAudienceAwards(data);
        } catch (error) {
            console.error('Ошибка отображения призов:', error);
        }
    }
    
    // Методы навигации
    toggleDropdown = () => {
        const dropdown = document.querySelector('.dropdown');
        if (dropdown) {
            dropdown.classList.toggle('active');
        }
    }
    
    showAdminPanel = () => {
        SecurityManager.requireAuth() && showAdminPanel();
    }
    
    closeEditTeamModal = () => {
        const modal = document.getElementById('editTeamModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.appState.setCurrentEditingTeamId(null);
    }
    
    addPlayerField = () => {
        addPlayerField();
    }
    
    saveTeamChanges = () => {
        saveTeamChanges();
    }
}

// === ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ===
class AppInitializer {
    static async initialize() {
        try {
            if (!this.checkBrowserSupport()) {
                this.showUnsupportedBrowser();
                return;
            }
            
            await this.initializeFirebase();
            
            window.app = new TournamentApp();
            await window.app.initialize();
            
            this.trackPerformance();
            
        } catch (error) {
            console.error('💥 Критическая ошибка инициализации:', error);
            this.showFatalError(error);
        }
    }
    
    static checkBrowserSupport() {
        return (
            typeof Promise !== 'undefined' &&
            typeof Map !== 'undefined' &&
            typeof Set !== 'undefined' &&
            'classList' in document.createElement('div')
        );
    }
    
    static async initializeFirebase() {
        try {
            firebase.initializeApp(firebaseConfig);
            console.log('🔥 Firebase успешно инициализирован');
        } catch (error) {
            console.error('❌ Ошибка Firebase:', error);
            throw new Error('Не удалось подключиться к базе данных');
        }
    }
    
    static trackPerformance() {
        if ('performance' in window) {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log('📊 Метрики производительности:', {
                    loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                    domReady: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                    totalTime: perfData.loadEventEnd - perfData.navigationStart
                });
            }
        }
    }
    
    static showUnsupportedBrowser() {
        document.body.innerHTML = `
            <div class="fallback-ui">
                <h1>😔 Браузер не поддерживается</h1>
                <p>Для работы приложения требуется современный браузер с поддержкой JavaScript.</p>
                <p>Рекомендуем обновить браузер или использовать:</p>
                <ul>
                    <li>Chrome 80+</li>
                    <li>Firefox 75+</li>
                    <li>Safari 13+</li>
                    <li>Edge 80+</li>
                </ul>
            </div>
        `;
    }
    
    static showFatalError(error) {
        document.body.innerHTML = `
            <div class="fallback-ui">
                <h1>😔 Критическая ошибка</h1>
                <p>Не удалось загрузить приложение. Пожалуйста, попробуйте обновить страницу.</p>
                <button onclick="location.reload()">🔄 Обновить страницу</button>
                <details style="margin-top: 20px; color: #a0aec0;">
                    <summary>Техническая информация</summary>
                    <pre>${error.stack || error.message}</pre>
                </details>
            </div>
        `;
    }
}

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let database;

// === ФУНКЦИИ ИНТЕРФЕЙСА ===

// Навигация
function toggleDropdown() {
    const dropdown = document.querySelector('.dropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function showTeams() {
    hideAllSections();
    const teamsContent = document.getElementById('teamsContent');
    if (teamsContent) {
        teamsContent.classList.remove('hidden');
    }
    
    const appState = AppState.getInstance();
    if (!appState.getCurrentDisplayedTeamId()) {
        displayTeamsCards();
    }
}

function showGroupStage() {
    hideAllSections();
    const groupStageContent = document.getElementById('groupStageContent');
    if (groupStageContent) {
        groupStageContent.classList.remove('hidden');
    }
    AppState.getInstance().setCurrentDisplayedTeamId(null);
}

function showBracket() {
    hideAllSections();
    const bracketContent = document.getElementById('bracketContent');
    if (bracketContent) {
        bracketContent.classList.remove('hidden');
    }
    AppState.getInstance().setCurrentDisplayedTeamId(null);
}

function showSchedule() {
    hideAllSections();
    const scheduleContent = document.getElementById('scheduleContent');
    if (scheduleContent) {
        scheduleContent.classList.remove('hidden');
    }
    AppState.getInstance().setCurrentDisplayedTeamId(null);
}

function showAudienceAward() {
    hideAllSections();
    const audienceAwardContent = document.getElementById('audienceAwardContent');
    if (audienceAwardContent) {
        audienceAwardContent.classList.remove('hidden');
    }
    AppState.getInstance().setCurrentDisplayedTeamId(null);
}

function hideAllSections() {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
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
        link.addEventListener('click', () => showTeamCard(teamId));
        dropdown.appendChild(link);
    });
}

function showTeamCard(teamId) {
    const container = document.getElementById('teamsContent');
    if (!container) return;
    
    const appState = AppState.getInstance();
    const teamsManager = appState.getTeamsManager();
    if (!teamsManager) return;
    
    container.innerHTML = '';
    
    const team = teamsManager.getTeam(teamId);
    if (team) {
        const card = createTeamCard(teamId, team);
        container.appendChild(card);
        appState.setCurrentDisplayedTeamId(teamId);
    }
    
    showTeams();
    toggleDropdown();
}

function displayTeamsCards() {
    const container = document.getElementById('teamsContent');
    if (!container) return;
    
    const appState = AppState.getInstance();
    const teamsManager = appState.getTeamsManager();
    if (!teamsManager) return;
    
    const fragment = document.createDocumentFragment();
    appState.setCurrentDisplayedTeamId(null);
    
    const teams = teamsManager.getAllTeams();
    Object.keys(teams).forEach(teamId => {
        const team = teams[teamId];
        const card = createTeamCard(teamId, team);
        fragment.appendChild(card);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
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
    
    if (SecurityManager.isAuthenticated) {
        const editBtn = card.querySelector('.edit-team-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => editTeam(teamId));
        }
    }
    
    return card;
}

function displayBracket(bracketData) {
    const container = document.getElementById('bracketContainer');
    if (!container) return;
    
    if (!bracketData) {
        container.innerHTML = '<p>Турнирная сетка пока не сформирована</p>';
        return;
    }
    
    const appState = AppState.getInstance();
    const teamsManager = appState.getTeamsManager();
    if (!teamsManager) return;
    
    let bracketHTML = '';
    
    Object.keys(bracketData).forEach(round => {
        const matches = bracketData[round];
        if (!Array.isArray(matches)) return;
        
        bracketHTML += `
            <div class="bracket-round">
                <h3>${getRoundName(round)}</h3>
                ${matches.map((match, index) => `
                    <div class="match ${round === 'final' ? 'final' : ''}">
                        <div class="team-select-container">
                            <select class="team-select" data-round="${round}" data-match="${index}" data-team="1">
                                <option value="">-- Выберите команду --</option>
                                ${Object.keys(teamsManager.getAllTeams()).map(teamId => {
                                    const team = teamsManager.getTeam(teamId);
                                    return `<option value="${teamId}" ${match.team1 === teamId ? 'selected' : ''}>${team.name}</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div class="score-container">
                            <input type="number" class="score-input" data-round="${round}" data-match="${index}" data-team="1" value="${match.score1 !== null ? match.score1 : ''}" placeholder="0">
                            <span> - </span>
                            <input type="number" class="score-input" data-round="${round}" data-match="${index}" data-team="2" value="${match.score2 !== null ? match.score2 : ''}" placeholder="0">
                        </div>
                        <div class="team-select-container">
                            <select class="team-select" data-round="${round}" data-match="${index}" data-team="2">
                                <option value="">-- Выберите команду --</option>
                                ${Object.keys(teamsManager.getAllTeams()).map(teamId => {
                                    const team = teamsManager.getTeam(teamId);
                                    return `<option value="${teamId}" ${match.team2 === teamId ? 'selected' : ''}>${team.name}</option>`;
                                }).join('')}
                            </select>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    });
    
    container.innerHTML = bracketHTML;
}

function displaySchedule(scheduleData) {
    const container = document.getElementById('scheduleList');
    if (!container) return;
    
    if (!scheduleData || scheduleData.length === 0) {
        container.innerHTML = '<p>Расписание матчей пока не опубликовано</p>';
        return;
    }
    
    container.innerHTML = scheduleData.map(match => `
        <div class="match-slot">
            <div class="time">${match.time || 'TBD'}</div>
            <div class="teams">${match.match || 'Матч не назначен'}</div>
            <div class="court">${match.stage || 'Групповой этап'}</div>
        </div>
    `).join('');
}

function displayGroupStage() {
    const container = document.getElementById('groupStageContainer');
    if (!container) return;
    
    const appState = AppState.getInstance();
    const tournamentData = appState.getTournamentData();
    
    if (!tournamentData || !tournamentData.groupStage) {
        container.innerHTML = '<p>Групповой этап пока не сформирован</p>';
        return;
    }

    let groupHTML = '';

    Object.keys(tournamentData.groupStage).forEach(groupName => {
        const group = tournamentData.groupStage[groupName];
        
        if (!group.teams) return;
        
        const sortedTeams = [...group.teams].sort((a, b) => {
            if (a.losses === 0 && b.losses !== 0) return -1;
            if (a.losses !== 0 && b.losses === 0) return 1;
            
            if (a.wins === a.losses && b.wins !== b.losses) return 1;
            if (a.wins !== a.losses && b.wins === b.losses) return -1;
            
            if (a.wins === 0 && b.wins !== 0) return 1;
            if (a.wins !== 0 && b.wins === 0) return -1;
            
            return (b.points || 0) - (a.points || 0);
        });
        
        groupHTML += `
            <div class="group-container">
                <h3>${groupName}</h3>
                <div class="group-table">
                    <div class="table-header">
                        <div>Команда</div>
                        <div>Матчи</div>
                        <div>Победы</div>
                        <div>Поражения</div>
                        <div>Очки</div>
                    </div>
                    ${sortedTeams.map((team, index) => {
                        let rowClass = '';
                        if (team.losses === 0 && team.wins > 0) {
                            rowClass = 'undefeated';
                        } else if (team.wins === 0 && team.losses > 0) {
                            rowClass = 'eliminated';
                        } else if (team.wins === team.losses) {
                            rowClass = 'equal';
                        } else if (team.wins === 0 && team.losses === 0) {
                            rowClass = 'new-team';
                        }
                        
                        return `
                            <div class="table-row ${rowClass}">
                                <div class="team-name">${team.name || 'Без названия'}</div>
                                <div>${(team.wins || 0) + (team.losses || 0)}</div>
                                <div>${team.wins || 0}</div>
                                <div>${team.losses || 0}</div>
                                <div class="points">${team.points || 0}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = groupHTML;
}

function displayAudienceAwards(awardsData) {
    const container = document.getElementById('audienceAwardsContent');
    if (!container) return;
    
    if (!awardsData || !awardsData.matches || awardsData.matches.length === 0) {
        container.innerHTML = '<p>Информация о лучших игроках матчей пока не добавлена</p>';
        return;
    }
    
    container.innerHTML = awardsData.matches.map(match => `
        <div class="award-match">
            <h4>${match.teams ? match.teams.join(' vs ') : 'Матч'}</h4>
            <div class="best-players">
                ${match.bestPlayers ? match.bestPlayers.map(player => `
                    <div class="player-award">
                        <strong>${player.name || 'Не указан'}</strong> 
                        (${player.team || 'Не указана'}) - ${player.role || 'Роль не указана'}
                    </div>
                `).join('') : '<p>Лучшие игроки не выбраны</p>'}
            </div>
        </div>
    `).join('');
}

// Админ-панель
function showAdminPanel() {
    if (!SecurityManager.requireAuth()) return;
    
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        adminPanel.classList.remove('hidden');
        updateAdminTeamsList();
        
        const totalTeamsInput = document.getElementById('totalTeams');
        if (totalTeamsInput) {
            const appState = AppState.getInstance();
            const teamsManager = appState.getTeamsManager();
            if (teamsManager) {
                totalTeamsInput.value = Object.keys(teamsManager.getAllTeams()).length;
            }
        }
        
        loadBracketSettings();
        loadScheduleSettings();
        EventManager.setupAdminEventListeners();
    }
}

function closeAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        adminPanel.classList.add('hidden');
    }
}

function openAdminTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const tabPane = document.getElementById(tabName);
    
    if (tabBtn) tabBtn.classList.add('active');
    if (tabPane) tabPane.classList.add('active');
}

function updateAdminTeamsList() {
    const container = document.getElementById('adminTeamsList');
    if (!container) return;
    
    const appState = AppState.getInstance();
    const teamsManager = appState.getTeamsManager();
    if (!teamsManager) return;
    
    container.innerHTML = '';
    
    const teams = teamsManager.getAllTeams();
    Object.keys(teams).forEach(teamId => {
        const team = teams[teamId];
        const teamItem = document.createElement('div');
        teamItem.className = 'team-admin-item';
        teamItem.innerHTML = `
            <span>${team.name || 'Без названия'}</span>
            <div>
                <button class="edit-team-btn" data-team-id="${teamId}">Редактировать</button>
                <button class="delete-team-btn" data-team-id="${teamId}">🗑️</button>
            </div>
        `;
        
        const editBtn = teamItem.querySelector('.edit-team-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => editTeam(teamId));
        }
        
        const deleteBtn = teamItem.querySelector('.delete-team-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteTeam(teamId));
        }
        
        container.appendChild(teamItem);
    });
}

// Управление командами
async function updateTeamsCount() {
    if (!SecurityManager.requireAuth()) return;
    
    const appState = AppState.getInstance();
    const teamsManager = appState.getTeamsManager();
    if (!teamsManager) {
        ErrorHandler.showError('Менеджер команд не инициализирован');
        return;
    }
    
    const totalTeamsInput = document.getElementById('totalTeams');
    if (!totalTeamsInput) return;
    
    const targetCount = parseInt(totalTeamsInput.value);
    const teams = teamsManager.getAllTeams();
    const currentCount = Object.keys(teams).length;
    
    if (isNaN(targetCount) || targetCount < 0) {
        ErrorHandler.showError('Введите корректное количество команд');
        return;
    }
    
    try {
        if (targetCount > currentCount) {
            // Добавляем новые команды
            const teamsToAdd = targetCount - currentCount;
            for (let i = 0; i < teamsToAdd; i++) {
                const newTeamId = 'team' + (currentCount + i + 1);
                const newTeam = {
                    name: "Новая команда " + (currentCount + i + 1),
                    slogan: "",
                    players: [
                        { name: "Игрок 1", role: "Керри", mmr: 3000 },
                        { name: "Игрок 2", role: "Мидер", mmr: 3000 },
                        { name: "Игрок 3", role: "Оффлейнер", mmr: 3000 },
                        { name: "Игрок 4", role: "Саппорт", mmr: 3000 },
                        { name: "Игрок 5", role: "Саппорт", mmr: 3000 }
                    ],
                    mmr: 3000
                };
                await teamsManager.database.ref('teams/' + newTeamId).set(newTeam);
            }
        } else if (targetCount < currentCount) {
            // Удаляем лишние команды
            const teamIds = Object.keys(teams);
            const teamsToRemove = currentCount - targetCount;
            
            for (let i = 0; i < teamsToRemove; i++) {
                const teamId = teamIds[teamIds.length - 1 - i];
                await teamsManager.deleteTeam(teamId);
            }
        }
        
        ErrorHandler.showError('Количество команд успешно обновлено');
    } catch (error) {
        ErrorHandler.showError('Ошибка при обновлении команд: ' + error.message);
    }
}

// Вспомогательные функции
function getRoundName(round) {
    const roundNames = {
        'quarterfinals': 'Четвертьфиналы',
        'semifinals': 'Полуфиналы', 
        'final': 'Финал'
    };
    return roundNames[round] || round;
}

function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    const statusDot = statusElement?.querySelector('.status-dot');
    const statusText = statusElement?.querySelector('.status-text');
    
    if (statusElement && statusDot && statusText) {
        if (connected) {
            statusDot.classList.add('connected');
            statusText.textContent = 'Подключено к турниру';
            statusElement.classList.remove('hidden');
        } else {
            statusDot.classList.remove('connected');
            statusText.textContent = 'Нет подключения';
        }
    }
}

// Функции для админ-панели
async function generateAccessLink() {
    if (!SecurityManager.requireAuth()) return;
    
    const durationSelect = document.getElementById('accessDuration');
    const durationHours = parseInt(durationSelect?.value) || 24;
    
    try {
        const link = await TemporaryAccess.generateTemporaryLink(durationHours);
        const container = document.getElementById('generatedLinkContainer');
        const linkInput = document.getElementById('generatedLink');
        const expiresSpan = document.getElementById('linkExpires');
        
        if (container && linkInput && expiresSpan) {
            linkInput.value = link;
            expiresSpan.textContent = `через ${durationHours} часов`;
            container.classList.remove('hidden');
        }
    } catch (error) {
        ErrorHandler.showError('Ошибка создания ссылки: ' + error.message);
    }
}

function copyAccessLink() {
    const linkInput = document.getElementById('generatedLink');
    if (linkInput) {
        linkInput.select();
        document.execCommand('copy');
        ErrorHandler.showError('Ссылка скопирована в буфер обмена');
    }
}

async function changePassword() {
    if (!SecurityManager.requireAuth()) return;
    
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    
    if (!newPassword || !confirmPassword) {
        ErrorHandler.showError('Заполните оба поля пароля');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        ErrorHandler.showError('Пароли не совпадают');
        return;
    }
    
    ErrorHandler.showError('Смена пароля временно недоступна');
}

async function updateTeamsSettings() {
    if (!SecurityManager.requireAuth()) return;
    ErrorHandler.showError('Функция в разработке');
}

async function saveBracketChanges() {
    if (!SecurityManager.requireAuth()) return;
    
    const appState = AppState.getInstance();
    const bracketManager = appState.getBracketManager();
    if (!bracketManager) return;
    
    const bracketData = {};
    const rounds = ['quarterfinals', 'semifinals', 'final'];
    
    rounds.forEach(round => {
        const matches = [];
        const matchElements = document.querySelectorAll(`[data-round="${round}"]`);
        
        matchElements.forEach((element, index) => {
            if (index % 2 === 0) {
                const matchIndex = Math.floor(index / 2);
                const team1Select = document.querySelector(`[data-round="${round}"][data-match="${matchIndex}"][data-team="1"]`);
                const team2Select = document.querySelector(`[data-round="${round}"][data-match="${matchIndex}"][data-team="2"]`);
                const score1Input = document.querySelector(`.score-input[data-round="${round}"][data-match="${matchIndex}"][data-team="1"]`);
                const score2Input = document.querySelector(`.score-input[data-round="${round}"][data-match="${matchIndex}"][data-team="2"]`);
                
                if (team1Select && team2Select) {
                    matches.push({
                        team1: team1Select.value,
                        team2: team2Select.value,
                        score1: score1Input ? parseInt(score1Input.value) || null : null,
                        score2: score2Input ? parseInt(score2Input.value) || null : null
                    });
                }
            }
        });
        
        bracketData[round] = matches;
    });
    
    try {
        await bracketManager.updateBracket(bracketData);
        ErrorHandler.showError('Турнирная сетка сохранена');
    } catch (error) {
        ErrorHandler.showError('Ошибка сохранения сетки: ' + error.message);
    }
}

async function saveScheduleChanges() {
    if (!SecurityManager.requireAuth()) return;
    ErrorHandler.showError('Функция в разработке');
}

function addScheduleMatch() {
    if (!SecurityManager.requireAuth()) return;
    
    const container = document.getElementById('scheduleEditList');
    if (!container) return;
    
    const matchElement = document.createElement('div');
    matchElement.className = 'schedule-edit-item';
    matchElement.innerHTML = `
        <input type="time" placeholder="Время" class="form-input">
        <input type="text" placeholder="Матч" class="form-input">
        <input type="text" placeholder="Стадия" class="form-input">
        <button class="remove-schedule-match">🗑️</button>
    `;
    
    container.appendChild(matchElement);
}

async function saveGroupStageSettings() {
    if (!SecurityManager.requireAuth()) return;
    ErrorHandler.showError('Функция в разработке');
}

// Функции редактирования команд
function editTeam(teamId) {
    if (!SecurityManager.requireAuth()) return;
    
    const appState = AppState.getInstance();
    const teamsManager = appState.getTeamsManager();
    if (!teamsManager) return;
    
    const team = teamsManager.getTeam(teamId);
    if (!team) return;
    
    const modal = document.getElementById('editTeamModal');
    const nameInput = document.getElementById('editTeamName');
    const sloganInput = document.getElementById('editTeamSlogan');
    const playersContainer = document.getElementById('playersEditContainer');
    
    if (modal && nameInput && sloganInput && playersContainer) {
        appState.setCurrentEditingTeamId(teamId);
        
        nameInput.value = team.name || '';
        sloganInput.value = team.slogan || '';
        
        playersContainer.innerHTML = '';
        (team.players || []).forEach((player, index) => {
            addPlayerField(player.name || '', player.role || '', player.mmr || 3000);
        });
        
        modal.classList.remove('hidden');
    }
}

function addPlayerField(name = '', role = '', mmr = 3000) {
    const container = document.getElementById('playersEditContainer');
    if (!container) return;
    
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-edit-row';
    playerDiv.innerHTML = `
        <input type="text" placeholder="Имя игрока" value="${name}" class="form-input">
        <input type="text" placeholder="Роль" value="${role}" class="form-input">
        <input type="number" placeholder="MMR" value="${mmr}" min="0" max="10000" class="form-input">
        <button type="button" class="remove-player">🗑️</button>
    `;
    
    container.appendChild(playerDiv);
    
    const removeBtn = playerDiv.querySelector('.remove-player');
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            if (container.children.length > 1) {
                playerDiv.remove();
            } else {
                ErrorHandler.showError('Команда должна иметь хотя бы одного игрока');
            }
        });
    }
}

async function saveTeamChanges() {
    if (!SecurityManager.requireAuth()) return;
    
    const appState = AppState.getInstance();
    const teamsManager = appState.getTeamsManager();
    if (!teamsManager) return;
    
    const teamId = appState.getCurrentEditingTeamId();
    if (!teamId) return;
    
    const nameInput = document.getElementById('editTeamName');
    const sloganInput = document.getElementById('editTeamSlogan');
    const playersContainer = document.getElementById('playersEditContainer');
    
    if (!nameInput || !sloganInput || !playersContainer) return;
    
    const teamData = {
        name: nameInput.value.trim(),
        slogan: sloganInput.value.trim(),
        players: []
    };
    
    const playerRows = playersContainer.querySelectorAll('.player-edit-row');
    playerRows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 3) {
            teamData.players.push({
                name: inputs[0].value.trim(),
                role: inputs[1].value.trim(),
                mmr: parseInt(inputs[2].value) || 0
            });
        }
    });
    
    try {
        const validation = ValidationSystem.validateTeam(teamData);
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }
        
        await teamsManager.updateTeam(teamId, teamData);
        ErrorHandler.showError('Команда успешно обновлена');
        closeEditTeamModal();
        
    } catch (error) {
        ErrorHandler.showError('Ошибка сохранения: ' + error.message);
    }
}

function closeEditTeamModal() {
    const modal = document.getElementById('editTeamModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    const appState = AppState.getInstance();
    appState.setCurrentEditingTeamId(null);
}

async function deleteTeam(teamId) {
    if (!SecurityManager.requireAuth()) return;
    
    if (!confirm('Вы уверены, что хотите удалить эту команду?')) {
        return;
    }
    
    const appState = AppState.getInstance();
    const teamsManager = appState.getTeamsManager();
    if (!teamsManager) return;
    
    try {
        await teamsManager.deleteTeam(teamId);
        ErrorHandler.showError('Команда удалена');
        updateAdminTeamsList();
    } catch (error) {
        ErrorHandler.showError('Ошибка удаления: ' + error.message);
    }
}

function loadBracketSettings() {
    const appState = AppState.getInstance();
    const bracketManager = appState.getBracketManager();
    if (!bracketManager) return;
    
    const bracketData = bracketManager.bracket;
    displayBracket(bracketData);
}

function loadScheduleSettings() {
    const appState = AppState.getInstance();
    const scheduleManager = appState.getScheduleManager();
    if (!scheduleManager) return;
    
    const scheduleData = scheduleManager.schedule;
    // Реализация загрузки настроек расписания
}

// === ЗАПУСК ПРИЛОЖЕНИЯ ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Запуск Illusive Cup Tournament App...');
    AppInitializer.initialize().catch(error => {
        console.error('💥 Критическая ошибка запуска:', error);
    });
});