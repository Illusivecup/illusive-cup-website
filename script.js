// === КОНФИГУРАЦИЯ FIREBASE ===
const firebaseConfig = {
    apiKey: "AIzaSyAjUOjB-mQTdI6G4jwsIXGOHGldGBmC6j4",
    authDomain: "illusive-cup.firebaseapp.com",
    databaseURL: "https://illusive-cup-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "illusive-cup",
    storageBucket: "illusive-cup.firebasestorage.app",
    messagingSenderId: "465786550229",
    appId: "1:465786550229:web:9a1d4a3015b9cb0a3caf5c"
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
    document.getElementById('applyTeamsCountBtn').addEventListener('click', updateTeamsCount);
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
        document.getElementById('connectionStatus').classList.remove('hidden');
        console.log('👑 Режим редактора активирован');
    }
}

// === СОЗДАНИЕ АНИМИРОВАННОГО ФОНА ===
function createAnimatedBackground() {
    const bg = document.getElementById('animatedBg');
    if (!bg) return;
    
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
        showErrorMessage('Ошибка подключения к базе данных');
    });

    // Слушатель для турнирной сетки
    database.ref('bracket').on('value', (snapshot) => {
        const bracketData = snapshot.val();
        console.log('📥 Загружена сетка:', bracketData);
        displayBracket(bracketData);
    }, (error) => {
        console.error('❌ Ошибка загрузки сетки:', error);
    });

    // Слушатель для расписания
    database.ref('schedule').on('value', (snapshot) => {
        const scheduleData = snapshot.val();
        console.log('📥 Загружено расписание:', scheduleData);
        displaySchedule(scheduleData);
    }, (error) => {
        console.error('❌ Ошибка загрузки расписания:', error);
    });

    // Слушатель для турнирных данных
    database.ref('tournament').on('value', (snapshot) => {
        tournamentData = snapshot.val() || {};
        console.log('📥 Загружены турнирные данные:', tournamentData);
        displayGroupStage();
    }, (error) => {
        console.error('❌ Ошибка загрузки турнирных данных:', error);
    });
}

// === СОЗДАНИЕ ДЕМО-ДАННЫХ ===
function createDemoData() {
    console.log('🔄 Создание демо-данных...');
    
    const demoTeams = {
        team1: {
            name: "Labubu Team",
            slogan: "Мы команда Labubu, мы милые такие, Но на пути к победе — мы просто стихия!",
            players: [
                { name: "TheNotoriousPudge", role: "Керри", mmr: 4500 },
                { name: "RTS", role: "Мидер", mmr: 4200 },
                { name: "na paneli", role: "Оффлейнер", mmr: 3800 },
                { name: "Insightful", role: "Саппорт", mmr: 3600 },
                { name: "nency", role: "Саппорт", mmr: 3400 }
            ]
        },
        team2: {
            name: "unluck", 
            slogan: "",
            players: [
                { name: "Ev1ri", role: "Керри", mmr: 3200 },
                { name: "F4cker", role: "Мидер", mmr: 3100 },
                { name: "bub1i-k", role: "Оффлейнер", mmr: 3000 },
                { name: "DEM", role: "Саппорт 4", mmr: 2900 },
                { name: "ДИКИЙ ОГУРЕЦ", role: "Саппорт", mmr: 2800 }
            ]
        },
        team3: {
            name: "Команда 3",
            slogan: "",
            players: [
                { name: "Игрок 1", role: "Керри", mmr: 3000 },
                { name: "Игрок 2", role: "Мидер", mmr: 3000 },
                { name: "Игрок 3", role: "Оффлейнер", mmr: 3000 },
                { name: "Игрок 4", role: "Саппорт", mmr: 3000 },
                { name: "Игрок 5", role: "Саппорт", mmr: 3000 }
            ]
        },
        team4: {
            name: "Команда 4",
            slogan: "",
            players: [
                { name: "Игрок 1", role: "Керри", mmr: 3000 },
                { name: "Игрок 2", role: "Мидер", mmr: 3000 },
                { name: "Игрок 3", role: "Оффлейнер", mmr: 3000 },
                { name: "Игрок 4", role: "Саппорт", mmr: 3000 },
                { name: "Игрок 5", role: "Саппорт", mmr: 3000 }
            ]
        }
    };

    // Рассчитываем средний MMR для каждой команды
    Object.keys(demoTeams).forEach(teamId => {
        const team = demoTeams[teamId];
        team.mmr = calculateTeamMMR(team.players);
    });

    // Сохраняем демо-команды в Firebase
    database.ref('teams').set(demoTeams).catch(error => {
        console.error('❌ Ошибка создания демо-данных:', error);
    });
    
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
    
    database.ref('bracket').set(demoBracket).catch(error => {
        console.error('❌ Ошибка создания сетки:', error);
    });
    
    // Создаем демо-расписание
    const demoSchedule = [
        { time: "15:00", match: "Labubu Team vs unluck", stage: "Групповой этап" },
        { time: "16:30", match: "Команда 3 vs Команда 4", stage: "Групповой этап" },
        { time: "19:00", match: "Полуфинал 1", stage: "Полуфинал" },
        { time: "21:00", match: "ГРАНД-ФИНАЛ", stage: "Финал" }
    ];
    
    database.ref('schedule').set(demoSchedule).catch(error => {
        console.error('❌ Ошибка создания расписания:', error);
    });

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

    database.ref('tournament').set(demoTournament).catch(error => {
        console.error('❌ Ошибка создания турнирных данных:', error);
    });
}

// === РАСЧЕТ СРЕДНЕГО MMR КОМАНДЫ ===
function calculateTeamMMR(players) {
    if (!players || players.length === 0) return 0;
    
    const totalMMR = players.reduce((sum, player) => {
        return sum + (parseInt(player.mmr) || 0);
    }, 0);
    
    return Math.round(totalMMR / players.length);
}

// === ОТОБРАЖЕНИЕ ГРУППОВОГО ЭТАПА ===
function displayGroupStage() {
    const container = document.getElementById('groupStageContainer');
    if (!container) return;
    
    if (!tournamentData || !tournamentData.groupStage) {
        container.innerHTML = '<p>Групповой этап пока не сформирован</p>';
        return;
    }

    let groupHTML = '';

    Object.keys(tournamentData.groupStage).forEach(groupName => {
        const group = tournamentData.groupStage[groupName];
        
        if (!group.teams) return;
        
        // Сортируем команды по очкам (по убыванию)
        const sortedTeams = [...group.teams].sort((a, b) => (b.points || 0) - (a.points || 0));
        
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
                        <div class="table-row ${index < (tournamentData.settings?.advancingTeams || 2) ? 'qualifying' : ''}">
                            <div class="team-name">${team.name || 'Без названия'}</div>
                            <div>${(team.wins || 0) + (team.losses || 0)}</div>
                            <div>${team.wins || 0}</div>
                            <div>${team.losses || 0}</div>
                            <div class="points">${team.points || 0}</div>
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
    if (!status) return;
    
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
    if (!dropdown) return;
    
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
    if (!container) return;
    
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
    if (!container) return;
    
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
    
    const players = team.players || [];
    const playersHTML = players.map((player, index) => `
        <div class="player-card-bublas">
            <div class="player-role-bublas">${player.role || 'Игрок'}</div>
            <div class="player-name-bublas" data-mmr="${player.mmr || '0'}">
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
    
    // Добавляем обработчики для никнеймов игроков
    card.querySelectorAll('.player-name-bublas').forEach(playerName => {
        playerName.addEventListener('mouseenter', function() {
            const mmr = this.getAttribute('data-mmr');
            this.setAttribute('data-original-text', this.textContent);
            this.textContent = `MMR: ${mmr}`;
        });
        
        playerName.addEventListener('mouseleave', function() {
            const originalText = this.getAttribute('data-original-text');
            if (originalText) {
                this.textContent = originalText;
            }
        });
    });
    
    // Добавляем обработчик для кнопки редактирования
    if (isEditor) {
        const editBtn = card.querySelector('.edit-team-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => editTeam(teamId));
        }
    }
    
    return card;
}

// === ОТОБРАЖЕНИЕ ТУРНИРНОЙ СЕТКИ ===
function displayBracket(bracketData) {
    const container = document.getElementById('bracketContainer');
    if (!container) return;
    
    if (!bracketData) {
        container.innerHTML = '<p>Турнирная сетка пока не сформирована</p>';
        return;
    }
    
    let bracketHTML = '';
    
    Object.keys(bracketData).forEach(round => {
        const matches = bracketData[round];
        if (!Array.isArray(matches)) return;
        
        bracketHTML += `
            <div class="bracket-round">
                <h3>${getRoundName(round)}</h3>
                ${matches.map(match => `
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
    if (!container) return;
    
    if (!scheduleData || scheduleData.length === 0) {
        container.innerHTML = '<p>Расписание матчей пока не опубликовано</p>';
        return;
    }
    
    container.innerHTML = scheduleData.map(match => `
        <div class="match-slot">
            <div class="time">${match.time || 'TBD'}</div>
            <div class="teams">${match.match || 'Матч не назначен'}</div>
            <div class="court">${match.stage || 'Групповой этап'}</div>
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

function showErrorMessage(message) {
    console.error('❌ Ошибка:', message);
    // Можно добавить уведомление для пользователя
    if (isEditor) {
        alert('Ошибка: ' + message);
    }
}

// === НАВИГАЦИЯ ===
function toggleDropdown() {
    const dropdown = document.querySelector('.dropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function showTeams() {
    hideAllSections();
    const teamsContent = document.getElementById('teamsContent');
    if (teamsContent) {
        teamsContent.classList.remove('hidden');
    }
    
    // Если не выбрана конкретная команда, показываем все
    if (!currentDisplayedTeamId) {
        displayTeamsCards();
    }
}

function showGroupStage() {
    hideAllSections();
    const groupStageContent = document.getElementById('groupStageContent');
    if (groupStageContent) {
        groupStageContent.classList.remove('hidden');
    }
    currentDisplayedTeamId = null;
}

function showBracket() {
    hideAllSections();
    const bracketContent = document.getElementById('bracketContent');
    if (bracketContent) {
        bracketContent.classList.remove('hidden');
    }
    currentDisplayedTeamId = null;
}

function showSchedule() {
    hideAllSections();
    const scheduleContent = document.getElementById('scheduleContent');
    if (scheduleContent) {
        scheduleContent.classList.remove('hidden');
    }
    currentDisplayedTeamId = null;
}

function hideAllSections() {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
}

// === АДМИН ПАНЕЛЬ ===
function showAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        adminPanel.classList.remove('hidden');
        updateAdminTeamsList();
        document.getElementById('totalTeams').value = Object.keys(teamsData).length;
    }
}

function closeAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        adminPanel.classList.add('hidden');
    }
}

function openAdminTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const tabPane = document.getElementById(tabName);
    
    if (tabBtn) tabBtn.classList.add('active');
    if (tabPane) tabPane.classList.add('active');
}

function updateAdminTeamsList() {
    const container = document.getElementById('adminTeamsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(teamsData).forEach(teamId => {
        const team = teamsData[teamId];
        const teamItem = document.createElement('div');
        teamItem.className = 'team-admin-item';
        teamItem.innerHTML = `
            <span>${team.name || 'Без названия'}</span>
            <div>
                <button class="edit-team-btn" data-team-id="${teamId}">Редактировать</button>
                <button class="delete-team-btn" data-team-id="${teamId}">🗑️</button>
            </div>
        `;
        
        const editBtn = teamItem.querySelector('.edit-team-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => editTeam(teamId));
        }
        
        const deleteBtn = teamItem.querySelector('.delete-team-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteTeam(teamId));
        }
        
        container.appendChild(teamItem);
    });
}

// === УПРАВЛЕНИЕ КОМАНДАМИ ===
function updateTeamsCount() {
    const totalTeamsInput = document.getElementById('totalTeams');
    if (!totalTeamsInput) return;
    
    const targetCount = parseInt(totalTeamsInput.value);
    const currentCount = Object.keys(teamsData).length;
    
    if (targetCount < 2 || targetCount > 16) {
        alert('Количество команд должно быть от 2 до 16');
        return;
    }
    
    if (targetCount > currentCount) {
        // Добавляем новые команды
        for (let i = currentCount + 1; i <= targetCount; i++) {
            const newTeamId = `team${i}`;
            if (!teamsData[newTeamId]) {
                teamsData[newTeamId] = {
                    name: `Команда ${i}`,
                    slogan: "",
                    players: [
                        { name: "Игрок 1", role: "Керри", mmr: 3000 },
                        { name: "Игрок 2", role: "Мидер", mmr: 3000 },
                        { name: "Игрок 3", role: "Оффлейнер", mmr: 3000 },
                        { name: "Игрок 4", role: "Саппорт", mmr: 3000 },
                        { name: "Игрок 5", role: "Саппорт", mmr: 3000 }
                    ]
                };
                teamsData[newTeamId].mmr = calculateTeamMMR(teamsData[newTeamId].players);
            }
        }
    } else if (targetCount < currentCount) {
        // Удаляем лишние команды
        const teamIds = Object.keys(teamsData).sort();
        for (let i = teamIds.length - 1; i >= targetCount; i--) {
            delete teamsData[teamIds[i]];
        }
    }
    
    // Сохраняем изменения в Firebase
    database.ref('teams').set(teamsData).then(() => {
        alert(`✅ Количество команд обновлено: ${targetCount}`);
        updateAdminTeamsList();
        updateTournamentSettings();
    }).catch(error => {
        console.error('❌ Ошибка обновления команд:', error);
        alert('❌ Ошибка обновления команд: ' + error.message);
    });
}

function deleteTeam(teamId) {
    if (!confirm(`Удалить команду "${teamsData[teamId]?.name}"?`)) return;
    
    delete teamsData[teamId];
    
    database.ref('teams').set(teamsData).then(() => {
        alert('✅ Команда удалена');
        updateAdminTeamsList();
        updateTournamentSettings();
        document.getElementById('totalTeams').value = Object.keys(teamsData).length;
    }).catch(error => {
        console.error('❌ Ошибка удаления команды:', error);
        alert('❌ Ошибка удаления команды: ' + error.message);
    });
}

function updateTournamentSettings() {
    const totalTeams = Object.keys(teamsData).length;
    
    database.ref('tournament/settings').update({
        totalTeams: totalTeams
    }).catch(error => {
        console.error('❌ Ошибка обновления настроек турнира:', error);
    });
}

// === РЕДАКТИРОВАНИЕ КОМАНД ===
function editTeam(teamId) {
    console.log('Редактирование команды:', teamId);
    currentEditingTeamId = teamId;
    const team = teamsData[teamId];
    
    const nameInput = document.getElementById('editTeamName');
    const sloganInput = document.getElementById('editTeamSlogan');
    
    if (nameInput) nameInput.value = team.name || '';
    if (sloganInput) sloganInput.value = team.slogan || '';
    
    // Заполнение игроков
    const playersContainer = document.getElementById('playersEditContainer');
    if (playersContainer) {
        playersContainer.innerHTML = '';
        
        (team.players || []).forEach((player) => {
            addPlayerField(player.name, player.role, player.mmr);
        });
    }
    
    const modal = document.getElementById('editTeamModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function addPlayerField(name = '', role = '', mmr = '3000') {
    const container = document.getElementById('playersEditContainer');
    if (!container) return;
    
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-edit-row';
    playerDiv.innerHTML = `
        <input type="text" placeholder="Имя игрока" value="${name}" class="player-name-input">
        <input type="text" placeholder="Роль" value="${role}" class="player-role-input">
        <input type="number" placeholder="MMR" value="${mmr}" class="player-mmr-input">
        <button type="button" class="remove-player">🗑️</button>
    `;
    
    // Добавляем обработчик для кнопки удаления
    const removeBtn = playerDiv.querySelector('.remove-player');
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            playerDiv.remove();
        });
    }
    
    container.appendChild(playerDiv);
}

function saveTeamChanges() {
    if (!currentEditingTeamId) return;
    
    const nameInput = document.getElementById('editTeamName');
    const sloganInput = document.getElementById('editTeamSlogan');
    
    if (!nameInput || !sloganInput) return;
    
    const name = nameInput.value;
    const slogan = sloganInput.value;
    
    const players = [];
    document.querySelectorAll('.player-edit-row').forEach(row => {
        const nameInput = row.querySelector('.player-name-input');
        const roleInput = row.querySelector('.player-role-input');
        const mmrInput = row.querySelector('.player-mmr-input');
        
        if (nameInput && nameInput.value.trim()) {
            players.push({
                name: nameInput.value,
                role: roleInput ? roleInput.value : 'Игрок',
                mmr: mmrInput ? parseInt(mmrInput.value) || 0 : 0
            });
        }
    });
    
    // Рассчитываем новый средний MMR
    const newMMR = calculateTeamMMR(players);
    
    // Обновление в Firebase
    database.ref('teams/' + currentEditingTeamId).update({
        name: name,
        slogan: slogan,
        players: players,
        mmr: newMMR
    }).then(() => {
        closeEditTeamModal();
        alert('✅ Команда сохранена!');
    }).catch(error => {
        console.error('❌ Ошибка сохранения команды:', error);
        alert('❌ Ошибка сохранения команды: ' + error.message);
    });
}

function closeEditTeamModal() {
    const modal = document.getElementById('editTeamModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentEditingTeamId = null;
}

// === УПРАВЛЕНИЕ ГРУППОВЫМ ЭТАПОМ ===
function saveGroupStageSettings() {
    const formatInput = document.getElementById('tournamentFormat');
    const groupsInput = document.getElementById('groupsCount');
    const advancingInput = document.getElementById('advancingTeams');
    
    if (!formatInput || !groupsInput || !advancingInput) return;
    
    const format = formatInput.value;
    const groupsCount = groupsInput.value;
    const advancingTeams = advancingInput.value;
    
    const settings = {
        format: format,
        settings: {
            totalTeams: Object.keys(teamsData).length,
            groups: parseInt(groupsCount),
            advancingTeams: parseInt(advancingTeams)
        }
    };
    
    // Обновление в Firebase
    database.ref('tournament').update(settings).then(() => {
        alert('✅ Настройки группового этапа сохранены!');
    }).catch(error => {
        console.error('❌ Ошибка сохранения настроек:', error);
        alert('❌ Ошибка сохранения настроек: ' + error.message);
    });
}

// === ЗАГРУЗКА НАЧАЛЬНЫХ ДАННЫХ ===
function loadInitialData() {
    console.log('🔄 Загрузка начальных данных...');
    // Данные уже загружаются через слушатели
}

// === ЗАГЛУШКИ ДЛЯ НЕРЕАЛИЗОВАННЫХ ФУНКЦИЙ ===
function updateTeamsSettings() {
    alert('Настройки команд сохранены');
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
