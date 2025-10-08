// js/init.js
import app from './app.js';
import ErrorHandler from './utils/error-handler.js';

// Проверка поддержки браузером необходимых функций
function checkBrowserSupport() {
    const requiredFeatures = [
        'Promise',
        'Map',
        'Set',
        'Object.entries',
        'Array.prototype.includes',
        'String.prototype.includes'
    ];

    const missingFeatures = requiredFeatures.filter(feature => !window[feature]);

    if (missingFeatures.length > 0) {
        throw new Error(`Браузер не поддерживает необходимые функции: ${missingFeatures.join(', ')}`);
    }

    // Проверка поддержки современных API
    if (!('content' in document.createElement('template'))) {
        throw new Error('Браузер не поддерживает HTML templates');
    }

    return true;
}

// Показать экран загрузки
function showLoadingScreen() {
    const loadingHTML = `
        <div class="loading-overlay" id="appLoading">
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p class="loading-text">Загрузка Illusive Cup...</p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
}

// Скрыть экран загрузки
function hideLoadingScreen() {
    const loadingElement = document.getElementById('appLoading');
    if (loadingElement) {
        loadingElement.style.opacity = '0';
        setTimeout(() => {
            loadingElement.remove();
        }, 300);
    }
}

// Основная функция инициализации
async function initializeApp() {
    try {
        console.log('🚀 Запуск Illusive Cup Tournament App...');
        
        // Показываем экран загрузки
        showLoadingScreen();
        
        // Проверяем поддержку браузера
        checkBrowserSupport();
        
        // Инициализируем приложение
        await app.initialize();
        
        // Скрываем экран загрузки
        hideLoadingScreen();
        
        console.log('🎉 Приложение успешно запущено!');
        
    } catch (error) {
        console.error('💥 Критическая ошибка запуска:', error);
        
        // Скрываем экран загрузки
        hideLoadingScreen();
        
        // Показываем экран ошибки
        ErrorHandler.showFallbackUI(error);
    }
}

// Запуск при полной загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Экспортируем глобальные объекты для отладки
window.tournamentApp = app;

// Глобальные обработчики ошибок
window.addEventListener('error', (event) => {
    console.error('💥 Глобальная ошибка:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('💥 Необработанный Promise:', event.reason);
});

// Service Worker регистрация (для PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('✅ ServiceWorker зарегистрирован:', registration);
            })
            .catch((error) => {
                console.log('❌ Ошибка регистрации ServiceWorker:', error);
            });
    });
}