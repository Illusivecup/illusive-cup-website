// js/utils/state-manager.js
class StateManager {
    constructor(namespace = 'app') {
        this.namespace = namespace;
        this.state = new Map();
        this.subscribers = new Map();
        this.history = [];
        this.maxHistorySize = 100;
        this.transaction = null;
    }

    set(key, value, description = '') {
        const oldValue = this.get(key);
        
        // Сохраняем предыдущее состояние для отката
        this.addToHistory(key, oldValue, value, description);
        
        // Устанавливаем новое значение
        this.state.set(key, value);
        
        // Уведомляем подписчиков
        this.notifySubscribers(key, value, oldValue);
        
        return value;
    }

    get(key, defaultValue = null) {
        return this.state.has(key) ? this.state.get(key) : defaultValue;
    }

    subscribe(key, callback, options = {}) {
        const { immediate = false } = options;
        
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        
        const subscriber = {
            callback,
            options
        };
        
        this.subscribers.get(key).add(subscriber);
        
        // Немедленный вызов при подписке, если требуется
        if (immediate) {
            try {
                callback(this.get(key), undefined);
            } catch (error) {
                console.error(`Error in immediate subscriber for ${key}:`, error);
            }
        }
        
        // Возвращаем функцию отписки
        return () => this.unsubscribe(key, subscriber);
    }

    unsubscribe(key, subscriber) {
        if (this.subscribers.has(key)) {
            this.subscribers.get(key).delete(subscriber);
            
            // Очищаем пустые наборы подписчиков
            if (this.subscribers.get(key).size === 0) {
                this.subscribers.delete(key);
            }
        }
    }

    notifySubscribers(key, newValue, oldValue) {
        if (this.subscribers.has(key)) {
            this.subscribers.get(key).forEach(({ callback, options }) => {
                try {
                    // Дебаунсинг для подписчиков
                    if (options.debounce) {
                        setTimeout(() => {
                            callback(newValue, oldValue);
                        }, options.debounce);
                    } else {
                        callback(newValue, oldValue);
                    }
                } catch (error) {
                    console.error(`Error in subscriber for ${key}:`, error);
                }
            });
        }
    }

    addToHistory(key, oldValue, newValue, description) {
        this.history.push({
            timestamp: Date.now(),
            key,
            oldValue,
            newValue,
            description,
            transaction: this.transaction
        });
        
        // Ограничиваем размер истории
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }

    beginTransaction(description = '') {
        this.transaction = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            description,
            timestamp: Date.now(),
            changes: []
        };
    }

    commitTransaction() {
        if (this.transaction) {
            this.transaction.committed = true;
            this.history.push({
                ...this.transaction,
                type: 'transaction'
            });
            this.transaction = null;
        }
    }

    rollbackTransaction() {
        if (this.transaction) {
            // Откатываем изменения транзакции
            this.transaction.changes.reverse().forEach(change => {
                this.state.set(change.key, change.oldValue);
                this.notifySubscribers(change.key, change.oldValue, change.newValue);
            });
            
            this.transaction = null;
        }
    }

    undo() {
        if (this.history.length === 0) return false;
        
        const lastChange = this.history.pop();
        if (lastChange.type === 'transaction') {
            // Сложная логика отката транзакции
            console.warn('Transaction rollback not fully implemented');
            return false;
        } else {
            this.state.set(lastChange.key, lastChange.oldValue);
            this.notifySubscribers(lastChange.key, lastChange.oldValue, lastChange.newValue);
            return true;
        }
    }

    getHistory() {
        return [...this.history];
    }

    clearHistory() {
        this.history = [];
    }

    persist(key) {
        // Сохранение в localStorage
        try {
            const value = this.get(key);
            localStorage.setItem(`${this.namespace}_${key}`, JSON.stringify({
                value,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error(`Failed to persist state for ${key}:`, error);
        }
    }

    restore(key, defaultValue = null) {
        // Восстановление из localStorage
        try {
            const stored = localStorage.getItem(`${this.namespace}_${key}`);
            if (stored) {
                const { value, timestamp } = JSON.parse(stored);
                this.set(key, value, `restored from storage (${new Date(timestamp).toISOString()})`);
                return value;
            }
        } catch (error) {
            console.error(`Failed to restore state for ${key}:`, error);
        }
        
        return defaultValue;
    }

    snapshot() {
        return {
            state: Object.fromEntries(this.state),
            subscribers: Array.from(this.subscribers.keys()).reduce((acc, key) => {
                acc[key] = this.subscribers.get(key).size;
                return acc;
            }, {}),
            history: this.history.length
        };
    }

    clear() {
        this.state.clear();
        this.subscribers.clear();
        this.history = [];
        this.transaction = null;
    }

    // Сериализация для отладки
    serialize() {
        return {
            namespace: this.namespace,
            stateSize: this.state.size,
            subscribers: this.subscribers.size,
            history: this.history.length,
            transaction: this.transaction
        };
    }
}

// Глобальный экземпляр State Manager
const AppState = new StateManager('illusive_cup');

// js/utils/error-handler.js
class ErrorHandler {
    static init() {
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
        
        // Мониторинг ошибок ресурсов
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.initiatorType === 'script' || entry.initiatorType === 'css') {
                        console.warn('Resource loading error:', entry);
                    }
                });
            });
            observer.observe({ entryTypes: ['resource'] });
        }
    }

    static handleGlobalError(event) {
        const error = event.error || new Error(event.message);
        
        console.error('🚨 Global Error:', {
            message: error.message,
            stack: error.stack,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });

        this.showNotification({
            type: 'error',
            title: 'Произошла непредвиденная ошибка',
            message: error.message,
            duration: 5000
        });

        this.logError(error, 'global');
    }

    static handleUnhandledRejection(event) {
        const reason = event.reason;
        
        console.error('🚨 Unhandled Promise Rejection:', reason);

        this.showNotification({
            type: 'warning',
            title: 'Ошибка загрузки данных',
            message: reason?.message || 'Неизвестная ошибка',
            duration: 5000
        });

        this.logError(reason, 'promise');
    }

    static showNotification(options) {
        this.removeExistingNotifications();

        const {
            type = 'info',
            title,
            message = '',
            duration = 0,
            actions = []
        } = options;

        const notification = document.createElement('div');
        notification.className = `notification notification--${type} fade-in`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');

        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon" aria-hidden="true">${this.getIcon(type)}</span>
                <div class="notification-text">
                    <div class="notification-message">${title}</div>
                    ${message ? `<div class="notification-details">${message}</div>` : ''}
                </div>
                <div class="notification-actions">
                    ${actions.map(action => `
                        <button class="btn btn--sm btn--outline" 
                                data-action="${action.id}">
                            ${action.label}
                        </button>
                    `).join('')}
                    <button class="notification-close" aria-label="Закрыть уведомление">
                        ×
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Обработчики действий
        notification.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const actionId = e.target.dataset.action;
                const action = actions.find(a => a.id === actionId);
                if (action?.handler) {
                    action.handler();
                }
                notification.remove();
            });
        });

        // Закрытие
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Авто-закрытие
        if (duration > 0 && type !== 'error') {
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
            }, duration);
        }

        return notification;
    }

    static getIcon(type) {
        const icons = {
            error: '⚠️',
            warning: '🚨',
            success: '✅',
            info: 'ℹ️',
            loading: '⏳'
        };
        return icons[type] || 'ℹ️';
    }

    static removeExistingNotifications() {
        document.querySelectorAll('.notification:not(.notification--persistent)').forEach(notification => {
            notification.remove();
        });
    }

    static logError(error, category = 'unknown') {
        const errorData = {
            category,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            platform: navigator.platform,
            language: navigator.language
        };

        // В продакшене здесь была бы отправка в сервис логирования
        if (true) { // DEBUG
            console.log('📝 Error logged:', errorData);
        }

        // Сохраняем в sessionStorage для отладки
        try {
            const errors = JSON.parse(sessionStorage.getItem('error_log') || '[]');
            errors.push(errorData);
            sessionStorage.setItem('error_log', JSON.stringify(errors.slice(-10))); // Последние 10 ошибок
        } catch (e) {
            console.warn('Could not save error to storage:', e);
        }
    }

    static showFallbackUI(error) {
        const fallbackHTML = `
            <div class="fallback-ui">
                <div class="fallback-content">
                    <h1>😔 Временные неполадки</h1>
                    <p>Приложение временно недоступно. Пожалуйста, попробуйте обновить страницу.</p>
                    
                    ${error ? `
                        <details class="error-details">
                            <summary>Техническая информация</summary>
                            <pre>${error.message}</pre>
                        </details>
                    ` : ''}
                    
                    <div class="fallback-actions">
                        <button onclick="window.location.reload()" class="btn btn--primary">
                            🔄 Обновить страницу
                        </button>
                        <button onclick="localStorage.clear(); sessionStorage.clear(); location.reload()" 
                                class="btn btn--outline">
                            🧹 Очистить кэш и перезагрузить
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.innerHTML = fallbackHTML;
    }

    static async handleOfflineMode() {
        // Реализация оффлайн режима
        const cachedData = await this.getCachedData();
        
        return {
            teams: cachedData.teams || [],
            schedule: cachedData.schedule || [],
            bracket: cachedData.bracket || {},
            isOffline: true
        };
    }

    static async getCachedData() {
        try {
            const cached = localStorage.getItem('illusive_cup_fallback_data');
            return cached ? JSON.parse(cached) : {};
        } catch {
            return {};
        }
    }

    static async cacheCriticalData(data) {
        try {
            localStorage.setItem(
                'illusive_cup_fallback_data',
                JSON.stringify({
                    ...data,
                    cachedAt: Date.now()
                })
            );
        } catch (e) {
            console.warn('Could not cache data:', e);
        }
    }
}

// js/utils/data-validator.js
class DataValidator {
    static validateTeam(teamData) {
        const errors = [];
        const warnings = [];
        
        if (!teamData) {
            errors.push('Данные команды обязательны');
            return { isValid: false, errors, warnings };
        }

        // Валидация названия
        if (!teamData.name || teamData.name.trim().length === 0) {
            errors.push('Название команды обязательно');
        } else {
            const name = teamData.name.trim();
            if (name.length < 2) {
                errors.push(`Название команды должно содержать минимум 2 символа`);
            }
            if (name.length > 50) {
                errors.push(`Название команды не должно превышать 50 символов`);
            }
            if (!/^[\p{L}\p{N}\s\-_]+$/u.test(name)) {
                errors.push('Название команды содержит недопустимые символы');
            }
        }

        // Валидация состава
        if (!Array.isArray(teamData.players)) {
            errors.push('Команда должна иметь список игроков');
        } else {
            if (teamData.players.length < 1) {
                errors.push(`Команда должна иметь минимум 1 игрока`);
            }
            if (teamData.players.length > 10) {
                errors.push(`Команда не может иметь больше 10 игроков`);
            }

            // Валидация каждого игрока
            teamData.players.forEach((player, index) => {
                const playerErrors = this.validatePlayer(player, index);
                errors.push(...playerErrors);
            });

            // Проверка уникальности игроков
            const playerNames = teamData.players.map(p => p.name?.toLowerCase().trim()).filter(Boolean);
            const uniqueNames = new Set(playerNames);
            if (uniqueNames.size !== playerNames.length) {
                warnings.push('Обнаружены игроки с одинаковыми именами');
            }

            // Проверка ролей
            const roles = teamData.players.map(p => p.role?.toLowerCase().trim()).filter(Boolean);
            const roleCounts = roles.reduce((acc, role) => {
                acc[role] = (acc[role] || 0) + 1;
                return acc;
            }, {});
            
            Object.entries(roleCounts).forEach(([role, count]) => {
                if (count > 1) {
                    warnings.push(`Роль "${role}" назначена ${count} игрокам`);
                }
            });
        }

        // Валидация MMR команды
        if (teamData.mmr !== undefined && teamData.mmr !== null) {
            const mmrErrors = this.validateMMR(teamData.mmr, 'Команда');
            errors.push(...mmrErrors);
        }

        // Предупреждения
        if (!teamData.slogan || teamData.slogan.trim().length === 0) {
            warnings.push('Рекомендуется добавить слоган команды');
        }

        if (teamData.players && teamData.players.length < 5) {
            warnings.push('Рекомендуется иметь 5 игроков для полноценной команды');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    static validatePlayer(player, index) {
        const errors = [];
        const playerPrefix = `Игрок ${index + 1}:`;
        
        if (!player) {
            errors.push(`${playerPrefix} данные игрока обязательны`);
            return errors;
        }

        // Валидация имени
        if (!player.name || player.name.trim().length === 0) {
            errors.push(`${playerPrefix} имя обязательно`);
        } else {
            const name = player.name.trim();
            if (name.length < 1) {
                errors.push(`${playerPrefix} имя должно содержать минимум 1 символ`);
            }
            if (name.length > 30) {
                errors.push(`${playerPrefix} имя не должно превышать 30 символов`);
            }
            if (!/^[\p{L}\p{N}\s\-_]+$/u.test(name)) {
                errors.push(`${playerPrefix} имя содержит недопустимые символы`);
            }
        }

        // Валидация роли
        if (!player.role || player.role.trim().length === 0) {
            errors.push(`${playerPrefix} роль обязательна`);
        } else {
            const role = player.role.trim();
            if (role.length > 20) {
                errors.push(`${playerPrefix} роль не должна превышать 20 символов`);
            }
        }

        // Валидация MMR
        if (player.mmr !== undefined && player.mmr !== null) {
            const mmrErrors = this.validateMMR(player.mmr, playerPrefix);
            errors.push(...mmrErrors);
        }

        return errors;
    }
    
    static validateMMR(mmr, prefix = '') {
        const errors = [];
        
        if (typeof mmr !== 'number' || isNaN(mmr)) {
            errors.push(`${prefix} MMR должен быть числом`);
            return errors;
        }
        
        if (!Number.isInteger(mmr)) {
            errors.push(`${prefix} MMR должен быть целым числом`);
        }
        
        if (mmr < 0) {
            errors.push(`${prefix} MMR не может быть отрицательным`);
        }
        
        if (mmr > 10000) {
            errors.push(`${prefix} MMR не может превышать 10000`);
        }
        
        return errors;
    }
    
    static validateBracketMatch(match) {
        const errors = [];
        const warnings = [];
        
        if (!match) {
            errors.push('Данные матча обязательны');
            return { isValid: false, errors, warnings };
        }

        // Валидация команд
        if (match.team1 && match.team2 && match.team1 === match.team2) {
            errors.push('Команда не может играть против себя');
        }

        if ((match.team1 && !match.team2) || (!match.team1 && match.team2)) {
            warnings.push('Одна из команд не выбрана');
        }

        // Валидация счета
        if (match.score1 !== null && match.score2 !== null) {
            if (typeof match.score1 !== 'number' || typeof match.score2 !== 'number') {
                errors.push('Счет должен быть числом');
            } else {
                if (match.score1 < 0 || match.score2 < 0) {
                    errors.push('Счет не может быть отрицательным');
                }
                
                if (!Number.isInteger(match.score1) || !Number.isInteger(match.score2)) {
                    errors.push('Счет должен быть целым числом');
                }
                
                if (match.score1 === match.score2 && match.score1 > 0) {
                    warnings.push('Ничейный результат в матче');
                }
            }
        }

        // Валидация статуса завершения
        if (match.completed && (!match.score1 !== null || !match.score2 !== null)) {
            warnings.push('Завершенный матч должен иметь счет');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    static validateSchedule(scheduleItem) {
        const errors = [];
        const warnings = [];
        
        if (!scheduleItem) {
            errors.push('Данные расписания обязательны');
            return { isValid: false, errors, warnings };
        }

        // Валидация времени
        if (!scheduleItem.time) {
            errors.push('Время матча обязательно');
        } else {
            if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(scheduleItem.time)) {
                errors.push('Неверный формат времени (используйте HH:MM)');
            }
        }

        // Валидация стадии
        if (!scheduleItem.stage) {
            errors.push('Стадия турнира обязательна');
        } else {
            const validStages = ['Групповой этап', 'Плей-офф', 'Четвертьфинал', 'Полуфинал', 'Финал'];
            if (!validStages.includes(scheduleItem.stage)) {
                warnings.push(`Неизвестная стадия турнира: ${scheduleItem.stage}`);
            }
        }

        // Валидация команд/названия матча
        if (!scheduleItem.match && (!scheduleItem.team1 || !scheduleItem.team2)) {
            errors.push('Необходимо указать команды или название матча');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    static validateTournamentSettings(settings) {
        const errors = [];
        const warnings = [];
        
        if (!settings) {
            errors.push('Настройки турнира обязательны');
            return { isValid: false, errors, warnings };
        }

        // Валидация формата
        if (!settings.format) {
            errors.push('Формат турнира обязателен');
        } else {
            const validFormats = ['round_robin', 'single_elimination', 'double_elimination'];
            if (!validFormats.includes(settings.format)) {
                errors.push('Неверный формат турнира');
            }
        }

        // Валидация количества групп
        if (settings.groups === undefined || settings.groups === null) {
            errors.push('Количество групп обязательно');
        } else {
            if (!Number.isInteger(settings.groups) || settings.groups < 1) {
                errors.push('Количество групп должно быть положительным целым числом');
            }
            if (settings.groups > 8) {
                warnings.push('Рекомендуется не более 8 групп');
            }
        }

        // Валидация команд для плей-офф
        if (settings.advancingTeams === undefined || settings.advancingTeams === null) {
            errors.push('Количество команд для плей-офф обязательно');
        } else {
            if (!Number.isInteger(settings.advancingTeams) || settings.advancingTeams < 1) {
                errors.push('Количество команд для плей-офф должно быть положительным целым числом');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    static sanitizeInput(input) {
        if (input === null || input === undefined) return '';
        if (typeof input !== 'string') return String(input).trim();
        
        return input
            .trim()
            .replace(/[<>&"']/g, (char) => {
                const entities = {
                    '<': '&lt;',
                    '>': '&gt;', 
                    '&': '&amp;',
                    '"': '&quot;',
                    "'": '&#x27;'
                };
                return entities[char] || char;
            });
    }

    static sanitizeTeamData(teamData) {
        if (!teamData) return null;
        
        const sanitized = { ...teamData };
        
        // Санитизация строковых полей
        if (sanitized.name) sanitized.name = this.sanitizeInput(sanitized.name);
        if (sanitized.slogan) sanitized.slogan = this.sanitizeInput(sanitized.slogan);
        
        // Санитизация игроков
        if (Array.isArray(sanitized.players)) {
            sanitized.players = sanitized.players.map(player => ({
                ...player,
                name: this.sanitizeInput(player.name),
                role: this.sanitizeInput(player.role)
            })).filter(player => 
                player.name && player.role && 
                player.name.length >= 1 &&
                player.name.length <= 30
            );
        }
        
        // Расчет MMR
        if (Array.isArray(sanitized.players) && sanitized.players.length > 0) {
            const totalMMR = sanitized.players.reduce((sum, player) => {
                return sum + (Number.isInteger(player.mmr) ? player.mmr : 0);
            }, 0);
            sanitized.mmr = Math.round(totalMMR / sanitized.players.length);
        }
        
        return sanitized;
    }

    static generateTeamId() {
        return 'team_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    static normalizeTeamStructure(teamData, teamId = null) {
        return {
            id: teamId || this.generateTeamId(),
            name: teamData.name || 'Новая команда',
            slogan: teamData.slogan || '',
            players: Array.isArray(teamData.players) ? teamData.players : [],
            mmr: teamData.mmr || 0,
            createdAt: teamData.createdAt || Date.now(),
            updatedAt: Date.now()
        };
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// js/utils/performance-optimizer.js
class PerformanceOptimizer {
    static debounceTimers = new Map();
    static throttleFlags = new Map();
    static animationFrames = new Map();
    static observers = new Map();
    static metrics = new Map();

    static init() {
        this.setupPerformanceMonitoring();
        this.setupCleanupInterval();
        this.setupMemoryMonitoring();
    }

    static debounce(key, callback, delay = 300) {
        this.clearDebounce(key);
        
        const timer = setTimeout(() => {
            this.trackMetric(`debounce_${key}`, Date.now());
            callback();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timer);
    }

    static throttle(key, callback, delay = 16) {
        if (this.throttleFlags.get(key)) return;
        
        this.trackMetric(`throttle_${key}`, Date.now());
        callback();
        this.throttleFlags.set(key, true);
        
        setTimeout(() => {
            this.throttleFlags.delete(key);
        }, delay);
    }

    static animationThrottle(key, callback) {
        if (this.animationFrames.get(key)) {
            cancelAnimationFrame(this.animationFrames.get(key));
        }
        
        const frameId = requestAnimationFrame(() => {
            callback();
            this.animationFrames.delete(key);
        });
        
        this.animationFrames.set(key, frameId);
    }

    static async idleCallback(callback, timeout) {
        if ('requestIdleCallback' in window) {
            return new Promise((resolve) => {
                window.requestIdleCallback(() => {
                    const result = callback();
                    resolve(result);
                }, { timeout });
            });
        } else {
            // Fallback для браузеров без requestIdleCallback
            return new Promise((resolve) => {
                setTimeout(() => {
                    const result = callback();
                    resolve(result);
                }, 0);
            });
        }
    }

    static observeElement(element, callback, options = {}) {
        if (!element || !('IntersectionObserver' in window)) {
            callback({ isIntersecting: true });
            return () => {};
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.trackMetric('lazy_load', Date.now());
                    callback(entry);
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.1,
            ...options
        });

        observer.observe(element);
        this.observers.set(element, observer);
        
        return () => {
            observer.unobserve(element);
            this.observers.delete(element);
        };
    }

    static lazyLoadImage(imgElement, src, srcset = null) {
        if (!imgElement) return;

        const cleanup = this.observeElement(imgElement, () => {
            imgElement.src = src;
            if (srcset) imgElement.srcset = srcset;
            imgElement.classList.remove('lazy');
            cleanup();
        });

        imgElement.classList.add('lazy');
    }

    static preloadCriticalResources() {
        const resources = [
            // Критически важные ресурсы для предзагрузки
            '/style.css',
            'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap'
        ];

        resources.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = url;
            link.as = this.getResourceType(url);
            document.head.appendChild(link);
        });
    }

    static getResourceType(url) {
        const types = {
            '.css': 'style',
            '.js': 'script',
            '.woff2': 'font',
            '.woff': 'font',
            '.ttf': 'font',
            '.jpg': 'image',
            '.jpeg': 'image',
            '.png': 'image',
            '.webp': 'image',
            '.gif': 'image',
            '.svg': 'image'
        };

        const extension = Object.keys(types).find(ext => url.includes(ext));
        return types[extension] || 'fetch';
    }

    static setupPerformanceMonitoring() {
        // Мониторинг метрик производительности
        if ('performance' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    this.trackMetric(entry.name, entry);
                });
            });

            try {
                observer.observe({ 
                    entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint', 'layout-shift'] 
                });
            } catch (e) {
                console.warn('PerformanceObserver not fully supported:', e);
            }

            // Отслеживание времени загрузки
            window.addEventListener('load', () => {
                this.trackMetric('page_loaded', Date.now());
            });
        }
    }

    static setupMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                this.trackMetric('memory_usage', {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit
                });
            }, 30000);
        }
    }

    static setupCleanupInterval() {
        setInterval(() => {
            this.cleanup();
        }, 60000); // Каждую минуту
    }

    static cleanup() {
        const now = Date.now();

        // Очистка старых таймеров
        for (const [key, timer] of this.debounceTimers.entries()) {
            if (timer._idleStart && (now - timer._idleStart > 300000)) {
                clearTimeout(timer);
                this.debounceTimers.delete(key);
            }
        }

        // Очистка анимаций
        for (const [key, frameId] of this.animationFrames.entries()) {
            cancelAnimationFrame(frameId);
            this.animationFrames.delete(key);
        }

        // Очистка наблюдателей для удаленных элементов
        for (const [element, observer] of this.observers.entries()) {
            if (!document.contains(element)) {
                observer.disconnect();
                this.observers.delete(element);
            }
        }

        // Очистка старых метрик
        for (const [key, metric] of this.metrics.entries()) {
            if (now - metric.timestamp > 3600000) { // 1 час
                this.metrics.delete(key);
            }
        }
    }

    static trackMetric(name, value) {
        this.metrics.set(name, {
            value,
            timestamp: Date.now()
        });
    }

    static getMetrics() {
        return Array.from(this.metrics.entries()).reduce((acc, [key, metric]) => {
            acc[key] = metric.value;
            return acc;
        }, {});
    }

    static measurePerformance(name, callback) {
        const startMark = `${name}_start`;
        const endMark = `${name}_end`;
        
        performance.mark(startMark);
        
        const result = callback();
        
        performance.mark(endMark);
        performance.measure(name, startMark, endMark);
        
        const measure = performance.getEntriesByName(name)[0];
        this.trackMetric(name, measure.duration);
        
        return {
            result,
            duration: measure.duration
        };
    }

    static async preloadData(dataPromises) {
        // Предзагрузка данных с приоритетами
        const critical = [];
        const normal = [];
        
        dataPromises.forEach(promise => {
            if (promise.priority === 'high') {
                critical.push(promise);
            } else {
                normal.push(promise);
            }
        });

        // Сначала загружаем критические данные
        await Promise.all(critical.map(p => p.promise));
        
        // Затем остальные в idle time
        if (normal.length > 0) {
            this.idleCallback(() => {
                Promise.allSettled(normal.map(p => p.promise));
            }, 1000);
        }
    }

    static optimizeImages(images) {
        // Автоматическая оптимизация изображений
        images.forEach(img => {
            if (!img.getAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
            
            if (!img.getAttribute('decoding')) {
                img.setAttribute('decoding', 'async');
            }
        });
    }

    static createVirtualList(container, items, renderItem, options = {}) {
        // Виртуализация для больших списков
        const {
            itemHeight = 50,
            overscan = 5,
            containerHeight = 400
        } = options;

        let visibleStart = 0;
        let visibleEnd = Math.ceil(containerHeight / itemHeight) + overscan;

        const renderVisibleItems = () => {
            const visibleItems = items.slice(visibleStart, visibleEnd);
            container.innerHTML = '';
            visibleItems.forEach((item, index) => {
                const element = renderItem(item, visibleStart + index);
                container.appendChild(element);
            });
        };

        const handleScroll = this.throttle('virtual_scroll', () => {
            const scrollTop = container.scrollTop;
            visibleStart = Math.floor(scrollTop / itemHeight);
            visibleEnd = visibleStart + Math.ceil(containerHeight / itemHeight) + overscan;
            renderVisibleItems();
        });

        container.addEventListener('scroll', handleScroll);
        renderVisibleItems();

        return {
            updateItems: (newItems) => {
                items = newItems;
                renderVisibleItems();
            },
            destroy: () => {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }

    static clearDebounce(key) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
            this.debounceTimers.delete(key);
        }
    }
}

// js/services/firebase-service.js
class FirebaseService {
    constructor() {
        this.app = null;
        this.database = null;
        this.isConnected = false;
        this.connectionListeners = new Set();
        this.retryCount = 0;
        this.maxRetries = 3;
        this.init();
    }

    async init() {
        try {
            const firebaseConfig = {
                apiKey: "AIzaSyC4_RV_YpV2e921LgQq4VrU6w7Q9X8J5t8",
                authDomain: "illusive-cup.firebaseapp.com",
                databaseURL: "https://illusive-cup-default-rtdb.europe-west1.firebasedatabase.app",
                projectId: "illusive-cup",
                storageBucket: "illusive-cup.firebasestorage.app",
                messagingSenderId: "123456789",
                appId: "1:123456789:web:abcdef123456"
            };

            // Инициализация Firebase
            this.app = firebase.initializeApp(firebaseConfig);
            this.database = firebase.database();
            
            // Проверка подключения
            await this.testConnection();
            this.setConnectionStatus(true);
            
            console.log('✅ Firebase initialized successfully');
            
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            this.setConnectionStatus(false);
            this.handleConnectionError(error);
        }
    }

    async testConnection() {
        try {
            const testRef = this.database.ref('.info/connected');
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    testRef.off();
                    reject(new Error('Connection timeout'));
                }, 5000);

                testRef.on('value', (snapshot) => {
                    clearTimeout(timeout);
                    testRef.off();
                    
                    if (snapshot.val() === true) {
                        resolve(true);
                    } else {
                        reject(new Error('Not connected to Firebase'));
                    }
                });
            });
        } catch (error) {
            throw new Error(`Connection test failed: ${error.message}`);
        }
    }

    setConnectionStatus(connected) {
        this.isConnected = connected;
        this.connectionListeners.forEach(listener => {
            try {
                listener(connected);
            } catch (error) {
                console.error('Error in connection listener:', error);
            }
        });
    }

    onConnectionChange(callback) {
        this.connectionListeners.add(callback);
        
        // Немедленный вызов с текущим статусом
        callback(this.isConnected);
        
        // Возвращаем функцию для отписки
        return () => this.connectionListeners.delete(callback);
    }

    async get(path) {
        if (!this.isConnected) {
            throw new Error('Firebase not connected');
        }

        try {
            const snapshot = await this.database.ref(path).once('value');
            return snapshot.val();
        } catch (error) {
            console.error(`❌ Firebase get error for path ${path}:`, error);
            throw this.wrapError(error, `Failed to get data from ${path}`);
        }
    }

    async set(path, data) {
        if (!this.isConnected) {
            throw new Error('Firebase not connected');
        }

        try {
            // Валидация данных перед записью
            const validatedData = this.validateData(data);
            await this.database.ref(path).set(validatedData);
            
            console.log(`✅ Data written to ${path}`, validatedData);
            return validatedData;
        } catch (error) {
            console.error(`❌ Firebase set error for path ${path}:`, error);
            throw this.wrapError(error, `Failed to write data to ${path}`);
        }
    }

    async update(path, updates) {
        if (!this.isConnected) {
            throw new Error('Firebase not connected');
        }

        try {
            // Валидация обновлений
            const validatedUpdates = this.validateData(updates);
            await this.database.ref(path).update(validatedUpdates);
            
            console.log(`✅ Data updated at ${path}`, validatedUpdates);
            return validatedUpdates;
        } catch (error) {
            console.error(`❌ Firebase update error for path ${path}:`, error);
            throw this.wrapError(error, `Failed to update data at ${path}`);
        }
    }

    async push(path, data) {
        if (!this.isConnected) {
            throw new Error('Firebase not connected');
        }

        try {
            const validatedData = this.validateData(data);
            const ref = await this.database.ref(path).push(validatedData);
            
            console.log(`✅ Data pushed to ${path} with key ${ref.key}`);
            return {
                key: ref.key,
                ...validatedData
            };
        } catch (error) {
            console.error(`❌ Firebase push error for path ${path}:`, error);
            throw this.wrapError(error, `Failed to push data to ${path}`);
        }
    }

    async remove(path) {
        if (!this.isConnected) {
            throw new Error('Firebase not connected');
        }

        try {
            await this.database.ref(path).remove();
            console.log(`✅ Data removed from ${path}`);
        } catch (error) {
            console.error(`❌ Firebase remove error for path ${path}:`, error);
            throw this.wrapError(error, `Failed to remove data from ${path}`);
        }
    }

    subscribe(path, callback, options = {}) {
        if (!this.isConnected) {
            throw new Error('Firebase not connected');
        }

        const {
            eventType = 'value',
            transform = null,
            errorHandler = null
        } = options;

        try {
            const ref = this.database.ref(path);
            
            const handler = (snapshot) => {
                try {
                    let data = snapshot.val();
                    
                    if (transform && typeof transform === 'function') {
                        data = transform(data);
                    }
                    
                    callback(data, snapshot);
                } catch (error) {
                    console.error(`Error in Firebase subscription handler for ${path}:`, error);
                    if (errorHandler) {
                        errorHandler(error);
                    }
                }
            };

            ref.on(eventType, handler);
            
            console.log(`🔔 Subscribed to ${path} (${eventType})`);
            
            // Возвращаем функцию отписки
            return () => {
                ref.off(eventType, handler);
                console.log(`🔕 Unsubscribed from ${path} (${eventType})`);
            };
        } catch (error) {
            console.error(`❌ Firebase subscription error for path ${path}:`, error);
            throw this.wrapError(error, `Failed to subscribe to ${path}`);
        }
    }

    validateData(data) {
        if (data === undefined) {
            throw new Error('Cannot write undefined to Firebase');
        }

        // Удаляем undefined значения
        const cleanData = JSON.parse(JSON.stringify(data));
        
        // Дополнительная валидация
        this.validateDataStructure(cleanData);
        
        return cleanData;
    }

    validateDataStructure(data) {
        const seen = new Set();
        
        const validate = (obj, path = '') => {
            if (obj === null) return;
            
            if (typeof obj === 'object') {
                if (seen.has(obj)) {
                    throw new Error(`Circular reference detected at ${path}`);
                }
                seen.add(obj);
                
                Object.keys(obj).forEach(key => {
                    const value = obj[key];
                    const currentPath = path ? `${path}.${key}` : key;
                    
                    // Проверка ключа
                    if (key.includes('.') || key.includes('#') || key.includes('$') || key.includes('/') || key.includes('[') || key.includes(']')) {
                        throw new Error(`Invalid character in key: ${key} at path ${currentPath}`);
                    }
                    
                    // Проверка значения
                    if (value === undefined) {
                        throw new Error(`Undefined value at path ${currentPath}`);
                    }
                    
                    if (typeof value === 'object') {
                        validate(value, currentPath);
                    }
                });
                
                seen.delete(obj);
            }
        };
        
        validate(data);
    }

    wrapError(originalError, message) {
        const error = new Error(`${message}: ${originalError.message}`);
        error.originalError = originalError;
        error.code = originalError.code;
        error.name = 'FirebaseServiceError';
        return error;
    }

    handleConnectionError(error) {
        this.retryCount++;
        
        if (this.retryCount <= this.maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
            console.log(`🔄 Retrying Firebase connection in ${delay}ms (attempt ${this.retryCount})`);
            
            setTimeout(() => {
                this.init();
            }, delay);
        } else {
            console.error('❌ Max retry attempts reached for Firebase connection');
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка подключения',
                message: 'Не удалось подключиться к серверу данных',
                actions: [
                    {
                        id: 'retry',
                        label: 'Повторить',
                        handler: () => {
                            this.retryCount = 0;
                            this.init();
                        }
                    }
                ]
            });
        }
    }

    async backupData(data, backupName = 'manual_backup') {
        try {
            const timestamp = new Date().toISOString();
            const backupPath = `backups/${backupName}_${timestamp}`;
            
            await this.set(backupPath, {
                data,
                timestamp,
                version: '1.0',
                backupName
            });
            
            console.log(`✅ Backup created: ${backupPath}`);
            return backupPath;
        } catch (error) {
            console.error('❌ Backup failed:', error);
            throw error;
        }
    }

    async getBackups() {
        try {
            const backups = await this.get('backups');
            return backups ? Object.keys(backups).map(key => ({
                id: key,
                ...backups[key]
            })) : [];
        } catch (error) {
            console.error('❌ Failed to get backups:', error);
            return [];
        }
    }

    async restoreBackup(backupId) {
        try {
            const backup = await this.get(`backups/${backupId}`);
            if (!backup) {
                throw new Error(`Backup ${backupId} not found`);
            }
            
            console.log(`🔄 Restoring backup: ${backupId}`);
            return backup.data;
        } catch (error) {
            console.error(`❌ Restore failed for backup ${backupId}:`, error);
            throw error;
        }
    }

    async getServerTimestamp() {
        try {
            const ref = this.database.ref('.info/serverTimeOffset');
            const snapshot = await ref.once('value');
            const offset = snapshot.val();
            return Date.now() + offset;
        } catch (error) {
            console.warn('❌ Failed to get server timestamp, using local time:', error);
            return Date.now();
        }
    }

    disconnect() {
        if (this.database) {
            this.database.goOffline();
        }
        
        if (this.app) {
            this.app.delete();
        }
        
        this.setConnectionStatus(false);
        console.log('🔌 Firebase disconnected');
    }
}

// js/services/tournament-service.js
class TournamentService {
    constructor() {
        this.firebase = new FirebaseService();
        this.cache = new Map();
        this.subscriptions = new Map();
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            // Ждем инициализации Firebase
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Firebase initialization timeout'));
                }, 10000);

                const unsubscribe = this.firebase.onConnectionChange((connected) => {
                    if (connected) {
                        clearTimeout(timeout);
                        unsubscribe();
                        resolve();
                    }
                });
            });

            this.isInitialized = true;
            console.log('✅ TournamentService initialized');
            
            // Предзагрузка критических данных
            await this.preloadCriticalData();
            
        } catch (error) {
            console.error('❌ TournamentService initialization failed:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    async preloadCriticalData() {
        const criticalPaths = [
            'tournament/settings',
            'tournament/teams',
            'tournament/schedule'
        ];

        await Promise.allSettled(
            criticalPaths.map(path => this.get(path))
        );
    }

    async getTournamentSettings() {
        return this.get('tournament/settings');
    }

    async updateTournamentSettings(settings) {
        const validation = DataValidator.validateTournamentSettings(settings);
        if (!validation.isValid) {
            throw new Error(`Invalid tournament settings: ${validation.errors.join(', ')}`);
        }

        const updatedSettings = {
            ...settings,
            updatedAt: await this.firebase.getServerTimestamp()
        };

        return this.set('tournament/settings', updatedSettings);
    }

    async getTeams() {
        return this.get('tournament/teams');
    }

    async getTeam(teamId) {
        if (!teamId) throw new Error('Team ID is required');
        return this.get(`tournament/teams/${teamId}`);
    }

    async createTeam(teamData) {
        const sanitizedData = DataValidator.sanitizeTeamData(teamData);
        const validation = DataValidator.validateTeam(sanitizedData);
        
        if (!validation.isValid) {
            throw new Error(`Invalid team data: ${validation.errors.join(', ')}`);
        }

        const teamWithMeta = DataValidator.normalizeTeamStructure(sanitizedData);
        
        const result = await this.set(`tournament/teams/${teamWithMeta.id}`, teamWithMeta);
        
        // Кэшируем команду
        this.cache.set(`team_${teamWithMeta.id}`, teamWithMeta);
        
        return result;
    }

    async updateTeam(teamId, updates) {
        if (!teamId) throw new Error('Team ID is required');

        const existingTeam = await this.getTeam(teamId);
        if (!existingTeam) {
            throw new Error(`Team ${teamId} not found`);
        }

        const updatedTeam = {
            ...existingTeam,
            ...updates,
            updatedAt: await this.firebase.getServerTimestamp()
        };

        const sanitizedData = DataValidator.sanitizeTeamData(updatedTeam);
        const validation = DataValidator.validateTeam(sanitizedData);
        
        if (!validation.isValid) {
            throw new Error(`Invalid team data: ${validation.errors.join(', ')}`);
        }

        const result = await this.set(`tournament/teams/${teamId}`, sanitizedData);
        
        // Обновляем кэш
        this.cache.set(`team_${teamId}`, sanitizedData);
        
        return result;
    }

    async deleteTeam(teamId) {
        if (!teamId) throw new Error('Team ID is required');

        // Проверяем, есть ли команда в расписании
        const schedule = await this.getSchedule();
        const teamInSchedule = schedule.some(match => 
            match.team1 === teamId || match.team2 === teamId
        );

        if (teamInSchedule) {
            throw new Error('Невозможно удалить команду, которая участвует в матчах');
        }

        await this.remove(`tournament/teams/${teamId}`);
        
        // Очищаем кэш
        this.cache.delete(`team_${teamId}`);
        
        return true;
    }

    async getSchedule() {
        return this.get('tournament/schedule');
    }

    async updateSchedule(schedule) {
        if (!Array.isArray(schedule)) {
            throw new Error('Schedule must be an array');
        }

        // Валидация всех матчей
        for (const [index, match] of schedule.entries()) {
            const validation = DataValidator.validateSchedule(match);
            if (!validation.isValid) {
                throw new Error(`Invalid match at index ${index}: ${validation.errors.join(', ')}`);
            }
        }

        const updatedSchedule = schedule.map(match => ({
            ...match,
            updatedAt: await this.firebase.getServerTimestamp()
        }));

        return this.set('tournament/schedule', updatedSchedule);
    }

    async addMatch(matchData) {
        const validation = DataValidator.validateSchedule(matchData);
        if (!validation.isValid) {
            throw new Error(`Invalid match data: ${validation.errors.join(', ')}`);
        }

        const matchWithMeta = {
            ...matchData,
            id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            createdAt: await this.firebase.getServerTimestamp(),
            updatedAt: await this.firebase.getServerTimestamp()
        };

        const schedule = await this.getSchedule();
        const updatedSchedule = [...schedule, matchWithMeta];
        
        await this.updateSchedule(updatedSchedule);
        return matchWithMeta;
    }

    async updateMatch(matchId, updates) {
        const schedule = await this.getSchedule();
        const matchIndex = schedule.findIndex(match => match.id === matchId);
        
        if (matchIndex === -1) {
            throw new Error(`Match ${matchId} not found`);
        }

        const updatedMatch = {
            ...schedule[matchIndex],
            ...updates,
            updatedAt: await this.firebase.getServerTimestamp()
        };

        const validation = DataValidator.validateSchedule(updatedMatch);
        if (!validation.isValid) {
            throw new Error(`Invalid match data: ${validation.errors.join(', ')}`);
        }

        const updatedSchedule = [...schedule];
        updatedSchedule[matchIndex] = updatedMatch;
        
        await this.updateSchedule(updatedSchedule);
        return updatedMatch;
    }

    async deleteMatch(matchId) {
        const schedule = await this.getSchedule();
        const updatedSchedule = schedule.filter(match => match.id !== matchId);
        
        await this.updateSchedule(updatedSchedule);
        return true;
    }

    async getBracket() {
        return this.get('tournament/bracket');
    }

    async updateBracket(bracketData) {
        if (!bracketData || typeof bracketData !== 'object') {
            throw new Error('Bracket data must be an object');
        }

        const updatedBracket = {
            ...bracketData,
            updatedAt: await this.firebase.getServerTimestamp()
        };

        return this.set('tournament/bracket', updatedBracket);
    }

    async updateMatchResult(matchId, score1, score2, winner = null) {
        const match = await this.getMatch(matchId);
        if (!match) {
            throw new Error(`Match ${matchId} not found`);
        }

        const updates = {
            score1: parseInt(score1),
            score2: parseInt(score2),
            completed: true,
            completedAt: await this.firebase.getServerTimestamp()
        };

        if (winner) {
            updates.winner = winner;
        }

        const validation = DataValidator.validateBracketMatch({
            ...match,
            ...updates
        });

        if (!validation.isValid) {
            throw new Error(`Invalid match result: ${validation.errors.join(', ')}`);
        }

        return this.updateMatch(matchId, updates);
    }

    async getMatch(matchId) {
        const schedule = await this.getSchedule();
        return schedule.find(match => match.id === matchId) || null;
    }

    async getStandings() {
        const [teams, schedule, settings] = await Promise.all([
            this.getTeams(),
            this.getSchedule(),
            this.getTournamentSettings()
        ]);

        if (!teams || !schedule) {
            return [];
        }

        // Расчет статистики для каждой команды
        const standings = Object.values(teams).map(team => {
            const teamMatches = schedule.filter(match => 
                (match.team1 === team.id || match.team2 === team.id) && match.completed
            );

            let wins = 0;
            let losses = 0;
            let pointsFor = 0;
            let pointsAgainst = 0;

            teamMatches.forEach(match => {
                const isTeam1 = match.team1 === team.id;
                const teamScore = isTeam1 ? match.score1 : match.score2;
                const opponentScore = isTeam1 ? match.score2 : match.score1;

                pointsFor += teamScore || 0;
                pointsAgainst += opponentScore || 0;

                if (teamScore > opponentScore) {
                    wins++;
                } else if (teamScore < opponentScore) {
                    losses++;
                }
            });

            return {
                team: team,
                wins,
                losses,
                pointsFor,
                pointsAgainst,
                pointsDifference: pointsFor - pointsAgainst,
                winRate: teamMatches.length > 0 ? (wins / teamMatches.length) * 100 : 0
            };
        });

        // Сортировка по wins -> points difference -> points for
        return standings.sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.pointsDifference !== a.pointsDifference) return b.pointsDifference - a.pointsDifference;
            return b.pointsFor - a.pointsFor;
        });
    }

    async generateGroups() {
        const [teams, settings] = await Promise.all([
            this.getTeams(),
            this.getTournamentSettings()
        ]);

        if (!teams || Object.keys(teams).length === 0) {
            throw new Error('No teams available for group generation');
        }

        const teamCount = Object.keys(teams).length;
        const groupCount = settings?.groups || 4;
        const teamsPerGroup = Math.ceil(teamCount / groupCount);

        // Сортируем команды по MMR для балансировки
        const sortedTeams = Object.values(teams)
            .sort((a, b) => (b.mmr || 0) - (a.mmr || 0));

        // Распределение по группам методом "змейки"
        const groups = Array.from({ length: groupCount }, () => []);
        
        for (let i = 0; i < sortedTeams.length; i++) {
            const groupIndex = i % 2 === 0 
                ? i % groupCount 
                : groupCount - 1 - (i % groupCount);
            
            if (groups[groupIndex].length < teamsPerGroup) {
                groups[groupIndex].push(sortedTeams[i]);
            } else {
                // Если группа заполнена, ищем следующую доступную
                for (let j = 0; j < groupCount; j++) {
                    if (groups[j].length < teamsPerGroup) {
                        groups[j].push(sortedTeams[i]);
                        break;
                    }
                }
            }
        }

        return groups.map((groupTeams, index) => ({
            id: `group_${index + 1}`,
            name: `Группа ${index + 1}`,
            teams: groupTeams,
            matches: []
        }));
    }

    async generateSchedule(groups) {
        if (!Array.isArray(groups)) {
            throw new Error('Groups must be an array');
        }

        const schedule = [];
        let matchId = 1;

        // Генерация матчей для каждой группы
        groups.forEach(group => {
            const teams = group.teams;
            
            // Круговой турнир в группе
            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    schedule.push({
                        id: `group_match_${matchId++}`,
                        group: group.id,
                        team1: teams[i].id,
                        team2: teams[j].id,
                        stage: 'Групповой этап',
                        time: this.generateMatchTime(schedule.length),
                        completed: false,
                        score1: null,
                        score2: null
                    });
                }
            }
        });

        await this.updateSchedule(schedule);
        return schedule;
    }

    generateMatchTime(index) {
        // Генерация времени матча (каждые 30 минут начиная с 10:00)
        const startHour = 10;
        const totalMinutes = startHour * 60 + index * 30;
        const hours = Math.floor(totalMinutes / 60) % 24;
        const minutes = totalMinutes % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    subscribeToTeams(callback) {
        return this.subscribe('tournament/teams', callback, {
            transform: (data) => data ? Object.values(data) : []
        });
    }

    subscribeToSchedule(callback) {
        return this.subscribe('tournament/schedule', callback, {
            transform: (data) => data || []
        });
    }

    subscribeToStandings(callback) {
        // Сложная подписка, которая вычисляет таблицу при изменении данных
        let unsubscribeTeams = null;
        let unsubscribeSchedule = null;

        const updateStandings = async () => {
            try {
                const standings = await this.getStandings();
                callback(standings);
            } catch (error) {
                console.error('Error updating standings:', error);
                callback([]);
            }
        };

        unsubscribeTeams = this.subscribeToTeams(updateStandings);
        unsubscribeSchedule = this.subscribeToSchedule(updateStandings);

        // Первоначальный вызов
        updateStandings();

        return () => {
            if (unsubscribeTeams) unsubscribeTeams();
            if (unsubscribeSchedule) unsubscribeSchedule();
        };
    }

    // Базовые методы для работы с Firebase
    async get(path) {
        const cacheKey = `get_${path}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const data = await this.firebase.get(path);
            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error(`Error getting ${path}:`, error);
            throw error;
        }
    }

    async set(path, data) {
        const result = await this.firebase.set(path, data);
        
        // Очищаем кэш для этого пути
        this.clearCacheForPath(path);
        
        return result;
    }

    async remove(path) {
        const result = await this.firebase.remove(path);
        
        // Очищаем кэш для этого пути
        this.clearCacheForPath(path);
        
        return result;
    }

    subscribe(path, callback, options = {}) {
        return this.firebase.subscribe(path, callback, options);
    }

    clearCacheForPath(path) {
        for (const [key] of this.cache.entries()) {
            if (key.startsWith(`get_${path}`) || key.includes(path)) {
                this.cache.delete(key);
            }
        }
    }

    clearCache() {
        this.cache.clear();
    }

    async exportData() {
        const [settings, teams, schedule, bracket] = await Promise.all([
            this.getTournamentSettings(),
            this.getTeams(),
            this.getSchedule(),
            this.getBracket()
        ]);

        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            tournament: {
                settings,
                teams,
                schedule,
                bracket
            }
        };
    }

    async importData(data) {
        if (!data || !data.tournament) {
            throw new Error('Invalid import data format');
        }

        const { settings, teams, schedule, bracket } = data.tournament;

        // Валидация импортируемых данных
        if (settings) {
            const validation = DataValidator.validateTournamentSettings(settings);
            if (!validation.isValid) {
                throw new Error(`Invalid settings in import data: ${validation.errors.join(', ')}`);
            }
        }

        if (teams) {
            for (const teamId in teams) {
                const validation = DataValidator.validateTeam(teams[teamId]);
                if (!validation.isValid) {
                    throw new Error(`Invalid team ${teamId} in import data: ${validation.errors.join(', ')}`);
                }
            }
        }

        // Записываем данные
        const writePromises = [];
        
        if (settings) writePromises.push(this.updateTournamentSettings(settings));
        if (teams) writePromises.push(this.set('tournament/teams', teams));
        if (schedule) writePromises.push(this.updateSchedule(schedule));
        if (bracket) writePromises.push(this.updateBracket(bracket));

        await Promise.all(writePromises);
        
        // Очищаем весь кэш
        this.clearCache();
        
        return true;
    }
}

// js/components/team-manager.js
class TeamManager {
    constructor(containerId, tournamentService) {
        this.container = document.getElementById(containerId);
        this.tournamentService = tournamentService;
        this.teams = [];
        this.filteredTeams = [];
        this.currentSort = { field: 'name', direction: 'asc' };
        this.currentFilter = '';
        this.selectedTeam = null;
        this.isEditing = false;
        
        this.init();
    }

    async init() {
        if (!this.container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }

        if (!this.tournamentService) {
            throw new Error('TournamentService is required');
        }

        await this.loadTeams();
        this.render();
        this.setupEventListeners();
        
        // Подписка на обновления команд
        this.unsubscribeTeams = this.tournamentService.subscribeToTeams((teams) => {
            this.teams = teams || [];
            this.applyFiltersAndSort();
            this.renderTeamList();
        });
    }

    async loadTeams() {
        try {
            this.teams = await this.tournamentService.getTeams() || [];
            this.applyFiltersAndSort();
        } catch (error) {
            console.error('Error loading teams:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка загрузки команд',
                message: error.message
            });
            this.teams = [];
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="team-manager">
                <div class="team-manager-header">
                    <h2>Управление командами</h2>
                    <div class="team-manager-controls">
                        <div class="search-box">
                            <input type="text" 
                                   id="teamSearch" 
                                   placeholder="Поиск команд..." 
                                   class="search-input">
                        </div>
                        <button class="btn btn--primary" id="addTeamBtn">
                            ➕ Добавить команду
                        </button>
                    </div>
                </div>

                <div class="team-manager-content">
                    <div class="team-list-container">
                        <div class="team-list-header">
                            <span class="team-count">Команд: ${this.filteredTeams.length}</span>
                            <div class="sort-controls">
                                <select id="teamSortSelect" class="select">
                                    <option value="name">По названию</option>
                                    <option value="mmr">По MMR</option>
                                    <option value="players">По количеству игроков</option>
                                </select>
                            </div>
                        </div>
                        <div class="team-list" id="teamList">
                            ${this.renderTeamList()}
                        </div>
                    </div>

                    <div class="team-details" id="teamDetails">
                        ${this.renderTeamDetails()}
                    </div>
                </div>

                ${this.renderTeamModal()}
            </div>
        `;
    }

    renderTeamList() {
        if (this.filteredTeams.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">🏆</div>
                    <h3>Команды не найдены</h3>
                    <p>${this.currentFilter ? 'Попробуйте изменить параметры поиска' : 'Добавьте первую команду для начала работы'}</p>
                </div>
            `;
        }

        return this.filteredTeams.map(team => `
            <div class="team-card ${this.selectedTeam?.id === team.id ? 'team-card--selected' : ''}" 
                 data-team-id="${team.id}">
                <div class="team-card-header">
                    <h4 class="team-name">${this.escapeHtml(team.name)}</h4>
                    <span class="team-mmr">${team.mmr || 0} MMR</span>
                </div>
                
                ${team.slogan ? `
                    <p class="team-slogan">"${this.escapeHtml(team.slogan)}"</p>
                ` : ''}
                
                <div class="team-players">
                    <span class="players-count">${team.players?.length || 0} игроков</span>
                    <div class="player-roles">
                        ${this.renderPlayerRoles(team.players)}
                    </div>
                </div>
                
                <div class="team-card-actions">
                    <button class="btn btn--sm btn--outline team-edit-btn" 
                            data-team-id="${team.id}">
                        ✏️ Редактировать
                    </button>
                    <button class="btn btn--sm btn--danger team-delete-btn" 
                            data-team-id="${team.id}">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderPlayerRoles(players) {
        if (!players || players.length === 0) return '';
        
        const roles = players.reduce((acc, player) => {
            const role = player.role || 'Не указана';
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(roles).map(([role, count]) => `
            <span class="player-role-badge" title="${role}: ${count} игроков">
                ${role} (${count})
            </span>
        `).join('');
    }

    renderTeamDetails() {
        if (!this.selectedTeam) {
            return `
                <div class="team-details-empty">
                    <div class="empty-state">
                        <div class="empty-state-icon">👈</div>
                        <h3>Выберите команду</h3>
                        <p>Выберите команду из списка для просмотра деталей</p>
                    </div>
                </div>
            `;
        }

        const team = this.selectedTeam;
        
        return `
            <div class="team-details-content">
                <div class="team-details-header">
                    <h3>${this.escapeHtml(team.name)}</h3>
                    <div class="team-meta">
                        <span class="mmr-badge">${team.mmr || 0} MMR</span>
                        <span class="team-id">ID: ${team.id}</span>
                    </div>
                </div>

                ${team.slogan ? `
                    <div class="team-slogan-section">
                        <h4>Слоган команды</h4>
                        <p class="team-slogan">"${this.escapeHtml(team.slogan)}"</p>
                    </div>
                ` : ''}

                <div class="team-players-section">
                    <div class="section-header">
                        <h4>Состав команды</h4>
                        <span class="players-count">${team.players?.length || 0} игроков</span>
                    </div>
                    
                    ${team.players && team.players.length > 0 ? `
                        <div class="players-list">
                            ${team.players.map((player, index) => `
                                <div class="player-card">
                                    <div class="player-info">
                                        <span class="player-name">${this.escapeHtml(player.name)}</span>
                                        <span class="player-role">${this.escapeHtml(player.role)}</span>
                                    </div>
                                    ${player.mmr ? `
                                        <span class="player-mmr">${player.mmr} MMR</span>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="empty-state empty-state--sm">
                            <p>В команде нет игроков</p>
                        </div>
                    `}
                </div>

                <div class="team-stats-section">
                    <h4>Статистика команды</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-value">${team.players?.length || 0}</span>
                            <span class="stat-label">Игроков</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${team.mmr || 0}</span>
                            <span class="stat-label">Средний MMR</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">
                                ${new Date(team.createdAt).toLocaleDateString()}
                            </span>
                            <span class="stat-label">Дата создания</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTeamModal() {
        return `
            <div class="modal" id="teamModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${this.isEditing ? 'Редактирование команды' : 'Новая команда'}</h3>
                        <button class="modal-close" id="closeTeamModal">&times;</button>
                    </div>
                    <form id="teamForm" class="modal-body">
                        <div class="form-group">
                            <label for="teamName">Название команды *</label>
                            <input type="text" 
                                   id="teamName" 
                                   name="name" 
                                   required 
                                   maxlength="50"
                                   class="form-input">
                            <div class="form-hint">Максимум 50 символов</div>
                        </div>

                        <div class="form-group">
                            <label for="teamSlogan">Слоган команды</label>
                            <input type="text" 
                                   id="teamSlogan" 
                                   name="slogan" 
                                   maxlength="100"
                                   class="form-input"
                                   placeholder="Необязательно">
                            <div class="form-hint">Максимум 100 символов</div>
                        </div>

                        <div class="form-group">
                            <div class="form-group-header">
                                <label>Состав команды *</label>
                                <button type="button" class="btn btn--sm btn--outline" id="addPlayerBtn">
                                    ➕ Добавить игрока
                                </button>
                            </div>
                            <div id="playersContainer" class="players-container">
                                <!-- Игроки будут добавляться здесь динамически -->
                            </div>
                            <div class="form-hint">Минимум 1 игрок, максимум 10 игроков</div>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn btn--outline" id="cancelTeamBtn">
                                Отмена
                            </button>
                            <button type="submit" class="btn btn--primary">
                                ${this.isEditing ? 'Сохранить изменения' : 'Создать команду'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Поиск
        const searchInput = this.container.querySelector('#teamSearch');
        if (searchInput) {
            PerformanceOptimizer.debounce('team_search', () => {
                this.currentFilter = searchInput.value.trim();
                this.applyFiltersAndSort();
                this.renderTeamList();
            }, 300);
        }

        // Сортировка
        const sortSelect = this.container.querySelector('#teamSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort.field = e.target.value;
                this.applyFiltersAndSort();
                this.renderTeamList();
            });
        }

        // Добавление команды
        const addTeamBtn = this.container.querySelector('#addTeamBtn');
        if (addTeamBtn) {
            addTeamBtn.addEventListener('click', () => {
                this.openTeamModal();
            });
        }

        // Выбор команды
        this.container.addEventListener('click', (e) => {
            const teamCard = e.target.closest('.team-card');
            if (teamCard) {
                const teamId = teamCard.dataset.teamId;
                this.selectTeam(teamId);
            }

            // Редактирование команды
            if (e.target.classList.contains('team-edit-btn')) {
                const teamId = e.target.dataset.teamId;
                this.openTeamModal(teamId);
            }

            // Удаление команды
            if (e.target.classList.contains('team-delete-btn')) {
                const teamId = e.target.dataset.teamId;
                this.deleteTeam(teamId);
            }
        });

        // Модальное окно
        this.setupModalListeners();
    }

    setupModalListeners() {
        const modal = this.container.querySelector('#teamModal');
        if (!modal) return;

        // Закрытие модального окна
        const closeBtn = modal.querySelector('#closeTeamModal');
        const cancelBtn = modal.querySelector('#cancelTeamBtn');
        
        const closeModal = () => {
            modal.style.display = 'none';
            this.isEditing = false;
            this.selectedTeam = null;
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        // Клик вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Добавление игрока
        const addPlayerBtn = modal.querySelector('#addPlayerBtn');
        if (addPlayerBtn) {
            addPlayerBtn.addEventListener('click', () => {
                this.addPlayerField();
            });
        }

        // Отправка формы
        const teamForm = modal.querySelector('#teamForm');
        if (teamForm) {
            teamForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveTeam();
            });
        }
    }

    addPlayerField(player = { name: '', role: '', mmr: '' }) {
        const container = this.container.querySelector('#playersContainer');
        if (!container) return;

        const playerIndex = container.children.length;
        const playerId = `player_${playerIndex}`;

        const playerHTML = `
            <div class="player-field" data-player-index="${playerIndex}">
                <div class="player-field-header">
                    <h5>Игрок ${playerIndex + 1}</h5>
                    <button type="button" class="btn btn--sm btn--danger remove-player-btn" 
                            ${container.children.length <= 1 ? 'disabled' : ''}>
                        🗑️ Удалить
                    </button>
                </div>
                <div class="player-field-grid">
                    <div class="form-group">
                        <label for="${playerId}_name">Имя *</label>
                        <input type="text" 
                               id="${playerId}_name" 
                               name="players[${playerIndex}][name]" 
                               value="${this.escapeHtml(player.name)}"
                               required 
                               maxlength="30"
                               class="form-input">
                    </div>
                    <div class="form-group">
                        <label for="${playerId}_role">Роль *</label>
                        <input type="text" 
                               id="${playerId}_role" 
                               name="players[${playerIndex}][role]" 
                               value="${this.escapeHtml(player.role)}"
                               required 
                               maxlength="20"
                               class="form-input"
                               placeholder="Например, Капитан">
                    </div>
                    <div class="form-group">
                        <label for="${playerId}_mmr">MMR</label>
                        <input type="number" 
                               id="${playerId}_mmr" 
                               name="players[${playerIndex}][mmr]" 
                               value="${player.mmr || ''}"
                               min="0" 
                               max="10000"
                               class="form-input"
                               placeholder="Необязательно">
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', playerHTML);

        // Обработчик удаления игрока
        const removeBtn = container.querySelector(`[data-player-index="${playerIndex}"] .remove-player-btn`);
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.removePlayerField(playerIndex);
            });
        }
    }

    removePlayerField(index) {
        const container = this.container.querySelector('#playersContainer');
        const playerField = container.querySelector(`[data-player-index="${index}"]`);
        
        if (playerField && container.children.length > 1) {
            playerField.remove();
            
            // Обновляем индексы оставшихся полей
            Array.from(container.children).forEach((field, newIndex) => {
                field.dataset.playerIndex = newIndex;
                field.querySelector('h5').textContent = `Игрок ${newIndex + 1}`;
                
                // Обновляем names инпутов
                const inputs = field.querySelectorAll('input');
                inputs.forEach(input => {
                    const name = input.name.replace(/\[\d+\]/, `[${newIndex}]`);
                    input.name = name;
                });
            });

            // Активируем кнопки удаления, если игроков больше 1
            const removeBtns = container.querySelectorAll('.remove-player-btn');
            removeBtns.forEach(btn => {
                btn.disabled = container.children.length <= 1;
            });
        }
    }

    openTeamModal(teamId = null) {
        const modal = this.container.querySelector('#teamModal');
        const form = modal.querySelector('#teamForm');
        const playersContainer = modal.querySelector('#playersContainer');
        
        if (!modal || !form) return;

        // Очищаем форму
        form.reset();
        playersContainer.innerHTML = '';
        
        if (teamId) {
            // Режим редактирования
            this.isEditing = true;
            const team = this.teams.find(t => t.id === teamId);
            this.selectedTeam = team;
            
            if (team) {
                // Заполняем данные команды
                form.querySelector('#teamName').value = team.name;
                if (team.slogan) {
                    form.querySelector('#teamSlogan').value = team.slogan;
                }
                
                // Добавляем игроков
                if (team.players && team.players.length > 0) {
                    team.players.forEach(player => {
                        this.addPlayerField(player);
                    });
                } else {
                    this.addPlayerField();
                }
            }
        } else {
            // Режим создания
            this.isEditing = false;
            this.selectedTeam = null;
            this.addPlayerField();
        }

        // Обновляем заголовок модального окна
        const modalTitle = modal.querySelector('h3');
        if (modalTitle) {
            modalTitle.textContent = this.isEditing ? 'Редактирование команды' : 'Новая команда';
        }

        modal.style.display = 'block';
    }

    async saveTeam() {
        const form = this.container.querySelector('#teamForm');
        if (!form) return;

        const formData = new FormData(form);
        const teamData = {
            name: formData.get('name'),
            slogan: formData.get('slogan'),
            players: []
        };

        // Собираем данные игроков
        const playerFields = this.container.querySelectorAll('.player-field');
        playerFields.forEach(field => {
            const index = field.dataset.playerIndex;
            const player = {
                name: formData.get(`players[${index}][name]`),
                role: formData.get(`players[${index}][role]`),
                mmr: formData.get(`players[${index}][mmr]`) ? 
                     parseInt(formData.get(`players[${index}][mmr]`)) : null
            };
            teamData.players.push(player);
        });

        try {
            if (this.isEditing && this.selectedTeam) {
                await this.tournamentService.updateTeam(this.selectedTeam.id, teamData);
                ErrorHandler.showNotification({
                    type: 'success',
                    title: 'Команда обновлена',
                    message: `Команда "${teamData.name}" успешно обновлена`,
                    duration: 3000
                });
            } else {
                await this.tournamentService.createTeam(teamData);
                ErrorHandler.showNotification({
                    type: 'success',
                    title: 'Команда создана',
                    message: `Команда "${teamData.name}" успешно создана`,
                    duration: 3000
                });
            }

            // Закрываем модальное окно
            const modal = this.container.querySelector('#teamModal');
            if (modal) modal.style.display = 'none';

        } catch (error) {
            console.error('Error saving team:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка сохранения',
                message: error.message
            });
        }
    }

    async deleteTeam(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) return;

        const confirmed = confirm(`Вы уверены, что хотите удалить команду "${team.name}"? Это действие нельзя отменить.`);
        if (!confirmed) return;

        try {
            await this.tournamentService.deleteTeam(teamId);
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Команда удалена',
                message: `Команда "${team.name}" успешно удалена`,
                duration: 3000
            });

            // Снимаем выделение, если удалена выбранная команда
            if (this.selectedTeam?.id === teamId) {
                this.selectedTeam = null;
                this.renderTeamDetails();
            }

        } catch (error) {
            console.error('Error deleting team:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка удаления',
                message: error.message
            });
        }
    }

    selectTeam(teamId) {
        this.selectedTeam = this.teams.find(team => team.id === teamId) || null;
        this.renderTeamDetails();
        
        // Обновляем выделение в списке
        this.container.querySelectorAll('.team-card').forEach(card => {
            card.classList.toggle('team-card--selected', card.dataset.teamId === teamId);
        });
    }

    applyFiltersAndSort() {
        let filtered = [...this.teams];

        // Применяем фильтр поиска
        if (this.currentFilter) {
            const searchTerm = this.currentFilter.toLowerCase();
            filtered = filtered.filter(team => 
                team.name.toLowerCase().includes(searchTerm) ||
                (team.slogan && team.slogan.toLowerCase().includes(searchTerm)) ||
                team.players.some(player => 
                    player.name.toLowerCase().includes(searchTerm) ||
                    player.role.toLowerCase().includes(searchTerm)
                )
            );
        }

        // Применяем сортировку
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (this.currentSort.field) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'mmr':
                    aValue = a.mmr || 0;
                    bValue = b.mmr || 0;
                    break;
                case 'players':
                    aValue = a.players?.length || 0;
                    bValue = b.players?.length || 0;
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return this.currentSort.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        this.filteredTeams = filtered;
    }

    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    destroy() {
        if (this.unsubscribeTeams) {
            this.unsubscribeTeams();
        }
    }
}

// js/components/schedule-manager.js
class ScheduleManager {
    constructor(containerId, tournamentService) {
        this.container = document.getElementById(containerId);
        this.tournamentService = tournamentService;
        this.schedule = [];
        this.teams = [];
        this.filteredSchedule = [];
        this.currentView = 'all'; // 'all', 'upcoming', 'completed'
        this.currentStage = 'all';
        this.init();
    }

    async init() {
        if (!this.container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }

        await this.loadData();
        this.render();
        this.setupEventListeners();
        
        // Подписка на обновления
        this.unsubscribeSchedule = this.tournamentService.subscribeToSchedule((schedule) => {
            this.schedule = schedule || [];
            this.applyFilters();
            this.renderSchedule();
        });

        this.unsubscribeTeams = this.tournamentService.subscribeToTeams((teams) => {
            this.teams = teams || [];
            this.renderSchedule();
        });
    }

    async loadData() {
        try {
            [this.schedule, this.teams] = await Promise.all([
                this.tournamentService.getSchedule(),
                this.tournamentService.getTeams()
            ]);
            this.applyFilters();
        } catch (error) {
            console.error('Error loading schedule data:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка загрузки расписания',
                message: error.message
            });
            this.schedule = [];
            this.teams = [];
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="schedule-manager">
                <div class="schedule-header">
                    <h2>Расписание матчей</h2>
                    <div class="schedule-controls">
                        <div class="view-controls">
                            <button class="btn btn--outline ${this.currentView === 'all' ? 'active' : ''}" 
                                    data-view="all">
                                Все матчи
                            </button>
                            <button class="btn btn--outline ${this.currentView === 'upcoming' ? 'active' : ''}" 
                                    data-view="upcoming">
                                Предстоящие
                            </button>
                            <button class="btn btn--outline ${this.currentView === 'completed' ? 'active' : ''}" 
                                    data-view="completed">
                                Завершенные
                            </button>
                        </div>
                        
                        <div class="filter-controls">
                            <select id="stageFilter" class="select">
                                <option value="all">Все стадии</option>
                                <option value="Групповой этап">Групповой этап</option>
                                <option value="Плей-офф">Плей-офф</option>
                                <option value="Четвертьфинал">Четвертьфинал</option>
                                <option value="Полуфинал">Полуфинал</option>
                                <option value="Финал">Финал</option>
                            </select>
                            
                            <button class="btn btn--primary" id="addMatchBtn">
                                ➕ Добавить матч
                            </button>
                        </div>
                    </div>
                </div>

                <div class="schedule-stats">
                    <div class="stat-cards">
                        <div class="stat-card">
                            <span class="stat-value">${this.getTotalMatches()}</span>
                            <span class="stat-label">Всего матчей</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">${this.getUpcomingMatches()}</span>
                            <span class="stat-label">Предстоящие</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">${this.getCompletedMatches()}</span>
                            <span class="stat-label">Завершенные</span>
                        </div>
                    </div>
                </div>

                <div class="schedule-content">
                    <div class="schedule-list" id="scheduleList">
                        ${this.renderSchedule()}
                    </div>
                </div>

                ${this.renderMatchModal()}
                ${this.renderScoreModal()}
            </div>
        `;
    }

    renderSchedule() {
        if (this.filteredSchedule.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <h3>Матчи не найдены</h3>
                    <p>${this.currentView !== 'all' || this.currentStage !== 'all' ? 
                        'Попробуйте изменить параметры фильтрации' : 
                        'Добавьте первый матч в расписание'}</p>
                </div>
            `;
        }

        // Группировка матчей по дате (если бы была дата)
        const matchesByStage = this.groupMatchesByStage(this.filteredSchedule);

        return Object.entries(matchesByStage).map(([stage, matches]) => `
            <div class="stage-section">
                <h3 class="stage-title">${stage}</h3>
                <div class="matches-grid">
                    ${matches.map(match => this.renderMatchCard(match)).join('')}
                </div>
            </div>
        `).join('');
    }

    renderMatchCard(match) {
        const team1 = this.teams.find(t => t.id === match.team1);
        const team2 = this.teams.find(t => t.id === match.team2);
        
        const isCompleted = match.completed;
        const hasScore = match.score1 !== null && match.score2 !== null;

        return `
            <div class="match-card ${isCompleted ? 'match-card--completed' : 'match-card--upcoming'}" 
                 data-match-id="${match.id}">
                <div class="match-header">
                    <span class="match-time">${match.time}</span>
                    <span class="match-stage">${match.stage}</span>
                    ${match.group ? `<span class="match-group">${match.group}</span>` : ''}
                </div>

                <div class="match-teams">
                    <div class="team-vs-team">
                        <div class="team-info ${match.winner === match.team1 ? 'team-winner' : ''}">
                            <span class="team-name">${team1 ? this.escapeHtml(team1.name) : 'TBD'}</span>
                            ${hasScore ? `<span class="team-score">${match.score1}</span>` : ''}
                        </div>
                        
                        <div class="vs-separator">VS</div>
                        
                        <div class="team-info ${match.winner === match.team2 ? 'team-winner' : ''}">
                            <span class="team-name">${team2 ? this.escapeHtml(team2.name) : 'TBD'}</span>
                            ${hasScore ? `<span class="team-score">${match.score2}</span>` : ''}
                        </div>
                    </div>
                </div>

                <div class="match-status">
                    ${isCompleted ? `
                        <span class="status-badge status-completed">Завершен</span>
                        ${match.winner ? `
                            <span class="winner-info">Победитель: ${this.getTeamName(match.winner)}</span>
                        ` : ''}
                    ` : `
                        <span class="status-badge status-upcoming">Предстоящий</span>
                    `}
                </div>

                <div class="match-actions">
                    ${!isCompleted ? `
                        <button class="btn btn--sm btn--primary enter-score-btn" 
                                data-match-id="${match.id}">
                            📊 Ввести счет
                        </button>
                    ` : `
                        <button class="btn btn--sm btn--outline edit-score-btn" 
                                data-match-id="${match.id}">
                            ✏️ Изменить счет
                        </button>
                    `}
                    
                    <button class="btn btn--sm btn--outline edit-match-btn" 
                            data-match-id="${match.id}">
                        🛠️ Редактировать
                    </button>
                    
                    <button class="btn btn--sm btn--danger delete-match-btn" 
                            data-match-id="${match.id}">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `;
    }

    renderMatchModal() {
        return `
            <div class="modal" id="matchModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="matchModalTitle">Добавить матч</h3>
                        <button class="modal-close" id="closeMatchModal">&times;</button>
                    </div>
                    <form id="matchForm" class="modal-body">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="matchStage">Стадия турнира *</label>
                                <select id="matchStage" name="stage" required class="form-select">
                                    <option value="">Выберите стадию</option>
                                    <option value="Групповой этап">Групповой этап</option>
                                    <option value="Плей-офф">Плей-офф</option>
                                    <option value="Четвертьфинал">Четвертьфинал</option>
                                    <option value="Полуфинал">Полуфинал</option>
                                    <option value="Финал">Финал</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="matchGroup">Группа</label>
                                <input type="text" 
                                       id="matchGroup" 
                                       name="group" 
                                       class="form-input"
                                       placeholder="Необязательно">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="matchTime">Время *</label>
                                <input type="time" 
                                       id="matchTime" 
                                       name="time" 
                                       required 
                                       class="form-input">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="matchTeam1">Команда 1 *</label>
                                <select id="matchTeam1" name="team1" required class="form-select">
                                    <option value="">Выберите команду</option>
                                    ${this.teams.map(team => `
                                        <option value="${team.id}">${this.escapeHtml(team.name)}</option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="matchTeam2">Команда 2 *</label>
                                <select id="matchTeam2" name="team2" required class="form-select">
                                    <option value="">Выберите команду</option>
                                    ${this.teams.map(team => `
                                        <option value="${team.id}">${this.escapeHtml(team.name)}</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn btn--outline" id="cancelMatchBtn">
                                Отмена
                            </button>
                            <button type="submit" class="btn btn--primary">
                                Сохранить матч
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    renderScoreModal() {
        return `
            <div class="modal" id="scoreModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Ввести счет матча</h3>
                        <button class="modal-close" id="closeScoreModal">&times;</button>
                    </div>
                    <form id="scoreForm" class="modal-body">
                        <div class="score-input-section">
                            <div class="team-score-input">
                                <label id="scoreTeam1Name">Команда 1</label>
                                <input type="number" 
                                       id="score1" 
                                       name="score1" 
                                       min="0" 
                                       max="99"
                                       required 
                                       class="score-input">
                            </div>
                            
                            <div class="score-separator">:</div>
                            
                            <div class="team-score-input">
                                <label id="scoreTeam2Name">Команда 2</label>
                                <input type="number" 
                                       id="score2" 
                                       name="score2" 
                                       min="0" 
                                       max="99"
                                       required 
                                       class="score-input">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="autoDetermineWinner" name="autoDetermineWinner" checked>
                                Автоматически определить победителя
                            </label>
                        </div>

                        <div class="form-group" id="winnerSelection" style="display: none;">
                            <label for="matchWinner">Победитель</label>
                            <select id="matchWinner" name="winner" class="form-select">
                                <option value="">Ничья</option>
                                <option value="" id="winnerTeam1Option">Команда 1</option>
                                <option value="" id="winnerTeam2Option">Команда 2</option>
                            </select>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn btn--outline" id="cancelScoreBtn">
                                Отмена
                            </button>
                            <button type="submit" class="btn btn--primary">
                                Сохранить счет
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Переключение представлений
        this.container.addEventListener('click', (e) => {
            if (e.target.dataset.view) {
                this.currentView = e.target.dataset.view;
                this.applyFilters();
                this.renderSchedule();
                
                // Обновляем активные кнопки
                this.container.querySelectorAll('[data-view]').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.view === this.currentView);
                });
            }

            // Фильтр по стадии
            const stageFilter = this.container.querySelector('#stageFilter');
            if (stageFilter) {
                stageFilter.addEventListener('change', (e) => {
                    this.currentStage = e.target.value;
                    this.applyFilters();
                    this.renderSchedule();
                });
            }

            // Добавление матча
            if (e.target.id === 'addMatchBtn') {
                this.openMatchModal();
            }

            // Ввод счета
            if (e.target.classList.contains('enter-score-btn') || 
                e.target.classList.contains('edit-score-btn')) {
                const matchId = e.target.dataset.matchId;
                this.openScoreModal(matchId);
            }

            // Редактирование матча
            if (e.target.classList.contains('edit-match-btn')) {
                const matchId = e.target.dataset.matchId;
                this.openMatchModal(matchId);
            }

            // Удаление матча
            if (e.target.classList.contains('delete-match-btn')) {
                const matchId = e.target.dataset.matchId;
                this.deleteMatch(matchId);
            }
        });

        this.setupModalListeners();
    }

    setupModalListeners() {
        // Модальное окно матча
        const matchModal = this.container.querySelector('#matchModal');
        if (matchModal) {
            const closeBtn = matchModal.querySelector('#closeMatchModal');
            const cancelBtn = matchModal.querySelector('#cancelMatchBtn');
            
            const closeMatchModal = () => {
                matchModal.style.display = 'none';
            };

            if (closeBtn) closeBtn.addEventListener('click', closeMatchModal);
            if (cancelBtn) cancelBtn.addEventListener('click', closeMatchModal);

            matchModal.addEventListener('click', (e) => {
                if (e.target === matchModal) closeMatchModal();
            });

            // Отправка формы матча
            const matchForm = matchModal.querySelector('#matchForm');
            if (matchForm) {
                matchForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveMatch();
                });
            }
        }

        // Модальное окно счета
        const scoreModal = this.container.querySelector('#scoreModal');
        if (scoreModal) {
            const closeBtn = scoreModal.querySelector('#closeScoreModal');
            const cancelBtn = scoreModal.querySelector('#cancelScoreBtn');
            
            const closeScoreModal = () => {
                scoreModal.style.display = 'none';
            };

            if (closeBtn) closeBtn.addEventListener('click', closeScoreModal);
            if (cancelBtn) cancelBtn.addEventListener('click', closeScoreModal);

            scoreModal.addEventListener('click', (e) => {
                if (e.target === scoreModal) closeScoreModal();
            });

            // Автоматическое определение победителя
            const autoWinnerCheckbox = scoreModal.querySelector('#autoDetermineWinner');
            const winnerSelection = scoreModal.querySelector('#winnerSelection');
            
            if (autoWinnerCheckbox && winnerSelection) {
                autoWinnerCheckbox.addEventListener('change', (e) => {
                    winnerSelection.style.display = e.target.checked ? 'none' : 'block';
                });
            }

            // Отправка формы счета
            const scoreForm = scoreModal.querySelector('#scoreForm');
            if (scoreForm) {
                scoreForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveScore();
                });
            }
        }
    }

    openMatchModal(matchId = null) {
        const modal = this.container.querySelector('#matchModal');
        const form = modal.querySelector('#matchForm');
        const title = modal.querySelector('#matchModalTitle');
        
        if (!modal || !form) return;

        form.reset();
        
        if (matchId) {
            // Режим редактирования
            const match = this.schedule.find(m => m.id === matchId);
            if (match) {
                form.querySelector('#matchStage').value = match.stage;
                form.querySelector('#matchGroup').value = match.group || '';
                form.querySelector('#matchTime').value = match.time;
                form.querySelector('#matchTeam1').value = match.team1 || '';
                form.querySelector('#matchTeam2').value = match.team2 || '';
                title.textContent = 'Редактировать матч';
                form.dataset.editId = matchId;
            }
        } else {
            // Режим создания
            title.textContent = 'Добавить матч';
            delete form.dataset.editId;
        }

        modal.style.display = 'block';
    }

    openScoreModal(matchId) {
        const modal = this.container.querySelector('#scoreModal');
        const form = modal.querySelector('#scoreForm');
        const match = this.schedule.find(m => m.id === matchId);
        
        if (!modal || !form || !match) return;

        const team1 = this.teams.find(t => t.id === match.team1);
        const team2 = this.teams.find(t => t.id === match.team2);

        // Заполняем названия команд
        modal.querySelector('#scoreTeam1Name').textContent = team1?.name || 'Команда 1';
        modal.querySelector('#scoreTeam2Name').textContent = team2?.name || 'Команда 2';
        
        // Заполняем опции победителя
        const winnerTeam1Option = modal.querySelector('#winnerTeam1Option');
        const winnerTeam2Option = modal.querySelector('#winnerTeam2Option');
        
        if (winnerTeam1Option && team1) {
            winnerTeam1Option.value = team1.id;
            winnerTeam1Option.textContent = team1.name;
        }
        if (winnerTeam2Option && team2) {
            winnerTeam2Option.value = team2.id;
            winnerTeam2Option.textContent = team2.name;
        }

        // Заполняем существующий счет
        if (match.score1 !== null && match.score2 !== null) {
            form.querySelector('#score1').value = match.score1;
            form.querySelector('#score2').value = match.score2;
            
            if (match.winner) {
                form.querySelector('#matchWinner').value = match.winner;
                form.querySelector('#autoDetermineWinner').checked = false;
                form.querySelector('#winnerSelection').style.display = 'block';
            }
        } else {
            form.reset();
            form.querySelector('#autoDetermineWinner').checked = true;
            form.querySelector('#winnerSelection').style.display = 'none';
        }

        form.dataset.matchId = matchId;
        modal.style.display = 'block';
    }

    async saveMatch() {
        const form = this.container.querySelector('#matchForm');
        if (!form) return;

        const formData = new FormData(form);
        const matchData = {
            stage: formData.get('stage'),
            group: formData.get('group') || null,
            time: formData.get('time'),
            team1: formData.get('team1'),
            team2: formData.get('team2')
        };

        // Валидация: команды не должны совпадать
        if (matchData.team1 === matchData.team2) {
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка валидации',
                message: 'Команда не может играть против себя'
            });
            return;
        }

        try {
            if (form.dataset.editId) {
                // Обновление существующего матча
                await this.tournamentService.updateMatch(form.dataset.editId, matchData);
                ErrorHandler.showNotification({
                    type: 'success',
                    title: 'Матч обновлен',
                    message: 'Расписание матча успешно обновлено',
                    duration: 3000
                });
            } else {
                // Создание нового матча
                await this.tournamentService.addMatch(matchData);
                ErrorHandler.showNotification({
                    type: 'success',
                    title: 'Матч добавлен',
                    message: 'Новый матч успешно добавлен в расписание',
                    duration: 3000
                });
            }

            const modal = this.container.querySelector('#matchModal');
            if (modal) modal.style.display = 'none';

        } catch (error) {
            console.error('Error saving match:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка сохранения',
                message: error.message
            });
        }
    }

    async saveScore() {
        const form = this.container.querySelector('#scoreForm');
        if (!form) return;

        const formData = new FormData(form);
        const matchId = form.dataset.matchId;
        const score1 = parseInt(formData.get('score1'));
        const score2 = parseInt(formData.get('score2'));
        const autoDetermineWinner = formData.get('autoDetermineWinner') === 'on';

        let winner = null;

        if (autoDetermineWinner) {
            // Автоматическое определение победителя
            if (score1 > score2) {
                const match = this.schedule.find(m => m.id === matchId);
                winner = match.team1;
            } else if (score2 > score1) {
                const match = this.schedule.find(m => m.id === matchId);
                winner = match.team2;
            }
            // Если ничья, winner остается null
        } else {
            // Ручное указание победителя
            winner = formData.get('winner') || null;
        }

        try {
            await this.tournamentService.updateMatchResult(matchId, score1, score2, winner);
            
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Счет сохранен',
                message: 'Результат матча успешно обновлен',
                duration: 3000
            });

            const modal = this.container.querySelector('#scoreModal');
            if (modal) modal.style.display = 'none';

        } catch (error) {
            console.error('Error saving score:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка сохранения',
                message: error.message
            });
        }
    }

    async deleteMatch(matchId) {
        const match = this.schedule.find(m => m.id === matchId);
        if (!match) return;

        const team1Name = this.getTeamName(match.team1);
        const team2Name = this.getTeamName(match.team2);
        
        const confirmed = confirm(`Вы уверены, что хотите удалить матч между "${team1Name}" и "${team2Name}"?`);
        if (!confirmed) return;

        try {
            await this.tournamentService.deleteMatch(matchId);
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Матч удален',
                message: 'Матч успешно удален из расписания',
                duration: 3000
            });
        } catch (error) {
            console.error('Error deleting match:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка удаления',
                message: error.message
            });
        }
    }

    applyFilters() {
        let filtered = [...this.schedule];

        // Фильтр по статусу
        switch (this.currentView) {
            case 'upcoming':
                filtered = filtered.filter(match => !match.completed);
                break;
            case 'completed':
                filtered = filtered.filter(match => match.completed);
                break;
            // 'all' - без фильтра
        }

        // Фильтр по стадии
        if (this.currentStage !== 'all') {
            filtered = filtered.filter(match => match.stage === this.currentStage);
        }

        this.filteredSchedule = filtered;
    }

    groupMatchesByStage(matches) {
        return matches.reduce((groups, match) => {
            const stage = match.stage;
            if (!groups[stage]) {
                groups[stage] = [];
            }
            groups[stage].push(match);
            return groups;
        }, {});
    }

    getTeamName(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        return team ? team.name : 'Неизвестная команда';
    }

    getTotalMatches() {
        return this.schedule.length;
    }

    getUpcomingMatches() {
        return this.schedule.filter(match => !match.completed).length;
    }

    getCompletedMatches() {
        return this.schedule.filter(match => match.completed).length;
    }

    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    destroy() {
        if (this.unsubscribeSchedule) this.unsubscribeSchedule();
        if (this.unsubscribeTeams) this.unsubscribeTeams();
    }
}

// js/components/bracket-viewer.js
class BracketViewer {
    constructor(containerId, tournamentService) {
        this.container = document.getElementById(containerId);
        this.tournamentService = tournamentService;
        this.bracketData = null;
        this.teams = [];
        this.schedule = [];
        this.currentRound = 0;
        this.init();
    }

    async init() {
        if (!this.container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }

        await this.loadData();
        this.render();
        this.setupEventListeners();
        
        // Подписка на обновления
        this.unsubscribeBracket = this.tournamentService.subscribe('tournament/bracket', (data) => {
            this.bracketData = data;
            this.renderBracket();
        });

        this.unsubscribeTeams = this.tournamentService.subscribeToTeams((teams) => {
            this.teams = teams || [];
            this.renderBracket();
        });

        this.unsubscribeSchedule = this.tournamentService.subscribeToSchedule((schedule) => {
            this.schedule = schedule || [];
            this.renderBracket();
        });
    }

    async loadData() {
        try {
            [this.bracketData, this.teams, this.schedule] = await Promise.all([
                this.tournamentService.getBracket(),
                this.tournamentService.getTeams(),
                this.tournamentService.getSchedule()
            ]);
        } catch (error) {
            console.error('Error loading bracket data:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка загрузки сетки',
                message: error.message
            });
            this.bracketData = null;
            this.teams = [];
            this.schedule = [];
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="bracket-viewer">
                <div class="bracket-header">
                    <h2>Сетка турнира</h2>
                    <div class="bracket-controls">
                        <button class="btn btn--outline" id="generateBracketBtn">
                            🔄 Сгенерировать сетку
                        </button>
                        <button class="btn btn--primary" id="autoAdvanceBtn">
                            ⚡ Автопродвижение
                        </button>
                    </div>
                </div>

                <div class="bracket-stats">
                    <div class="stat-cards">
                        <div class="stat-card">
                            <span class="stat-value" id="totalRounds">0</span>
                            <span class="stat-label">Раундов</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value" id="completedMatches">0</span>
                            <span class="stat-label">Завершено матчей</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value" id="remainingMatches">0</span>
                            <span class="stat-label">Осталось матчей</span>
                        </div>
                    </div>
                </div>

                <div class="bracket-navigation">
                    <button class="btn btn--outline" id="prevRoundBtn" disabled>
                        ◀ Предыдущий раунд
                    </button>
                    <span class="round-info" id="roundInfo">Раунд 1 из 1</span>
                    <button class="btn btn--outline" id="nextRoundBtn" disabled>
                        Следующий раунд ▶
                    </button>
                </div>

                <div class="bracket-container">
                    <div class="bracket" id="bracket">
                        ${this.renderBracket()}
                    </div>
                </div>

                <div class="bracket-legend">
                    <div class="legend-item">
                        <div class="legend-color legend-winner"></div>
                        <span>Победитель матча</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color legend-completed"></div>
                        <span>Завершенный матч</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color legend-upcoming"></div>
                        <span>Предстоящий матч</span>
                    </div>
                </div>
            </div>
        `;

        this.updateStats();
    }

    renderBracket() {
        if (!this.bracketData || !this.bracketData.rounds || this.bracketData.rounds.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">🏆</div>
                    <h3>Сетка турнира не сгенерирована</h3>
                    <p>Нажмите "Сгенерировать сетку" чтобы создать турнирную сетку</p>
                </div>
            `;
        }

        const rounds = this.bracketData.rounds;
        const currentRound = rounds[this.currentRound] || rounds[rounds.length - 1];

        return `
            <div class="bracket-rounds">
                ${rounds.map((round, roundIndex) => `
                    <div class="bracket-round ${roundIndex === this.currentRound ? 'bracket-round--active' : ''}">
                        <div class="round-header">
                            <h4>${round.name}</h4>
                            <span class="round-matches">${round.matches.length} матчей</span>
                        </div>
                        
                        <div class="round-matches">
                            ${round.matches.map(match => this.renderBracketMatch(match, roundIndex)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderBracketMatch(match, roundIndex) {
        const team1 = this.teams.find(t => t.id === match.team1);
        const team2 = this.teams.find(t => t.id === match.team2);
        const scheduleMatch = this.schedule.find(m => m.id === match.scheduleId);
        
        const isCompleted = scheduleMatch?.completed || false;
        const hasScore = scheduleMatch?.score1 !== null && scheduleMatch?.score2 !== null;
        const isWinner1 = match.winner === match.team1;
        const isWinner2 = match.winner === match.team2;

        return `
            <div class="bracket-match ${isCompleted ? 'bracket-match--completed' : 'bracket-match--upcoming'}" 
                 data-match-id="${match.id}">
                <div class="match-teams">
                    <div class="team-slot ${isWinner1 ? 'team-slot--winner' : ''} ${!team1 ? 'team-slot--empty' : ''}">
                        <span class="team-name">${team1 ? this.escapeHtml(team1.name) : 'TBD'}</span>
                        ${hasScore ? `<span class="team-score">${scheduleMatch.score1}</span>` : ''}
                    </div>
                    
                    <div class="team-slot ${isWinner2 ? 'team-slot--winner' : ''} ${!team2 ? 'team-slot--empty' : ''}">
                        <span class="team-name">${team2 ? this.escapeHtml(team2.name) : 'TBD'}</span>
                        ${hasScore ? `<span class="team-score">${scheduleMatch.score2}</span>` : ''}
                    </div>
                </div>
                
                ${scheduleMatch ? `
                    <div class="match-info">
                        <span class="match-time">${scheduleMatch.time}</span>
                        ${isCompleted ? `
                            <span class="match-status completed">Завершен</span>
                        ` : `
                            <span class="match-status upcoming">Ожидается</span>
                        `}
                    </div>
                ` : ''}
                
                <div class="match-actions">
                    ${scheduleMatch ? `
                        <button class="btn btn--sm btn--outline view-match-btn" 
                                data-schedule-id="${scheduleMatch.id}">
                            👁️ Просмотр
                        </button>
                    ` : `
                        <button class="btn btn--sm btn--outline create-match-btn" 
                                data-bracket-match-id="${match.id}">
                            ➕ Создать матч
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Генерация сетки
        const generateBtn = this.container.querySelector('#generateBracketBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateBracket();
            });
        }

        // Автопродвижение
        const autoAdvanceBtn = this.container.querySelector('#autoAdvanceBtn');
        if (autoAdvanceBtn) {
            autoAdvanceBtn.addEventListener('click', () => {
                this.autoAdvanceWinners();
            });
        }

        // Навигация по раундам
        const prevBtn = this.container.querySelector('#prevRoundBtn');
        const nextBtn = this.container.querySelector('#nextRoundBtn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.navigateRound(-1);
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.navigateRound(1);
            });
        }

        // Действия с матчами
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-match-btn')) {
                const scheduleId = e.target.dataset.scheduleId;
                this.viewMatch(scheduleId);
            }
            
            if (e.target.classList.contains('create-match-btn')) {
                const bracketMatchId = e.target.dataset.bracketMatchId;
                this.createMatchFromBracket(bracketMatchId);
            }
        });
    }

    async generateBracket() {
        try {
            // Получаем команды для плей-офф
            const standings = await this.tournamentService.getStandings();
            const settings = await this.tournamentService.getTournamentSettings();
            
            const advancingTeams = settings?.advancingTeams || 8;
            const playoffTeams = standings.slice(0, advancingTeams).map(s => s.team);

            if (playoffTeams.length < 2) {
                throw new Error('Для создания сетки нужно минимум 2 команды');
            }

            // Генерация сетки на основе количества команд
            const bracket = this.generateBracketStructure(playoffTeams);
            
            await this.tournamentService.updateBracket(bracket);
            
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Сетка сгенерирована',
                message: `Турнирная сетка для ${playoffTeams.length} команд успешно создана`,
                duration: 5000
            });

        } catch (error) {
            console.error('Error generating bracket:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка генерации сетки',
                message: error.message
            });
        }
    }

    generateBracketStructure(teams) {
        const teamCount = teams.length;
        const rounds = [];
        let currentRoundTeams = [...teams];
        let roundNumber = 1;

        // Определяем имена раундов
        const roundNames = {
            1: 'Финал',
            2: 'Полуфиналы', 
            3: 'Четвертьфиналы',
            4: '1/8 финала',
            5: '1/16 финала'
        };

        while (currentRoundTeams.length > 1) {
            const roundName = roundNames[roundNumber] || `Раунд ${roundNumber}`;
            const matches = [];

            // Разбиваем команды на пары
            for (let i = 0; i < currentRoundTeams.length; i += 2) {
                const team1 = currentRoundTeams[i];
                const team2 = currentRoundTeams[i + 1] || null; // BYE если нечетное количество

                const match = {
                    id: `bracket_${roundNumber}_${i/2 + 1}`,
                    team1: team1?.id || null,
                    team2: team2?.id || null,
                    winner: null,
                    nextMatch: null
                };

                // Определяем следующий матч для победителя
                if (roundNumber > 1) {
                    const nextMatchIndex = Math.floor(i / 4);
                    match.nextMatch = `bracket_${roundNumber - 1}_${nextMatchIndex + 1}`;
                }

                matches.push(match);
            }

            rounds.unshift({
                name: roundName,
                number: roundNumber,
                matches: matches
            });

            // Следующий раунд - победители текущего раунда
            currentRoundTeams = Array(Math.ceil(currentRoundTeams.length / 2)).fill(null);
            roundNumber++;
        }

        return {
            id: 'main_bracket',
            type: 'single_elimination',
            teams: teamCount,
            rounds: rounds,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }

    async autoAdvanceWinners() {
        if (!this.bracketData) return;

        try {
            let updated = false;
            const updatedRounds = [...this.bracketData.rounds];

            // Проходим по всем раундам и матчам
            for (let i = 0; i < updatedRounds.length; i++) {
                const round = updatedRounds[i];
                
                for (const match of round.matches) {
                    if (match.winner) continue; // Победитель уже определен

                    const scheduleMatch = this.schedule.find(m => 
                        m.team1 === match.team1 && m.team2 === match.team2 && m.completed
                    );

                    if (scheduleMatch && scheduleMatch.winner) {
                        match.winner = scheduleMatch.winner;
                        updated = true;

                        // Автоматически продвигаем победителя в следующий матч
                        if (match.nextMatch && i > 0) {
                            const nextRound = updatedRounds[i - 1];
                            const nextMatch = nextRound.matches.find(m => m.id === match.nextMatch);
                            
                            if (nextMatch) {
                                // Определяем слот для команды в следующем матче
                                if (!nextMatch.team1) {
                                    nextMatch.team1 = match.winner;
                                } else if (!nextMatch.team2) {
                                    nextMatch.team2 = match.winner;
                                }
                            }
                        }
                    }
                }
            }

            if (updated) {
                await this.tournamentService.updateBracket({
                    ...this.bracketData,
                    rounds: updatedRounds,
                    updatedAt: Date.now()
                });

                ErrorHandler.showNotification({
                    type: 'success',
                    title: 'Автопродвижение завершено',
                    message: 'Победители автоматически продвинуты по сетке',
                    duration: 3000
                });
            } else {
                ErrorHandler.showNotification({
                    type: 'info',
                    title: 'Нет изменений',
                    message: 'Все победители уже продвинуты или нет завершенных матчей',
                    duration: 3000
                });
            }

        } catch (error) {
            console.error('Error in auto advance:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка автопродвижения',
                message: error.message
            });
        }
    }

    navigateRound(direction) {
        if (!this.bracketData) return;

        const newRound = this.currentRound + direction;
        const maxRound = this.bracketData.rounds.length - 1;

        if (newRound >= 0 && newRound <= maxRound) {
            this.currentRound = newRound;
            this.renderBracket();
            this.updateNavigation();
        }
    }

    updateNavigation() {
        if (!this.bracketData) return;

        const prevBtn = this.container.querySelector('#prevRoundBtn');
        const nextBtn = this.container.querySelector('#nextRoundBtn');
        const roundInfo = this.container.querySelector('#roundInfo');
        const maxRound = this.bracketData.rounds.length - 1;

        if (prevBtn) prevBtn.disabled = this.currentRound === 0;
        if (nextBtn) nextBtn.disabled = this.currentRound === maxRound;
        
        if (roundInfo) {
            roundInfo.textContent = `Раунд ${this.currentRound + 1} из ${maxRound + 1}`;
        }
    }

    updateStats() {
        if (!this.bracketData) return;

        const totalRounds = this.bracketData.rounds.length;
        let totalMatches = 0;
        let completedMatches = 0;

        this.bracketData.rounds.forEach(round => {
            round.matches.forEach(match => {
                totalMatches++;
                const scheduleMatch = this.schedule.find(m => 
                    (m.team1 === match.team1 && m.team2 === match.team2) || 
                    m.id === match.scheduleId
                );
                if (scheduleMatch?.completed) {
                    completedMatches++;
                }
            });
        });

        const totalRoundsEl = this.container.querySelector('#totalRounds');
        const completedMatchesEl = this.container.querySelector('#completedMatches');
        const remainingMatchesEl = this.container.querySelector('#remainingMatches');

        if (totalRoundsEl) totalRoundsEl.textContent = totalRounds;
        if (completedMatchesEl) completedMatchesEl.textContent = completedMatches;
        if (remainingMatchesEl) remainingMatchesEl.textContent = totalMatches - completedMatches;
    }

    viewMatch(scheduleId) {
        // Здесь можно реализовать просмотр деталей матча
        // Например, открыть модальное окно с информацией о матче
        const match = this.schedule.find(m => m.id === scheduleId);
        if (match) {
            alert(`Матч: ${this.getTeamName(match.team1)} vs ${this.getTeamName(match.team2)}\nВремя: ${match.time}\nСтадия: ${match.stage}`);
        }
    }

    async createMatchFromBracket(bracketMatchId) {
        if (!this.bracketData) return;

        // Находим матч в сетке
        let targetMatch = null;
        let roundNumber = 0;

        for (const round of this.bracketData.rounds) {
            for (const match of round.matches) {
                if (match.id === bracketMatchId) {
                    targetMatch = match;
                    break;
                }
            }
            if (targetMatch) break;
            roundNumber++;
        }

        if (!targetMatch || !targetMatch.team1 || !targetMatch.team2) {
            ErrorHandler.showNotification({
                type: 'warning',
                title: 'Невозможно создать матч',
                message: 'Обе команды должны быть определены'
            });
            return;
        }

        try {
            const round = this.bracketData.rounds[roundNumber];
            const matchData = {
                stage: round.name,
                time: this.generateMatchTime(this.schedule.length),
                team1: targetMatch.team1,
                team2: targetMatch.team2,
                bracketMatchId: bracketMatchId
            };

            const newMatch = await this.tournamentService.addMatch(matchData);
            
            // Обновляем матч в сетке ссылкой на расписание
            targetMatch.scheduleId = newMatch.id;
            await this.tournamentService.updateBracket(this.bracketData);

            ErrorHandler.showNotification({
                type: 'success',
                title: 'Матч создан',
                message: 'Матч добавлен в расписание и привязан к сетке',
                duration: 3000
            });

        } catch (error) {
            console.error('Error creating match from bracket:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка создания матча',
                message: error.message
            });
        }
    }

    generateMatchTime(index) {
        const startHour = 10;
        const totalMinutes = startHour * 60 + index * 30;
        const hours = Math.floor(totalMinutes / 60) % 24;
        const minutes = totalMinutes % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    getTeamName(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        return team ? team.name : 'Неизвестная команда';
    }

    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    destroy() {
        if (this.unsubscribeBracket) this.unsubscribeBracket();
        if (this.unsubscribeTeams) this.unsubscribeTeams();
        if (this.unsubscribeSchedule) this.unsubscribeSchedule();
    }
}

// js/app.js
class IllusiveCupApp {
    constructor() {
        this.tournamentService = null;
        this.currentView = 'teams';
        this.components = new Map();
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            // Инициализация утилит
            ErrorHandler.init();
            PerformanceOptimizer.init();

            console.log('🚀 Initializing Illusive Cup App...');

            // Предзагрузка критических ресурсов
            PerformanceOptimizer.preloadCriticalResources();

            // Инициализация сервисов
            this.tournamentService = new TournamentService();
            await this.tournamentService.init();

            // Настройка приложения
            this.setupAppStructure();
            this.setupEventListeners();
            this.loadCurrentView();

            this.isInitialized = true;
            console.log('✅ Illusive Cup App initialized successfully');

            // Показ уведомления о успешной загрузке
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Приложение загружено',
                message: 'Illusive Cup готов к работе!',
                duration: 3000
            });

        } catch (error) {
            console.error('❌ App initialization failed:', error);
            ErrorHandler.showFallbackUI(error);
        }
    }

    setupAppStructure() {
        const appContainer = document.getElementById('app');
        if (!appContainer) {
            throw new Error('App container not found');
        }

        appContainer.innerHTML = `
            <div class="app">
                <!-- Header -->
                <header class="app-header">
                    <div class="header-content">
                        <div class="logo">
                            <h1>🏆 Illusive Cup</h1>
                            <span class="app-version">v1.0.0</span>
                        </div>
                        
                        <nav class="main-nav">
                            <button class="nav-btn ${this.currentView === 'teams' ? 'active' : ''}" 
                                    data-view="teams">
                                👥 Команды
                            </button>
                            <button class="nav-btn ${this.currentView === 'schedule' ? 'active' : ''}" 
                                    data-view="schedule">
                                📅 Расписание
                            </button>
                            <button class="nav-btn ${this.currentView === 'bracket' ? 'active' : ''}" 
                                    data-view="bracket">
                                🏆 Сетка
                            </button>
                            <button class="nav-btn ${this.currentView === 'settings' ? 'active' : ''}" 
                                    data-view="settings">
                                ⚙️ Настройки
                            </button>
                        </nav>

                        <div class="header-actions">
                            <div class="connection-status" id="connectionStatus">
                                <span class="status-indicator"></span>
                                <span class="status-text">Подключение...</span>
                            </div>
                            <button class="btn btn--outline" id="exportBtn">
                                📤 Экспорт
                            </button>
                        </div>
                    </div>
                </header>

                <!-- Main Content -->
                <main class="app-main">
                    <div class="view-container">
                        <div id="teamsView" class="view ${this.currentView === 'teams' ? 'active' : ''}"></div>
                        <div id="scheduleView" class="view ${this.currentView === 'schedule' ? 'active' : ''}"></div>
                        <div id="bracketView" class="view ${this.currentView === 'bracket' ? 'active' : ''}"></div>
                        <div id="settingsView" class="view ${this.currentView === 'settings' ? 'active' : ''}"></div>
                    </div>
                </main>

                <!-- Footer -->
                <footer class="app-footer">
                    <div class="footer-content">
                        <span>Illusive Cup Tournament Manager © 2024</span>
                        <div class="footer-links">
                            <button class="btn btn--link" id="helpBtn">Помощь</button>
                            <button class="btn btn--link" id="aboutBtn">О приложении</button>
                        </div>
                    </div>
                </footer>

                <!-- Модальные окна -->
                ${this.renderSettingsModal()}
                ${this.renderHelpModal()}
                ${this.renderAboutModal()}
                ${this.renderExportModal()}
            </div>
        `;
    }

    renderSettingsModal() {
        return `
            <div class="modal" id="settingsModal">
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h3>Настройки турнира</h3>
                        <button class="modal-close" id="closeSettingsModal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="settingsForm">
                            <div class="form-section">
                                <h4>Основные настройки</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="tournamentName">Название турнира</label>
                                        <input type="text" 
                                               id="tournamentName" 
                                               name="name" 
                                               class="form-input"
                                               placeholder="Illusive Cup 2024">
                                    </div>
                                    <div class="form-group">
                                        <label for="tournamentFormat">Формат турнира</label>
                                        <select id="tournamentFormat" name="format" class="form-select">
                                            <option value="round_robin">Круговой</option>
                                            <option value="single_elimination">Олимпийская</option>
                                            <option value="double_elimination">Двойная олимпийская</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="form-section">
                                <h4>Групповой этап</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="groupCount">Количество групп</label>
                                        <input type="number" 
                                               id="groupCount" 
                                               name="groups" 
                                               min="1" 
                                               max="8" 
                                               value="4"
                                               class="form-input">
                                    </div>
                                    <div class="form-group">
                                        <label for="advancingTeams">Команд в плей-офф</label>
                                        <input type="number" 
                                               id="advancingTeams" 
                                               name="advancingTeams" 
                                               min="2" 
                                               max="16" 
                                               value="8"
                                               class="form-input">
                                    </div>
                                </div>
                            </div>

                            <div class="form-section">
                                <h4>Настройки матчей</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>
                                            <input type="checkbox" name="autoSchedule" checked>
                                            Автоматическое расписание
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label>
                                            <input type="checkbox" name="notifications" checked>
                                            Уведомления о матчах
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div class="form-actions">
                                <button type="button" class="btn btn--outline" id="cancelSettingsBtn">
                                    Отмена
                                </button>
                                <button type="submit" class="btn btn--primary">
                                    Сохранить настройки
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    renderHelpModal() {
        return `
            <div class="modal" id="helpModal">
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h3>Помощь по приложению</h3>
                        <button class="modal-close" id="closeHelpModal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="help-sections">
                            <div class="help-section">
                                <h4>👥 Управление командами</h4>
                                <ul>
                                    <li>Добавляйте, редактируйте и удаляйте команды</li>
                                    <li>Указывайте состав команды с ролями и MMR</li>
                                    <li>Сортировка и поиск по командам</li>
                                </ul>
                            </div>

                            <div class="help-section">
                                <h4>📅 Расписание матчей</h4>
                                <ul>
                                    <li>Создавайте расписание группового этапа и плей-офф</li>
                                    <li>Вводите результаты матчей</li>
                                    <li>Фильтруйте матчи по статусу и стадии</li>
                                </ul>
                            </div>

                            <div class="help-section">
                                <h4>🏆 Турнирная сетка</h4>
                                <ul>
                                    <li>Автоматическая генерация сетки плей-офф</li>
                                    <li>Визуализация прогресса команд</li>
                                    <li>Автопродвижение победителей</li>
                                </ul>
                            </div>

                            <div class="help-section">
                                <h4>⚙️ Настройки</h4>
                                <ul>
                                    <li>Настройка формата турнира</li>
                                    <li>Управление группами и командами для плей-офф</li>
                                    <li>Экспорт и импорт данных</li>
                                </ul>
                            </div>
                        </div>

                        <div class="help-contact">
                            <h4>Нужна помощь?</h4>
                            <p>Если у вас возникли проблемы или вопросы, обратитесь в техническую поддержку.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAboutModal() {
        return `
            <div class="modal" id="aboutModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>О приложении</h3>
                        <button class="modal-close" id="closeAboutModal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="about-content">
                            <div class="app-logo-large">🏆</div>
                            <h2>Illusive Cup Tournament Manager</h2>
                            <p class="app-version">Версия 1.0.0</p>
                            
                            <div class="about-features">
                                <h4>Возможности:</h4>
                                <ul>
                                    <li>Полное управление турниром Dota 2</li>
                                    <li>Редактирование команд и составов</li>
                                    <li>Расписание матчей и ввод результатов</li>
                                    <li>Автоматическая генерация сеток</li>
                                    <li>Real-time обновления данных</li>
                                </ul>
                            </div>

                            <div class="about-tech">
                                <h4>Технологии:</h4>
                                <p>JavaScript, Firebase, CSS3, HTML5</p>
                            </div>

                            <div class="about-copyright">
                                <p>© 2024 Illusive Cup. Все права защищены.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderExportModal() {
        return `
            <div class="modal" id="exportModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Экспорт данных</h3>
                        <button class="modal-close" id="closeExportModal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="export-options">
                            <div class="export-option">
                                <h4>📊 Полный экспорт</h4>
                                <p>Все данные турнира в JSON формате</p>
                                <button class="btn btn--primary" id="exportFullBtn">
                                    Экспортировать все данные
                                </button>
                            </div>

                            <div class="export-option">
                                <h4>👥 Экспорт команд</h4>
                                <p>Только данные команд и игроков</p>
                                <button class="btn btn--outline" id="exportTeamsBtn">
                                    Экспортировать команды
                                </button>
                            </div>

                            <div class="export-option">
                                <h4>📅 Экспорт расписания</h4>
                                <p>Расписание матчей и результаты</p>
                                <button class="btn btn--outline" id="exportScheduleBtn">
                                    Экспортировать расписание
                                </button>
                            </div>
                        </div>

                        <div class="import-section">
                            <h4>Импорт данных</h4>
                            <div class="file-upload">
                                <input type="file" id="importFile" accept=".json" class="file-input">
                                <label for="importFile" class="btn btn--outline">
                                    📁 Выбрать файл для импорта
                                </label>
                                <button class="btn btn--primary" id="importBtn" disabled>
                                    Импортировать данные
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Навигация
        document.addEventListener('click', (e) => {
            if (e.target.dataset.view) {
                this.switchView(e.target.dataset.view);
            }
        });

        // Кнопки header
        document.addEventListener('click', (e) => {
            if (e.target.id === 'exportBtn') {
                this.openExportModal();
            }
        });

        // Кнопки footer
        document.addEventListener('click', (e) => {
            if (e.target.id === 'helpBtn') {
                this.openHelpModal();
            }
            if (e.target.id === 'aboutBtn') {
                this.openAboutModal();
            }
        });

        // Модальные окна
        this.setupModalListeners();

        // Мониторинг подключения
        this.setupConnectionMonitoring();
    }

    setupModalListeners() {
        // Настройки
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            const closeBtn = settingsModal.querySelector('#closeSettingsModal');
            const cancelBtn = settingsModal.querySelector('#cancelSettingsBtn');
            const form = settingsModal.querySelector('#settingsForm');

            const closeSettings = () => settingsModal.style.display = 'none';
            
            if (closeBtn) closeBtn.addEventListener('click', closeSettings);
            if (cancelBtn) cancelBtn.addEventListener('click', closeSettings);
            
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveSettings();
                });
            }

            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) closeSettings();
            });
        }

        // Помощь
        this.setupSimpleModal('helpModal', 'closeHelpModal');
        
        // О приложении
        this.setupSimpleModal('aboutModal', 'closeAboutModal');
        
        // Экспорт
        this.setupExportModal();
    }

    setupSimpleModal(modalId, closeBtnId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const closeBtn = modal.querySelector(`#${closeBtnId}`);
            const closeModal = () => modal.style.display = 'none';
            
            if (closeBtn) closeBtn.addEventListener('click', closeModal);
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }
    }

    setupExportModal() {
        const modal = document.getElementById('exportModal');
        if (!modal) return;

        const closeBtn = modal.querySelector('#closeExportModal');
        const closeModal = () => modal.style.display = 'none';
        
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => e.target === modal && closeModal());

        // Экспорт
        const exportFullBtn = modal.querySelector('#exportFullBtn');
        const exportTeamsBtn = modal.querySelector('#exportTeamsBtn');
        const exportScheduleBtn = modal.querySelector('#exportScheduleBtn');
        
        if (exportFullBtn) {
            exportFullBtn.addEventListener('click', () => this.exportData('full'));
        }
        if (exportTeamsBtn) {
            exportTeamsBtn.addEventListener('click', () => this.exportData('teams'));
        }
        if (exportScheduleBtn) {
            exportScheduleBtn.addEventListener('click', () => this.exportData('schedule'));
        }

        // Импорт
        const importFile = modal.querySelector('#importFile');
        const importBtn = modal.querySelector('#importBtn');
        
        if (importFile && importBtn) {
            importFile.addEventListener('change', (e) => {
                importBtn.disabled = !e.target.files.length;
            });
            
            importBtn.addEventListener('click', () => {
                this.importData(importFile.files[0]);
            });
        }
    }

    setupConnectionMonitoring() {
        const connectionStatus = document.getElementById('connectionStatus');
        if (!connectionStatus || !this.tournamentService) return;

        this.tournamentService.firebase.onConnectionChange((connected) => {
            const indicator = connectionStatus.querySelector('.status-indicator');
            const text = connectionStatus.querySelector('.status-text');
            
            if (connected) {
                indicator.className = 'status-indicator connected';
                text.textContent = 'Подключено';
                connectionStatus.title = 'Соединение с сервером активно';
            } else {
                indicator.className = 'status-indicator disconnected';
                text.textContent = 'Не подключено';
                connectionStatus.title = 'Нет соединения с сервером';
            }
        });
    }

    async switchView(viewName) {
        if (this.currentView === viewName) return;

        // Обновляем активную кнопку навигации
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Скрываем текущее представление
        const currentViewEl = document.getElementById(`${this.currentView}View`);
        if (currentViewEl) {
            currentViewEl.classList.remove('active');
        }

        // Уничтожаем текущий компонент
        if (this.components.has(this.currentView)) {
            const component = this.components.get(this.currentView);
            if (component.destroy) {
                component.destroy();
            }
            this.components.delete(this.currentView);
        }

        // Обновляем текущее представление
        this.currentView = viewName;

        // Показываем новое представление
        const newViewEl = document.getElementById(`${viewName}View`);
        if (newViewEl) {
            newViewEl.classList.add('active');
        }

        // Загружаем компонент для нового представления
        await this.loadCurrentView();
    }

    async loadCurrentView() {
        const viewContainer = document.getElementById(`${this.currentView}View`);
        if (!viewContainer) return;

        try {
            switch (this.currentView) {
                case 'teams':
                    if (!this.components.has('teams')) {
                        const teamManager = new TeamManager('teamsView', this.tournamentService);
                        this.components.set('teams', teamManager);
                    }
                    break;

                case 'schedule':
                    if (!this.components.has('schedule')) {
                        const scheduleManager = new ScheduleManager('scheduleView', this.tournamentService);
                        this.components.set('schedule', scheduleManager);
                    }
                    break;

                case 'bracket':
                    if (!this.components.has('bracket')) {
                        const bracketViewer = new BracketViewer('bracketView', this.tournamentService);
                        this.components.set('bracket', bracketViewer);
                    }
                    break;

                case 'settings':
                    await this.loadSettingsView();
                    break;
            }
        } catch (error) {
            console.error(`Error loading view ${this.currentView}:`, error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка загрузки',
                message: `Не удалось загрузить ${this.getViewTitle(this.currentView)}`
            });
        }
    }

    async loadSettingsView() {
        const viewContainer = document.getElementById('settingsView');
        if (!viewContainer) return;

        try {
            const settings = await this.tournamentService.getTournamentSettings();
            
            viewContainer.innerHTML = `
                <div class="settings-view">
                    <div class="settings-header">
                        <h2>Настройки турнира</h2>
                        <p>Управление основными параметрами турнира Illusive Cup</p>
                    </div>

                    <div class="settings-content">
                        <div class="settings-card">
                            <h3>⚙️ Основные настройки</h3>
                            <button class="btn btn--primary" id="openSettingsModalBtn">
                                Открыть настройки
                            </button>
                        </div>

                        <div class="settings-card">
                            <h3>🔄 Управление данными</h3>
                            <div class="settings-actions">
                                <button class="btn btn--outline" id="backupBtn">
                                    💾 Создать резервную копию
                                </button>
                                <button class="btn btn--outline" id="clearDataBtn">
                                    🗑️ Очистить все данные
                                </button>
                            </div>
                        </div>

                        <div class="settings-card">
                            <h3>📊 Статистика системы</h3>
                            <div class="system-stats">
                                <div class="system-stat">
                                    <span class="stat-label">Команд в системе:</span>
                                    <span class="stat-value" id="teamsCount">0</span>
                                </div>
                                <div class="system-stat">
                                    <span class="stat-label">Матчей в расписании:</span>
                                    <span class="stat-value" id="matchesCount">0</span>
                                </div>
                                <div class="system-stat">
                                    <span class="stat-label">Размер кэша:</span>
                                    <span class="stat-value" id="cacheSize">0 KB</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.setupSettingsViewListeners();
            this.updateSystemStats();

        } catch (error) {
            console.error('Error loading settings view:', error);
            viewContainer.innerHTML = `
                <div class="error-state">
                    <h3>Ошибка загрузки настроек</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    setupSettingsViewListeners() {
        // Открытие модального окна настроек
        const openSettingsBtn = document.getElementById('openSettingsModalBtn');
        if (openSettingsBtn) {
            openSettingsBtn.addEventListener('click', () => {
                this.openSettingsModal();
            });
        }

        // Резервное копирование
        const backupBtn = document.getElementById('backupBtn');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                this.createBackup();
            });
        }

        // Очистка данных
        const clearDataBtn = document.getElementById('clearDataBtn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                this.clearAllData();
            });
        }
    }

    async updateSystemStats() {
        try {
            const [teams, schedule] = await Promise.all([
                this.tournamentService.getTeams(),
                this.tournamentService.getSchedule()
            ]);

            const teamsCount = document.getElementById('teamsCount');
            const matchesCount = document.getElementById('matchesCount');
            const cacheSize = document.getElementById('cacheSize');

            if (teamsCount) teamsCount.textContent = Object.keys(teams || {}).length;
            if (matchesCount) matchesCount.textContent = (schedule || []).length;
            
            // Примерный расчет размера кэша
            if (cacheSize) {
                const size = JSON.stringify(teams).length + JSON.stringify(schedule).length;
                cacheSize.textContent = Math.round(size / 1024) + ' KB';
            }

        } catch (error) {
            console.error('Error updating system stats:', error);
        }
    }

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    openHelpModal() {
        const modal = document.getElementById('helpModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    openAboutModal() {
        const modal = document.getElementById('aboutModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    openExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    async saveSettings() {
        const form = document.getElementById('settingsForm');
        if (!form) return;

        const formData = new FormData(form);
        const settings = {
            name: formData.get('name'),
            format: formData.get('format'),
            groups: parseInt(formData.get('groups')),
            advancingTeams: parseInt(formData.get('advancingTeams')),
            autoSchedule: formData.get('autoSchedule') === 'on',
            notifications: formData.get('notifications') === 'on'
        };

        try {
            await this.tournamentService.updateTournamentSettings(settings);
            
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Настройки сохранены',
                message: 'Настройки турнира успешно обновлены',
                duration: 3000
            });

            const modal = document.getElementById('settingsModal');
            if (modal) modal.style.display = 'none';

        } catch (error) {
            console.error('Error saving settings:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка сохранения',
                message: error.message
            });
        }
    }

    async exportData(type = 'full') {
        try {
            let data;
            let filename;
            let mimeType = 'application/json';

            switch (type) {
                case 'full':
                    data = await this.tournamentService.exportData();
                    filename = `illusive_cup_full_export_${Date.now()}.json`;
                    break;
                case 'teams':
                    const teams = await this.tournamentService.getTeams();
                    data = { teams, exportedAt: new Date().toISOString() };
                    filename = `illusive_cup_teams_${Date.now()}.json`;
                    break;
                case 'schedule':
                    const schedule = await this.tournamentService.getSchedule();
                    data = { schedule, exportedAt: new Date().toISOString() };
                    filename = `illusive_cup_schedule_${Date.now()}.json`;
                    break;
            }

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            ErrorHandler.showNotification({
                type: 'success',
                title: 'Экспорт завершен',
                message: `Данные успешно экспортированы в файл ${filename}`,
                duration: 3000
            });

        } catch (error) {
            console.error('Error exporting data:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка экспорта',
                message: error.message
            });
        }
    }

    async importData(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            await this.tournamentService.importData(data);
            
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Импорт завершен',
                message: 'Данные успешно импортированы в систему',
                duration: 3000
            });

            const modal = document.getElementById('exportModal');
            if (modal) modal.style.display = 'none';

            // Перезагружаем текущее представление
            this.loadCurrentView();

        } catch (error) {
            console.error('Error importing data:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка импорта',
                message: error.message
            });
        }
    }

    async createBackup() {
        try {
            const data = await this.tournamentService.exportData();
            const backupPath = await this.tournamentService.firebase.backupData(data);
            
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Резервная копия создана',
                message: 'Резервная копия данных успешно сохранена в облаке',
                duration: 3000
            });

        } catch (error) {
            console.error('Error creating backup:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка резервного копирования',
                message: error.message
            });
        }
    }

    async clearAllData() {
        const confirmed = confirm(
            'ВНИМАНИЕ: Вы уверены, что хотите очистить ВСЕ данные турнира?\n\n' +
            'Это действие удалит все команды, расписание и настройки. ' +
            'Отменить это действие будет невозможно.\n\n' +
            'Рекомендуется создать резервную копию перед очисткой.'
        );

        if (!confirmed) return;

        try {
            // Очищаем все данные в Firebase
            await this.tournamentService.set('tournament/teams', null);
            await this.tournamentService.set('tournament/schedule', null);
            await this.tournamentService.set('tournament/bracket', null);
            await this.tournamentService.set('tournament/settings', null);

            // Очищаем локальный кэш
            this.tournamentService.clearCache();

            ErrorHandler.showNotification({
                type: 'success',
                title: 'Данные очищены',
                message: 'Все данные турнира успешно удалены',
                duration: 5000
            });

            // Перезагружаем приложение
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Error clearing data:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка очистки',
                message: error.message
            });
        }
    }

    getViewTitle(view) {
        const titles = {
            teams: 'Команды',
            schedule: 'Расписание',
            bracket: 'Турнирная сетка',
            settings: 'Настройки'
        };
        return titles[view] || view;
    }

    destroy() {
        // Уничтожаем все компоненты
        this.components.forEach((component, view) => {
            if (component.destroy) {
                component.destroy();
            }
        });
        this.components.clear();

        // Отключаем сервисы
        if (this.tournamentService) {
            this.tournamentService.firebase.disconnect();
        }
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.illusiveCupApp = new IllusiveCupApp();
});

// Глобальные обработчики ошибок
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
