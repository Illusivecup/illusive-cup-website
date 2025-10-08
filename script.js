// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC4mZxJpzqoQn1l7K4wQ5Y9v8XzAbCdEfG",
    authDomain: "illusive-cup-2025.firebaseapp.com",
    databaseURL: "https://illusive-cup-2025-default-rtdb.firebaseio.com",
    projectId: "illusive-cup-2025",
    storageBucket: "illusive-cup-2025.firebasestorage.app",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Глобальные переменные
let currentUser = null;
let teams = {};
let matches = {};
let audienceAwards = {};
let selectedMatchForVoting = null;
let selectedPlayersForVoting = [];

// DOM элементы
const elements = {
    // Основные контейнеры
    teamsContent: document.getElementById('teamsContent'),
    scheduleContent: document.getElementById('scheduleContent'),
    groupStageContent: document.getElementById('groupStageContent'),
    playoffContent: document.getElementById('playoffContent'),
    audienceAwardContent: document.getElementById('audienceAwardContent'),
    
    // Кнопки навигации
    teamsDropdownBtn: document.getElementById('teamsDropdownBtn'),
    teamsDropdown: document.getElementById('teamsDropdown'),
    scheduleBtn: document.getElementById('scheduleBtn'),
    groupStageBtn: document.getElementById('groupStageBtn'),
    playoffBtn: document.getElementById('playoffBtn'),
    audienceAwardBtn: document.getElementById('audienceAwardBtn'),
    adminBtn: document.getElementById('adminBtn'),
    
    // Модальные окна
    adminPanel: document.getElementById('adminPanel'),
    authModal: document.getElementById('authModal'),
    editTeamModal: document.getElementById('editTeamModal'),
    addMatchModal: document.getElementById('addMatchModal'),
    editMatchResultModal: document.getElementById('editMatchResultModal'),
    votingModal: document.getElementById('votingModal'),
    editVoteModal: document.getElementById('editVoteModal'),
    
    // Статус подключения
    connectionStatus: document.getElementById('connectionStatus'),
    
    // Другие элементы
    singleTeamCard: document.getElementById('singleTeamCard'),
    upcomingMatches: document.getElementById('upcomingMatches'),
    completedMatches: document.getElementById('completedMatches'),
    groupStageContainer: document.getElementById('groupStageContainer'),
    audienceAwardsContent: document.getElementById('audienceAwardsContent')
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadInitialData();
});

// Инициализация приложения
function initializeApp() {
    console.log('🚀 Инициализация Illusive Cup 2025...');
    createAnimatedBackground();
    checkAuthentication();
}

// Создание анимированного фона
function createAnimatedBackground() {
    const bg = document.getElementById('animatedBg');
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Случайный размер и позиция
        const size = Math.random() * 100 + 50;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.background = `rgba(76, 175, 80, ${Math.random() * 0.2 + 0.1})`;
        
        // Случайная анимация
        const duration = Math.random() * 30 + 20;
        const delay = Math.random() * 10;
        particle.style.animation = `float ${duration}s linear ${delay}s infinite`;
        
        bg.appendChild(particle);
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Навигация
    elements.teamsDropdownBtn.addEventListener('click', toggleTeamsDropdown);
    elements.scheduleBtn.addEventListener('click', () => showContent('schedule'));
    elements.groupStageBtn.addEventListener('click', () => showContent('groupStage'));
    elements.playoffBtn.addEventListener('click', () => showContent('playoff'));
    elements.audienceAwardBtn.addEventListener('click', () => showContent('audienceAward'));
    elements.adminBtn.addEventListener('click', showAdminPanel);
    
    // Закрытие модальных окон
    setupModalCloseListeners();
    
    // Аутентификация
    document.getElementById('confirmAuth').addEventListener('click', authenticateEditor);
    document.getElementById('cancelAuth').addEventListener('click', closeAuthModal);
    document.getElementById('editorPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') authenticateEditor();
    });
    
    // Голосование
    document.getElementById('submitVote').addEventListener('click', submitVote);
    document.getElementById('cancelVote').addEventListener('click', closeVotingModal);
    
    // Редактирование голосов
    document.getElementById('saveVoteChanges').addEventListener('click', saveVoteChanges);
    document.getElementById('deleteVoteBtn').addEventListener('click', deleteVote);
    document.getElementById('cancelEditVote').addEventListener('click', closeEditVoteModal);
    
    // Управление голосованием в админке
    document.getElementById('selectMatchForVote').addEventListener('click', selectMatchForVoting);
}

// Настройка обработчиков закрытия модальных окон
function setupModalCloseListeners() {
    const closeButtons = [
        { btn: 'closeAdminPanel', modal: 'adminPanel' },
        { btn: 'closeAuthModal', modal: 'authModal' },
        { btn: 'closeEditTeamModal', modal: 'editTeamModal' },
        { btn: 'closeAddMatchModal', modal: 'addMatchModal' },
        { btn: 'closeEditMatchResultModal', modal: 'editMatchResultModal' },
        { btn: 'closeVotingModal', modal: 'votingModal' },
        { btn: 'closeEditVoteModal', modal: 'editVoteModal' }
    ];
    
    closeButtons.forEach(({ btn, modal }) => {
        const element = document.getElementById(btn);
        if (element) {
            element.addEventListener('click', () => {
                document.getElementById(modal).classList.add('hidden');
            });
        }
    });
    
    // Закрытие по клику вне модального окна
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
        }
    });
}

// Проверка аутентификации
function checkAuthentication() {
    const savedAuth = localStorage.getItem('editorAuth');
    if (savedAuth && JSON.parse(savedAuth).expires > Date.now()) {
        currentUser = JSON.parse(savedAuth);
        updateUIForAuthenticatedUser();
    }
}

// Аутентификация редактора
function authenticateEditor() {
    const password = document.getElementById('editorPassword').value;
    
    // Проверка пароля (в реальном приложении это должно быть на сервере)
    if (password === 'admin123') { // Временный пароль
        const authData = {
            authenticated: true,
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 часа
        };
        
        localStorage.setItem('editorAuth', JSON.stringify(authData));
        currentUser = authData;
        
        closeAuthModal();
        showAdminPanel();
        updateUIForAuthenticatedUser();
        
        showNotification('✅ Успешная авторизация!', 'success');
    } else {
        showNotification('❌ Неверный пароль!', 'error');
    }
}

// Обновление UI для аутентифицированного пользователя
function updateUIForAuthenticatedUser() {
    elements.adminBtn.style.display = 'block';
}

// Показать панель администратора
function showAdminPanel() {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    loadAdminData();
    elements.adminPanel.classList.remove('hidden');
    
    // Настройка вкладок админки
    setupAdminTabs();
}

// Настройка вкладок админки
function setupAdminTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Убрать активные классы
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Добавить активные классы
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // Загрузить данные для активной вкладки
            if (tabId === 'audienceAwardTab') {
                loadAudienceAwardsForEditing();
            }
        });
    });
}

// Загрузка данных для админки
function loadAdminData() {
    loadTeamsForAdmin();
    loadScheduleForAdmin();
    loadAudienceAwardsForEditing();
}

// Показать модальное окно аутентификации
function showAuthModal() {
    document.getElementById('editorPassword').value = '';
    elements.authModal.classList.remove('hidden');
}

// Закрыть модальное окно аутентификации
function closeAuthModal() {
    elements.authModal.classList.add('hidden');
}

// Переключение выпадающего списка команд
function toggleTeamsDropdown() {
    elements.teamsDropdown.classList.toggle('active');
    elements.teamsDropdownBtn.parentElement.classList.toggle('active');
}

// Показать контент
function showContent(type) {
    // Скрыть все секции
    const sections = [
        elements.teamsContent,
        elements.scheduleContent,
        elements.groupStageContent,
        elements.playoffContent,
        elements.audienceAwardContent
    ];
    
    sections.forEach(section => section.classList.add('hidden'));
    
    // Показать выбранную секцию
    switch (type) {
        case 'teams':
            elements.teamsContent.classList.remove('hidden');
            break;
        case 'schedule':
            elements.scheduleContent.classList.remove('hidden');
            loadSchedule();
            break;
        case 'groupStage':
            elements.groupStageContent.classList.remove('hidden');
            loadGroupStage();
            break;
        case 'playoff':
            elements.playoffContent.classList.remove('hidden');
            loadPlayoff();
            break;
        case 'audienceAward':
            elements.audienceAwardContent.classList.remove('hidden');
            loadAudienceAwards();
            break;
    }
    
    // Закрыть выпадающий список команд
    elements.teamsDropdown.classList.remove('active');
    elements.teamsDropdownBtn.parentElement.classList.remove('active');
}

// Загрузка начальных данных
function loadInitialData() {
    updateConnectionStatus('Подключение к базе данных...', 'connecting');
    
    // Загрузка команд
    database.ref('teams').on('value', (snapshot) => {
        teams = snapshot.val() || {};
        updateTeamsDropdown();
        updateConnectionStatus('Подключено', 'connected');
    }, (error) => {
        console.error('Ошибка загрузки команд:', error);
        updateConnectionStatus('Ошибка подключения', 'error');
    });
    
    // Загрузка матчей
    database.ref('matches').on('value', (snapshot) => {
        matches = snapshot.val() || {};
        loadSchedule();
    });
    
    // Загрузка приза зрительских симпатий
    database.ref('audienceAwards').on('value', (snapshot) => {
        audienceAwards = snapshot.val() || {};
        loadAudienceAwards();
    });
}

// Обновление статуса подключения
function updateConnectionStatus(message, status) {
    elements.connectionStatus.classList.remove('hidden');
    elements.connectionStatus.querySelector('.status-text').textContent = message;
    elements.connectionStatus.className = `connection-status ${status}`;
}

// Обновление выпадающего списка команд
function updateTeamsDropdown() {
    elements.teamsDropdown.innerHTML = '';
    
    Object.keys(teams).forEach(teamId => {
        const team = teams[teamId];
        const link = document.createElement('a');
        link.textContent = team.name;
        link.href = '#';
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showTeamCard(teamId);
        });
        elements.teamsDropdown.appendChild(link);
    });
}

// Показать карточку команды
function showTeamCard(teamId) {
    const team = teams[teamId];
    if (!team) return;
    
    const cardHTML = `
        <div class="team-visiting-card">
            <div class="card-header">
                <div class="header-highlight"></div>
                <h2 class="team-name-bublas">${team.name}</h2>
                <p class="team-subtitle">${team.slogan || 'Команда мечты'}</p>
            </div>
            <div class="team-card-content">
                <div class="players-section-bublas">
                    <h3 class="section-title-bublas">Состав команды</h3>
                    <div class="player-grid-bublas">
                        ${team.players ? team.players.map((player, index) => `
                            <div class="player-card-bublas">
                                <div class="player-name-bublas">${player.name}</div>
                                <div class="player-role-bublas">${player.role || 'Игрок'}</div>
                            </div>
                        `).join('') : '<p>Состав не указан</p>'}
                    </div>
                </div>
                <div class="team-stats-bublas">
                    <div class="stat-item-bublas">
                        <div class="stat-value-bublas">${team.wins || 0}</div>
                        <div class="stat-label-bublas">Побед</div>
                    </div>
                    <div class="stat-item-bublas">
                        <div class="stat-value-bublas">${team.losses || 0}</div>
                        <div class="stat-label-bublas">Поражений</div>
                    </div>
                    <div class="stat-item-bublas">
                        <div class="stat-value-bublas">${team.rating || 1000}</div>
                        <div class="stat-label-bublas">Рейтинг</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    elements.singleTeamCard.innerHTML = cardHTML;
    showContent('teams');
}

// Загрузка расписания
function loadSchedule() {
    if (!elements.upcomingMatches || !elements.completedMatches) return;
    
    elements.upcomingMatches.innerHTML = '';
    elements.completedMatches.innerHTML = '';
    
    Object.keys(matches).forEach(matchId => {
        const match = matches[matchId];
        const matchCard = createMatchCard(matchId, match);
        
        if (match.status === 'completed') {
            elements.completedMatches.appendChild(matchCard);
        } else {
            elements.upcomingMatches.appendChild(matchCard);
        }
    });
}

// Создание карточки матча
function createMatchCard(matchId, match) {
    const team1 = teams[match.team1];
    const team2 = teams[match.team2];
    
    if (!team1 || !team2) return document.createElement('div');
    
    const card = document.createElement('div');
    card.className = 'match-card';
    card.innerHTML = `
        <div class="match-header">
            <span class="match-stage">${getStageName(match.stage)}</span>
            <span class="match-time">${formatDateTime(match.time)}</span>
        </div>
        <div class="match-teams">
            <div class="team">
                <div class="team-name">${team1.name}</div>
                <div class="team-score">${match.score1 || 0}</div>
            </div>
            <div class="vs">VS</div>
            <div class="team">
                <div class="team-name">${team2.name}</div>
                <div class="team-score">${match.score2 || 0}</div>
            </div>
        </div>
        <div class="match-status ${match.status === 'completed' ? 'status-completed' : 'status-upcoming'}">
            ${match.status === 'completed' ? 'Завершен' : 'Запланирован'}
        </div>
    `;
    
    // Добавляем обработчик клика для голосования
    if (match.status === 'completed' && currentUser) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => openVotingModal(matchId, match));
    }
    
    return card;
}

// Открытие модального окна голосования
function openVotingModal(matchId, match) {
    selectedMatchForVoting = { id: matchId, ...match };
    selectedPlayersForVoting = [];
    
    const team1 = teams[match.team1];
    const team2 = teams[match.team2];
    
    if (!team1 || !team2) return;
    
    // Обновляем информацию о матче
    document.getElementById('votingMatchInfo').innerHTML = `
        <h3>${team1.name} vs ${team2.name}</h3>
        <p>${formatDateTime(match.time)} • ${getStageName(match.stage)}</p>
    `;
    
    // Загружаем игроков команд
    loadPlayersForVoting('team1Voting', team1);
    loadPlayersForVoting('team2Voting', team2);
    
    // Показываем модальное окно
    elements.votingModal.classList.remove('hidden');
}

// Загрузка игроков для голосования
function loadPlayersForVoting(containerId, team) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="voting-team-header">
            <div class="voting-team-name">${team.name}</div>
        </div>
        <div class="player-voting-list">
            ${team.players ? team.players.map((player, index) => `
                <div class="player-voting-item" data-player-id="${index}">
                    <div class="player-checkbox"></div>
                    <div class="player-voting-info">
                        <div class="player-voting-name">${player.name}</div>
                        <div class="player-voting-role">${player.role || 'Игрок'}</div>
                    </div>
                </div>
            `).join('') : '<p>Игроки не указаны</p>'}
        </div>
    `;
    
    // Добавляем обработчики выбора игроков
    container.querySelectorAll('.player-voting-item').forEach(item => {
        item.addEventListener('click', function() {
            const playerId = this.getAttribute('data-player-id');
            const player = team.players[playerId];
            const playerKey = `${team.name}_${player.name}`;
            
            if (this.classList.contains('selected')) {
                // Убираем из выбранных
                this.classList.remove('selected');
                selectedPlayersForVoting = selectedPlayersForVoting.filter(p => p.key !== playerKey);
            } else {
                // Добавляем в выбранных
                this.classList.add('selected');
                selectedPlayersForVoting.push({
                    key: playerKey,
                    team: team.name,
                    player: player.name,
                    reason: ''
                });
            }
        });
    });
}

// Отправка голоса
function submitVote() {
    if (selectedPlayersForVoting.length === 0) {
        showNotification('❌ Выберите хотя бы одного игрока!', 'error');
        return;
    }
    
    const voteId = Date.now().toString();
    const voteData = {
        matchId: selectedMatchForVoting.id,
        matchInfo: `${teams[selectedMatchForVoting.team1].name} vs ${teams[selectedMatchForVoting.team2].name}`,
        players: selectedPlayersForVoting,
        timestamp: Date.now()
    };
    
    // Сохраняем в Firebase
    database.ref(`audienceAwards/${voteId}`).set(voteData)
        .then(() => {
            showNotification('✅ Голос успешно отправлен!', 'success');
            closeVotingModal();
        })
        .catch((error) => {
            console.error('Ошибка сохранения голоса:', error);
            showNotification('❌ Ошибка отправки голоса!', 'error');
        });
}

// Закрыть модальное окно голосования
function closeVotingModal() {
    elements.votingModal.classList.add('hidden');
    selectedMatchForVoting = null;
    selectedPlayersForVoting = [];
}

// Загрузка группового этапа
function loadGroupStage() {
    // Заглушка - в реальном приложении здесь будет логика группового этапа
    elements.groupStageContainer.innerHTML = `
        <div class="group-stage-container">
            <div class="group-tables">
                <div class="group-table">
                    <div class="group-header">
                        <h3>Группа A</h3>
                    </div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Команда</th>
                                <th>И</th>
                                <th>В</th>
                                <th>П</th>
                                <th>О</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="qualified">
                                <td>1</td>
                                <td class="team-cell">
                                    <div class="team-logo-small">T1</div>
                                    <span>Team Alpha</span>
                                </td>
                                <td>3</td>
                                <td>3</td>
                                <td>0</td>
                                <td>9</td>
                            </tr>
                            <tr class="qualified">
                                <td>2</td>
                                <td class="team-cell">
                                    <div class="team-logo-small">T2</div>
                                    <span>Team Beta</span>
                                </td>
                                <td>3</td>
                                <td>2</td>
                                <td>1</td>
                                <td>6</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Загрузка плей-офф
function loadPlayoff() {
    // Заглушка - в реальном приложении здесь будет логика плей-офф
    document.getElementById('thirdPlaceMatch').innerHTML = `
        <div class="match-teams">
            <div class="team">
                <div class="team-name">Team Gamma</div>
                <div class="team-score">2</div>
            </div>
            <div class="vs">VS</div>
            <div class="team">
                <div class="team-name">Team Delta</div>
                <div class="team-score">1</div>
            </div>
        </div>
    `;
    
    document.getElementById('grandFinalMatch').innerHTML = `
        <div class="match-teams">
            <div class="team">
                <div class="team-name">Team Alpha</div>
                <div class="team-score">3</div>
            </div>
            <div class="vs">VS</div>
            <div class="team">
                <div class="team-name">Team Beta</div>
                <div class="team-score">2</div>
            </div>
        </div>
    `;
    
    document.getElementById('winnerSection').innerHTML = `
        <div class="winner-trophy">🏆</div>
        <div class="winner-name">Team Alpha</div>
        <p>Победитель Illusive Cup 2025</p>
    `;
}

// Загрузка приза зрительских симпатий
function loadAudienceAwards() {
    if (!elements.audienceAwardsContent) return;
    
    let awardsHTML = '';
    
    if (Object.keys(audienceAwards).length === 0) {
        awardsHTML = `
            <div class="text-center">
                <h3>🎭 Приз зрительских симпатий</h3>
                <p>Голосование еще не проводилось</p>
            </div>
        `;
    } else {
        awardsHTML = `
            <div class="awards-grid">
                ${Object.keys(audienceAwards).map(voteId => {
                    const vote = audienceAwards[voteId];
                    return `
                        <div class="award-card">
                            <div class="award-header">
                                <div class="award-icon">🎭</div>
                                <div class="award-title">${vote.matchInfo}</div>
                            </div>
                            ${vote.players.map(player => `
                                <div class="award-player">${player.player}</div>
                                <div class="award-reason">${player.reason || 'Без комментария'}</div>
                            `).join('')}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    elements.audienceAwardsContent.innerHTML = awardsHTML;
}

// Загрузка приза зрительских симпатий для редактирования
function loadAudienceAwardsForEditing() {
    const votesList = document.getElementById('votesList');
    if (!votesList) return;
    
    let votesHTML = '';
    
    if (Object.keys(audienceAwards).length === 0) {
        votesHTML = '<p>Голосов пока нет</p>';
    } else {
        votesHTML = Object.keys(audienceAwards).map(voteId => {
            const vote = audienceAwards[voteId];
            return `
                <div class="vote-item-admin">
                    <div class="vote-info">
                        <div class="vote-match-admin">${vote.matchInfo}</div>
                        <div class="vote-players-admin">
                            ${vote.players.map(p => p.player).join(', ')}
                        </div>
                    </div>
                    <div class="admin-actions">
                        <button class="edit-btn" onclick="editVote('${voteId}')">
                            ✏️ Редактировать
                        </button>
                        <button class="delete-btn" onclick="deleteVote('${voteId}')">
                            🗑️ Удалить
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    votesList.innerHTML = votesHTML;
}

// Редактирование голоса
function editVote(voteId) {
    const vote = audienceAwards[voteId];
    if (!vote) return;
    
    // Сохраняем ID редактируемого голоса
    window.editingVoteId = voteId;
    
    // Обновляем информацию о голосе
    document.getElementById('editVoteInfo').innerHTML = `
        <h3>${vote.matchInfo}</h3>
        <p>Редактирование голоса</p>
    `;
    
    // Загружаем выбранных игроков с полями для причин
    const playersList = document.getElementById('selectedPlayersList');
    playersList.innerHTML = vote.players.map((player, index) => `
        <div class="selected-player-item">
            <div class="selected-player-header">
                <div class="selected-player-name">${player.player}</div>
                <div class="selected-player-team">${player.team}</div>
            </div>
            <textarea class="reason-input" placeholder="Причина выбора игрока..." 
                     data-player-index="${index}">${player.reason || ''}</textarea>
        </div>
    `).join('');
    
    // Показываем модальное окно
    elements.editVoteModal.classList.remove('hidden');
}

// Сохранение изменений голоса
function saveVoteChanges() {
    const voteId = window.editingVoteId;
    if (!voteId) return;
    
    const vote = audienceAwards[voteId];
    if (!vote) return;
    
    // Обновляем причины для каждого игрока
    const reasonInputs = document.querySelectorAll('.reason-input');
    reasonInputs.forEach(input => {
        const playerIndex = input.getAttribute('data-player-index');
        if (vote.players[playerIndex]) {
            vote.players[playerIndex].reason = input.value;
        }
    });
    
    // Сохраняем в Firebase
    database.ref(`audienceAwards/${voteId}`).update({
        players: vote.players
    })
    .then(() => {
        showNotification('✅ Изменения сохранены!', 'success');
        closeEditVoteModal();
        loadAudienceAwardsForEditing();
    })
    .catch((error) => {
        console.error('Ошибка сохранения изменений:', error);
        showNotification('❌ Ошибка сохранения!', 'error');
    });
}

// Удаление голоса
function deleteVote(voteId = null) {
    const idToDelete = voteId || window.editingVoteId;
    if (!idToDelete) return;
    
    if (confirm('Вы уверены, что хотите удалить этот голос?')) {
        database.ref(`audienceAwards/${idToDelete}`).remove()
            .then(() => {
                showNotification('✅ Голос удален!', 'success');
                if (!voteId) {
                    closeEditVoteModal();
                }
                loadAudienceAwardsForEditing();
            })
            .catch((error) => {
                console.error('Ошибка удаления голоса:', error);
                showNotification('❌ Ошибка удаления!', 'error');
            });
    }
}

// Закрыть модальное окно редактирования голоса
function closeEditVoteModal() {
    elements.editVoteModal.classList.add('hidden');
    window.editingVoteId = null;
}

// Выбор матча для голосования
function selectMatchForVoting() {
    const matchSelect = document.getElementById('voteMatchSelect');
    const selectedMatchId = matchSelect.value;
    
    if (!selectedMatchId) {
        showNotification('❌ Выберите матч!', 'error');
        return;
    }
    
    const match = matches[selectedMatchId];
    if (!match) return;
    
    openVotingModal(selectedMatchId, match);
}

// Загрузка команд для админки
function loadTeamsForAdmin() {
    const teamsList = document.getElementById('adminTeamsList');
    if (!teamsList) return;
    
    let teamsHTML = '';
    
    Object.keys(teams).forEach(teamId => {
        const team = teams[teamId];
        teamsHTML += `
            <div class="admin-team-item">
                <div class="team-info">
                    <div class="team-name-admin">${team.name}</div>
                    <div class="team-slogan-admin">${team.slogan || 'Без слогана'}</div>
                </div>
                <div class="admin-actions">
                    <button class="edit-btn" onclick="editTeam('${teamId}')">
                        ✏️ Редактировать
                    </button>
                    <button class="delete-btn" onclick="deleteTeam('${teamId}')">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `;
    });
    
    teamsList.innerHTML = teamsHTML;
}

// Загрузка расписания для админки
function loadScheduleForAdmin() {
    const scheduleList = document.getElementById('scheduleEditList');
    if (!scheduleList) return;
    
    let scheduleHTML = '';
    
    Object.keys(matches).forEach(matchId => {
        const match = matches[matchId];
        const team1 = teams[match.team1] || { name: 'Неизвестно' };
        const team2 = teams[match.team2] || { name: 'Неизвестно' };
        
        scheduleHTML += `
            <div class="admin-schedule-item">
                <div class="match-info-admin">
                    <div class="match-teams-admin">${team1.name} vs ${team2.name}</div>
                    <div class="match-details-admin">
                        ${formatDateTime(match.time)} • ${getStageName(match.stage)} • ${match.status === 'completed' ? 'Завершен' : 'Запланирован'}
                    </div>
                </div>
                <div class="admin-actions">
                    <button class="edit-btn" onclick="editMatchResult('${matchId}')">
                        ✏️ Результат
                    </button>
                    <button class="delete-btn" onclick="deleteMatch('${matchId}')">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `;
    });
    
    scheduleList.innerHTML = scheduleHTML;
}

// Вспомогательные функции
function getStageName(stage) {
    const stages = {
        'group': 'Групповой этап',
        'third_place': 'Матч за 3 место',
        'grand_final': 'Гранд финал'
    };
    return stages[stage] || stage;
}

function formatDateTime(timestamp) {
    if (!timestamp) return 'Время не указано';
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU');
}

function showNotification(message, type = 'info') {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--accent-success)' : type === 'error' ? 'var(--accent-danger)' : 'var(--accent-warning)'};
        color: white;
        padding: 15px 20px;
        border-radius: var(--radius-medium);
        box-shadow: var(--shadow-medium);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Добавляем CSS анимации для уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Заглушки для функций, которые будут реализованы позже
function editTeam(teamId) {
    console.log('Редактирование команды:', teamId);
    showNotification('Функция редактирования команды в разработке', 'info');
}

function deleteTeam(teamId) {
    if (confirm('Вы уверены, что хотите удалить эту команду?')) {
        database.ref(`teams/${teamId}`).remove()
            .then(() => showNotification('✅ Команда удалена!', 'success'))
            .catch(error => {
                console.error('Ошибка удаления команды:', error);
                showNotification('❌ Ошибка удаления команды!', 'error');
            });
    }
}

function editMatchResult(matchId) {
    console.log('Редактирование результата матча:', matchId);
    showNotification('Функция редактирования результата матча в разработке', 'info');
}

function deleteMatch(matchId) {
    if (confirm('Вы уверены, что хотите удалить этот матч?')) {
        database.ref(`matches/${matchId}`).remove()
            .then(() => showNotification('✅ Матч удален!', 'success'))
            .catch(error => {
                console.error('Ошибка удаления матча:', error);
                showNotification('❌ Ошибка удаления матча!', 'error');
            });
    }
}

// Загрузка матчей для выпадающего списка в админке
function loadMatchesForVotingSelect() {
    const select = document.getElementById('voteMatchSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Выберите матч --</option>';
    
    Object.keys(matches).forEach(matchId => {
        const match = matches[matchId];
        const team1 = teams[match.team1];
        const team2 = teams[match.team2];
        
        if (team1 && team2 && match.status === 'completed') {
            const option = document.createElement('option');
            option.value = matchId;
            option.textContent = `${team1.name} vs ${team2.name} (${formatDateTime(match.time)})`;
            select.appendChild(option);
        }
    });
}

// Обновляем загрузку матчей для выпадающего списка при изменении данных
database.ref('matches').on('value', () => {
    loadMatchesForVotingSelect();
});