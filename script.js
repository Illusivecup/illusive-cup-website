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

// Создание всех визиток команд
function createTeamCards() {
    const teamsContent = document.getElementById('teamsContent');
    
    // Создаем Bublas Team
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

    // Создаем остальные команды
    const otherTeams = [
        { id: 'team2', name: 'Фениксы', captain: 'Петр Петров', members: '6 человек', achievements: 'Лучший новичок 2024', wins: 8, rating: 85 },
        { id: 'team3', name: 'Тигры', captain: 'Анна Сидорова', members: '4 человека', achievements: '3 место в чемпионате', wins: 6, rating: 78 },
        { id: 'team4', name: 'Волки', captain: 'Мария Козлова', members: '5 человек', achievements: 'Специальный приз зрителей', wins: 7, rating: 82 },
        { id: 'team5', name: 'Орлы', captain: 'Алексей Смирнов', members: '6 человек', achievements: 'Чемпионы весны 2024', wins: 9, rating: 88 },
        { id: 'team6', name: 'Медведи', captain: 'Дмитрий Попов', members: '5 человек', achievements: 'Лучшая защита турнира', wins: 5, rating: 75 }
    ];

    otherTeams.forEach(team => {
        teamsContent.innerHTML += `
            <div id="${team.id}" class="team-card hidden">
                <div class="card-header">
                    <h2>Команда ${team.name}</h2>
                    <button class="close-btn" onclick="hideTeam('${team.id}')">×</button>
                </div>
                <div class="card-content">
                    <div class="team-info">
                        <h3>Команда ${team.name}</h3>
                        <p><strong>Капитан:</strong> ${team.captain}</p>
                        <p><strong>Участники:</strong> ${team.members}</p>
                        <p><strong>Достижения:</strong> ${team.achievements}</p>
                        <div class="team-stats">
                            <div class="stat">🏆 Побед: ${team.wins}</div>
                            <div class="stat">⚡ Рейтинг: ${team.rating}%</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

// Основные функции навигации
function toggleDropdown() {
    const dropdown = document.querySelector('.dropdown');
    dropdown.classList.toggle('active');
}

function showTeam(teamId) {
    hideAllSections();
    const teamCard = document.getElementById(teamId);
    if (teamCard) {
        teamCard.classList.remove('hidden');
        teamCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    document.querySelector('.dropdown').classList.remove('active');
}

function hideTeam(teamId) {
    const teamCard = document.getElementById(teamId);
    teamCard.classList.add('hidden');
}

function showBracket() {
    hideAllSections();
    document.getElementById('bracketContent').classList.remove('hidden');
    document.getElementById('bracketContent').scrollIntoView({ behavior: 'smooth' });
}

function showSchedule() {
    hideAllSections();
    document.getElementById('scheduleContent').classList.remove('hidden');
    document.getElementById('scheduleContent').scrollIntoView({ behavior: 'smooth' });
}

function hideAllSections() {
    const sections = document.querySelectorAll('.content-section, .team-visiting-card, .team-card');
    sections.forEach(section => {
        section.classList.add('hidden');
    });
}

// Закрытие выпадающего списка при клике вне его
document.addEventListener('click', function(event) {
    const dropdown = document.querySelector('.dropdown');
    const isClickInside = dropdown.contains(event.target);
    
    if (!isClickInside) {
        dropdown.classList.remove('active');
    }
});
