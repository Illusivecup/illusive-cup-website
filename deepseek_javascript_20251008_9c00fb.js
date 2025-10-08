// js/managers/teams-manager.js
import { AppState } from '../utils/state-manager.js';
import { firebaseService } from '../services/firebase-service.js';
import DataValidator from '../utils/data-validator.js';
import ErrorHandler from '../utils/error-handler.js';
import PerformanceOptimizer from '../utils/performance-optimizer.js';

export class TeamsManager {
    constructor() {
        this.teams = new Map();
        this.subscriptions = new Set();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Загрузка данных из кэша
            await this.loadFromCache();
            
            // Подписка на обновления в реальном времени
            await this.setupRealtimeSubscriptions();
            
            this.isInitialized = true;
            console.log('✅ Teams Manager инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации Teams Manager:', error);
            throw error;
        }
    }

    async setupRealtimeSubscriptions() {
        // Подписка на все команды
        const unsubscribe = firebaseService.subscribe('teams', (teamsData) => {
            PerformanceOptimizer.debounce('teams_update', () => {
                this.handleTeamsUpdate(teamsData);
            }, 300);
        }, {
            errorHandler: (error) => {
                ErrorHandler.showNotification({
                    type: 'warning',
                    title: 'Ошибка загрузки команд',
                    message: 'Используются кэшированные данные'
                });
            }
        });

        this.subscriptions.add(unsubscribe);
    }

    handleTeamsUpdate(teamsData) {
        const previousCount = this.teams.size;
        
        // Очищаем текущие данные
        this.teams.clear();
        
        // Заполняем новыми данными
        if (teamsData) {
            Object.entries(teamsData).forEach(([teamId, teamData]) => {
                const validatedTeam = this.validateAndNormalizeTeam(teamData, teamId);
                if (validatedTeam) {
                    this.teams.set(teamId, validatedTeam);
                }
            });
        }

        // Сохраняем в кэш
        this.saveToCache();
        
        // Обновляем состояние приложения
        AppState.set('teams', this.getAllTeams(), 'teams_updated');
        
        // Логируем изменения
        if (this.teams.size !== previousCount) {
            console.log(`📊 Обновлены данные команд: ${this.teams.size} команд`);
        }
    }

    validateAndNormalizeTeam(teamData, teamId) {
        try {
            // Санитизация данных
            const sanitizedData = DataValidator.sanitizeTeamData(teamData);
            if (!sanitizedData) return null;

            // Валидация
            const validation = DataValidator.validateTeam(sanitizedData);
            if (!validation.isValid) {
                console.warn(`⚠️ Команда ${teamId} не прошла валидацию:`, validation.errors);
                
                if (validation.errors.length > 0) {
                    ErrorHandler.showNotification({
                        type: 'warning',
                        title: `Проблема с командой ${sanitizedData.name}`,
                        message: validation.errors[0]
                    });
                }
                
                // Возвращаем данные даже с ошибками, но логируем их
                sanitizedData.validationErrors = validation.errors;
                sanitizedData.validationWarnings = validation.warnings;
            }

            // Нормализация структуры
            return DataValidator.normalizeTeamStructure(sanitizedData, teamId);
            
        } catch (error) {
            console.error(`❌ Ошибка обработки команды ${teamId}:`, error);
            return null;
        }
    }

    // CRUD операции
    async createTeam(teamData) {
        if (!firebaseService.isConnected) {
            throw new Error('Нет подключения к базе данных');
        }

        const validation = DataValidator.validateTeam(teamData);
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        const sanitizedData = DataValidator.sanitizeTeamData(teamData);
        const teamId = DataValidator.generateTeamId();

        try {
            await firebaseService.set(`teams/${teamId}`, sanitizedData);
            
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Команда создана',
                message: `Команда "${sanitizedData.name}" успешно добавлена`
            });

            return teamId;
            
        } catch (error) {
            console.error('❌ Ошибка создания команды:', error);
            throw new Error('Не удалось создать команду');
        }
    }

    async updateTeam(teamId, updates) {
        if (!this.teams.has(teamId)) {
            throw new Error('Команда не найдена');
        }

        const existingTeam = this.teams.get(teamId);
        const updatedTeam = { ...existingTeam, ...updates, updatedAt: Date.now() };

        const validation = DataValidator.validateTeam(updatedTeam);
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        const sanitizedData = DataValidator.sanitizeTeamData(updatedTeam);

        try {
            await firebaseService.update(`teams/${teamId}`, sanitizedData);
            
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Команда обновлена',
                message: `Данные команды "${sanitizedData.name}" сохранены`
            });

            return teamId;
            
        } catch (error) {
            console.error(`❌ Ошибка обновления команды ${teamId}:`, error);
            throw new Error('Не удалось обновить команду');
        }
    }

    async deleteTeam(teamId) {
        if (!this.teams.has(teamId)) {
            throw new Error('Команда не найдена');
        }

        const teamName = this.teams.get(teamId).name;

        try {
            await firebaseService.remove(`teams/${teamId}`);
            
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Команда удалена',
                message: `Команда "${teamName}" удалена из турнира`
            });

            return true;
            
        } catch (error) {
            console.error(`❌ Ошибка удаления команды ${teamId}:`, error);
            throw new Error('Не удалось удалить команду');
        }
    }

    // Получение данных
    getTeam(teamId) {
        return this.teams.get(teamId) || null;
    }

    getAllTeams() {
        return Array.from(this.teams.values());
    }

    getTeamsArray() {
        return this.getAllTeams();
    }

    getTeamsMap() {
        return new Map(this.teams);
    }

    searchTeams(query, field = 'name') {
        const searchTerm = query.toLowerCase().trim();
        
        return this.getAllTeams().filter(team => {
            const value = team[field]?.toLowerCase() || '';
            return value.includes(searchTerm);
        });
    }

    filterTeamsByMMR(minMMR = 0, maxMMR = 10000) {
        return this.getAllTeams().filter(team => {
            const mmr = team.mmr || 0;
            return mmr >= minMMR && mmr <= maxMMR;
        });
    }

    // Статистика
    getTeamsStats() {
        const teams = this.getAllTeams();
        
        return {
            total: teams.length,
            averageMMR: teams.reduce((sum, team) => sum + (team.mmr || 0), 0) / teams.length,
            totalPlayers: teams.reduce((sum, team) => sum + (team.players?.length || 0), 0),
            validated: teams.filter(team => !team.validationErrors).length,
            withWarnings: teams.filter(team => team.validationWarnings?.length > 0).length
        };
    }

    // Кэширование
    async saveToCache() {
        try {
            const cacheData = {
                teams: Object.fromEntries(this.teams),
                timestamp: Date.now(),
                version: '1.0'
            };
            
            localStorage.setItem('teams_cache', JSON.stringify(cacheData));
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить команды в кэш:', error);
        }
    }

    async loadFromCache() {
        try {
            const cached = localStorage.getItem('teams_cache');
            if (!cached) return;

            const cacheData = JSON.parse(cached);
            
            // Проверяем актуальность кэша (не старше 1 часа)
            const cacheAge = Date.now() - cacheData.timestamp;
            if (cacheAge > 3600000) {
                console.log('🗑️ Кэш команд устарел');
                return;
            }

            // Восстанавливаем данные из кэша
            if (cacheData.teams) {
                Object.entries(cacheData.teams).forEach(([teamId, teamData]) => {
                    this.teams.set(teamId, teamData);
                });
                
                AppState.set('teams', this.getAllTeams(), 'teams_loaded_from_cache');
                console.log(`📁 Загружено ${this.teams.size} команд из кэша`);
            }
            
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить команды из кэша:', error);
        }
    }

    // Утилиты
    calculateTeamMMR(players) {
        if (!players || players.length === 0) return 0;
        
        const validPlayers = players.filter(player => 
            player.mmr && Number.isInteger(player.mmr) && player.mmr > 0
        );
        
        if (validPlayers.length === 0) return 0;
        
        const totalMMR = validPlayers.reduce((sum, player) => sum + player.mmr, 0);
        return Math.round(totalMMR / validPlayers.length);
    }

    exportTeams(format = 'json') {
        const teams = this.getAllTeams();
        
        switch (format) {
            case 'json':
                return JSON.stringify(teams, null, 2);
            case 'csv':
                return this.convertToCSV(teams);
            default:
                throw new Error(`Неизвестный формат: ${format}`);
        }
    }

    convertToCSV(teams) {
        const headers = ['Название', 'Слоган', 'MMR', 'Игроков'];
        const rows = teams.map(team => [
            team.name,
            team.slogan,
            team.mmr,
            team.players?.length || 0
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
    }

    // Очистка
    destroy() {
        this.subscriptions.forEach(unsubscribe => unsubscribe());
        this.subscriptions.clear();
        this.teams.clear();
        this.isInitialized = false;
        
        console.log('✅ Teams Manager уничтожен');
    }
}

// Глобальный экземпляр
export const teamsManager = new TeamsManager();

export default TeamsManager;