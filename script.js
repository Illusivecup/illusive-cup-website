// Конфигурация Firebase - ЗАМЕНИТЕ НА ВАШУ!
const firebaseConfig = {
    apiKey: "AIzaSyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    authDomain: "illusive-cup-2025.firebaseapp.com",
    databaseURL: "https://illusive-cup-2025-default-rtdb.firebaseio.com",
    projectId: "illusive-cup-2025",
    storageBucket: "illusive-cup-2025.appspot.com",
    messagingSenderId: "123456789000",
    appId: "1:123456789000:web:aaaaaaaaaaaaaaaaaaaaaa"
};

// Инициализация Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase инициализирован');
} catch (error) {
    console.log('Firebase уже инициализирован');
}

const database = firebase.database();

// Глобальные переменные
let isEditor = false;
let currentBracketData = null;
let currentScheduleData = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Создаем визитки команд
    createTeamCards();
    
    // Создаем анимированный фон
    createAnimatedBackground();
    
    // Проверяем права редактора
    checkEditorRights();
    
    // Загружаем данные из Firebase
    loadTournamentData();
    
    // Слушаем обновления в реальном времени
    setupRealtimeListeners();
    
    // Обновляем статус подключения
    updateConnectionStatus();
}

// Проверка прав редактора
function checkEditorRights() {
    const urlParams = new URLSearchParams(window.location.search);
    const editorKey = urlParams.get('editor');
    
    if (editorKey === 'Illusive2025' || localStorage.getItem('isEditor') === 'true') {
        isEditor = true;
        localStorage.setItem('isEditor', 'true');
        showEditorButtons();
    }
}

function showEditorButtons() {
    document.getElementById('editBracketBtn').classList.remove('hidden');
    document.getElementById('editScheduleBtn').classList.remove('hidden');
}

// Загрузка данных турнира
function loadTournamentData() {
    loadBracketData();
    loadScheduleData();
}

// ==================== ТУРНИРНАЯ СЕТКА ====================

function loadBracketData() {
    database.ref('tournament/bracket').once('value').then((snapshot) => {
        const bracketData = snapshot.val();
        if (bracketData) {
            currentBracketData = bracketData;
            renderBracket(bracketData);
        } else {
            // Создаем начальные данные
            createInitialBracket();
        }
    });
}

function setupRealtimeListeners() {
    // Слушаем изменения турнирной сетки
    database.ref('tournament/bracket').on('value', (snapshot) => {
        const bracketData = snapshot.val();
        if (bracketData) {
            currentBracketData = bracketData;
            renderBracket(bracketData);
            highlightUpdate('bracketContainer');
        }
    });
    
    // Слушаем изменения расписания
    database.ref('tournament/schedule').on('value', (snapshot) => {
        const scheduleData = snapshot.val();
        if (scheduleData) {
            currentScheduleData = scheduleData;
            renderSchedule(scheduleData);
            highlightUpdate('scheduleList');
        }
    });
}

function createInitialBracket() {
    const initialBracket = {
        quarterFinals: [
            { team1: "Bublas Team", team2: "Фениксы" },
            { team1: "Тигры", team2: "Волки" },
            { team1: "Орлы", team2: "Медведи" },
            { team1: "Команда A", team2: "Команда B" }
        ],
        semiFinals: [
            { team1: "Победитель 1", team2: "Победитель 2" },
            { team1: "Победитель 3", team2: "Победитель 4" }
        ],
        final: [
            { team1: "Чемпион Illusive Cup" }
        ]
    };
    
    saveBracketToFirebase(initialBracket);
}

function renderBracket(bracketData) {
    const bracketContainer = document.getElementById('bracketContainer');
    bracketContainer.innerHTML = '';
    
    // Рендерим каждый раунд
    if (bracketData.quarterFinals) {
        const quarterFinals = createRoundElement('1/4 финала', bracketData.quarterFinals);
        bracketContainer.appendChild(quarterFinals);
    }
    
    if (bracketData.semiFinals) {
        const semiFinals = createRoundElement('1/2 финала', bracketData.semiFinals);
        bracketContainer.appendChild(semiFinals);
    }
    
    if (bracketData.final) {
        const final = createRoundElement('Финал', bracketData.final, true);
        bracketContainer.appendChild(final);
    }
}

function createRoundElement(title, matches, isFinal = false) {
    const roundElement = document.createElement('div');
    roundElement.className = 'bracket-round';
    
    roundElement.innerHTML = `<h3>${title}</h3>`;
    
    matches.forEach(match => {
        const matchElement = document.createElement('div');
        matchElement.className = 'match';
        
        if (isFinal) matchElement.classList.add('final');
        if (match.team1 === 'Bublas Team' || match.team2 === 'Bublas Team') {
            matchElement.classList.add('highlight-match');
        }
        
        matchElement.textContent = match.team2 ? 
            `${match.team1} vs ${match.team2}` : match.team1;
        
        roundElement.appendChild(matchElement);
    });
    
    return roundElement;
}

// ==================== РЕДАКТИРОВАНИЕ СЕТКИ ====================

function toggleEditMode() {
    if (!isEditor) {
        alert('Только организаторы могут редактировать сетку');
        return;
    }
    
    openBracketEditModal();
}

function openBracketEditModal() {
    if (!currentBracketData) return;
    
    const modal = document.getElementById('editModal');
    
    // Заполняем форму текущими данными
    document.getElementById('quarterFinalsEdit').innerHTML = createMatchEditRows(
        currentBracketData.quarterFinals, 'quarter'
    );
    
    document.getElementById('semiFinalsEdit').innerHTML = createMatchEditRows(
        currentBracketData.semiFinals, 'semi'
    );
    
    document.getElementById('finalEdit').innerHTML = createMatchEditRows(
        currentBracketData.final, 'final'
    );
    
    modal.classList.remove('hidden');
}

function createMatchEditRows(matches, roundType) {
    if (!matches) return '';
    
    return matches.map((match, index) => `
        <div class="match-edit-row">
            <input type="text" id="${roundType}-team1-${index}" value="${match.team1 || ''}" 
                   placeholder="Команда 1">
            ${roundType !== 'final' ? '<span>vs</span>' : ''}
            ${roundType !== 'final' ? 
                `<input type="text" id="${roundType}-team2-${index}" value="${match.team2 || ''}" 
                        placeholder="Команда 2">` : ''}
        </div>
    `).join('');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
}

async function saveBracketToFirebase() {
    if (!isEditor) return;
    
    try {
        const bracketData = {
            quarterFinals: getMatchesFromForm('quarter', 4),
            semiFinals: getMatchesFromForm('semi', 2),
            final: getMatchesFromForm('final', 1)
        };
        
        await database.ref('tournament/bracket').set(bracketData);
        
        // Добавляем метку времени обновления
        await database.ref('tournament/lastUpdate').set(firebase.database.ServerValue.TIMESTAMP);
        
        alert('✅ Турнирная сетка обновлена для всех зрителей!');
        closeEditModal();
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        alert('❌ Ошибка сохранения. Попробуйте снова.');
    }
}

function getMatchesFromForm(roundType, count) {
    const matches = [];
    
    for (let i = 0; i < count; i++) {
        const team1 = document.getElementById(`${roundType}-team1-${i}`)?.value || '';
        const team2 = document.getElementById(`${roundType}-team2-${i}`)?.value || '';
        
        if (team1) {
            matches.push({
                team1: team1.trim(),
                team2: roundType !== 'final' ? team2.trim() : undefined
            });
        }
    }
    
    return matches;
}

// ==================== РАСПИСАНИЕ ====================

function loadScheduleData() {
    database.ref('tournament/schedule').once('value').then((snapshot) => {
        const scheduleData = snapshot.val();
        if (scheduleData) {
            currentScheduleData = scheduleData;
            renderSchedule(scheduleData);
        } else {
            createInitialSchedule();
        }
    });
}

function createInitialSchedule() {
    const initialSchedule = [
        { time: "10:00", teams: "Bublas Team vs Фениксы", court: "Главная арена", highlight: true },
        { time: "11:30", teams: "Тигры vs Волки", court: "Корт 2", highlight: false },
        { time: "13:00", teams: "Орлы vs Медведи", court: "Корт 1", highlight: false },
        { time: "14:30", teams: "Полуфинал 1", court: "Центральный корт", highlight: false },
        { time: "16:00", teams: "ФИНАЛ Illusive Cup", court: "Центральный корт", highlight: true }
    ];
    
    saveScheduleToFirebase(initialSchedule);
}

function renderSchedule(scheduleData) {
    const scheduleList = document.getElementById('scheduleList');
    scheduleList.innerHTML = '';
    
    scheduleData.forEach((match, index) => {
        const matchElement = document.createElement('div');
        matchElement.className = 'match-slot';
        if (match.highlight) matchElement.classList.add('highlight');
        
        matchElement.innerHTML = `
            <span class="time">${match.time}</span>
            <span class="teams">${match.teams}</span>
            <span class="court">${match.court}</span>
        `;
        
        scheduleList.appendChild(matchElement);
    });
}

// ==================== РЕДАКТИРОВАНИЕ РАСПИСАНИЯ ====================

function toggleScheduleEditMode() {
    if (!isEditor) {
        alert('Только организаторы могут редактировать расписание');
        return;
    }
    
    openScheduleEditModal();
}

function openScheduleEditModal() {
    if (!currentScheduleData) return;
    
    const container = document.getElementById('scheduleEditContainer');
    container.innerHTML = '';
    
    currentScheduleData.forEach((match, index) => {
        container.appendChild(createScheduleEditItem(match, index));
    });
    
    document.getElementById('editScheduleModal').classList.remove('hidden');
}

function createScheduleEditItem(match, index) {
    const item = document.createElement('div');
    item.className = 'schedule-edit-item';
    
    item.innerHTML = `
        <input type="text" class="time-input" value="${match.time}" placeholder="Время">
        <input type="text" class="teams-input" value="${match.teams}" placeholder="Команды">
        <input type="text" class="court-input" value="${match.court}" placeholder="Корт">
        <input type="checkbox" ${match.highlight ? 'checked' : ''} id="highlight-${index}">
        <label for="highlight-${index}">Выделить</label>
        <button class="remove-btn" onclick="removeScheduleItem(${index})">🗑️</button>
    `;
    
    return item;
}

function addScheduleItem() {
    const container = document.getElementById('scheduleEditContainer');
    const newIndex = container.children.length;
    
    const newItem = document.createElement('div');
    newItem.className = 'schedule-edit-item';
    
    newItem.innerHTML = `
        <input type="text" class="time-input" placeholder="Время">
        <input type="text" class="teams-input" placeholder="Команды">
        <input type="text" class="court-input" placeholder="Корт">
        <input type="checkbox" id="highlight-${newIndex}">
        <label for="highlight-${newIndex}">Выделить</label>
        <button class="remove-btn" onclick="removeScheduleItem(${newIndex})">🗑️</button>
    `;
    
    container.appendChild(newItem);
}

function removeScheduleItem(index) {
    if (confirm('Удалить этот матч из расписания?')) {
        const container = document.getElementById('scheduleEditContainer');
        if (container.children[index]) {
            container.children[index].remove();
        }
    }
}

function closeScheduleEditModal() {
    document.getElementById('editScheduleModal').classList.add('hidden');
}

async function saveScheduleToFirebase() {
    if (!isEditor) return;
    
    try {
        const scheduleData = getScheduleFromForm();
        
        await database.ref('tournament/schedule').set(scheduleData);
        await database.ref('tournament/scheduleLastUpdate').set(firebase.database.ServerValue.TIMESTAMP);
        
        alert('✅ Расписание обновлено для всех зрителей!');
        closeScheduleEditModal();
        
    } catch (error) {
        console.error('Ошибка сохранения расписания:', error);
        alert('❌ Ошибка сохранения расписания.');
    }
}

function getScheduleFromForm() {
    const container = document.getElementById('scheduleEditContainer');
    const scheduleData = [];
    
    for (let i = 0; i < container.children.length; i++) {
        const item = container.children[i];
        const time = item.querySelector('.time-input').value;
        const teams = item.querySelector('.teams-input').value;
        const court = item.querySelector('.court-input').value;
        const highlight = item.querySelector('input[type="checkbox"]').checked;
        
        if (time && teams && court) {
            scheduleData.push({
                time: time.trim(),
                teams: teams.trim(),
                court: court.trim(),
                highlight: highlight
            });
        }
    }
    
    return scheduleData;
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    const dot = statusElement.querySelector('.status-dot');
    const text = statusElement.querySelector('.status-text');
    
    database.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === true) {
            dot.classList.add('connected');
            text.textContent = 'Онлайн - данные обновляются в реальном времени';
        } else {
            dot.classList.remove('connected');
            text.textContent = 'Офлайн - используем локальные данные';
        }
    });
}

function highlightUpdate(elementId) {
    const element = document.getElementById(elementId);
    element.classList.add('updating');
    setTimeout(() => {
        element.classList.remove('updating');
    }, 1000);
}

// ==================== СТАРЫЕ ФУНКЦИИ (оставляем для совместимости) ====================

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

// Функции навигации (оставляем без изменений)
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

function showBracket
