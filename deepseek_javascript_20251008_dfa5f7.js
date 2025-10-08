// js/app.js
import AppConfig from './config/app-config.js';
import ErrorHandler from './utils/error-handler.js';
import PerformanceOptimizer from './utils/performance-optimizer.js';
import { AppState } from './utils/state-manager.js';
import { firebaseService } from './services/firebase-service.js';
import { securityService } from './services/security-service.js';
import { teamsManager } from './managers/teams-manager.js';
import { tournamentManager } from './managers/tournament-manager.js';
import UIManager from './ui/ui-manager.js';

export class TournamentApp {
    constructor() {
        this.isInitialized = false;
        this.modules = new Map();
        this.uiManager = null;
    }

    async initialize() {
        try {
            console.log('🚀 Инициализация Illusive Cup Tournament App...');

            // Инициализация системных утилит
            await this.initializeSystem();
            
            // Инициализация сервисов
            await this.initializeServices();
            
            // Инициализация менеджеров
            await this.initializeManagers();
            
            // Инициализация UI
            await this.initializeUI();
            
            // Загрузка начальных данных
            await this.loadInitialData();
            
            // Финальная настройка
            await this.finalizeInitialization();

            this.isInitialized = true;
            console.log('✅ Tournament App успешно инициализирован');

        } catch (error) {
            console.error('💥 Критическая ошибка инициализации:', error);
            await this.handleFatalError(error);
        }
    }

    async initializeSystem() {
        // Инициализация обработчика ошибок
        ErrorHandler.init();

        // Инициализация оптимизатора производительности
        PerformanceOptimizer.init();

        // Настройка глобальных обработчиков
        this.setupGlobalHandlers();

        console.log('✅ Системные утилиты инициализированы');
    }

    async initializeServices() {
        // Инициализация Firebase
        await firebaseService.initialize();
        this.modules.set('firebase', firebaseService);

        // Инициализация безопасности
        await securityService.initialize();
        this.modules.set('security', securityService);

        // Мониторинг подключения
        firebaseService.onConnectionChange((connected) => {
            this.handleConnectionChange(connected);
        });

        console.log('✅ Сервисы инициализированы');
    }

    async initializeManagers() {
        // Инициализация менеджера команд
        await teamsManager.initialize();
        this.modules.set('teams', teamsManager);

        // Инициализация менеджера турнира
        await tournamentManager.initialize();
        this.modules.set('tournament', tournamentManager);

        console.log('✅ Менеджеры данных инициализированы');
    }

    async initializeUI() {
        this.uiManager = new UIManager();
        await this.uiManager.initialize();
        this.modules.set('ui', this.uiManager);

        console.log('✅ UI Manager инициализирован');
    }

    async loadInitialData() {
        try {
            // Предзагрузка критических данных
            await PerformanceOptimizer.preloadCriticalData([
                { 
                    promise: teamsManager.getAllTeams(), 
                    priority: 'high' 
                },
                { 
                    promise: tournamentManager.exportTournamentData(), 
                    priority: 'high' 
                }
            ]);

            // Загрузка дополнительных данных в фоне
            this.loadBackgroundData();

            console.log('✅ Начальные данные загружены');
        } catch (error) {
            console.warn('⚠️ Ошибка загрузки начальных данных:', error);
        }
    }

    async finalizeInitialization() {
        // Проверка доступа по URL параметрам
        await this.checkURLAccess();

        // Запуск фоновых процессов
        this.startBackgroundProcesses();

        // Отслеживание метрик
        this.trackInitializationMetrics();

        // Оповещение о готовности
        this.notifyReady();

        console.log('🎉 Приложение готово к работе');
    }

    setupGlobalHandlers() {
        // Обработка глобальных ошибок
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

        // Обработка онлайн/офлайн статуса
        window.addEventListener('online', this.handleOnlineStatus.bind(this));
        window.addEventListener('offline', this.handleOfflineStatus.bind(this));

        // Обработка видимости страницы
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // Защита от потери данных при закрытии страницы
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

        console.log('✅ Глобальные обработчики настроены');
    }

    handleConnectionChange(connected) {
        AppState.set('connectionStatus', connected ? 'connected' : 'disconnected');
        
        if (connected) {
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Подключение восстановлено',
                message: 'Синхронизация данных...',
                duration: 3000
            });
        } else {
            ErrorHandler.showNotification({
                type: 'warning',
                title: 'Потеряно подключение',
                message: 'Работа в оффлайн режиме',
                duration: 5000
            });
        }
    }

    async handleGlobalError(event) {
        console.error('💥 Глобальная ошибка в приложении:', event.error);
        
        // Логируем ошибку для последующего анализа
        ErrorHandler.logError(event.error, 'app_global');
        
        // Показываем пользовательское сообщение
        if (!this.isCriticalError(event.error)) {
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Произошла ошибка',
                message: 'Мы уже работаем над исправлением',
                duration: 5000
            });
        }
    }

    handleUnhandledRejection(event) {
        console.error('💥 Необработанный Promise:', event.reason);
        ErrorHandler.logError(event.reason, 'app_promise');
    }

    handleOnlineStatus() {
        console.log('🌐 Онлайн статус восстановлен');
        AppState.set('networkStatus', 'online');
        
        // Пытаемся переподключиться к Firebase
        setTimeout(() => {
            firebaseService.initialize().catch(console.error);
        }, 1000);
    }

    handleOfflineStatus() {
        console.log('🌐 Потеряно интернет-соединение');
        AppState.set('networkStatus', 'offline');
    }

    handleVisibilityChange() {
        const isVisible = document.visibilityState === 'visible';
        AppState.set('appVisible', isVisible);
        
        if (isVisible) {
            // Приложение стало видимым - проверяем соединение
            this.checkConnection();
        }
    }

    handleBeforeUnload(event) {
        if (securityService.isAuthenticated) {
            securityService.logout('Пользователь закрыл страницу');
        }

        // Сохраняем критичные данные
        this.saveCriticalData();

        // Можно показать предупреждение о несохраненных данных
        if (this.hasUnsavedChanges()) {
            event.preventDefault();
            event.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите уйти?';
            return event.returnValue;
        }
    }

    async checkURLAccess() {
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const editorMode = urlParams.get('editor');

        try {
            if (accessToken) {
                await securityService.authenticate(null, { 
                    isTemporary: true, 
                    token: accessToken 
                });
                
                // Очищаем URL от токена
                window.history.replaceState({}, '', window.location.pathname);
                
                ErrorHandler.showNotification({
                    type: 'success',
                    title: 'Временный доступ предоставлен',
                    message: 'Доступ действителен 24 часа',
                    duration: 5000
                });
            } else if (editorMode === 'true') {
                this.uiManager.showAuthModal();
            }
        } catch (error) {
            console.warn('⚠️ Ошибка проверки доступа по URL:', error);
        }
    }

    loadBackgroundData() {
        // Фоновая загрузка не критичных данных
        PerformanceOptimizer.idleCallback(() => {
            // Загрузка дополнительной статистики
            // Предзагрузка следующих разделов
            // Кэширование ресурсов
        }, 2000);
    }

    startBackgroundProcesses() {
        // Периодическая синхронизация
        setInterval(() => {
            this.backgroundSync();
        }, 30000); // Каждые 30 секунд

        // Очистка памяти
        setInterval(() => {
            this.cleanupMemory();
        }, 60000); // Каждую минуту

        // Сохранение состояния
        setInterval(() => {
            this.autoSave();
        }, 30000); // Каждые 30 секунд
    }

    async backgroundSync() {
        if (!firebaseService.isConnected) return;

        try {
            // Синхронизация данных
            await Promise.allSettled([
                teamsManager.saveToCache(),
                // Другие менеджеры...
            ]);

            // Обновление метрик
            this.updatePerformanceMetrics();
        } catch (error) {
            console.warn('⚠️ Ошибка фоновой синхронизации:', error);
        }
    }

    cleanupMemory() {
        PerformanceOptimizer.cleanup();
        
        // Очистка кэша если нужно
        if (PerformanceOptimizer.getMetrics().memory_usage > 0.8) {
            console.log('🧹 Очистка памяти...');
            // Логика очистки кэша
        }
    }

    autoSave() {
        // Автосохранение важных данных
        if (this.hasUnsavedChanges()) {
            this.saveCriticalData();
        }
    }

    trackInitializationMetrics() {
        if ('performance' in window) {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                const metrics = {
                    loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                    domReady: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                    totalTime: perfData.loadEventEnd - perfData.navigationStart,
                    initTime: Date.now() - perfData.navigationStart
                };

                PerformanceOptimizer.trackMetric('app_initialization', metrics);
                console.log('📊 Метрики инициализации:', metrics);
            }
        }
    }

    notifyReady() {
        const event = new CustomEvent('app:ready', {
            detail: { 
                timestamp: Date.now(),
                version: '2.0.0'
            }
        });
        document.dispatchEvent(event);
    }

    async checkConnection() {
        try {
            const isConnected = await firebaseService.testConnection();
            AppState.set('connectionStatus', isConnected ? 'connected' : 'disconnected');
            return isConnected;
        } catch (error) {
            AppState.set('connectionStatus', 'error');
            return false;
        }
    }

    saveCriticalData() {
        try {
            // Сохраняем важные данные в localStorage
            const criticalData = {
                teams: teamsManager.getAllTeams(),
                tournament: tournamentManager.exportTournamentData(),
                timestamp: Date.now()
            };

            localStorage.setItem('app_critical_data', JSON.stringify(criticalData));
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить критические данные:', error);
        }
    }

    hasUnsavedChanges() {
        // Проверяем наличие несохраненных изменений
        const unsavedChanges = AppState.get('unsavedChanges', false);
        return unsavedChanges === true;
    }

    isCriticalError(error) {
        const criticalErrors = [
            'FirebaseError',
            'NetworkError',
            'TypeError',
            'ReferenceError'
        ];

        return criticalErrors.some(criticalError => 
            error.name?.includes(criticalError) || 
            error.message?.includes(criticalError)
        );
    }

    async handleFatalError(error) {
        console.error('💥 Фатальная ошибка приложения:', error);

        // Сохраняем состояние для отладки
        this.saveErrorState(error);

        // Показываем экран ошибки
        ErrorHandler.showFallbackUI(error);

        // Пытаемся восстановиться
        setTimeout(() => {
            this.attemptRecovery();
        }, 5000);
    }

    saveErrorState(error) {
        const errorState = {
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            appState: AppState.serialize(),
            modules: Array.from(this.modules.keys()),
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        try {
            sessionStorage.setItem('app_error_state', JSON.stringify(errorState));
        } catch (e) {
            console.warn('⚠️ Не удалось сохранить состояние ошибки:', e);
        }
    }

    async attemptRecovery() {
        try {
            console.log('🔄 Попытка восстановления...');

            // Очищаем состояние
            AppState.clear();

            // Переинициализируем модули
            for (const [name, module] of this.modules) {
                if (typeof module.destroy === 'function') {
                    module.destroy();
                }
            }
            this.modules.clear();

            // Пытаемся перезагрузить
            await this.initialize();

        } catch (recoveryError) {
            console.error('💥 Восстановление не удалось:', recoveryError);
            
            // Предлагаем полную перезагрузку
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Критическая ошибка',
                message: 'Требуется перезагрузка страницы',
                actions: [
                    {
                        id: 'reload',
                        label: 'Перезагрузить',
                        handler: () => window.location.reload()
                    }
                ]
            });
        }
    }

    // Публичные методы
    getModule(name) {
        return this.modules.get(name);
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            modules: Array.from(this.modules.keys()),
            connection: firebaseService.isConnected,
            authentication: securityService.getAuthStatus(),
            performance: PerformanceOptimizer.getMetrics()
        };
    }

    async destroy() {
        console.log('🛑 Завершение работы приложения...');

        // Сохраняем данные
        this.saveCriticalData();

        // Останавливаем модули
        for (const [name, module] of this.modules) {
            if (typeof module.destroy === 'function') {
                await module.destroy();
            }
        }

        // Очищаем состояние
        AppState.clear();

        this.isInitialized = false;
        this.modules.clear();
        this.uiManager = null;

        console.log('✅ Приложение завершило работу');
    }
}

// Инициализация приложения
const app = new TournamentApp();

// Глобальная ссылка для отладки
window.tournamentApp = app;

// Запуск при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await app.initialize();
    } catch (error) {
        console.error('💥 Не удалось запустить приложение:', error);
        ErrorHandler.showFallbackUI(error);
    }
});

// Глобальные обработчики ошибок для асинхронного кода
window.addEventListener('error', (event) => {
    console.error('💥 Глобальная ошибка:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('💥 Необработанный Promise:', event.reason);
});

export default app;