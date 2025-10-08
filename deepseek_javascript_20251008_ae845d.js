// js/services/firebase-service.js
import AppConfig from '../config/app-config.js';
import ErrorHandler from '../utils/error-handler.js';
import PerformanceOptimizer from '../utils/performance-optimizer.js';

export class FirebaseService {
    constructor() {
        this.app = null;
        this.database = null;
        this.isConnected = false;
        this.connectionListeners = new Set();
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    async initialize() {
        try {
            if (this.app) {
                console.log('🔥 Firebase уже инициализирован');
                return;
            }

            // Инициализация Firebase
            this.app = firebase.initializeApp(AppConfig.FIREBASE_CONFIG);
            this.database = firebase.database();
            
            // Настройка мониторинга подключения
            this.setupConnectionMonitoring();
            
            // Проверка подключения
            await this.testConnection();
            
            console.log('✅ Firebase Service инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации Firebase:', error);
            ErrorHandler.showNotification({
                type: 'error',
                title: 'Ошибка подключения к базе данных',
                message: 'Приложение работает в оффлайн режиме'
            });
            throw error;
        }
    }

    setupConnectionMonitoring() {
        const connectedRef = this.database.ref('.info/connected');
        
        connectedRef.on('value', (snapshot) => {
            const connected = snapshot.val() === true;
            this.handleConnectionChange(connected);
        });

        // Мониторинг потери соединения
        this.database.ref('.info/connected').on('value', (snapshot) => {
            if (snapshot.val() === false) {
                this.handleDisconnection();
            }
        });
    }

    handleConnectionChange(connected) {
        const previousState = this.isConnected;
        this.isConnected = connected;

        if (connected && !previousState) {
            console.log('✅ Подключение к Firebase восстановлено');
            this.retryCount = 0;
        } else if (!connected && previousState) {
            console.warn('❌ Потеряно подключение к Firebase');
        }

        // Уведомляем слушателей
        this.connectionListeners.forEach(listener => {
            try {
                listener(connected, previousState);
            } catch (error) {
                console.error('Ошибка в обработчике подключения:', error);
            }
        });
    }

    handleDisconnection() {
        this.retryCount++;
        
        if (this.retryCount <= this.maxRetries) {
            console.log(`🔄 Попытка переподключения ${this.retryCount}/${this.maxRetries}`);
        } else {
            ErrorHandler.showNotification({
                type: 'warning',
                title: 'Проблемы с подключением',
                message: 'Проверьте интернет-соединение'
            });
        }
    }

    async testConnection() {
        try {
            const testRef = this.database.ref('connection_test');
            await testRef.set({ timestamp: Date.now() });
            await testRef.remove();
            return true;
        } catch (error) {
            console.error('❌ Тест подключения не пройден:', error);
            return false;
        }
    }

    onConnectionChange(callback) {
        this.connectionListeners.add(callback);
        
        // Возвращаем функцию отписки
        return () => {
            this.connectionListeners.delete(callback);
        };
    }

    // Базовые операции с базой данных
    async get(path) {
        try {
            const snapshot = await this.database.ref(path).once('value');
            return snapshot.val();
        } catch (error) {
            console.error(`❌ Ошибка чтения из ${path}:`, error);
            throw error;
        }
    }

    async set(path, data) {
        try {
            await this.database.ref(path).set(data);
            return true;
        } catch (error) {
            console.error(`❌ Ошибка записи в ${path}:`, error);
            throw error;
        }
    }

    async update(path, updates) {
        try {
            await this.database.ref(path).update(updates);
            return true;
        } catch (error) {
            console.error(`❌ Ошибка обновления ${path}:`, error);
            throw error;
        }
    }

    async push(path, data) {
        try {
            const ref = this.database.ref(path).push();
            await ref.set(data);
            return ref.key;
        } catch (error) {
            console.error(`❌ Ошибка добавления в ${path}:`, error);
            throw error;
        }
    }

    async remove(path) {
        try {
            await this.database.ref(path).remove();
            return true;
        } catch (error) {
            console.error(`❌ Ошибка удаления ${path}:`, error);
            throw error;
        }
    }

    // Реальное время - подписки на данные
    subscribe(path, callback, options = {}) {
        const {
            once = false,
            errorHandler = null
        } = options;

        const ref = this.database.ref(path);
        
        const eventType = once ? 'once' : 'on';
        const handler = ref[eventType]('value', 
            (snapshot) => {
                PerformanceOptimizer.trackMetric(`firebase_subscription_${path}`, Date.now());
                callback(snapshot.val(), snapshot);
            },
            (error) => {
                console.error(`❌ Ошибка подписки на ${path}:`, error);
                if (errorHandler) {
                    errorHandler(error);
                } else {
                    ErrorHandler.showNotification({
                        type: 'error',
                        title: 'Ошибка загрузки данных',
                        message: `Не удалось загрузить данные из ${path}`
                    });
                }
            }
        );

        // Возвращаем функцию отписки
        return () => {
            ref.off('value', handler);
        };
    }

    subscribeChild(path, callback, eventType = 'child_added') {
        const ref = this.database.ref(path);
        
        const handler = ref.on(eventType, 
            (snapshot) => {
                callback(snapshot.val(), snapshot.key, snapshot);
            },
            (error) => {
                console.error(`❌ Ошибка подписки на детей ${path}:`, error);
            }
        );

        return () => {
            ref.off(eventType, handler);
        };
    }

    // Пакетные операции
    async batchSet(updates) {
        try {
            await this.database.ref().update(updates);
            return true;
        } catch (error) {
            console.error('❌ Ошибка пакетной записи:', error);
            throw error;
        }
    }

    // Транзакции
    async transaction(path, transactionUpdate) {
        try {
            const result = await this.database.ref(path).transaction(transactionUpdate);
            return result;
        } catch (error) {
            console.error(`❌ Ошибка транзакции в ${path}:`, error);
            throw error;
        }
    }

    // Оффлайн возможности
    enableOfflinePersistance() {
        try {
            firebase.database().setPersistenceEnabled(true);
            console.log('✅ Включено оффлайн кэширование');
        } catch (error) {
            console.warn('⚠️ Оффлайн кэширование не поддерживается:', error);
        }
    }

    // Безопасность и валидация
    async validateWriteAccess(path) {
        // В реальном приложении здесь была бы проверка правил безопасности
        try {
            const testRef = this.database.ref(`${path}/_write_test`);
            await testRef.set({ test: Date.now() });
            await testRef.remove();
            return true;
        } catch (error) {
            console.error(`❌ Нет прав на запись в ${path}:`, error);
            return false;
        }
    }

    // Утилиты
    generateId() {
        return this.database.ref().push().key;
    }

    getTimestamp() {
        return firebase.database.ServerValue.TIMESTAMP;
    }

    // Очистка
    destroy() {
        if (this.app) {
            this.connectionListeners.clear();
            this.app.delete();
            this.app = null;
            this.database = null;
            console.log('🔥 Firebase Service уничтожен');
        }
    }
}

// Глобальный экземпляр
export const firebaseService = new FirebaseService();

export default FirebaseService;