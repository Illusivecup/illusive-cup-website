// hidden-teams.js - Модуль для управления командами-заглушками

class HiddenTeamsManager {
    constructor(database) {
        this.database = database;
        this.hiddenTeams = {};
        this.isInitialized = false;
    }

    // Инициализация модуля
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🎯 Инициализация менеджера скрытых команд...');
        await this.createHiddenTeams();
        await this.setupListeners();
        this.isInitialized = true;
        console.log('✅ Менеджер скрытых команд готов');
    }

    // Создание команд-заглушек
    async createHiddenTeams() {
        const hiddenTeamsData = {
            'tbd1': {
                name: 'TBD 1',
                slogan: 'Команда будет определена',
                players: [],
                mmr: 0,
                isHidden: true,
                createdAt: Date.now(),
                updatedAt: Date.now()
            },
            'tbd2': {
                name: 'TBD 2', 
                slogan: 'Команда будет определена',
                players: [],
                mmr: 0,
                isHidden: true,
                createdAt: Date.now(),
                updatedAt: Date.now()
            }
        };

        try {
            const snapshot = await this.database.ref('hiddenTeams').once('value');
            if (!snapshot.exists()) {
                await this.database.ref('hiddenTeams').set(hiddenTeamsData);
                console.log('✅ Команды-заглушки созданы: TBD 1, TBD 2');
            } else {
                console.log('✅ Команды-заглушки уже существуют');
            }
        } catch (error) {
            console.error('❌ Ошибка создания команд-заглушек:', error);
        }
    }

    // Настройка слушателей Firebase
    async setupListeners() {
        this.database.ref('hiddenTeams').on('value', (snapshot) => {
            this.hiddenTeams = snapshot.val() || {};
            console.log('📥 Обновлены команды-заглушки:', Object.keys(this.hiddenTeams));
        });
    }

    // Получить все команды-заглушки
    getAllHiddenTeams() {
        return { ...this.hiddenTeams };
    }

    // Получить конкретную команду-заглушку
    getHiddenTeam(teamId) {
        return this.hiddenTeams[teamId];
    }

    // Проверить, является ли команда скрытой
    isHiddenTeam(teamId) {
        return this.hiddenTeams[teamId] !== undefined;
    }

    // Получить все команды (обычные + скрытые)
    getAllTeamsWithHidden(regularTeams = {}) {
        return { ...regularTeams, ...this.hiddenTeams };
    }

    // Получить только обычные команды (без скрытых)
    getRegularTeamsOnly(regularTeams = {}) {
        const filtered = {};
        Object.keys(regularTeams).forEach(teamId => {
            if (!this.isHiddenTeam(teamId)) {
                filtered[teamId] = regularTeams[teamId];
            }
        });
        return filtered;
    }

    // Создать дополнительную команду-заглушку
    async createAdditionalHiddenTeam(teamId, teamName) {
        const newTeam = {
            name: teamName,
            slogan: 'Команда будет определена',
            players: [],
            mmr: 0,
            isHidden: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        try {
            await this.database.ref(`hiddenTeams/${teamId}`).set(newTeam);
            console.log(`✅ Создана новая команда-заглушка: ${teamName}`);
            return true;
        } catch (error) {
            console.error('❌ Ошибка создания команды-заглушки:', error);
            return false;
        }
    }

    // Удалить команду-заглушку
    async deleteHiddenTeam(teamId) {
        try {
            await this.database.ref(`hiddenTeams/${teamId}`).remove();
            console.log(`✅ Удалена команда-заглушка: ${teamId}`);
            return true;
        } catch (error) {
            console.error('❌ Ошибка удаления команды-заглушки:', error);
            return false;
        }
    }
}

// Создаем глобальный экземпляр
let hiddenTeamsManager = null;

// Функция для инициализации модуля
async function initializeHiddenTeams(database) {
    if (!hiddenTeamsManager) {
        hiddenTeamsManager = new HiddenTeamsManager(database);
        await hiddenTeamsManager.initialize();
    }
    return hiddenTeamsManager;
}

// Глобальные функции для использования в основном коде
window.HiddenTeamsManager = {
    // Инициализация
    initialize: initializeHiddenTeams,
    
    // Основные методы
    getAllHiddenTeams: () => hiddenTeamsManager ? hiddenTeamsManager.getAllHiddenTeams() : {},
    getHiddenTeam: (teamId) => hiddenTeamsManager ? hiddenTeamsManager.getHiddenTeam(teamId) : null,
    isHiddenTeam: (teamId) => hiddenTeamsManager ? hiddenTeamsManager.isHiddenTeam(teamId) : false,
    getAllTeamsWithHidden: (regularTeams) => hiddenTeamsManager ? hiddenTeamsManager.getAllTeamsWithHidden(regularTeams) : regularTeams,
    getRegularTeamsOnly: (regularTeams) => hiddenTeamsManager ? hiddenTeamsManager.getRegularTeamsOnly(regularTeams) : regularTeams,
    
    // Дополнительные методы
    createAdditionalHiddenTeam: (teamId, teamName) => hiddenTeamsManager ? hiddenTeamsManager.createAdditionalHiddenTeam(teamId, teamName) : false,
    deleteHiddenTeam: (teamId) => hiddenTeamsManager ? hiddenTeamsManager.deleteHiddenTeam(teamId) : false
};

console.log('🎯 Модуль скрытых команд загружен');