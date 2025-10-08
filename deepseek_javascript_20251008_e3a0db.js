// js/utils/performance-optimizer.js
import AppConfig from '../config/app-config.js';

export class PerformanceOptimizer {
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

    static debounce(key, callback, delay = AppConfig.PERFORMANCE.DEBOUNCE.INPUT) {
        this.clearDebounce(key);
        
        const timer = setTimeout(() => {
            this.trackMetric(`debounce_${key}`, Date.now());
            callback();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timer);
    }

    static throttle(key, callback, delay = AppConfig.PERFORMANCE.THROTTLE.SCROLL) {
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
}

export default PerformanceOptimizer;