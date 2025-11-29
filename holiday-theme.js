// holiday-theme.js - Новогоднее обновление "Новогоднее чудо"
class HolidayTheme {
    constructor() {
        this.isEnabled = false;
        this.themeName = "Новогоднее чудо";
        this.init();
    }

    async init() {
        await this.checkThemeStatus();
        
        if (this.isEnabled) {
            this.applyTheme();
            console.log(`🎄 ${this.themeName} активировано для всех пользователей!`);
        }
    }

    async checkThemeStatus() {
        // Проверяем глобальную настройку в Firebase
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            try {
                const themeRef = firebase.database().ref('systemSettings/holidayThemeEnabled');
                const snapshot = await themeRef.get();
                
                if (snapshot.exists()) {
                    this.isEnabled = snapshot.val();
                    console.log('🎄 Global theme status:', this.isEnabled);
                } else {
                    // Если настройки нет, создаем выключенной по умолчанию
                    this.isEnabled = false;
                    await themeRef.set(false);
                }
            } catch (error) {
                console.error('❌ Error checking global theme:', error);
                this.isEnabled = false;
            }
        } else {
            console.warn('⚠️ Firebase not available, theme disabled');
            this.isEnabled = false;
        }
    }

    applyTheme() {
        this.createSnowflakes();
        // this.addHolidayHeader();
        this.addHolidayStyles();
        this.addHolidayCursor();
        this.decorateMainElements();
        this.addNavigationGarlands();
    }

    // === СНЕЖИНКИ ===
    createSnowflakes() {
        const snowContainer = document.createElement('div');
        snowContainer.id = 'snow-container';
        snowContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9998;
            overflow: hidden;
        `;
        document.body.appendChild(snowContainer);

        for (let i = 0; i < 30; i++) {
            this.createSnowflake(snowContainer);
        }
    }

    createSnowflake(container) {
        const snowflake = document.createElement('div');
        snowflake.innerHTML = '❄';
        snowflake.style.cssText = `
            position: absolute;
            top: -20px;
            color: rgba(255, 255, 255, 0.7);
            font-size: ${Math.random() * 16 + 12}px;
            text-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
            user-select: none;
            pointer-events: none;
            opacity: 0;
        `;

        const startPosition = Math.random() * 100;
        const animationDuration = Math.random() * 8 + 12;
        const delay = Math.random() * 5;

        snowflake.style.left = `${startPosition}vw`;
        snowflake.style.animation = `snowfall ${animationDuration}s linear ${delay}s infinite`;

        container.appendChild(snowflake);
    }

    // === ГИРЛЯНДЫ НА НАВИГАЦИИ ===
    addNavigationGarlands() {
        const navigationGrid = document.getElementById('navigationGrid');
        if (!navigationGrid) return;

        const garlandContainer = document.createElement('div');
        garlandContainer.className = 'holiday-garland-container';
        garlandContainer.style.cssText = `
            position: absolute;
            top: -10px;
            left: 0;
            right: 0;
            height: 20px;
            display: flex;
            justify-content: space-between;
            padding: 0 10px;
            pointer-events: none;
            z-index: 1;
        `;

        const lightsCount = 8;
        for (let i = 0; i < lightsCount; i++) {
            const light = document.createElement('div');
            light.className = 'holiday-garland-light';
            light.style.cssText = `
                width: 12px;
                height: 12px;
                border-radius: 50%;
                animation: garlandBlink 2s infinite;
                animation-delay: ${i * 0.3}s;
            `;
            
            if (i % 3 === 0) {
                light.style.backgroundColor = '#ff4444';
            } else if (i % 3 === 1) {
                light.style.backgroundColor = '#44ff44';
            } else {
                light.style.backgroundColor = '#ffff44';
            }

            garlandContainer.appendChild(light);
        }

        navigationGrid.style.position = 'relative';
        navigationGrid.appendChild(garlandContainer);

        this.addSnowOnButtons();
    }

    addSnowOnButtons() {
        const navButtons = document.querySelectorAll('.nav-btn');
        
        navButtons.forEach((button, index) => {
            const snowContainer = document.createElement('div');
            snowContainer.className = 'button-snow-container';
            snowContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                overflow: hidden;
                border-radius: var(--radius-medium);
                z-index: 1;
            `;

            for (let i = 0; i < 3; i++) {
                this.createButtonSnowflake(snowContainer, index);
            }

            button.style.position = 'relative';
            button.appendChild(snowContainer);
        });
    }

    createButtonSnowflake(container, buttonIndex) {
        const snowflake = document.createElement('div');
        snowflake.innerHTML = '❄';
        snowflake.style.cssText = `
            position: absolute;
            color: rgba(255, 255, 255, 0.9);
            font-size: 10px;
            user-select: none;
            pointer-events: none;
            opacity: 0;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
        `;

        const animationDuration = Math.random() * 3 + 2;
        const delay = (buttonIndex * 0.5) + (Math.random() * 2);

        snowflake.style.animation = `buttonSnowfall ${animationDuration}s ease-in-out ${delay}s infinite`;

        container.appendChild(snowflake);
    }

    /* === ЗАГОЛОВОК В СТИЛЕ САЙТА ===
    addHolidayHeader() {
        const mainTitle = document.querySelector('.main-title');
        if (mainTitle) {
            const holidaySubtitle = document.createElement('div');
            holidaySubtitle.className = 'holiday-subtitle';
            holidaySubtitle.innerHTML = `
                <div class="holiday-badge">
                    <span class="holiday-icon">🎄</span>
                    <span class="holiday-text">${this.themeName}</span>
                </div>
            `;
            mainTitle.parentNode.insertBefore(holidaySubtitle, mainTitle.nextSibling);
        }
    }
    */

    // === КУРСОР С ЭФФЕКТОМ ===
    addHolidayCursor() {
        let lastX = 0, lastY = 0;
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isEnabled) return;
            
            const deltaX = Math.abs(e.clientX - lastX);
            const deltaY = Math.abs(e.clientY - lastY);
            
            if (deltaX > 3 || deltaY > 3) {
                this.createCursorTrail(e.clientX, e.clientY);
                lastX = e.clientX;
                lastY = e.clientY;
            }
        });
    }

    createCursorTrail(x, y) {
        if (Math.random() > 0.4) return;
        
        const trail = document.createElement('div');
        trail.innerHTML = '✨';
        trail.style.cssText = `
            position: fixed;
            left: ${x + 15}px;
            top: ${y + 15}px;
            font-size: 14px;
            pointer-events: none;
            z-index: 10000;
            opacity: 0;
            animation: cursorTrail 1.2s ease-out forwards;
        `;
        
        document.body.appendChild(trail);
        
        setTimeout(() => {
            if (trail.parentNode) {
                trail.parentNode.removeChild(trail);
            }
        }, 1200);
    }

    // === ДЕКОР ОСНОВНЫХ ЭЛЕМЕНТОВ ===
    decorateMainElements() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.classList.add('holiday-nav-btn');
        });

        const mainTitle = document.querySelector('.main-title');
        if (mainTitle) {
            mainTitle.classList.add('holiday-main-title');
        }

        const teamCards = document.querySelectorAll('.team-visiting-card');
        teamCards.forEach(card => {
            card.classList.add('holiday-team-card');
        });
    }

    // === СТИЛИ ===
    addHolidayStyles() {
        const style = document.createElement('style');
        style.id = 'holiday-styles';
        style.textContent = `
            @keyframes snowfall {
                0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
                10% { opacity: 0.8; }
                90% { opacity: 0.8; }
                100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
            }

            @keyframes buttonSnowfall {
                0% { transform: translateY(-10px) rotate(0deg); opacity: 0; }
                20% { opacity: 1; }
                80% { opacity: 1; }
                100% { transform: translateY(10px) rotate(180deg); opacity: 0; }
            }

            @keyframes garlandBlink {
                0%, 100% { opacity: 0.3; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1.1); box-shadow: 0 0 10px currentColor; }
            }

            .holiday-subtitle {
                text-align: center;
                margin: 5px 0 20px 0;
            }

            .holiday-badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(139, 195, 74, 0.2));
                border: 1px solid rgba(76, 175, 80, 0.3);
                padding: 6px 16px;
                border-radius: 20px;
                color: var(--text-primary);
                font-family: 'Exo 2', sans-serif;
                font-weight: 600;
                font-size: 14px;
                backdrop-filter: blur(10px);
                box-shadow: var(--shadow-light);
            }

            .holiday-icon {
                font-size: 16px;
                filter: drop-shadow(0 0 8px rgba(76, 175, 80, 0.5));
            }

            .holiday-text {
                background: linear-gradient(45deg, var(--accent-primary), var(--accent-secondary));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            @keyframes cursorTrail {
                0% { opacity: 0; transform: scale(0.8) translate(0, 0); }
                50% { opacity: 0.7; transform: scale(1) translate(-5px, -5px); }
                100% { opacity: 0; transform: scale(0.5) translate(-10px, -10px); }
            }

            .holiday-nav-btn {
                position: relative;
                overflow: hidden;
                border: 1px solid rgba(76, 175, 80, 0.3) !important;
            }

            .holiday-nav-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                transition: left 0.5s ease;
            }

            .holiday-nav-btn:hover::before {
                left: 100%;
            }

            .holiday-nav-btn:hover .button-snow-container {
                opacity: 1;
            }

            .button-snow-container {
                opacity: 0.3;
                transition: opacity 0.3s ease;
            }

            .holiday-main-title .title-highlight::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(45deg, transparent 30%, rgba(76, 175, 80, 0.1) 50%, transparent 70%);
                animation: titleShine 3s ease-in-out infinite;
                border-radius: 10px;
            }

            @keyframes titleShine {
                0%, 100% { opacity: 0; }
                50% { opacity: 1; }
            }

            .holiday-team-card {
                position: relative;
            }

            .holiday-team-card::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(45deg, var(--accent-primary), var(--accent-secondary), var(--accent-primary));
                border-radius: var(--radius-large);
                z-index: -1;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .holiday-team-card:hover::before {
                opacity: 0.3;
            }
        `;
        document.head.appendChild(style);
    }

    // === ОБНОВЛЕНИЕ ТЕМЫ В РЕАЛЬНОМ ВРЕМЕНИ ===
    startThemeListener() {
        if (typeof firebase !== 'undefined') {
            const themeRef = firebase.database().ref('systemSettings/holidayThemeEnabled');
            themeRef.on('value', (snapshot) => {
                const newState = snapshot.val();
                if (newState !== this.isEnabled) {
                    console.log('🎄 Theme state changed:', newState);
                    this.isEnabled = newState;
                    
                    if (newState) {
                        this.applyTheme();
                    } else {
                        this.disable();
                    }
                }
            });
        }
    }

    disable() {
        // Удаляем все новогодние элементы
        const elementsToRemove = [
            'snow-container',
            'holiday-styles'
        ];
        
        elementsToRemove.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.remove();
        });
        
        // Удаляем классы
        const classesToRemove = [
            'holiday-nav-btn',
            'holiday-main-title',
            'holiday-team-card'
        ];
        
        classesToRemove.forEach(className => {
            document.querySelectorAll(`.${className}`).forEach(el => {
                el.classList.remove(className);
            });
        });
        
        // Удаляем динамические элементы
        document.querySelectorAll('.holiday-subtitle, .holiday-garland-container, .button-snow-container').forEach(el => {
            el.remove();
        });
        
        console.log('🎄 Новогодняя тема отключена для всех пользователей');
    }
}

// Автоматическая инициализация
document.addEventListener('DOMContentLoaded', function() {
    window.holidayTheme = new HolidayTheme();
    // Запускаем слушатель изменений
    setTimeout(() => {
        if (window.holidayTheme) {
            window.holidayTheme.startThemeListener();
        }
    }, 2000);
});