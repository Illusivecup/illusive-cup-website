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

// === ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ===
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    createAnimatedBackground();
    checkEditorAccess();
    setupRealTimeListeners();
    loadInitialData();
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
        displayTeamsCards();
        updateConnectionStatus(true);
    }, (error) => {
        console.error('❌ Ошибка загрузки команд:', error);
        updateConnectionStatus(false);
    });

    // Слушатель для турнирной сетки
    database.ref('bracket').on('value', (snapshot) => {
        const bracketData = snapshot.val();
        console.log('📥 Загружена сетка:', bracketData);
        // Здесь будет отображение сетки
    });

    // Слушатель для расписания
    database.ref('schedule').on('value', (snapshot) => {
        const scheduleData = snapshot.val();
        console.log('📥 Загружено расписание:', scheduleData);
        // Здесь будет отображение расписания
    });
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
        link.onclick = () => showTeamCard(teamId);
        dropdown.appendChild(link);
    });
}

// === ОТОБРАЖЕНИЕ КАРТОЧЕК КОМАНД ===
function displayTeamsCards() {
    const container = document.getElementById('teamsContent');
    container.innerHTML = '';
    
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
                    ${(team.players || []).map(player => `
                        <div class="player-card-bublas">
                            <div class="player-role-bublas">${player.role || 'Игрок'}</div>
                            <div class="player-name-bublas">${player.name || 'Неизвестно'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="stats-section-bublas">
                <div class="mmr-display-bublas">
                    <div class="mmr-label-bublas">Средний MMR</div>
                    <div class="mmr-value-bublas">${team.mmr || '0'}</div>
                </div>
                <div class="tournament-section-bublas">
                    <div class="tournament-text-bublas">Illusive Cup</div>
                    <div class="tournament-badge-bublas">2025</div>
                </div>
            </div>
        </div>
        <div class="team-footer-bublas">
            Зарегистрирована для участия в турнире
            ${isEditor ? `<button onclick="editTeam('${teamId}')" class="edit-team-btn">✏️ Редактировать</button>` : ''}
        </div>
    `;
    return card;
}

// === НАВИГАЦИЯ ===
function toggleDropdown() {
    document.querySelector('.dropdown').classList.toggle('active');
}

function showTeamCard(teamId) {
    showTeams();
    // Можно добавить скролл к конкретной карточке
    const card = document.querySelector(`[data-team-id="${teamId}"]`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth' });
    }
}

function showTeams() {
    hideAllSections();
    document.getElementById('teamsContent').classList.remove('hidden');
}

function showBracket() {
    hideAllSections();
    document.getElementById('bracketContent').classList.remove('hidden');
}

function showSchedule() {
    hideAllSections();
    document.getElementById('scheduleContent').classList.remove('hidden');
}

function showAdminPanel() {
    document.getElementById('adminPanel').classList.remove('hidden');
}

function closeAdminPanel() {
    document.getElementById('adminPanel').classList.add('hidden');
}

function hideAllSections() {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
}

// === ЗАГРУЗКА НАЧАЛЬНЫХ ДАННЫХ ===
function loadInitialData() {
    console.log('🔄 Загрузка начальных данных...');
    // Данные уже загружаются через слушатели
}

// === БАЗОВЫЕ ФУНКЦИИ РЕДАКТОРА ===
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
    
    (team.players || []).forEach((player, index) => {
        addPlayerField(player.name, player.role);
    });
    
    document.getElementById('editTeamModal').classList.remove('hidden');
}

function addPlayerField(name = '', role = '') {
    const container = document.getElementById('playersEditContainer');
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-edit-row';
    playerDiv.innerHTML = `
        <input type="text" placeholder="Имя игрока" value="${name}" class="player-name-input">
        <input type="text" placeholder="Роль" value="${role}" class="player-role-input">
        <button type="button" onclick="this.parentElement.remove()" class="remove-player">🗑️</button>
    `;
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

function openAdminTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    document.querySelector(`[onclick="openAdminTab('${tabName}')"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// Заглушки для функций, которые еще не реализованы
function updateTeamsSettings() {
    alert('Функция в разработке');
}

function saveBracketChanges() {
    alert('Функция в разработке');
}

function saveScheduleChanges() {
    alert('Функция в разработке');
}

function addScheduleMatch() {
    alert('Функция в разработке');
}

console.log('🚀 Приложение инициализировано!');
