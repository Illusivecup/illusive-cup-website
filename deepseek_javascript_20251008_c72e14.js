// js/services/security-service.js
import AppConfig from '../config/app-config.js';
import ErrorHandler from '../utils/error-handler.js';
import { firebaseService } from './firebase-service.js';

export class SecurityService {
    constructor() {
        this.isAuthenticated = false;
        this.sessionTimer = null;
        this.inactivityTimer = null;
        this.loginAttempts = 0;
        this.maxLoginAttempts = AppConfig.SECURITY.MAX_LOGIN_ATTEMPTS;
        this.sessionData = null;
    }

    async initialize() {
        await this.checkExistingSession();
        this.setupActivityMonitoring();
        console.log('✅ Security Service инициализирован');
    }

    async authenticate(password, options = {}) {
        const { isTemporary = false, token = null } = options;

        // Защита от brute force
        if (this.loginAttempts >= this.maxLoginAttempts) {
            const cooldown = this.getCooldownTime();
            throw new Error(`Слишком много попыток. Попробуйте через ${cooldown} минут`);
        }

        // Имитация задержки для безопасности
        await this.securityDelay();

        try {
            let isValid = false;

            if (isTemporary && token) {
                isValid = await this.validateTemporaryToken(token);
            } else {
                isValid = await this.validatePassword(password);
            }

            if (isValid) {
                await this.startSession({ isTemporary, token });
                this.loginAttempts = 0;
                return true;
            } else {
                this.loginAttempts++;
                const attemptsLeft = this.maxLoginAttempts - this.loginAttempts;
                
                if (attemptsLeft > 0) {
                    throw new Error(`Неверный пароль. Осталось попыток: ${attemptsLeft}`);
                } else {
                    throw new Error('Превышено количество попыток входа');
                }
            }
        } catch (error) {
            console.error('❌ Ошибка аутентификации:', error);
            throw error;
        }
    }

    async validatePassword(password) {
        // В реальном приложении пароль должен храниться безопасно
        // и проверяться через хеширование
        try {
            // Временно используем простую проверку
            // В продакшене замените на безопасную проверку
            const storedHash = await this.getStoredPasswordHash();
            return this.hashPassword(password) === storedHash;
        } catch (error) {
            console.error('❌ Ошибка валидации пароля:', error);
            return false;
        }
    }

    async validateTemporaryToken(token) {
        try {
            const tokenData = await firebaseService.get(`temporary_access/${token}`);
            
            if (!tokenData) {
                throw new Error('Токен не найден');
            }

            if (tokenData.used) {
                throw new Error('Токен уже использован');
            }

            if (Date.now() > tokenData.expiresAt) {
                throw new Error('Срок действия токена истек');
            }

            // Помечаем токен как использованный
            await firebaseService.update(`temporary_access/${token}`, { used: true });

            return true;
        } catch (error) {
            console.error('❌ Ошибка валидации токена:', error);
            throw error;
        }
    }

    async startSession(sessionOptions = {}) {
        const sessionId = this.generateSessionId();
        const sessionData = {
            id: sessionId,
            authenticated: true,
            timestamp: Date.now(),
            expiresAt: Date.now() + AppConfig.SECURITY.SESSION_TIMEOUT,
            userAgent: navigator.userAgent,
            ipHash: this.generateIPHash(),
            isTemporary: sessionOptions.isTemporary || false,
            token: sessionOptions.token || null
        };

        // Сохраняем сессию
        this.sessionData = sessionData;
        this.isAuthenticated = true;

        // Сохраняем в localStorage
        this.saveSessionToStorage(sessionData);

        // Сохраняем в Firebase (опционально)
        await this.saveSessionToFirebase(sessionData);

        // Настраиваем таймеры
        this.setupSessionTimers();

        console.log('🔐 Сессия начата:', sessionId);
        return sessionId;
    }

    async checkExistingSession() {
        try {
            const sessionData = this.getSessionFromStorage();
            
            if (!sessionData) {
                return false;
            }

            // Проверяем срок действия
            if (Date.now() > sessionData.expiresAt) {
                this.clearSession();
                return false;
            }

            // Проверяем user agent
            if (sessionData.userAgent !== navigator.userAgent) {
                console.warn('⚠️ User agent изменился, требуется повторная аутентификация');
                this.clearSession();
                return false;
            }

            // Восстанавливаем сессию
            this.sessionData = sessionData;
            this.isAuthenticated = true;
            this.setupSessionTimers();

            console.log('🔐 Сессия восстановлена');
            return true;

        } catch (error) {
            console.error('❌ Ошибка проверки сессии:', error);
            this.clearSession();
            return false;
        }
    }

    setupSessionTimers() {
        this.clearTimers();

        // Таймер истечения сессии
        const timeUntilExpiry = this.sessionData.expiresAt - Date.now();
        this.sessionTimer = setTimeout(() => {
            this.handleSessionExpiry();
        }, timeUntilExpiry);

        // Таймер неактивности
        this.resetInactivityTimer();
    }

    setupActivityMonitoring() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, this.resetInactivityTimer.bind(this), { passive: true });
        });

        // Мониторинг видимости страницы
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.resetInactivityTimer();
            }
        });
    }

    resetInactivityTimer() {
        if (!this.isAuthenticated) return;

        clearTimeout(this.inactivityTimer);

        this.inactivityTimer = setTimeout(() => {
            this.handleInactivity();
        }, AppConfig.SECURITY.SESSION_TIMEOUT);
    }

    handleSessionExpiry() {
        console.log('⏰ Сессия истекла по времени');
        this.logout('Сессия истекла по времени');
        
        ErrorHandler.showNotification({
            type: 'warning',
            title: 'Сессия истекла',
            message: 'Пожалуйста, войдите снова'
        });
    }

    handleInactivity() {
        console.log('⏰ Сессия истекла из-за неактивности');
        this.logout('Сессия истекла из-за неактивности');
        
        ErrorHandler.showNotification({
            type: 'warning',
            title: 'Сессия истекла',
            message: 'Из-за неактивности требуется повторный вход'
        });
    }

    logout(reason = 'Пользователь вышел') {
        console.log(`🔐 Выход из системы: ${reason}`);
        
        this.isAuthenticated = false;
        this.sessionData = null;
        this.clearTimers();
        this.clearSessionStorage();
        
        // Оповещаем о выходе
        this.notifyLogout(reason);
    }

    async generateTemporaryAccess(durationHours = 24) {
        if (!this.isAuthenticated) {
            throw new Error('Требуется аутентификация');
        }

        const token = this.generateToken();
        const expiresAt = Date.now() + (durationHours * 60 * 60 * 1000);

        const accessData = {
            token,
            expiresAt,
            createdAt: Date.now(),
            createdBy: this.sessionData.id,
            used: false,
            durationHours
        };

        await firebaseService.set(`temporary_access/${token}`, accessData);

        const accessLink = `${window.location.origin}${window.location.pathname}?access_token=${token}`;
        
        return {
            token,
            link: accessLink,
            expiresAt: new Date(expiresAt).toLocaleString('ru-RU'),
            durationHours
        };
    }

    async changePassword(newPassword, currentPassword = null) {
        if (!this.isAuthenticated) {
            throw new Error('Требуется аутентификация');
        }

        // В реальном приложении здесь была бы проверка текущего пароля
        // и безопасное хеширование нового пароля

        try {
            const passwordHash = this.hashPassword(newPassword);
            await this.storePasswordHash(passwordHash);

            // Завершаем все сессии кроме текущей
            await this.invalidateOtherSessions();

            ErrorHandler.showNotification({
                type: 'success',
                title: 'Пароль изменен',
                message: 'Пароль успешно обновлен'
            });

            return true;

        } catch (error) {
            console.error('❌ Ошибка смены пароля:', error);
            throw new Error('Не удалось изменить пароль');
        }
    }

    // Утилиты безопасности
    generateSessionId() {
        return 'session_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    generateToken() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        
        for (let i = 0; i < AppConfig.SECURITY.TOKEN_LENGTH; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return 'temp_' + token;
    }

    hashPassword(password) {
        // В реальном приложении используйте безопасное хеширование
        // Например: bcrypt, Argon2, или PBKDF2
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    generateIPHash() {
        // Упрощенная имитация хеша IP (в реальном приложении IP должен обрабатываться на сервере)
        return btoa(navigator.userAgent + navigator.language).substr(0, 16);
    }

    getCooldownTime() {
        const baseCooldown = 1; // минута
        return baseCooldown * Math.pow(2, this.loginAttempts - this.maxLoginAttempts);
    }

    async securityDelay() {
        // Имитация задержки для защиты от timing attacks
        const baseDelay = 500 + Math.random() * 500;
        const penalty = this.loginAttempts * 200;
        await new Promise(resolve => setTimeout(resolve, baseDelay + penalty));
    }

    // Работа с хранилищем
    saveSessionToStorage(sessionData) {
        try {
            localStorage.setItem('editor_session', JSON.stringify(sessionData));
            sessionStorage.setItem('editor_active', 'true');
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить сессию в хранилище:', error);
        }
    }

    getSessionFromStorage() {
        try {
            const sessionJson = localStorage.getItem('editor_session');
            return sessionJson ? JSON.parse(sessionJson) : null;
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить сессию из хранилища:', error);
            return null;
        }
    }

    clearSessionStorage() {
        try {
            localStorage.removeItem('editor_session');
            sessionStorage.removeItem('editor_active');
        } catch (error) {
            console.warn('⚠️ Не удалось очистить хранилище сессии:', error);
        }
    }

    async saveSessionToFirebase(sessionData) {
        try {
            await firebaseService.set(`sessions/${sessionData.id}`, {
                ...sessionData,
                // Не сохраняем чувствительные данные в Firebase
                userAgent: undefined,
                ipHash: undefined
            });
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить сессию в Firebase:', error);
        }
    }

    async invalidateOtherSessions() {
        try {
            if (this.sessionData) {
                // Помечаем все сессии кроме текущей как недействительные
                const sessions = await firebaseService.get('sessions');
                if (sessions) {
                    const updates = {};
                    Object.keys(sessions).forEach(sessionId => {
                        if (sessionId !== this.sessionData.id) {
                            updates[`sessions/${sessionId}/valid`] = false;
                        }
                    });
                    await firebaseService.batchSet(updates);
                }
            }
        } catch (error) {
            console.warn('⚠️ Не удалось инвалидировать другие сессии:', error);
        }
    }

    async getStoredPasswordHash() {
        // В реальном приложении хеш должен храниться безопасно
        // Здесь упрощенная реализация для демонстрации
        try {
            const stored = await firebaseService.get('admin/password_hash');
            return stored || this.hashPassword('IllusiveCup2025!'); // fallback
        } catch (error) {
            return this.hashPassword('IllusiveCup2025!');
        }
    }

    async storePasswordHash(hash) {
        try {
            await firebaseService.set('admin/password_hash', hash);
        } catch (error) {
            console.error('❌ Не удалось сохранить хеш пароля:', error);
            throw error;
        }
    }

    // Оповещения
    notifyLogout(reason) {
        const event = new CustomEvent('security:logout', {
            detail: { reason }
        });
        document.dispatchEvent(event);
    }

    // Очистка
    clearTimers() {
        clearTimeout(this.sessionTimer);
        clearTimeout(this.inactivityTimer);
        this.sessionTimer = null;
        this.inactivityTimer = null;
    }

    destroy() {
        this.clearTimers();
        console.log('✅ Security Service уничтожен');
    }

    // Геттеры
    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            sessionData: this.sessionData ? { ...this.sessionData } : null,
            loginAttempts: this.loginAttempts,
            maxAttempts: this.maxLoginAttempts
        };
    }

    requireAuth() {
        if (!this.isAuthenticated) {
            throw new Error('Требуется аутентификация');
        }
        return true;
    }
}

// Глобальный экземпляр
export const securityService = new SecurityService();

export default SecurityService;