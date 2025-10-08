// js/utils/state-manager.js
export class StateManager {
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
export const AppState = new StateManager('illusive_cup');

export default StateManager;