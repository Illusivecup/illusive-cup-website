// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Создаем визитки команд
    createTeamCards();
    // Создаем анимированный фон
    createAnimatedBackground();
});

// Создание анимированного фона для Bublas Team
function createAnimatedBackground() {
    const bg = document.getElementById('animatedBg');
    const particleCount = 18;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        const size = Math.random() * 12 + 6;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100 + 100}%`;
        particle.style.animationDelay = `${Math.random() * 20}s`;
        
        bg.appendChild(particle);
    }
}

// Создание визитки Bublas Team
function createBublasTeamCard() {
    const teamsContent = document.getElementById('teamsContent');
    
    teamsContent.innerHTML += `
        <div id="bublasTeam" class="team-visiting-card hidden">
            <div class="card-header">
                <div class="header-highlight"></div>
                <h1 class="team-name-bublas">Bublas Team</h1>
                <p class="team-subtitle">"Победа не случайность, а результат нашей тактики"</p>
            </div>
            
            <div class="team-card-content">
                <div class="players-section-bublas">
                    <h2 class="section-title-bublas">Состав команды</h2>
                    <div class="player-grid-bublas">
                        <div class="player-card-bublas">
                            <div class="player-role-bublas">Мидлейнер</div>
                            <div class="player-name-bublas">Yatorro</div>
                        </div>
                        
                        <div class="player-card-bublas">
                            <div class="player-role-bublas">Керри</div>
                            <div class="player-name-bublas">Griudd</div>
                        </div>
                        
                        <div class="player-card-bublas">
                            <div class="player-role-bublas">Оффлейнер</div>
                            <div class="player-name-bublas">Collapse</div>
                        </div>
                        
                        <div class="player-card-bublas">
                            <div class="player-role-bublas">Саппорт 5</div>
                            <div class="player-name-bublas">rue</div>
                        </div>
                        
                        <div class="player-card-bublas">
                            <div class="player-role-bublas">Саппорт 4</div>
                            <div class="player-name-bublas">Miposkka</div>
                        </div>
                    </div>
                </div>
                
                <div class="stats-section-bublas">
                    <div class="mmr-display-bublas">
                        <div class="mmr-label-bublas">Средний MMR команды</div>
                        <div class="mmr-value-bublas">10000</div>
                    </div>
                    
                    <div class="tournament-section-bublas">
                        <div class="tournament-text-bublas">играем на</div>
                        <div class="tournament-badge-bublas">Illusive Cup</div>
                    </div>
                </div>
            </div>
            
            <div class="team-footer-bublas">
                Bublas Team © 2025
            </div>
        </div>
    `;
}

// Остальные функции остаются такими же, как в предыдущем коде
// ... (showTeam, hideTeam, showBracket, showSchedule и т.д.)