// === КОНФИГУРАЦИЯ FIREBASE ===
const firebaseConfig = {
    apiKey: "AIzaSyAjUojB-m0TdI604jwsIXGOHGLdGBmC64",
    authDomain: "illusive-cup.firebaseapp.com",
    databaseURL: "https://illusive-cup-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "illusive-cup",
    storageBucket: "illusive-cup.firebasestorage.app",
    messagingSenderId: "465786550229",
    appId: "1:465786550229:web:9a1d4a3015bbcb8a3ca75c"
};

// Инициализация Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('🔥 Firebase подключен!');
} catch (error) {
    console.log('❌ Ошибка Firebase:', error);
}

const database = firebase.database();

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let isEditor = false;
let currentEditingTeamId = null;
let teamsData = {};
let currentDisplayedTeamId = null;
let tournamentData = {};

// === ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ===
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    createAnimatedBackground();
    initializeEventListeners();
    checkEditorAccess();
    setupRealTimeListeners();
    loadInitialData();
}

// === ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ СОБЫТИЙ ===
function initializeEventListeners() {
    // Навигационные кнопки
    document.getElementById('teamsDropdownBtn').addEventListener('click', toggleDropdown);
    document.getElementById('groupStageBtn').addEventListener('click', showGroupStage);
    document.getElementById('bracketBtn').addEventListener('click', showBracket);
    document.getElementById('scheduleBtn').addEventListener('click', showSchedule);
    
    // Кнопки модальных окон
    document.getElementById('closeEditTeamModal').addEventListener('click', closeEditTeamModal);
    document.getElementById('closeAdminPanel').addEventListener('click', closeAdminPanel);
    document.getElementById('addPlayerBtn').addEventListener('click', addPlayerField);
    document.getElementById('saveTeamBtn').addEventListener('click', saveTeamChanges);
    document.getElementById('cancelEditTeamBtn').addEventListener('click', closeEditTeamModal);
    
    // Админ панель
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', showAdminPanel);
    }
    document.getElementById('updateTeamsBtn').addEventListener('click', updateTeamsSettings);
    document.getElementById('saveBracketBtn').addEventListener('click', saveBracketChanges);
    document.getElementById('saveScheduleBtn').addEventListener('click', saveScheduleChanges);
    document.getElementById('addScheduleMatchBtn').addEventListener('click', addScheduleMatch);
    document.getElementById('saveGroupStageBtn').addEventListener('click', saveGroupStageSettings);
    
    // Табы админ панели
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            openAdminTab(this.getAttribute('data-tab'));
        });
    });
    
    // Закрытие модальных окон по клику вне области
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.add('hidden');
        }
    });
}

// === ПРОВЕРКА ПРАВ РЕДАКТОРА ===
function checkEditorAccess() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('editor') === 'true') {
        isEditor = true;
        document.getElementById('adminBtn').classList.remove('hidden');
        console.log('👑 Режим редактора активирован');
    }
}

// === СОЗДАНИЕ АНИМИРОВАННОГО ФОНА ===
function createAnimatedBackground() {
    const bg = document.getElementById('animatedBg');
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        const size = Math.random() * 10 + 5;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 20}s`;
        particle.style.animationDuration = `${15 + Math.random() * 10}s`;
        
        bg.appendChild(particle);
    }
}

// === REAL-TIME СЛУШАТЕЛИ FIREBASE ===
function setupRealTimeListeners() {
    // Слушатель для команд
    database.ref('teams').on('value', (snapshot) => {
        teamsData = snapshot.val() || {};
        console.log('📥 Загружены команды:', teamsData);
        updateTeamsDropdown();
        updateConnectionStatus(true);
        
        // Если данных нет, создаем демо-данные
        if (Object.keys(teamsData).length === 0) {
            createDemoData();
        }
    }, (error) => {
        console.error('❌ Ошибка загрузки команд:', error);
        updateConnectionStatus(false);
    });

    // Слушатель для турнирной сетки
    database.ref('bracket').on('value', (snapshot) => {
        const bracketData = snapshot.val();
        console.log('📥 Загружена сетка:', bracketData);
        displayBracket(bracketData);
    });

    // Слушатель для расписания
    database.ref('schedule').on('value', (snapshot) => {
        const scheduleData = snapshot.val();
        console.log('📥 Загружено расписание:', scheduleData);
        displaySchedule(scheduleData);
    });

    // Слушатель для турнирных данных
    database.ref('tournament').on('value', (snapshot) => {
        tournamentData = snapshot.val() || {};
        console.log('📥 Загружены турнирные данные:', tournamentData);
        displayGroupStage();
    });
}

// === СОЗДАНИЕ ДЕМО-ДАННЫХ ===
function createDemoData() {
    console.log('🔄 Создание демо-данных...');
    
    const demoTeams = {
        team1: {
            name: "Labubu Team",
            slogan: "Мы команда Labubu, мы милые такие, Но на пути к победе — мы просто стихия!",
            mmr: 3820,
            players: [
                { name: "TheNotoriousPudge", role: "Керри" },
                { name: "RTS", role: "Мидер" },
                { name: "na paneli", role: "Оффлейнер" },
                { name: "Insightful", role: "Саппорт" },
                { name: "nency", role: "Саппорт" }
            ]
        },
        team2: {
            name: "unluck", 
            slogan: "",
            mmr: 2960,
            players: [
                { name: "Ev1ri", role: "Керри" },
                { name: "F4cker", role: "Мидер" },
                { name: "bub1i-k", role: "Оффлейнер" },
                { name: "DEM", role: "Саппорт 4" },
                { name: "ДИКИЙ ОГУРЕЦ", role: "Саппорт" }
            ]
        },
        team3: {
            name: "Команда 3",
            slogan: "",
            mmr: 0,
            players: [
                { name: "Игрок 1", role: "Керри" },
                { name: "Игрок 2", role: "Мидер" },
                { name: "Игрок 3", role: "Оффлейнер" },
                { name: "Игрок 4", role: "Саппорт" },
                { name: "Игрок 5", role: "Саппорт" }
            ]
        },
        team4: {
            name: "Команда 4",
            slogan: "",
            mmr: 0,
            players: [
                { name: "Игрок 1", role: "Керри" },
                { name: "Игрок 2", role: "Мидер" },
                { name: "Игрок 3", role: "Оффлейнер" },
                { name: "Игрок 4", role: "Саппорт" },
                { name: "Игрок 5", role: "Саппорт" }
            ]
        }
    };

    // Сохраняем демо-команды в Firebase
    database.ref('teams').set(demoTeams);
    
    // Создаем демо-сетку
    const demoBracket = {
        quarterfinals: [
            { team1: "1 место группы", team2: "4 место группы", score1: null, score2: null },
            { team1: "2 место группы", team2: "3 место группы", score1: null, score2: null }
        ],
        semifinals: [
            { team1: "Победитель 1/4", team2: "Победитель 1/4", score1: null, score2: null }
        ],
        final: [
            { team1: "Победитель 1/2", team2: "Победитель 1/2", score1: null, score2: null }
        ]
    };
    
    database.ref('bracket').set(demoBracket);
    
    // Создаем демо-расписание
    const demoSchedule = [
        { time: "15:00", match: "Labubu Team vs unluck", stage: "Групповой этап" },
        { time: "16:30", match: "Команда 3 vs Команда 4", stage: "Групповой этап" },
        { time: "19:00", match: "Полуфинал 1", stage: "Полуфинал" },
        { time: "21:00", match: "ГРАНД-ФИНАЛ", stage: "Финал" }
    ];
    
    database.ref('schedule').set(demoSchedule);

    // Создаем турнирные данные
    const demoTournament = {
        format: "round_robin",
        settings: {
            totalTeams: 4,
            groups: 1,
            advancingTeams: 4
        },
        groupStage: {
            groupA: {
                teams: [
                    { name: "Labubu Team", wins: 0, losses: 0, points: 0 },
                    { name: "unluck", wins: 0, losses: 0, points: 0 },
                    { name: "Команда 3", wins: 0, losses: 0, points: 0 },
                    { name: "Команда 4", wins: 0, losses: 0, points: 0 }
                ],
                matches: [
                    { team1: "Labubu Team", team2: "unluck", score1: 0, score2: 0, completed: false },
                    { team1: "Команда 3", team2: "Команда 4", score1: 0, score2: 0, completed: false }
                ]
            }
        }
    };

    database.ref('tournament').set(demoTournament);
}

// === ОТОБРАЖЕНИЕ ГРУППОВОГО ЭТАПА ===
function displayGroupStage() {
    const container = document.getElementById('groupStageContainer');
    if (!container || !tournamentData.groupStage) {
        container.innerHTML = '<p>Групповой этап пока не сформирован</p>';
        return;
    }

    let groupHTML = '';

    Object.keys(tournamentData.groupStage).forEach(groupName => {
        const group = tournamentData.groupStage[groupName];
        
        // Сортируем команды по очкам (по убыванию)
        const sortedTeams = [...group.teams].sort((a, b) => b.points - a.points);
        
        groupHTML += `
            <div class="group-container">
                <h3>${groupName}</h3>
                <div class="group-table">
                    <div class="table-header">
                        <div>Команда</div>
                        <div>Матчи</div>
                        <div>Победы</div>
                        <div>Поражения</div>
                        <div>Очки</div>
                    </div>
                    ${sortedTeams.map((team, index) => `
                        <div class="table-row ${index < tournamentData.settings.advancingTeams ? 'qualifying' : ''}">
                            <div class="team-name">${team.name}</div>
                            <div>${team.wins + team.losses}</div>
                            <div>${team.wins}</div>
                            <div>${team.losses}</div>
                            <div class="points">${team.points}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = groupHTML;
}

// === ОБНОВЛЕНИЕ СТАТУСА ПОДКЛЮЧЕНИЯ ===
function updateConnectionStatus(connected) {
    const status = document.getElementById('connectionStatus');
    const dot = status.querySelector('.status-dot');
    const text = status.querySelector('.status-text');
    
    if (connected) {
        dot.classList.add('connected');
        text.textContent = 'Подключено к турниру';
    } else {
        dot.classList.remove('connected');
        text.textContent = 'Ошибка подключения';
    }
}

// === ОБНОВЛЕНИЕ ВЫПАДАЮЩЕГО СПИСКА КОМАНД ===
function updateTeamsDropdown() {
    const dropdown = document.getElementById('teamsDropdown');
    dropdown.innerHTML = '';
    
    Object.keys(teamsData).forEach(teamId => {
        const team = teamsData[teamId];
        const link = document.createElement('a');
        link.textContent = team.name || 'Без названия';
        link.addEventListener('click', () => showTeamCard(teamId));
        dropdown.appendChild(link);
    });
}

// === ОТОБРАЖЕНИЕ КАРТОЧКИ КОМАНДЫ (ОДНОЙ) ===
function showTeamCard(teamId) {
    const container = document.getElementById('teamsContent');
    container.innerHTML = '';
    
    const team = teamsData[teamId];
    if (team) {
        const card = createTeamCard(teamId, team);
        container.appendChild(card);
        currentDisplayedTeamId = teamId;
    }
    
    showTeams();
    toggleDropdown(); // Закрываем выпадающий список после выбора
}

// === ОТОБРАЖЕНИЕ ВСЕХ КАРТОЧЕК КОМАНД ===
function displayTeamsCards() {
    const container = document.getElementById('teamsContent');
    container.innerHTML = '';
    currentDisplayedTeamId = null;
    
    Object.keys(teamsData).forEach(teamId => {
        const team = teamsData[teamId];
        const card = createTeamCard(teamId, team);
        container.appendChild(card);
    });
}

// === СОЗДАНИЕ КАРТОЧКИ КОМАНДЫ ===
function createTeamCard(teamId, team) {
    const card = document.createElement('div');
    card.className = 'team-visiting-card';
    card.setAttribute('data-team-id', teamId);
    
    const playersHTML = (team.players || []).map((player, index) => `
        <div class="player-card-bublas">
            <div class="player-role-bublas">${player.role || 'Игрок'}</div>
            <div class="player-name-bublas" data-text="${player.name || 'Неизвестно'}">
                ${player.name || 'Неизвестно'}
            </div>
        </div>
    `).join('');
    
    const editButton = isEditor ? 
        `<button class="edit-team-btn" data-team-id="${teamId}">✏️ Редактировать</button>` : '';
    
    card.innerHTML = `
        <div class="card-header">
            <div class="header-highlight"></div>
            <div class="team-name-bublas">${team.name || 'Без названия'}</div>
            <div class="team-subtitle">${team.slogan || 'Готовы к победе!'}</div>
        </div>
        <div class="team-card-content">
            <div class="players-section-bublas">
                <div class="section-title-bublas">Состав команды</div>
                <div class="player-grid-bublas">
                    ${playersHTML}
                </div>
            </div>
            <div class="stats-section-bublas">
                <div class="mmr-display-bublas">
                    <div class="mmr-label-bublas">Средний MMR</div>
                    <div class="mmr-value-bublas">${team.mmr || '0'}</div>
                </div>
                <div class="tournament-section-bublas">
                    <div class="tournament-text-bublas">играем на</div>
                    <div class="tournament-badge-bublas">Illusive Cup</div>
                </div>
            </div>
        </div>
        <div class="team-footer-bublas">
            Зарегистрирована для участия в турнире
            ${editButton}
        </div>
    `;
    
    // Добавляем обработчик для кнопки редактирования
    if (isEditor) {
        const editBtn = card.querySelector('.edit-team-btn');
        editBtn.addEventListener('click', () => editTeam(teamId));
    }
    
    return card;
}

// === ОТОБРАЖЕНИЕ ТУРНИРНОЙ СЕТКИ ===
function displayBracket(bracketData) {
    const container = document.getElementById('bracketContainer');
    
    if (!bracketData) {
        container.innerHTML = '<p>Турнирная сетка пока не сформирована</p>';
        return;
    }
    
    let bracketHTML = '';
    
    Object.keys(bracketData).forEach(round => {
        bracketHTML += `
            <div class="bracket-round">
                <h3>${getRoundName(round)}</h3>
                ${bracketData[round].map(match => `
                    <div class="match ${round === 'final' ? 'final' : ''}">
                        <div>${match.team1 || 'TBD'}</div>
                        <div>${match.score1 !== null ? match.score1 : '?'} - ${match.score2 !== null ? match.score2 : '?'}</div>
                        <div>${match.team2 || 'TBD'}</div>
                    </div>
                `).join('')}
            </div>
        `;
    });
    
    container.innerHTML = bracketHTML;
}

// === ОТОБРАЖЕНИЕ РАСПИСАНИЯ ===
function displaySchedule(scheduleData) {
    const container = document.getElementById('scheduleList');
    
    if (!scheduleData || scheduleData.length === 0) {
        container.innerHTML = '<p>Расписание матчей пока не опубликовано</p>';
        return;
    }
    
    container.innerHTML = scheduleData.map(match => `
        <div class="match-slot">
            <div class="time">${match.time}</div>
            <div class="teams">${match.match}</div>
            <div class="court">${match.stage}</div>
        </div>
    `).join('');
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function getRoundName(round) {
    const roundNames = {
        'quarterfinals': 'Четвертьфиналы',
        'semifinals': 'Полуфиналы', 
        'final': 'Финал'
    };
    return roundNames[round] || round;
}

// === НАВИГАЦИЯ ===
function toggleDropdown() {
    document.querySelector('.dropdown').classList.toggle('active');
}

function showTeams() {
    hideAllSections();
    document.getElementById('teamsContent').classList.remove('hidden');
    
    // Если не выбрана конкретная команда, показываем все
    if (!currentDisplayedTeamId) {
        displayTeamsCards();
    }
}

function showGroupStage() {
    hideAllSections();
    document.getElementById('groupStageContent').classList.remove('hidden');
    currentDisplayedTeamId = null;
}

function showBracket() {
    hideAllSections();
    document.getElementById('bracketContent').classList.remove('hidden');
    currentDisplayedTeamId = null;
}

function showSchedule() {
    hideAllSections();
    document.getElementById('scheduleContent').classList.remove('hidden');
    currentDisplayedTeamId = null;
}

function hideAllSections() {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
}

// === АДМИН ПАНЕЛЬ ===
function showAdminPanel() {
    document.getElementById('adminPanel').classList.remove('hidden');
    updateAdminTeamsList();
}

function closeAdminPanel() {
    document.getElementById('adminPanel').classList.add('hidden');
}

function openAdminTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

function updateAdminTeamsList() {
    const container = document.getElementById('adminTeamsList');
    container.innerHTML = '';
    
    Object.keys(teamsData).forEach(teamId => {
        const team = teamsData[teamId];
        const teamItem = document.createElement('div');
        teamItem.className = 'team-admin-item';
        teamItem.innerHTML = `
            <span>${team.name}</span>
            <button class="edit-team-btn" data-team-id="${teamId}">Редактировать</button>
        `;
        
        teamItem.querySelector('.edit-team-btn').addEventListener('click', () => editTeam(teamId));
        container.appendChild(teamItem);
    });
}

// === РЕДАКТИРОВАНИЕ КОМАНД ===
function editTeam(teamId) {
    console.log('Редактирование команды:', teamId);
    currentEditingTeamId = teamId;
    const team = teamsData[teamId];
    
    document.getElementById('editTeamName').value = team.name || '';
    document.getElementById('editTeamSlogan').value = team.slogan || '';
    document.getElementById('editTeamMMR').value = team.mmr || '';
    
    // Заполнение игроков
    const playersContainer = document.getElementById('playersEditContainer');
    playersContainer.innerHTML = '';
    
    (team.players || []).forEach((player) => {
        addPlayerField(player.name, player.role);
    });
    
    document.getElementById('editTeamModal').classList.remove('hidden');
}

function addPlayerField(name = '', role = '') {
    const container = document.getElementById('playersEditContainer');
    const playerDiv
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-edit-row';
    playerDiv.innerHTML = `
        <input type="text" placeholder="Имя игрока" value="${name}" class="player-name-input">
        <input type="text" placeholder="Роль" value="${role}" class="player-role-input">
        <button type="button" class="remove-player">🗑️</button>
    `;
    
    // Добавляем обработчик для кнопки удаления
    playerDiv.querySelector('.remove-player').addEventListener('click', function() {
        playerDiv.remove();
    });
    
    container.appendChild(playerDiv);
}

function saveTeamChanges() {
    if (!currentEditingTeamId) return;
    
    const name = document.getElementById('editTeamName').value;
    const slogan = document.getElementById('editTeamSlogan').value;
    const mmr = document.getElementById('editTeamMMR').value;
    
    const players = [];
    document.querySelectorAll('.player-edit-row').forEach(row => {
        const nameInput = row.querySelector('.player-name-input');
        const roleInput = row.querySelector('.player-role-input');
        if (nameInput.value.trim()) {
            players.push({
                name: nameInput.value,
                role: roleInput.value || 'Игрок'
            });
        }
    });
    
    // Обновление в Firebase
    database.ref('teams/' + currentEditingTeamId).update({
        name: name,
        slogan: slogan,
        mmr: mmr,
        players: players
    });
    
    closeEditTeamModal();
    alert('✅ Команда сохранена!');
}

function closeEditTeamModal() {
    document.getElementById('editTeamModal').classList.add('hidden');
    currentEditingTeamId = null;
}

// === УПРАВЛЕНИЕ ГРУППОВЫМ ЭТАПОМ ===
function saveGroupStageSettings() {
    const format = document.getElementById('tournamentFormat').value;
    const groupsCount = document.getElementById('groupsCount').value;
    const advancingTeams = document.getElementById('advancingTeams').value;
    
    const settings = {
        format: format,
        settings: {
            totalTeams: Object.keys(teamsData).length,
            groups: parseInt(groupsCount),
            advancingTeams: parseInt(advancingTeams)
        }
    };
    
    // Обновление в Firebase
    database.ref('tournament').update(settings);
    
    alert('✅ Настройки группового этапа сохранены!');
}

// === ЗАГРУЗКА НАЧАЛЬНЫХ ДАННЫХ ===
function loadInitialData() {
    console.log('🔄 Загрузка начальных данных...');
    // Данные уже загружаются через слушатели
}

// === ЗАГЛУШКИ ДЛЯ НЕРЕАЛИЗОВАННЫХ ФУНКЦИЙ ===
function updateTeamsSettings() {
    const totalTeams = document.getElementById('totalTeams').value;
    alert(`Настройки команд обновлены. Всего команд: ${totalTeams}`);
}

function saveBracketChanges() {
    alert('Функция сохранения сетки в разработке');
}

function saveScheduleChanges() {
    alert('Функция сохранения расписания в разработке');
}

function addScheduleMatch() {
    alert('Функция добавления матча в разработке');
}

console.log('🚀 Приложение Illusive Cup инициализировано!');
