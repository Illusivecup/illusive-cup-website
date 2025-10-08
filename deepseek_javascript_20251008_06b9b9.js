// js/utils/error-handler.js
import AppConfig from '../config/app-config.js';

export class ErrorHandler {
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
            duration: AppConfig.UI.NOTIFICATION_TIMEOUT
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
            duration: AppConfig.UI.NOTIFICATION_TIMEOUT
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
        if (AppConfig.DEBUG) {
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
            const cached = localStorage.getItem(AppConfig.CACHE.PREFIX + 'fallback_data');
            return cached ? JSON.parse(cached) : {};
        } catch {
            return {};
        }
    }

    static async cacheCriticalData(data) {
        try {
            localStorage.setItem(
                AppConfig.CACHE.PREFIX + 'fallback_data',
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

export default ErrorHandler;