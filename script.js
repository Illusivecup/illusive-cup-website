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

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let database;
let teamsManager;
let securityManager;
let matchManager;
let votingSystem;
let tournamentFormatManager;

// === МЕНЕДЖЕР ФОРМАТА ТУРНИРА (ПОЛНОСТЬЮ ОБНОВЛЕННЫЙ) ===
class TournamentFormatManager {
    constructor(database) {
        this.database = database;
        this.currentFormat = 'with_groups';
        this.groupStages = ['group', 'third_place', 'grand_final'];
        this.noGroupStages = ['quarter_final', 'semi_final', 'lower_bracket', 'grand_final'];
    }

    async initialize() {
        await this.loadTournamentFormat();
        await this.setupFormatListeners();
        this.applyFormat();
    }

    async loadTournamentFormat() {
        try {
            const snapshot = await this.database.ref('tournamentFormat').once('value');
            if (snapshot.exists()) {
                this.currentFormat = snapshot.val();
                console.log('📋 Загружен формат турнира:', this.currentFormat);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки формата турнира:', error);
        }
    }

    async setupFormatListeners() {
        this.database.ref('tournamentFormat').on('value', (snapshot) => {
            if (snapshot.exists()) {
                this.currentFormat = snapshot.val();
                console.log('📋 Обновлен формат турнира:', this.currentFormat);
                this.applyFormat();
                
                // Обновляем UI матчей при смене формата
                if (matchManager && matchManager.updateMatchUI) {
                    matchManager.updateMatchUI();
                }
            }
        });
    }

    applyFormat() {
        const isGroupFormat = this.currentFormat === 'with_groups';
        
        // Управление отображением элементов навигации
        document.querySelectorAll('.group-format-item').forEach(item => {
            item.classList.toggle('hidden', !isGroupFormat);
        });
        
        document.querySelectorAll('.no-group-format-item').forEach(item => {
            item.classList.toggle('hidden', isGroupFormat);
        });

        // Управление отображением вкладок в админ-панели
        const groupStageTab = document.querySelector('[data-tab="groupStageTab"]');
        const scheduleTab = document.querySelector('[data-tab="scheduleTab"]');
        const rpofTab = document.querySelector('[data-tab="rpofTab"]');
        
        if (groupStageTab) {
            groupStageTab.classList.toggle('hidden', !isGroupFormat);
        }
        if (scheduleTab) {
            scheduleTab.classList.toggle('hidden', !isGroupFormat);
        }
        if (rpofTab) {
            rpofTab.classList.toggle('hidden', isGroupFormat);
        }

        // Обновляем выпадающие списки этапов
        this.updateStageSelects();

        console.log('🎯 Применен формат:', isGroupFormat ? 'С группой' : 'Без группы');
    }

    updateStageSelects() {
        const isGroupFormat = this.currentFormat === 'with_groups';
        
        // Обновляем выпадающий список в добавлении матчей
        const newMatchStageSelect = document.getElementById('newMatchStage');
        const editMatchStageSelect = document.getElementById('editMatchStage');
        
        if (newMatchStageSelect) {
            newMatchStageSelect.innerHTML = this.getStageOptions(isGroupFormat);
        }
        if (editMatchStageSelect) {
            editMatchStageSelect.innerHTML = this.getStageOptions(isGroupFormat);
        }
    }

    getStageOptions(isGroupFormat) {
        if (isGroupFormat) {
            return `
                <option value="group">Групповой этап</option>
                <option value="third_place">Матч за 3 место</option>
                <option value="grand_final">Гранд финал</option>
            `;
        } else {
            return `
                <option value="quarter_final">Четвертьфинал</option>
                <option value="semi_final">Полуфинал</option>
                <option value="lower_bracket">Нижняя сетка</option>
                <option value="grand_final">Гранд финал</option>
            `;
        }
    }

    updateUI() {
        // Обновляем выпадающий список в настройках
        const formatSelect = document.getElementById('tournamentFormat');
        if (formatSelect) {
            formatSelect.value = this.currentFormat;
        }
        
        this.updateStageSelects();
    }

    async setTournamentFormat(format) {
        try {
            await this.database.ref('tournamentFormat').set(format);
            this.currentFormat = format;
            this.applyFormat();
            console.log('✅ Формат турнира сохранен:', format);
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения формата турнира:', error);
            return false;
        }
    }

    getCurrentFormat() {
        return this.currentFormat;
    }

    isGroupFormat() {
        return this.currentFormat === 'with_groups';
    }

    getStageName(stage) {
        const stages = {
            'group': 'Групповой этап',
            'third_place': 'Матч за 3 место',
            'grand_final': 'Гранд финал',
            'quarter_final': 'Четвертьфинал',
            'semi_final': 'Полуфинал',
            'lower_bracket': 'Нижняя сетка'
        };
        return stages[stage] || stage;
    }
}

// === СИСТЕМА БЕЗОПАСНОСТИ ===
class SecurityManager {
    constructor() {
        this.EDITOR_PASSWORD = 'IllusiveCup2025!';
        this.isAuthenticated = false;
        console.log('🔐 SecurityManager создан');
    }

    init() {
        console.log('🔐 Инициализация SecurityManager...');
        
        this.checkRequiredElements();
        this.checkExistingSession();
        this.setupEventListeners();
        console.log('✅ SecurityManager инициализирован');
    }

    checkRequiredElements() {
        const requiredElements = [
            'adminBtn',
            'authModal',
            'adminPanel',
            'confirmAuth',
            'cancelAuth',
            'closeAuthModal',
            'closeAdminPanel',
            'editorPassword'
        ];

        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            console.log(`🔍 ${id}:`, element ? '✅ Найден' : '❌ Не найден');
        });
    }

    setupEventListeners() {
        console.log('🔧 Настройка обработчиков SecurityManager...');
        
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            adminBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🖱️ Кнопка админки нажата!');
                this.handleAdminButtonClick();
            });
            console.log('✅ Обработчик кнопки админки добавлен');
        } else {
            console.error('❌ Элемент adminBtn не найден');
        }

        this.setupAuthModalListeners();
    }

    setupAuthModalListeners() {
        const confirmAuth = document.getElementById('confirmAuth');
        const cancelAuth = document.getElementById('cancelAuth');
        const closeAuthModal = document.getElementById('closeAuthModal');
        const closeAdminPanel = document.getElementById('closeAdminPanel');
        const editorPassword = document.getElementById('editorPassword');

        if (confirmAuth) {
            confirmAuth.addEventListener('click', () => {
                this.handleAuthConfirm();
            });
        }

        if (cancelAuth) {
            cancelAuth.addEventListener('click', () => {
                this.hideAuthModal();
            });
        }

        if (closeAuthModal) {
            closeAuthModal.addEventListener('click', () => {
                this.hideAuthModal();
            });
        }

        if (closeAdminPanel) {
            closeAdminPanel.addEventListener('click', () => {
                this.hideAdminPanel();
            });
        }

        if (editorPassword) {
            editorPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAuthConfirm();
                }
            });
        }

        console.log('✅ Обработчики модальных окон настроены');
    }

    handleAdminButtonClick() {
        console.log('🎯 Обработка клика админки, авторизован:', this.isAuthenticated);
        if (this.isAuthenticated) {
            this.showAdminPanel();
        } else {
            this.showAuthModal();
        }
    }

    async handleAuthConfirm() {
        console.log('🔐 Подтверждение авторизации...');
        const passwordInput = document.getElementById('editorPassword');
        const password = passwordInput.value.trim();
        
        if (!password) {
            alert('❌ Введите пароль');
            return;
        }

        const isValid = await this.authenticate(password);
        
        if (isValid) {
            this.isAuthenticated = true;
            this.startSession();
            this.hideAuthModal();
            this.showAdminPanel();
            
            // Обновляем статус подключения после авторизации
            updateConnectionStatus(true);
            
            alert('✅ Успешная авторизация!');
        } else {
            alert('❌ Неверный пароль');
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    async authenticate(password) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return password === this.EDITOR_PASSWORD;
    }

    startSession() {
        const sessionData = {
            authenticated: true,
            timestamp: Date.now()
        };
        localStorage.setItem('editor_session', JSON.stringify(sessionData));
        console.log('💾 Сессия сохранена в localStorage');
    }

    checkExistingSession() {
        try {
            const sessionData = localStorage.getItem('editor_session');
            if (!sessionData) return;

            const data = JSON.parse(sessionData);
            const sessionAge = Date.now() - data.timestamp;
            const maxAge = 8 * 60 * 60 * 1000;

            if (data.authenticated && sessionAge < maxAge) {
                this.isAuthenticated = true;
                console.log('✅ Сессия восстановлена');
            } else {
                this.clearSession();
            }
        } catch (error) {
            this.clearSession();
        }
    }

    clearSession() {
        localStorage.removeItem('editor_session');
        this.isAuthenticated = false;
        console.log('🗑️ Сессия очищена');
    }

    showAuthModal() {
        console.log('🪟 Показ модального окна авторизации');
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('hidden');
            const passwordInput = document.getElementById('editorPassword');
            if (passwordInput) {
                passwordInput.focus();
            }
        }
    }

    hideAuthModal() {
        console.log('🪟 Скрытие модального окна авторизации');
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.add('hidden');
            const passwordInput = document.getElementById('editorPassword');
            if (passwordInput) {
                passwordInput.value = '';
            }
        }
    }

    showAdminPanel() {
        console.log('🖥️ Показ админ панели');
        const panel = document.getElementById('adminPanel');
        if (panel) {
            panel.classList.remove('hidden');
            if (window.updateAdminTeamsList) {
                updateAdminTeamsList();
            }
            // Заполняем список матчей для голосования
            populateVoteMatchSelect();
        }
    }

    hideAdminPanel() {
        console.log('🖥️ Скрытие админ панели');
        const panel = document.getElementById('adminPanel');
        if (panel) {
            panel.classList.add('hidden');
        }
        
        // Скрываем статус подключения при выходе из админки
        updateConnectionStatus(false);
    }
}

// === МЕНЕДЖЕР КОМАНД ===
class TeamsManager {
    constructor(database) {
        this.database = database;
        this.teams = {};
    }

    async initialize() {
        await this.setupListeners();
    }

    async setupListeners() {
        return new Promise((resolve) => {
            this.database.ref('teams').on('value', (snapshot) => {
                this.handleTeamsUpdate(snapshot.val());
                resolve();
            });
        });
    }

    handleTeamsUpdate(teamsData) {
        this.teams = teamsData || {};
        console.log('📥 Обновлены данные команд:', this.teams);
        updateConnectionStatus(true);
        this.updateUI();
    }

    updateUI() {
        updateTeamsDropdown();
        updateAdminTeamsList();
        
        const appState = getAppState();
        if (appState.currentDisplayedTeamId) {
            showSingleTeamCard(appState.currentDisplayedTeamId);
        }
    }

    calculateTeamMMR(players) {
        if (!players || players.length === 0) return 0;
        
        const totalMMR = players.reduce((sum, player) => {
            return sum + (parseInt(player.mmr) || 0);
        }, 0);
        
        return Math.round(totalMMR / players.length);
    }

    async updateTeam(teamId, teamData) {
        teamData.mmr = this.calculateTeamMMR(teamData.players);
        teamData.updatedAt = Date.now();
        await this.database.ref(`teams/${teamId}`).update(teamData);
        return teamId;
    }

    async createTeam(teamId, teamData) {
        teamData.mmr = this.calculateTeamMMR(teamData.players);
        teamData.createdAt = Date.now();
        teamData.updatedAt = Date.now();
        await this.database.ref(`teams/${teamId}`).set(teamData);
        return teamId;
    }

    async deleteTeam(teamId) {
        if (!confirm('❌ Вы уверены, что хотите удалить эту команду? Это действие нельзя отменить.')) {
            return;
        }
        
        try {
            await this.database.ref(`teams/${teamId}`).remove();
            delete this.teams[teamId];
            console.log('✅ Команда удалена из базы:', teamId);
            
            closeEditTeamModal();
            this.updateUI();
            
            // Обновляем матчи после удаления команды
            if (matchManager && matchManager.updateMatchUI) {
                matchManager.updateMatchUI();
            }
            
            alert('✅ Команда успешно удалена!');
        } catch (error) {
            console.error('❌ Ошибка удаления команды:', error);
            alert('❌ Ошибка удаления команды');
        }
    }

    getTeam(teamId) {
        return this.teams[teamId];
    }

    getAllTeams() {
        return { ...this.teams };
    }
}

// === ОБНОВЛЕННЫЙ МЕНЕДЖЕР МАТЧЕЙ С РАЗДЕЛЬНЫМИ БАЗАМИ ===
class MatchManager {
    constructor(database) {
        this.database = database;
        this.matches = {};
        this.noGroupMatches = {};
    }

    async initialize() {
        await this.setupMatchListeners();
    }

    async setupMatchListeners() {
        return new Promise((resolve) => {
            // Слушаем обе базы данных
            this.database.ref('matches').on('value', (snapshot) => {
                this.matches = snapshot.val() || {};
                console.log('📥 Обновлены данные матчей (с группой):', this.matches);
                this.updateMatchUI();
                resolve();
            });

            this.database.ref('noGroupMatches').on('value', (snapshot) => {
                this.noGroupMatches = snapshot.val() || {};
                console.log('📥 Обновлены данные матчей (без группы):', this.noGroupMatches);
                this.updateMatchUI();
                resolve();
            });
        });
    }

    updateMatchUI() {
        const isGroupFormat = tournamentFormatManager ? tournamentFormatManager.isGroupFormat() : true;
        
        if (isGroupFormat) {
            this.updateGroupStageTable();
            this.updatePlayoffMatches();
            this.updateScheduleLists();
        } else {
            this.updateNoGroupScheduleLists();
            this.updatePlayoffGrid();
        }
    }

    getCurrentMatches() {
        const isGroupFormat = tournamentFormatManager ? tournamentFormatManager.isGroupFormat() : true;
        return isGroupFormat ? this.matches : this.noGroupMatches;
    }

    updateNoGroupScheduleLists() {
        const upcomingContainer = document.getElementById('upcomingMatchesNoGroup');
        const completedContainer = document.getElementById('completedMatchesNoGroup');
        
        if (!upcomingContainer || !completedContainer) return;

        const matches = this.noGroupMatches;
        const upcoming = Object.entries(matches)
            .filter(([matchId, match]) => !this.isMatchCompleted(match))
            .sort(([, a], [, b]) => (a.timestamp || 0) - (b.timestamp || 0));

        const completed = Object.entries(matches)
            .filter(([matchId, match]) => this.isMatchCompleted(match))
            .sort(([, a], [, b]) => (b.timestamp || 0) - (a.timestamp || 0));

        upcomingContainer.innerHTML = upcoming.map(([matchId, match]) => 
            this.createEnhancedScheduleMatchCard(match, false, matchId, false)
        ).join('') || '<div class="no-data">Нет запланированных матчей</div>';

        completedContainer.innerHTML = completed.map(([matchId, match]) => 
            this.createEnhancedScheduleMatchCard(match, true, matchId, false)
        ).join('') || '<div class="no-data">Нет завершенных матчей</div>';
    }

    updatePlayoffGrid() {
        const container = document.getElementById('playoffGridContent');
        if (!container) return;

        const matches = this.noGroupMatches;
        const stages = {
            'quarter_final': 'Четвертьфинал',
            'semi_final': 'Полуфинал', 
            'lower_bracket': 'Нижняя сетка',
            'grand_final': 'Гранд финал'
        };

        let content = '';
        
        Object.entries(stages).forEach(([stageKey, stageName]) => {
            const stageMatches = Object.entries(matches)
                .filter(([matchId, match]) => match.stage === stageKey)
                .sort(([, a], [, b]) => (a.timestamp || 0) - (b.timestamp || 0));

            if (stageMatches.length > 0) {
                content += `
                    <div class="playoff-stage-section">
                        <h3>${stageName}</h3>
                        <div class="playoff-stage-matches">
                            ${stageMatches.map(([matchId, match]) => 
                                this.createPlayoffGridMatchCard(match, matchId)
                            ).join('')}
                        </div>
                    </div>
                `;
            }
        });

        container.innerHTML = content || '<div class="no-data">Нет данных о матчах плей-офф</div>';
    }

    createPlayoffGridMatchCard(match, matchId) {
        const isCompleted = this.isMatchCompleted(match);
        const winner = this.getMatchWinner(match);
        const team1Class = winner === 'team1' ? 'winner' : (winner === 'team2' ? 'loser' : '');
        const team2Class = winner === 'team2' ? 'winner' : (winner === 'team1' ? 'loser' : '');
        
        return `
            <div class="playoff-grid-match" data-match-id="${matchId}">
                <div class="playoff-grid-teams">
                    <div class="playoff-grid-team ${team1Class}">
                        ${match.team1Name}
                    </div>
                    <div class="playoff-grid-vs">
                        ${isCompleted ? 
                            `<div class="playoff-grid-score">${match.score1 || 0}:${match.score2 || 0}</div>` : 
                            '<div class="playoff-grid-vs-text">VS</div>'
                        }
                    </div>
                    <div class="playoff-grid-team ${team2Class}">
                        ${match.team2Name}
                    </div>
                </div>
                <div class="playoff-grid-info">
                    <span class="playoff-grid-time">${match.time || 'Время не указано'}</span>
                    <span class="playoff-grid-format">${this.getFormatName(match.format)}</span>
                </div>
                ${isCompleted ? 
                    '<div class="playoff-grid-status completed">✅ Завершен</div>' : 
                    '<div class="playoff-grid-status upcoming">⏳ Ожидается</div>'
                }
            </div>
        `;
    }

    isMatchCompleted(match) {
        if (!match.format) {
            match.format = 'bo1';
        }

        const score1 = parseInt(match.score1) || 0;
        const score2 = parseInt(match.score2) || 0;

        switch (match.format) {
            case 'bo1':
                return score1 >= 1 || score2 >= 1;
            case 'bo3':
                return score1 >= 2 || score2 >= 2;
            case 'bo5':
                return score1 >= 3 || score2 >= 3;
            default:
                return score1 >= 1 || score2 >= 1;
        }
    }

    getRequiredWins(format) {
        switch (format) {
            case 'bo1': return 1;
            case 'bo3': return 2;
            case 'bo5': return 3;
            default: return 1;
        }
    }

    getFormatName(format) {
        const formats = {
            'bo1': 'Bo1',
            'bo3': 'Bo3', 
            'bo5': 'Bo5'
        };
        return formats[format] || 'Bo1';
    }

    getMatchWinner(match) {
        if (!this.isMatchCompleted(match)) return null;
        
        const requiredWins = this.getRequiredWins(match.format);
        const score1 = parseInt(match.score1) || 0;
        const score2 = parseInt(match.score2) || 0;
        
        if (score1 >= requiredWins) return 'team1';
        if (score2 >= requiredWins) return 'team2';
        return null;
    }

    updateGroupStageTable() {
        const container = document.getElementById('groupStageContainer');
        if (!container) return;

        const groupMatches = Object.values(this.matches).filter(match => 
            match.stage === 'group'
        );

        const standings = this.calculateStandings(groupMatches);
        container.innerHTML = this.createEnhancedGroupStageTable(standings);
    }

    calculateStandings(matches) {
        const standings = {};
        const teams = teamsManager ? teamsManager.getAllTeams() : {};

        Object.keys(teams).forEach(teamId => {
            const team = teams[teamId];
            if (team && team.name) {
                standings[teamId] = {
                    teamId: teamId,
                    teamName: team.name,
                    played: 0,
                    wins: 0,
                    losses: 0,
                    points: 0
                };
            }
        });

        matches.forEach(match => {
            if (!this.isMatchCompleted(match)) return;
            
            const team1Exists = teams[match.team1Id] && teams[match.team1Id].name;
            const team2Exists = teams[match.team2Id] && teams[match.team2Id].name;
            
            if (!team1Exists || !team2Exists) return;

            if (!standings[match.team1Id]) {
                standings[match.team1Id] = {
                    teamId: match.team1Id,
                    teamName: match.team1Name,
                    played: 0,
                    wins: 0,
                    losses: 0,
                    points: 0
                };
            }
            if (!standings[match.team2Id]) {
                standings[match.team2Id] = {
                    teamId: match.team2Id,
                    teamName: match.team2Name,
                    played: 0,
                    wins: 0,
                    losses: 0,
                    points: 0
                };
            }

            standings[match.team1Id].played++;
            standings[match.team2Id].played++;

            const winner = this.getMatchWinner(match);
            if (winner === 'team1') {
                standings[match.team1Id].wins++;
                standings[match.team1Id].points += 3;
                standings[match.team2Id].losses++;
            } else if (winner === 'team2') {
                standings[match.team2Id].wins++;
                standings[match.team2Id].points += 3;
                standings[match.team1Id].losses++;
            }
        });

        const validStandings = Object.values(standings).filter(team => 
            team && team.teamName
        );

        return validStandings.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.wins !== a.wins) return b.wins - a.wins;
            return a.losses - b.losses;
        });
    }

    createEnhancedGroupStageTable(standings) {
        if (standings.length === 0) {
            return '<div class="no-data">Нет данных о матчах группового этапа</div>';
        }

        // Определяем минимальное и максимальное количество очков
        const points = standings.map(team => team.points);
        const minPoints = Math.min(...points);
        const maxPoints = Math.max(...points);

        return `
            <div class="standings-table">
                <table>
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
                        ${standings.map((team, index) => {
                            let rowClass = 'middle';
                            
                            if (team.points === maxPoints && maxPoints !== minPoints) {
                                rowClass = 'champion';
                            } else if (team.points === minPoints && maxPoints !== minPoints) {
                                rowClass = 'relegation';
                            }
                            
                            return `
                                <tr class="${rowClass}">
                                    <td>${index + 1}</td>
                                    <td><strong>${team.teamName}</strong></td>
                                    <td>${team.played}</td>
                                    <td>${team.wins}</td>
                                    <td>${team.losses}</td>
                                    <td>${team.points}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    updatePlayoffMatches() {
        this.updateThirdPlaceMatch();
        this.updateGrandFinal();
        this.updateWinnerSection();
    }

    updateThirdPlaceMatch() {
        const container = document.getElementById('thirdPlaceMatch');
        if (!container) return;

        const thirdPlaceMatch = Object.values(this.matches).find(match => 
            match.stage === 'third_place'
        );

        if (thirdPlaceMatch) {
            container.innerHTML = this.createPlayoffMatchCard(thirdPlaceMatch);
        } else {
            container.innerHTML = '<div class="no-match">Матч за 3 место не назначен</div>';
        }
    }

    updateGrandFinal() {
        const container = document.getElementById('grandFinalMatch');
        if (!container) return;

        const grandFinal = Object.values(this.matches).find(match => 
            match.stage === 'grand_final'
        );

        if (grandFinal) {
            container.innerHTML = this.createPlayoffMatchCard(grandFinal);
        } else {
            container.innerHTML = '<div class="no-match">Грандфинал не назначен</div>';
        }
    }

    updateWinnerSection() {
        const container = document.getElementById('winnerSection');
        if (!container) return;

        const grandFinal = Object.values(this.matches).find(match => 
            match.stage === 'grand_final' && this.isMatchCompleted(match)
        );

        if (grandFinal) {
            const winner = this.getMatchWinner(grandFinal);
            const winnerName = winner === 'team1' ? grandFinal.team1Name : grandFinal.team2Name;
            container.innerHTML = `
                <div class="winner-content">
                    <div class="winner-icon">🏆</div>
                    <div class="winner-name">${winnerName}</div>
                    <div class="winner-subtitle">Победитель Illusive Cup 2025</div>
                </div>
            `;
        } else {
            container.innerHTML = '<div class="no-match">Победитель не определён</div>';
        }
    }

    createPlayoffMatchCard(match) {
        const isCompleted = this.isMatchCompleted(match);
        const currentFormat = match.format || 'bo1';
        const winner = this.getMatchWinner(match);
        const team1Class = winner === 'team1' ? 'winner' : (winner === 'team2' ? 'loser' : '');
        const team2Class = winner === 'team2' ? 'winner' : (winner === 'team1' ? 'loser' : '');
        
        return `
            <div class="playoff-match-content">
                <div class="playoff-team ${team1Class}">
                    ${match.team1Name}
                </div>
                ${isCompleted ? `
                    <div class="playoff-score">${match.score1 || 0} : ${match.score2 || 0}</div>
                ` : `
                    <div class="playoff-vs">VS</div>
                `}
                <div class="playoff-team ${team2Class}">
                    ${match.team2Name}
                </div>
                ${match.time ? `<div class="match-time">${match.time}</div>` : ''}
                <div class="match-format">${this.getFormatName(currentFormat)}</div>
            </div>
        `;
    }

    updateScheduleLists() {
        this.updateUpcomingMatches();
        this.updateCompletedMatches();
        
        // Дублируем для формата без группы
        this.updateNoGroupScheduleLists();
    }

    updateUpcomingMatches() {
        const container = document.getElementById('upcomingMatches');
        if (!container) return;

        const upcoming = Object.entries(this.matches)
            .filter(([matchId, match]) => !this.isMatchCompleted(match))
            .sort(([, a], [, b]) => (a.timestamp || 0) - (b.timestamp || 0));

        container.innerHTML = upcoming.map(([matchId, match]) => 
            this.createEnhancedScheduleMatchCard(match, false, matchId, true)
        ).join('') || '<div class="no-data">Нет запланированных матчей</div>';
    }

    updateCompletedMatches() {
        const container = document.getElementById('completedMatches');
        if (!container) return;

        const completed = Object.entries(this.matches)
            .filter(([matchId, match]) => this.isMatchCompleted(match))
            .sort(([, a], [, b]) => (b.timestamp || 0) - (a.timestamp || 0));

        container.innerHTML = completed.map(([matchId, match]) => 
            this.createEnhancedScheduleMatchCard(match, true, matchId, true)
        ).join('') || '<div class="no-data">Нет завершенных матчей</div>';
    }

    createEnhancedScheduleMatchCard(match, isCompleted = false, matchId = '', isGroupFormat = true) {
        const showScore = match.score1 !== undefined && match.score2 !== undefined;
        const teams = teamsManager ? teamsManager.getAllTeams() : {};
        const team1Exists = teams[match.team1Id] && teams[match.team1Id].name;
        const team2Exists = teams[match.team2Id] && teams[match.team2Id].name;
        
        const winner = this.getMatchWinner(match);
        const team1Class = winner === 'team1' ? 'winner' : (winner === 'team2' ? 'loser' : '');
        const team2Class = winner === 'team2' ? 'winner' : (winner === 'team1' ? 'loser' : '');
        
        // Определяем класс стиля в зависимости от этапа турнира
        let matchClass = 'match-card';
        const stageName = tournamentFormatManager ? tournamentFormatManager.getStageName(match.stage) : match.stage;
        
        if (match.stage === 'grand_final') {
            matchClass += ' grand-final';
        } else if (match.stage === 'third_place') {
            matchClass += ' third-place';
        } else if (match.stage === 'quarter_final' || match.stage === 'semi_final') {
            matchClass += ' playoff-stage';
        } else if (match.stage === 'lower_bracket') {
            matchClass += ' lower-bracket';
        } else {
            matchClass += ' group-stage';
        }
        
        if (isCompleted) {
            matchClass += ' completed';
        }
        
        if (!team1Exists || !team2Exists) {
            return `
                <div class="${matchClass} deleted" data-match-id="${matchId}">
                    <div class="match-time">${match.time || 'Время не указано'}</div>
                    <div class="match-teams">
                        <div class="team-name large deleted">${team1Exists ? match.team1Name : 'Команда удалена'}</div>
                        <div class="vs">vs</div>
                        <div class="team-name large deleted">${team2Exists ? match.team2Name : 'Команда удалена'}</div>
                    </div>
                    <div class="match-stage">${stageName}</div>
                    <div class="match-format">${this.getFormatName(match.format)}</div>
                    <div class="match-status">🗑️ Команда удалена</div>
                </div>
            `;
        }
        
        const currentFormat = match.format || 'bo1';
        const winnerIcon = winner ? '🏆' : '';
        
        return `
            <div class="${matchClass}" data-match-id="${matchId}">
                <div class="match-time">${match.time || 'Время не указано'}</div>
                <div class="match-teams">
                    <div class="team-name large ${team1Class}">
                        ${match.team1Name} ${winner === 'team1' ? winnerIcon : ''}
                    </div>
                    <div class="vs">vs</div>
                    <div class="team-name large ${team2Class}">
                        ${match.team2Name} ${winner === 'team2' ? winnerIcon : ''}
                    </div>
                </div>
                ${showScore ? createEnhancedProgressBar(match) : ''}
                <div class="match-stage">${stageName}</div>
                <div class="match-format">${this.getFormatName(currentFormat)}</div>
                ${isCompleted ? '<div class="match-status">✅ Завершен</div>' : '<div class="match-status">⏳ Ожидается</div>'}
            </div>
        `;
    }

    async createMatch(matchData) {
        const isGroupFormat = tournamentFormatManager ? tournamentFormatManager.isGroupFormat() : true;
        const matchId = `match_${Date.now()}`;
        
        matchData.createdAt = Date.now();
        matchData.updatedAt = Date.now();
        
        if (!matchData.format) {
            matchData.format = 'bo1';
        }
        
        const dbPath = isGroupFormat ? 'matches' : 'noGroupMatches';
        await this.database.ref(`${dbPath}/${matchId}`).set(matchData);
        console.log('✅ Матч создан в базе:', matchId, 'Формат:', isGroupFormat ? 'с группой' : 'без группы');
        return matchId;
    }

    async updateMatch(matchId, matchData) {
        const isGroupFormat = tournamentFormatManager ? tournamentFormatManager.isGroupFormat() : true;
        const dbPath = isGroupFormat ? 'matches' : 'noGroupMatches';
        
        matchData.updatedAt = Date.now();
        await this.database.ref(`${dbPath}/${matchId}`).update(matchData);
        console.log('✅ Матч обновлен в базе:', matchId);
    }

    async deleteMatch(matchId) {
        if (!confirm('❌ Вы уверены, что хотите удалить этот матч? Это действие нельзя отменить.')) {
            return;
        }
        
        try {
            const isGroupFormat = tournamentFormatManager ? tournamentFormatManager.isGroupFormat() : true;
            const dbPath = isGroupFormat ? 'matches' : 'noGroupMatches';
            
            await this.database.ref(`${dbPath}/${matchId}`).remove();
            
            if (isGroupFormat) {
                delete this.matches[matchId];
            } else {
                delete this.noGroupMatches[matchId];
            }
            
            console.log('✅ Матч удален из базы:', matchId);
            
            closeEditMatchResultModal();
            this.updateMatchUI();
            
            alert('✅ Матч успешно удален!');
        } catch (error) {
            console.error('❌ Ошибка удаления матча:', error);
            alert('❌ Ошибка удаления матча');
        }
    }

    async setMatchResult(matchId, score1, score2, format = 'bo1') {
        const match = this.getMatch(matchId);
        if (!match) return;

        const updateData = {
            score1: parseInt(score1),
            score2: parseInt(score2),
            format: format,
            updatedAt: Date.now()
        };

        await this.updateMatch(matchId, updateData);
        this.updateMatchUI();
    }

    getMatch(matchId) {
        const isGroupFormat = tournamentFormatManager ? tournamentFormatManager.isGroupFormat() : true;
        return isGroupFormat ? this.matches[matchId] : this.noGroupMatches[matchId];
    }
}

// === ОБНОВЛЕННАЯ ФУНКЦИЯ ДЛЯ ПРОГРЕСС-БАРА СО СЧЕТОМ ПОСЕРЕДИНЕ ===
function createEnhancedProgressBar(match) {
    const requiredWins = matchManager.getRequiredWins(match.format);
    const score1 = parseInt(match.score1) || 0;
    const score2 = parseInt(match.score2) || 0;
    
    const totalGames = score1 + score2;
    const team1Percentage = totalGames > 0 ? (score1 / totalGames) * 100 : 50;
    const team2Percentage = totalGames > 0 ? (score2 / totalGames) * 100 : 50;
    
    const winner = matchManager.getMatchWinner(match);
    const team1Class = winner === 'team1' ? 'winner' : '';
    const team2Class = winner === 'team2' ? 'winner' : '';
    
    return `
        <div class="match-progress">
            <div class="progress-bar-container">
                <div class="progress-bar-track">
                    <div class="progress-team progress-team-1 ${team1Class}" 
                         style="width: ${team1Percentage}%">
                    </div>
                    <div class="progress-team progress-team-2 ${team2Class}" 
                         style="width: ${team2Percentage}%">
                    </div>
                    <div class="progress-score-center">${score1} : ${score2}</div>
                    ${totalGames > 0 ? `<div class="progress-divider" style="left: ${team1Percentage}%"></div>` : ''}
                </div>
            </div>
            <div class="progress-text">
                ${winner ? '🏆 Матч завершен' : `До победы: ${requiredWins} побед`}
            </div>
        </div>
    `;
}

// === СИСТЕМА ГОЛОСОВАНИЯ ===
class VotingSystem {
    constructor(database) {
        this.database = database;
        this.votes = {};
    }

    async initialize() {
        await this.setupVoteListeners();
    }

    async setupVoteListeners() {
        this.database.ref('audienceAwards/votes').on('value', (snapshot) => {
            this.votes = snapshot.val() || {};
            console.log('📥 Обновлены данные голосов:', this.votes);
            this.updateVoteResults();
            updateAudienceAwardsDisplay();
        });
    }

    updateVoteResults() {
        const resultsContainer = document.getElementById('voteResultsContent');
        if (!resultsContainer) return;

        if (Object.keys(this.votes).length === 0) {
            resultsContainer.innerHTML = '<div class="no-data">Нет данных о голосовании</div>';
            return;
        }

        const matchVotes = {};
        
        Object.values(this.votes).forEach(vote => {
            if (!matchVotes[vote.matchId]) {
                matchVotes[vote.matchId] = {
                    matchInfo: vote.matchInfo,
                    players: {}
                };
            }

            vote.selectedPlayers.forEach(player => {
                const playerKey = `${player.teamId}_${player.playerName}`;
                if (!matchVotes[vote.matchId].players[playerKey]) {
                    matchVotes[vote.matchId].players[playerKey] = {
                        ...player,
                        votes: 0
                    };
                }
                matchVotes[vote.matchId].players[playerKey].votes++;
            });
        });

        resultsContainer.innerHTML = Object.entries(matchVotes).map(([matchId, matchData]) => {
            const topPlayers = Object.values(matchData.players)
                .sort((a, b) => b.votes - a.votes)
                .slice(0, 5);

            return `
                <div class="vote-result-card">
                    <div class="vote-match-header">
                        <h4>${matchData.matchInfo.team1Name} vs ${matchData.matchInfo.team2Name}</h4>
                        <div class="vote-match-score">${matchData.matchInfo.score}</div>
                        <div class="vote-actions">
                            <button class="edit-vote-btn" onclick="editVote('${matchId}')">✏️ Редактировать</button>
                            <button class="delete-vote-btn" onclick="deleteVote('${matchId}')">🗑️ Удалить</button>
                        </div>
                    </div>
                    <div class="vote-players">
                        ${topPlayers.map(player => `
                            <div class="vote-player-result ${player.votes === Math.max(...topPlayers.map(p => p.votes)) ? 'top-voted' : ''}">
                                <span class="player-name">${player.playerName}</span>
                                <span class="player-team">(${player.teamName})</span>
                                <span class="vote-count">${player.votes} голосов</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    async submitVote(matchId, selectedPlayers) {
        const voteId = `vote_${Date.now()}`;
        
        const match = matchManager.getMatch(matchId);
        const voteData = {
            matchId: matchId,
            matchInfo: {
                team1Name: match.team1Name,
                team2Name: match.team2Name,
                score: `${match.score1 || 0}:${match.score2 || 0}`,
                time: match.time || new Date().toLocaleString('ru-RU'),
                stage: match.stage || 'group',
                format: match.format || 'bo1'
            },
            selectedPlayers: selectedPlayers,
            timestamp: Date.now()
        };

        await this.database.ref(`audienceAwards/votes/${voteId}`).set(voteData);
        return voteId;
    }

    async deleteVote(matchId) {
        if (!confirm('❌ Вы уверены, что хотите удалить все голоса за этот матч? Это действие нельзя отменить.')) {
            return;
        }
        
        try {
            const votesToDelete = [];
            Object.entries(this.votes).forEach(([voteId, vote]) => {
                if (vote.matchId === matchId) {
                    votesToDelete.push(voteId);
                }
            });
            
            for (const voteId of votesToDelete) {
                await this.database.ref(`audienceAwards/votes/${voteId}`).remove();
            }
            
            console.log('✅ Голоса удалены:', votesToDelete.length);
            alert(`✅ Удалено ${votesToDelete.length} голосов за матч`);
            
        } catch (error) {
            console.error('❌ Ошибка удаления голосов:', error);
            alert('❌ Ошибка удаления голосов');
        }
    }

    async editVote(matchId) {
        showEditVoteModal(matchId);
    }
}

// === ФУНКЦИИ ДЛЯ СИСТЕМЫ ГОЛОСОВАНИЯ ===
function populateVoteMatchSelect() {
    const select = document.getElementById('voteMatchSelect');
    if (!select || !matchManager) return;
    
    select.innerHTML = '<option value="">-- Выберите матч --</option>';
    
    const matches = matchManager.getCurrentMatches();
    const teams = teamsManager.getAllTeams();
    
    Object.entries(matches).forEach(([matchId, match]) => {
        const team1Exists = teams[match.team1Id] && teams[match.team1Id].name;
        const team2Exists = teams[match.team2Id] && teams[match.team2Id].name;
        
        if (team1Exists && team2Exists) {
            const option = document.createElement('option');
            option.value = matchId;
            option.textContent = `${match.team1Name} vs ${match.team2Name} - ${match.time || 'Время не указано'} - ${match.score1 || 0}:${match.score2 || 0}`;
            select.appendChild(option);
        }
    });
}

function showVotingModal(matchId) {
    const match = matchManager.getMatch(matchId);
    if (!match) return;
    
    const teams = teamsManager.getAllTeams();
    const team1 = teams[match.team1Id];
    const team2 = teams[match.team2Id];
    
    if (!team1 || !team2) {
        alert('❌ Не удалось загрузить данные команд');
        return;
    }
    
    window.currentVotingMatchId = matchId;
    
    // Компактная информация о матче
    const matchInfo = document.getElementById('votingMatchInfo');
    matchInfo.className = 'match-info compact';
    matchInfo.innerHTML = `
        <div class="match-teams">
            <div class="team-name large">${match.team1Name}</div>
            <div class="vs">vs</div>
            <div class="team-name large">${match.team2Name}</div>
        </div>
        <div class="match-score">${match.score1 || 0} : ${match.score2 || 0}</div>
        <div class="match-stage">${tournamentFormatManager ? tournamentFormatManager.getStageName(match.stage) : match.stage} • ${matchManager.getFormatName(match.format)}</div>
    `;
    
    // Компактные колонки с игроками
    const team1Column = document.getElementById('team1Voting');
    const team2Column = document.getElementById('team2Voting');
    
    team1Column.className = 'voting-column compact';
    team2Column.className = 'voting-column compact';
    
    team1Column.innerHTML = `
        <h3>${match.team1Name}</h3>
        ${team1.players.map((player, index) => `
            <div class="player-vote-item compact" data-team="team1" data-player-index="${index}">
                <div class="player-mmr">MMR: ${player.mmr || 0}</div>
                <div class="player-vote-name" data-mmr="${player.mmr || 0}">${player.name}</div>
                <div class="player-vote-role">${player.role}</div>
                <div class="reason-input-container compact hidden">
                    <textarea class="reason-input compact" placeholder="Почему вы выбрали этого игрока? (необязательно)" rows="2"></textarea>
                </div>
            </div>
        `).join('')}
    `;
    
    team2Column.innerHTML = `
        <h3>${match.team2Name}</h3>
        ${team2.players.map((player, index) => `
            <div class="player-vote-item compact" data-team="team2" data-player-index="${index}">
                <div class="player-mmr">MMR: ${player.mmr || 0}</div>
                <div class="player-vote-name" data-mmr="${player.mmr || 0}">${player.name}</div>
                <div class="player-vote-role">${player.role}</div>
                <div class="reason-input-container compact hidden">
                    <textarea class="reason-input compact" placeholder="Почему вы выбрали этого игрока? (необязательно)" rows="2"></textarea>
                </div>
            </div>
        `).join('')}
    `;
    
    // Функциональность показа MMR при наведении на никнейм
    document.querySelectorAll('.player-vote-name').forEach(playerName => {
        playerName.addEventListener('mouseenter', function() {
            const mmr = this.getAttribute('data-mmr');
            const originalText = this.textContent;
            
            // Сохраняем оригинальный текст и показываем MMR
            this.setAttribute('data-original-text', originalText);
            this.textContent = `MMR: ${mmr}`;
        });
        
        playerName.addEventListener('mouseleave', function() {
            const originalText = this.getAttribute('data-original-text');
            if (originalText) {
                this.textContent = originalText;
            }
        });
    });
    
    // Обработчики для выбора игроков с причинами
    document.querySelectorAll('.player-vote-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (e.target.classList.contains('reason-input')) return;
            
            const wasSelected = this.classList.contains('selected');
            
            if (!wasSelected) {
                this.classList.add('selected');
                this.querySelector('.reason-input-container').classList.remove('hidden');
                this.querySelector('.reason-input').focus();
            } else {
                this.classList.remove('selected');
                this.querySelector('.reason-input-container').classList.add('hidden');
                this.querySelector('.reason-input').value = '';
            }
        });
        
        // Обработчики для тач-устройств
        let tapTimer;
        
        item.addEventListener('touchstart', function(e) {
            e.stopPropagation();
            tapTimer = setTimeout(() => {
                // Длинное нажатие - показываем MMR
                const playerName = this.querySelector('.player-vote-name');
                if (playerName) {
                    const mmr = playerName.getAttribute('data-mmr');
                    const originalText = playerName.textContent;
                    playerName.setAttribute('data-original-text', originalText);
                    playerName.textContent = `MMR: ${mmr}`;
                }
            }, 500);
        });
        
        item.addEventListener('touchend', function(e) {
            e.stopPropagation();
            clearTimeout(tapTimer);
        });
        
        item.addEventListener('touchmove', function(e) {
            e.stopPropagation();
            clearTimeout(tapTimer);
        });
    });
    
    // Обновляем кнопку "Отмена" в модальном окне
    const cancelBtn = document.getElementById('cancelVote');
    if (cancelBtn) {
        cancelBtn.className = 'voting-cancel-btn';
        cancelBtn.innerHTML = '❌ Отмена';
    }
    
    // Показываем модальное окно
    document.getElementById('votingModal').classList.remove('hidden');
}

async function submitVote() {
    const selectedPlayers = document.querySelectorAll('.player-vote-item.selected');
    const matchId = window.currentVotingMatchId;
    
    if (selectedPlayers.length === 0) {
        alert('❌ Выберите хотя бы одного игрока');
        return;
    }
    
    const match = matchManager.getMatch(matchId);
    const teams = teamsManager.getAllTeams();
    
    const votes = Array.from(selectedPlayers).map(player => {
        const team = player.getAttribute('data-team');
        const playerIndex = parseInt(player.getAttribute('data-player-index'));
        const teamData = team === 'team1' ? teams[match.team1Id] : teams[match.team2Id];
        const playerData = teamData.players[playerIndex];
        const reason = player.querySelector('.reason-input')?.value.trim() || '';
        
        return {
            teamId: team === 'team1' ? match.team1Id : match.team2Id,
            teamName: team === 'team1' ? match.team1Name : match.team2Name,
            playerName: playerData.name,
            playerRole: playerData.role,
            reason: reason
        };
    });
    
    try {
        // Блокируем кнопку на время отправки
        const submitBtn = document.getElementById('submitVote');
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Отправка...';
        
        await votingSystem.submitVote(matchId, votes);
        closeVotingModal();
        alert('✅ Ваш голос успешно отправлен!');
        
        // Сразу обновляем отображение приза зрительских симпатий
        updateAudienceAwardsDisplay();
        
    } catch (error) {
        console.error('❌ Ошибка отправки голоса:', error);
        alert('❌ Ошибка отправки голоса');
        
        // Разблокируем кнопку при ошибке
        const submitBtn = document.getElementById('submitVote');
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ Отправить голос';
    }
}

function closeVotingModal() {
    document.getElementById('votingModal').classList.add('hidden');
    window.currentVotingMatchId = null;
    
    // Сбрасываем все состояния
    document.querySelectorAll('.player-vote-item').forEach(item => {
        item.classList.remove('selected');
        
        const playerName = item.querySelector('.player-vote-name');
        const originalText = playerName.getAttribute('data-original-text');
        if (originalText) {
            playerName.textContent = originalText;
        }
        
        item.querySelector('.reason-input-container').classList.add('hidden');
        item.querySelector('.reason-input').value = '';
    });
    
    // Сбрасываем кнопку отправки
    const submitBtn = document.getElementById('submitVote');
    submitBtn.disabled = false;
    submitBtn.textContent = '✅ Отправить голос';
}

function showEditVoteModal(matchId) {
    const match = matchManager.getMatch(matchId);
    if (!match) return;
    
    const existingVotes = Object.values(votingSystem.votes).filter(vote => vote.matchId === matchId);
    
    const matchInfo = document.getElementById('editVoteInfo');
    matchInfo.innerHTML = `
        <div class="match-teams">
            <div class="team-name large">${match.team1Name}</div>
            <div class="vs">vs</div>
            <div class="team-name large">${match.team2Name}</div>
        </div>
        <div class="match-score">${match.score1 || 0} : ${match.score2 || 0}</div>
        <div class="total-votes">Всего голосов: ${existingVotes.length}</div>
    `;
    
    const votesList = document.getElementById('existingVotesList');
    if (existingVotes.length === 0) {
        votesList.innerHTML = '<div class="no-data">Нет голосов за этот матч</div>';
    } else {
        votesList.innerHTML = existingVotes.map((vote, index) => `
            <div class="existing-vote-item">
                <div class="vote-header">
                    <strong>Голос #${index + 1}</strong>
                    <span class="vote-time">${new Date(vote.timestamp).toLocaleString('ru-RU')}</span>
                </div>
                <div class="vote-players">
                    ${vote.selectedPlayers.map(player => `
                        <div class="voted-player">
                            <span class="player-name">${player.playerName}</span>
                            <span class="player-team">(${player.teamName})</span>
                            ${player.reason ? `<div class="player-reason">Причина: ${player.reason}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }
    
    document.getElementById('deleteAllVotesBtn').onclick = () => {
        votingSystem.deleteVote(matchId);
        closeEditVoteModal();
    };
    
    document.getElementById('editVoteModal').classList.remove('hidden');
}

function closeEditVoteModal() {
    document.getElementById('editVoteModal').classList.add('hidden');
}

// Глобальные функции для управления голосованием
window.deleteVote = function(matchId) {
    if (votingSystem) {
        votingSystem.deleteVote(matchId);
    }
};

window.editVote = function(matchId) {
    if (votingSystem) {
        votingSystem.editVote(matchId);
    }
};

// === ОБНОВЛЕННАЯ ФУНКЦИЯ ДЛЯ ПРИЗА ЗРИТЕЛЬСКИХ СИМПАТИЙ С ОБЩИМИ МЕСТАМИ ===
async function updateAudienceAwardsDisplay() {
    const container = document.getElementById('audienceAwardsContent');
    if (!container) return;
    
    try {
        const snapshot = await database.ref('audienceAwards/votes').once('value');
        const votes = snapshot.val() || {};
        
        if (Object.keys(votes).length === 0) {
            container.innerHTML = '<div class="no-data">Пока нет голосов от зрителей</div>';
            return;
        }
        
        // Агрегируем голоса по игрокам
        const playerVotes = {};
        
        Object.values(votes).forEach(vote => {
            const matchInfo = vote.matchInfo;
            vote.selectedPlayers.forEach(player => {
                const playerKey = `${player.teamName}_${player.playerName}`;
                
                if (!playerVotes[playerKey]) {
                    playerVotes[playerKey] = {
                        ...player,
                        votes: 0,
                        reasons: [],
                        matches: new Set()
                    };
                }
                
                playerVotes[playerKey].votes++;
                if (player.reason) {
                    playerVotes[playerKey].reasons.push({
                        reason: player.reason,
                        matchInfo: matchInfo
                    });
                }
                playerVotes[playerKey].matches.add(JSON.stringify(matchInfo));
            });
        });
        
        // Сортируем по количеству голосов и группируем по местам
        const sortedPlayers = Object.values(playerVotes)
            .sort((a, b) => b.votes - a.votes);
        
        // Группируем игроков по количеству голосов для определения мест
        const groupedPlayers = [];
        let currentVotes = -1;
        let currentGroup = [];
        let currentPlace = 1;
        
        sortedPlayers.forEach((player, index) => {
            if (player.votes !== currentVotes) {
                if (currentGroup.length > 0) {
                    groupedPlayers.push({
                        place: currentPlace,
                        players: currentGroup,
                        votes: currentVotes
                    });
                    currentPlace += currentGroup.length;
                }
                currentVotes = player.votes;
                currentGroup = [player];
            } else {
                currentGroup.push(player);
            }
        });
        
        // Добавляем последнюю группу
        if (currentGroup.length > 0) {
            groupedPlayers.push({
                place: currentPlace,
                players: currentGroup,
                votes: currentVotes
            });
        }
        
        // Берем топ-10 мест (не игроков)
        const topPlayers = [];
        let placeCounter = 1;
        
        for (const group of groupedPlayers) {
            for (const player of group.players) {
                if (topPlayers.length < 10) {
                    topPlayers.push({
                        ...player,
                        place: group.place,
                        displayPlace: group.players.length > 1 ? `${group.place}-${group.place + group.players.length - 1}` : group.place.toString()
                    });
                }
            }
            placeCounter += group.players.length;
            if (topPlayers.length >= 10) break;
        }
        
        container.innerHTML = `
            <div class="award-match-card">
                <div class="award-match-header">
                    <h3>🏆 Топ игроков по мнению зрителей</h3>
                    <div class="award-match-time">Обновлено: ${new Date().toLocaleString('ru-RU')}</div>
                </div>
                <div class="award-players">
                    ${topPlayers.map((player, index) => {
                        const isTopThree = player.place <= 3;
                        const isHonorable = player.place > 3 && player.place <= 6;
                        const cardClass = isTopThree ? 'top-player' : (isHonorable ? 'honorable-player' : 'regular-player');
                        
                        const matchesArray = Array.from(player.matches).map(matchStr => JSON.parse(matchStr));
                        
                        return `
                            <div class="award-player-card ${cardClass}">
                                <div class="player-award-name">${player.playerName}</div>
                                <div class="player-award-role">${player.playerRole}</div>
                                <div class="player-award-team">${player.teamName}</div>
                                <div class="player-award-votes">❤️ ${player.votes} голосов</div>
                                <div class="player-award-place">Место: ${player.displayPlace}</div>
                                ${isTopThree ? `<div class="player-award-badge">🏅 Топ ${player.place}</div>` : ''}
                                ${isHonorable ? `<div class="player-honorable-badge">⭐ Выдающийся</div>` : ''}
                                ${player.reasons && player.reasons.length > 0 ? `
                                    <div class="player-reasons">
                                        <strong>Причины выбора:</strong>
                                        <ul>
                                            ${player.reasons.slice(0, 3).map(reasonData => 
                                                reasonData.reason ? `
                                                    <li>
                                                        <div class="reason-text">${reasonData.reason}</div>
                                                        <div class="reason-match-info">
                                                            📅 ${reasonData.matchInfo.team1Name} vs ${reasonData.matchInfo.team2Name} 
                                                            ${reasonData.matchInfo.time ? `• ${reasonData.matchInfo.time}` : ''}
                                                            ${reasonData.matchInfo.score ? `• ${reasonData.matchInfo.score}` : ''}
                                                            ${reasonData.matchInfo.stage ? `• ${tournamentFormatManager ? tournamentFormatManager.getStageName(reasonData.matchInfo.stage) : reasonData.matchInfo.stage}` : ''}
                                                            ${reasonData.matchInfo.format ? `• ${matchManager.getFormatName(reasonData.matchInfo.format)}` : ''}
                                                        </div>
                                                    </li>
                                                ` : ''
                                            ).join('')}
                                            ${player.reasons.length > 3 ? `<li>...и еще ${player.reasons.length - 3} причин</li>` : ''}
                                        </ul>
                                    </div>
                                ` : ''}
                                ${matchesArray.length > 0 ? `
                                    <div class="player-matches">
                                        <strong>Отличился в матчах:</strong>
                                        <div class="matches-list">
                                            ${matchesArray.slice(0, 2).map(match => `
                                                <div class="match-info-small">
                                                    ${match.team1Name} vs ${match.team2Name}
                                                    ${match.time ? `• ${match.time}` : ''}
                                                    ${match.score ? `• ${match.score}` : ''}
                                                </div>
                                            `).join('')}
                                            ${matchesArray.length > 2 ? `<div class="more-matches">...и еще ${matchesArray.length - 2} матчей</div>` : ''}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки голосов:', error);
        container.innerHTML = '<div class="no-data">Ошибка загрузки голосов</div>';
    }
}

// === ФУНКЦИИ ДЛЯ РЕДАКТИРОВАНИЯ ВРЕМЕНИ МАТЧА ===
function showEditMatchTimeModal(matchId) {
    const modal = document.getElementById('editMatchResultModal');
    const matchInfo = document.getElementById('editMatchInfo');
    const score1Input = document.getElementById('editMatchScore1');
    const score2Input = document.getElementById('editMatchScore2');
    const formatSelect = document.getElementById('editMatchFormat');
    const stageSelect = document.getElementById('editMatchStage');
    
    if (!modal || !matchInfo || !score1Input || !score2Input || !matchManager) return;

    const match = matchManager.getMatch(matchId);
    if (!match) return;

    const teams = teamsManager ? teamsManager.getAllTeams() : {};
    const team1Exists = teams[match.team1Id] && teams[match.team1Id].name;
    const team2Exists = teams[match.team2Id] && teams[match.team2Id].name;
    
    if (!team1Exists || !team2Exists) {
        alert('❌ Нельзя редактировать матч с удаленными командами');
        return;
    }
    
    // Создаем поле для редактирования времени
    matchInfo.innerHTML = `
        <div class="match-teams">
            <div class="team-name large">${match.team1Name}</div>
            <div class="vs">vs</div>
            <div class="team-name large">${match.team2Name}</div>
        </div>
        <div class="form-group">
            <label>Время матча:</label>
            <input type="datetime-local" id="editMatchTime" class="form-input" value="${getDateTimeForInput(match.timestamp)}">
        </div>
        <div class="match-stage">${tournamentFormatManager ? tournamentFormatManager.getStageName(match.stage) : match.stage}</div>
    `;
    
    score1Input.value = match.score1 || 0;
    score2Input.value = match.score2 || 0;
    
    if (formatSelect) {
        formatSelect.innerHTML = `
            <option value="bo1" ${match.format === 'bo1' ? 'selected' : ''}>Bo1 (1 победа)</option>
            <option value="bo3" ${match.format === 'bo3' ? 'selected' : ''}>Bo3 (2 победы)</option>
            <option value="bo5" ${match.format === 'bo5' ? 'selected' : ''}>Bo5 (3 победы)</option>
        `;
    }
    
    if (stageSelect && tournamentFormatManager) {
        const isGroupFormat = tournamentFormatManager.isGroupFormat();
        stageSelect.innerHTML = tournamentFormatManager.getStageOptions(isGroupFormat);
        stageSelect.value = match.stage;
    }
    
    // Обновляем обработчик кнопки удаления
    const deleteMatchBtn = document.getElementById('deleteMatchBtn');
    if (deleteMatchBtn) {
        deleteMatchBtn.onclick = () => window.deleteMatch(matchId);
    }
    
    appState.currentEditingMatchId = matchId;
    modal.classList.remove('hidden');
}

// Функция для преобразования времени в формат datetime-local
function getDateTimeForInput(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Обновленная функция сохранения результата матча с временем
async function saveMatchResultWithTime() {
    const matchId = appState.currentEditingMatchId;
    const score1Input = document.getElementById('editMatchScore1');
    const score2Input = document.getElementById('editMatchScore2');
    const formatSelect = document.getElementById('editMatchFormat');
    const stageSelect = document.getElementById('editMatchStage');
    const timeInput = document.getElementById('editMatchTime');
    
    if (!matchId || !score1Input || !score2Input || !matchManager) return;
    
    const score1 = parseInt(score1Input.value);
    const score2 = parseInt(score2Input.value);
    const format = formatSelect ? formatSelect.value : 'bo1';
    const stage = stageSelect ? stageSelect.value : 'group';
    const timeValue = timeInput ? timeInput.value : '';
    
    if (isNaN(score1) || isNaN(score2)) {
        alert('❌ Введите корректные значения счета');
        return;
    }
    
    if (score1 < 0 || score2 < 0) {
        alert('❌ Счет не может быть отрицательным');
        return;
    }
    
    const requiredWins = matchManager.getRequiredWins(format);
    if (score1 > requiredWins || score2 > requiredWins) {
        alert(`❌ Счет не может превышать ${requiredWins} для формата ${matchManager.getFormatName(format)}`);
        return;
    }
    
    if ((score1 >= requiredWins && score2 >= requiredWins) || (score1 === requiredWins && score2 === requiredWins)) {
        alert(`❌ Только одна команда может иметь ${requiredWins} побед в формате ${matchManager.getFormatName(format)}`);
        return;
    }
    
    try {
        const updateData = {
            score1: parseInt(score1),
            score2: parseInt(score2),
            format: format,
            stage: stage,
            updatedAt: Date.now()
        };
        
        // Обновляем время если оно было изменено
        if (timeValue) {
            const newTimestamp = new Date(timeValue).getTime();
            const newTime = new Date(timeValue).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            updateData.timestamp = newTimestamp;
            updateData.time = newTime;
        }
        
        await matchManager.updateMatch(matchId, updateData);
        closeEditMatchResultModal();
        alert('✅ Результат матча и время сохранены!');
        
        if (matchManager.updateMatchUI) {
            matchManager.updateMatchUI();
        }
    } catch (error) {
        console.error('❌ Ошибка сохранения результата:', error);
        alert('❌ Ошибка сохранения результата');
    }
}

// === ФУНКЦИЯ ДЛЯ УДАЛЕНИЯ МАТЧА ===
window.deleteMatch = function(matchId) {
    if (!matchId || !matchManager) return;
    
    if (!confirm('❌ Вы уверены, что хотите удалить этот матч? Это действие нельзя отменить.')) {
        return;
    }
    
    matchManager.deleteMatch(matchId);
};

// === ОБНОВЛЕННАЯ ФУНКЦИЯ ЗАКРЫТИЯ МОДАЛЬНОГО ОКНА РЕДАКТИРОВАНИЯ МАТЧА ===
function closeEditMatchResultModal() {
    const modal = document.getElementById('editMatchResultModal');
    if (modal) {
        modal.classList.add('hidden');
        appState.currentEditingMatchId = null;
    }
}

// === ОСТАЛЬНЫЕ ФУНКЦИИ (оригинальные, с обновлениями) ===
const appState = {
    currentEditingTeamId: null,
    currentDisplayedTeamId: null,
    currentEditingMatchId: null
};

function getAppState() {
    return appState;
}

function toggleDropdown() {
    const dropdown = document.querySelector('.dropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.classList.remove('active');
    });
}

function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    const targetSection = document.getElementById(`${sectionName}Content`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    appState.currentDisplayedTeamId = null;
}

function updateTeamsDropdown() {
    const dropdown = document.getElementById('teamsDropdown');
    if (!dropdown || !teamsManager) return;
    
    const teams = teamsManager.getAllTeams();
    dropdown.innerHTML = '';
    
    Object.keys(teams).forEach(teamId => {
        const team = teams[teamId];
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = team.name || 'Без названия';
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showSingleTeamCard(teamId);
        });
        dropdown.appendChild(link);
    });
}

function showSingleTeamCard(teamId) {
    const container = document.getElementById('singleTeamCard');
    if (!container || !teamsManager) return;
    
    const team = teamsManager.getTeam(teamId);
    if (!team) return;
    
    const card = createTeamCard(teamId, team);
    container.innerHTML = '';
    container.appendChild(card);
    appState.currentDisplayedTeamId = teamId;
    
    hideAllSections();
    document.getElementById('teamsContent').classList.remove('hidden');
    closeAllDropdowns();
}

function hideAllSections() {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
}

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
    
    const editButton = securityManager && securityManager.isAuthenticated ? 
        `<button class="edit-team-btn" onclick="editTeam('${teamId}')">✏️ Редактировать</button>` : '';
    
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
    
    return card;
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

function closeEditTeamModal() {
    document.getElementById('editTeamModal').classList.add('hidden');
    appState.currentEditingTeamId = null;
}

function openAdminTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const targetPane = document.getElementById(tabName);
    
    if (targetBtn) targetBtn.classList.add('active');
    if (targetPane) targetPane.classList.add('active');
}

function updateAdminTeamsList() {
    const container = document.getElementById('adminTeamsList');
    if (!container || !teamsManager) return;
    
    const teams = teamsManager.getAllTeams();
    container.innerHTML = '';
    
    Object.keys(teams).forEach(teamId => {
        const team = teams[teamId];
        const teamElement = document.createElement('div');
        teamElement.className = 'admin-team-item';
        teamElement.innerHTML = `
            <div class="team-info">
                <strong>${team.name || 'Без названия'}</strong>
                <span>MMR: ${team.mmr || '0'}</span>
            </div>
            <button class="edit-btn" onclick="editTeam('${teamId}')">✏️</button>
        `;
        container.appendChild(teamElement);
    });
}

window.editTeam = function(teamId) {
    console.log('✏️ Редактирование команды:', teamId);
    if (!securityManager || !securityManager.isAuthenticated) {
        console.log('❌ Не авторизован, показываем модалку авторизации');
        if (securityManager) {
            securityManager.showAuthModal();
        }
        return;
    }
    
    if (!teamsManager) return;
    
    const team = teamsManager.getTeam(teamId);
    if (!team) return;
    
    const modal = document.getElementById('editTeamModal');
    if (!modal) return;
    
    appState.currentEditingTeamId = teamId;
    
    document.getElementById('editTeamName').value = team.name || '';
    document.getElementById('editTeamSlogan').value = team.slogan || '';
    
    const playersContainer = document.getElementById('playersEditContainer');
    playersContainer.innerHTML = '';
    
    const players = team.players || Array(5).fill().map(() => ({ name: '', role: '', mmr: 3000 }));
    
    players.forEach((player, index) => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player-edit-form';
        playerElement.innerHTML = `
            <h4>Игрок ${index + 1}</h4>
            <div class="player-fields">
                <input type="text" class="player-name" placeholder="Никнейм" value="${player.name || ''}">
                <input type="text" class="player-role" placeholder="Позиция" value="${player.role || ''}">
                <input type="number" class="player-mmr" placeholder="MMR" value="${player.mmr || 3000}" min="0" max="10000">
            </div>
        `;
        playersContainer.appendChild(playerElement);
    });
    
    modal.classList.remove('hidden');
};

window.saveTeamChanges = async function() {
    console.log('💾 Сохранение изменений команды');
    if (!securityManager || !securityManager.isAuthenticated || !teamsManager) return;
    
    const teamId = appState.currentEditingTeamId;
    if (!teamId) return;
    
    const name = document.getElementById('editTeamName').value.trim();
    const slogan = document.getElementById('editTeamSlogan').value.trim();
    
    const players = [];
    const playerForms = document.querySelectorAll('.player-edit-form');
    
    playerForms.forEach(form => {
        const nameInput = form.querySelector('.player-name');
        const roleInput = form.querySelector('.player-role');
        const mmrInput = form.querySelector('.player-mmr');
        
        players.push({
            name: nameInput?.value.trim() || '',
            role: roleInput?.value.trim() || '',
            mmr: parseInt(mmrInput?.value) || 3000
        });
    });
    
    if (!name) {
        alert('❌ Введите название команды');
        return;
    }
    
    const teamData = {
        name,
        slogan,
        players
    };
    
    try {
        await teamsManager.updateTeam(teamId, teamData);
        closeEditTeamModal();
        alert('✅ Команда успешно обновлена!');
    } catch (error) {
        console.error('❌ Ошибка сохранения команды:', error);
        alert('❌ Ошибка сохранения команды');
    }
};

window.updateTeamsCount = async function() {
    console.log('🔢 Обновление количества команд');
    if (!securityManager || !securityManager.isAuthenticated || !teamsManager) return;
    
    const input = document.getElementById('totalTeams');
    const count = parseInt(input.value) || 4;
    
    if (count < 2 || count > 16) {
        alert('❌ Количество команд должно быть от 2 до 16');
        return;
    }
    
    const currentTeams = teamsManager.getAllTeams();
    const currentCount = Object.keys(currentTeams).length;
    
    try {
        if (count < currentCount) {
            const teamIds = Object.keys(currentTeams);
            for (let i = count; i < currentCount; i++) {
                await teamsManager.deleteTeam(teamIds[i]);
            }
        } else if (count > currentCount) {
            for (let i = currentCount + 1; i <= count; i++) {
                const teamId = `team${i}`;
                const newTeam = {
                    name: `Новая команда ${i}`,
                    slogan: '',
                    players: Array(5).fill().map(() => ({
                        name: '',
                        role: '',
                        mmr: 3000
                    })),
                    mmr: 3000
                };
                await teamsManager.createTeam(teamId, newTeam);
            }
        }
        
        updateAdminTeamsList();
        alert(`✅ Количество команд обновлено: ${count}`);
    } catch (error) {
        console.error('❌ Ошибка обновления команд:', error);
        alert('❌ Ошибка обновления команд');
    }
};

// ОБНОВЛЕННАЯ ФУНКЦИЯ ДОБАВЛЕНИЯ МАТЧА
function showAddMatchModal() {
    if (!securityManager || !securityManager.isAuthenticated) {
        securityManager.showAuthModal();
        return;
    }

    const modal = document.getElementById('addMatchModal');
    if (!modal) return;

    populateTeamSelects();
    
    // Обновляем список этапов в зависимости от формата
    const stageSelect = document.getElementById('newMatchStage');
    if (stageSelect && tournamentFormatManager) {
        const isGroupFormat = tournamentFormatManager.isGroupFormat();
        stageSelect.innerHTML = tournamentFormatManager.getStageOptions(isGroupFormat);
    }
    
    modal.classList.remove('hidden');
}

function populateTeamSelects() {
    const team1Select = document.getElementById('newMatchTeam1');
    const team2Select = document.getElementById('newMatchTeam2');
    
    if (!team1Select || !team2Select || !teamsManager) return;
    
    team1Select.innerHTML = '<option value="">-- Выберите команду --</option>';
    team2Select.innerHTML = '<option value="">-- Выберите команду --</option>';
    
    const teams = teamsManager.getAllTeams();
    
    Object.keys(teams).forEach(teamId => {
        const team = teams[teamId];
        const option1 = document.createElement('option');
        const option2 = document.createElement('option');
        
        option1.value = teamId;
        option1.textContent = team.name || 'Без названия';
        
        option2.value = teamId;
        option2.textContent = team.name || 'Без названия';
        
        team1Select.appendChild(option1);
        team2Select.appendChild(option2);
    });
}

async function saveNewMatch() {
    const team1Select = document.getElementById('newMatchTeam1');
    const team2Select = document.getElementById('newMatchTeam2');
    const timeInput = document.getElementById('newMatchTime');
    const stageSelect = document.getElementById('newMatchStage');
    const formatSelect = document.getElementById('newMatchFormat');
    
    if (!team1Select || !team2Select || !timeInput || !stageSelect || !matchManager) return;
    
    const team1Id = team1Select.value;
    const team2Id = team2Select.value;
    const time = timeInput.value;
    const stage = stageSelect.value;
    const format = formatSelect ? formatSelect.value : 'bo1';
    
    if (!team1Id || !team2Id) {
        alert('❌ Выберите обе команды');
        return;
    }
    
    if (team1Id === team2Id) {
        alert('❌ Команды не могут играть сами с собой');
        return;
    }
    
    if (!time) {
        alert('❌ Укажите время матча');
        return;
    }
    
    const teams = teamsManager.getAllTeams();
    const team1Name = teams[team1Id]?.name || 'Команда 1';
    const team2Name = teams[team2Id]?.name || 'Команда 2';
    
    const matchTime = new Date(time).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const matchData = {
        team1Id,
        team2Id,
        team1Name,
        team2Name,
        time: matchTime,
        timestamp: new Date(time).getTime(),
        stage,
        format,
        score1: 0,
        score2: 0,
        createdAt: Date.now()
    };
    
    try {
        await matchManager.createMatch(matchData);
        closeAddMatchModal();
        alert('✅ Матч успешно добавлен!');
    } catch (error) {
        console.error('❌ Ошибка добавления матча:', error);
        alert('❌ Ошибка добавления матча');
    }
}

function closeAddMatchModal() {
    const modal = document.getElementById('addMatchModal');
    if (modal) {
        modal.classList.add('hidden');
        
        const team1Select = document.getElementById('newMatchTeam1');
        const team2Select = document.getElementById('newMatchTeam2');
        const timeInput = document.getElementById('newMatchTime');
        const stageSelect = document.getElementById('newMatchStage');
        const formatSelect = document.getElementById('newMatchFormat');
        
        if (team1Select) team1Select.value = '';
        if (team2Select) team2Select.value = '';
        if (timeInput) timeInput.value = '';
        if (stageSelect) stageSelect.value = 'group';
        if (formatSelect) formatSelect.value = 'bo1';
    }
}

// ОБНОВЛЕННАЯ ФУНКЦИЯ НАСТРОЙКИ РЕДАКТИРОВАНИЯ МАТЧЕЙ
function setupMatchEditing() {
    document.addEventListener('click', (e) => {
        const matchCard = e.target.closest('.match-card, .playoff-grid-match');
        if (matchCard) {
            const matchId = matchCard.getAttribute('data-match-id');
            if (matchId) {
                const match = matchManager.getMatch(matchId);
                const teams = teamsManager.getAllTeams();
                const team1Exists = teams[match.team1Id] && teams[match.team1Id].name;
                const team2Exists = teams[match.team2Id] && teams[match.team2Id].name;
                
                if (!team1Exists || !team2Exists) {
                    if (securityManager && securityManager.isAuthenticated && confirm('🗑️ Этот матч содержит удаленные команды. Хотите удалить этот матч?')) {
                        matchManager.deleteMatch(matchId);
                    }
                } else {
                    if (securityManager && securityManager.isAuthenticated) {
                        showEditMatchTimeModal(matchId);
                    }
                }
            }
        }
    });
}

function updateConnectionStatus(connected) {
    const status = document.getElementById('connectionStatus');
    if (!status) return;
    
    const isAuthorized = securityManager && securityManager.isAuthenticated;
    
    if (!isAuthorized) {
        status.classList.add('hidden');
        return;
    }
    
    const dot = status.querySelector('.status-dot');
    const text = status.querySelector('.status-text');
    
    if (connected) {
        status.classList.remove('hidden');
        if (dot) dot.classList.add('connected');
        if (text) text.textContent = 'Подключено к турниру';
    } else {
        status.classList.remove('hidden');
        if (dot) dot.classList.remove('connected');
        if (text) text.textContent = 'Нет подключения';
    }
}

// ОБНОВЛЕННАЯ ИНИЦИАЛИЗАЦИЯ
async function initializeApp() {
    try {
        console.log('🚀 Инициализация Tournament App...');
        
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        window.database = database;
        console.log('🔥 Firebase успешно инициализирован');
        
        securityManager = new SecurityManager();
        teamsManager = new TeamsManager(database);
        tournamentFormatManager = new TournamentFormatManager(database);
        matchManager = new MatchManager(database);
        votingSystem = new VotingSystem(database);
        
        await teamsManager.initialize();
        await tournamentFormatManager.initialize();
        await matchManager.initialize();
        await votingSystem.initialize();
        
        setupEventListeners();
        setupDeleteTeamHandler();
        setupMatchEditing();
        
        securityManager.init();
        
        updateConnectionStatus(true);
        
        populateVoteMatchSelect();
        
        updateAudienceAwardsDisplay();
        
        console.log('✅ Tournament App успешно инициализирован');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
    }
}

function setupDeleteTeamHandler() {
    const deleteBtn = document.getElementById('deleteTeamBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const teamId = appState.currentEditingTeamId;
            if (teamId && teamsManager) {
                await teamsManager.deleteTeam(teamId);
            }
        });
    }
}

// ОБНОВЛЕННАЯ ФУНКЦИЯ НАСТРОЙКИ ОБРАБОТЧИКОВ
function setupEventListeners() {
    console.log('🔧 Настройка основных обработчиков событий...');
    
    const teamsDropdownBtn = document.getElementById('teamsDropdownBtn');
    const scheduleBtn = document.getElementById('scheduleBtn');
    const groupStageBtn = document.getElementById('groupStageBtn');
    const playoffBtn = document.getElementById('playoffBtn');
    const audienceAwardBtn = document.getElementById('audienceAwardBtn');
    const scheduleNoGroupBtn = document.getElementById('scheduleNoGroupBtn');
    const playoffGridBtn = document.getElementById('playoffGridBtn');
    
    if (teamsDropdownBtn) {
        teamsDropdownBtn.addEventListener('click', toggleDropdown);
    }
    
    if (scheduleBtn) {
        scheduleBtn.addEventListener('click', () => showSection('schedule'));
    }
    
    if (groupStageBtn) {
        groupStageBtn.addEventListener('click', () => showSection('groupStage'));
    }
    
    if (playoffBtn) {
        playoffBtn.addEventListener('click', () => showSection('playoff'));
    }
    
    if (audienceAwardBtn) {
        audienceAwardBtn.addEventListener('click', () => showSection('audienceAward'));
    }
    
    // Обработчики для новых кнопок навигации
    if (scheduleNoGroupBtn) {
        scheduleNoGroupBtn.addEventListener('click', () => {
            showSection('scheduleNoGroup');
            if (matchManager && matchManager.updateMatchUI) {
                matchManager.updateMatchUI();
            }
        });
    }

    if (playoffGridBtn) {
        playoffGridBtn.addEventListener('click', () => {
            showSection('playoffGrid');
        });
    }
    
    const closeEditTeamModalBtn = document.getElementById('closeEditTeamModal');
    const cancelEditTeamBtn = document.getElementById('cancelEditTeamBtn');
    
    if (closeEditTeamModalBtn) {
        closeEditTeamModalBtn.addEventListener('click', closeEditTeamModal);
    }
    
    if (cancelEditTeamBtn) {
        cancelEditTeamBtn.addEventListener('click', closeEditTeamModal);
    }
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            openAdminTab(this.getAttribute('data-tab'));
        });
    });
    
    const saveTeamBtn = document.getElementById('saveTeamBtn');
    const applyTeamsCountBtn = document.getElementById('applyTeamsCountBtn');
    
    if (saveTeamBtn) {
        saveTeamBtn.addEventListener('click', window.saveTeamChanges);
    }
    
    if (applyTeamsCountBtn) {
        applyTeamsCountBtn.addEventListener('click', window.updateTeamsCount);
    }
    
    const addScheduleMatchBtn = document.getElementById('addScheduleMatchBtn');
    const addRPOFMatchBtn = document.getElementById('addRPOFMatchBtn');
    const saveNewMatchBtn = document.getElementById('saveNewMatchBtn');
    const cancelAddMatchBtn = document.getElementById('cancelAddMatchBtn');
    const closeAddMatchModal = document.getElementById('closeAddMatchModal');
    
    if (addScheduleMatchBtn) {
        addScheduleMatchBtn.addEventListener('click', showAddMatchModal);
    }
    
    if (addRPOFMatchBtn) {
        addRPOFMatchBtn.addEventListener('click', showAddMatchModal);
    }
    
    if (saveNewMatchBtn) {
        saveNewMatchBtn.addEventListener('click', saveNewMatch);
    }
    
    if (cancelAddMatchBtn) {
        cancelAddMatchBtn.addEventListener('click', closeAddMatchModal);
    }
    
    if (closeAddMatchModal) {
        closeAddMatchModal.addEventListener('click', closeAddMatchModal);
    }
    
    const saveMatchResultBtn = document.getElementById('saveMatchResultBtn');
    const cancelEditMatchResultBtn = document.getElementById('cancelEditMatchResultBtn');
    const closeEditMatchResultModal = document.getElementById('closeEditMatchResultModal');
    const deleteMatchBtn = document.getElementById('deleteMatchBtn');
    
    if (saveMatchResultBtn) {
        saveMatchResultBtn.addEventListener('click', saveMatchResultWithTime);
    }
    
    if (cancelEditMatchResultBtn) {
        cancelEditMatchResultBtn.addEventListener('click', closeEditMatchResultModal);
    }
    
    if (closeEditMatchResultModal) {
        closeEditMatchResultModal.addEventListener('click', closeEditMatchResultModal);
    }
    
    if (deleteMatchBtn) {
        deleteMatchBtn.addEventListener('click', function() {
            const matchId = appState.currentEditingMatchId;
            if (matchId) {
                window.deleteMatch(matchId);
            }
        });
    }
    
    const selectMatchForVote = document.getElementById('selectMatchForVote');
    const closeVotingModal = document.getElementById('closeVotingModal');
    const cancelVote = document.getElementById('cancelVote');
    const submitVoteBtn = document.getElementById('submitVote');
    const closeEditVoteModal = document.getElementById('closeEditVoteModal');
    const closeEditVoteBtn = document.getElementById('closeEditVoteBtn');
    
    if (selectMatchForVote) {
        selectMatchForVote.addEventListener('click', function() {
            const matchSelect = document.getElementById('voteMatchSelect');
            const selectedMatchId = matchSelect.value;
            
            if (!selectedMatchId) {
                alert('❌ Выберите матч для голосования');
                return;
            }
            
            showVotingModal(selectedMatchId);
        });
    }
    
    if (closeVotingModal) {
        closeVotingModal.addEventListener('click', closeVotingModal);
    }
    
    if (cancelVote) {
        cancelVote.addEventListener('click', closeVotingModal);
    }
    
    if (submitVoteBtn) {
        submitVoteBtn.addEventListener('click', submitVote);
    }
    
    if (closeEditVoteModal) {
        closeEditVoteModal.addEventListener('click', closeEditVoteModal);
    }
    
    if (closeEditVoteBtn) {
        closeEditVoteBtn.addEventListener('click', closeEditVoteModal);
    }
    
    // Обработчик для сохранения формата турнира
    const saveTournamentFormatBtn = document.getElementById('saveTournamentFormat');
    if (saveTournamentFormatBtn) {
        saveTournamentFormatBtn.addEventListener('click', async () => {
            const formatSelect = document.getElementById('tournamentFormat');
            if (formatSelect && tournamentFormatManager) {
                const newFormat = formatSelect.value;
                const success = await tournamentFormatManager.setTournamentFormat(newFormat);
                if (success) {
                    alert('✅ Формат турнира сохранен!');
                } else {
                    alert('❌ Ошибка сохранения формата турнира');
                }
            }
        });
    }
    
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.classList.add('hidden');
        }
        
        if (!event.target.closest('.dropdown') && !event.target.closest('.nav-btn')) {
            closeAllDropdowns();
        }
    });
    
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeAllModals();
        }
    });
    
    console.log('✅ Основные обработчики событий настроены');
}

function createAnimatedBackground() {
    const bg = document.getElementById('animatedBg');
    if (!bg) return;
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 100 + 50;
        const left = Math.random() * 100;
        const animationDuration = Math.random() * 30 + 20;
        const animationDelay = Math.random() * 10;
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${left}%`;
        particle.style.animationDuration = `${animationDuration}s`;
        particle.style.animationDelay = `${animationDelay}s`;
        
        bg.appendChild(particle);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM загружен, запуск приложения...');
    createAnimatedBackground();
    initializeApp();
});