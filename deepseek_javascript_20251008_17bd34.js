// js/managers/tournament-manager.js
import { AppState } from '../utils/state-manager.js';
import { firebaseService } from '../services/firebase-service.js';
import { teamsManager } from './teams-manager.js';
import DataValidator from '../utils/data-validator.js';
import ErrorHandler from '../utils/error-handler.js';

export class TournamentManager {
    constructor() {
        this.tournamentData = {
            bracket: {},
            schedule: [],
            groupStage: {},
            audienceAwards: {},
            settings: {}
        };
        this.subscriptions = new Set();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Загрузка начальных данных
            await this.loadInitialData();
            
            // Настройка подписок
            await this.setupSubscriptions();
            
            this.isInitialized = true;
            console.log('✅ Tournament Manager инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации Tournament Manager:', error);
            throw error;
        }
    }

    async setupSubscriptions() {
        const paths = ['bracket', 'schedule', 'tournament', 'audienceAwards'];
        
        paths.forEach(path => {
            const unsubscribe = firebaseService.subscribe(path, (data) => {
                this.handleDataUpdate(path, data);
            });
            this.subscriptions.add(unsubscribe);
        });
    }

    handleDataUpdate(path, data) {
        switch (path) {
            case 'bracket':
                this.tournamentData.bracket = data || {};
                AppState.set('bracket', this.tournamentData.bracket, 'bracket_updated');
                break;
                
            case 'schedule':
                this.tournamentData.schedule = data || [];
                AppState.set('schedule', this.tournamentData.schedule, 'schedule_updated');
                break;
                
            case 'tournament':
                this.tournamentData.groupStage = data?.groupStage || {};
                this.tournamentData.settings = data?.settings || {};
                AppState.set('tournament', data, 'tournament_updated');
                break;
                
            case 'audienceAwards':
                this.tournamentData.audienceAwards = data || {};
                AppState.set('audienceAwards', this.tournamentData.audienceAwards, 'awards_updated');
                break;
        }

        console.log(`📊 Обновлены данные: ${path}`);
    }

    async loadInitialData() {
        try {
            const [bracket, schedule, tournament, awards] = await Promise.allSettled([
                firebaseService.get('bracket'),
                firebaseService.get('schedule'),
                firebaseService.get('tournament'),
                firebaseService.get('audienceAwards')
            ]);

            this.tournamentData.bracket = bracket.value || {};
            this.tournamentData.schedule = schedule.value || [];
            this.tournamentData.groupStage = tournament.value?.groupStage || {};
            this.tournamentData.settings = tournament.value?.settings || {};
            this.tournamentData.audienceAwards = awards.value || {};

            // Инициализация состояния
            AppState.set('bracket', this.tournamentData.bracket);
            AppState.set('schedule', this.tournamentData.schedule);
            AppState.set('tournament', tournament.value);
            AppState.set('audienceAwards', this.tournamentData.audienceAwards);

        } catch (error) {
            console.error('❌ Ошибка загрузки начальных данных:', error);
            throw error;
        }
    }

    // Управление турнирной сеткой
    async updateBracket(bracketData) {
        try {
            const validation = this.validateBracket(bracketData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            await firebaseService.set('bracket', bracketData);
            
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Сетка обновлена',
                message: 'Турнирная сетка успешно сохранена'
            });

            return true;
            
        } catch (error) {
            console.error('❌ Ошибка обновления сетки:', error);
            throw error;
        }
    }

    validateBracket(bracketData) {
        const errors = [];
        
        if (!bracketData) {
            errors.push('Данные сетки обязательны');
            return { isValid: false, errors };
        }

        // Валидация раундов
        const rounds = ['quarterfinals', 'semifinals', 'final'];
        rounds.forEach(round => {
            if (bracketData[round] && !Array.isArray(bracketData[round])) {
                errors.push(`Раунд ${round} должен быть массивом`);
            }
        });

        // Валидация матчей
        Object.values(bracketData).forEach(matches => {
            if (Array.isArray(matches)) {
                matches.forEach((match, index) => {
                    const matchValidation = DataValidator.validateBracketMatch(match);
                    if (!matchValidation.isValid) {
                        errors.push(`Матч ${index + 1}: ${matchValidation.errors.join(', ')}`);
                    }
                });
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Управление расписанием
    async updateSchedule(scheduleData) {
        try {
            const validation = this.validateSchedule(scheduleData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            await firebaseService.set('schedule', scheduleData);
            
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Расписание обновлено',
                message: 'Расписание матчей успешно сохранено'
            });

            return true;
            
        } catch (error) {
            console.error('❌ Ошибка обновления расписания:', error);
            throw error;
        }
    }

    validateSchedule(scheduleData) {
        const errors = [];
        
        if (!Array.isArray(scheduleData)) {
            errors.push('Расписание должно быть массивом');
            return { isValid: false, errors };
        }

        scheduleData.forEach((item, index) => {
            const validation = DataValidator.validateSchedule(item);
            if (!validation.isValid) {
                errors.push(`Элемент ${index + 1}: ${validation.errors.join(', ')}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Управление групповым этапом
    async updateGroupStage(groupStageData) {
        try {
            await firebaseService.update('tournament', { groupStage: groupStageData });
            
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Групповой этап обновлен',
                message: 'Данные группового этапа сохранены'
            });

            return true;
            
        } catch (error) {
            console.error('❌ Ошибка обновления группового этапа:', error);
            throw error;
        }
    }

    async updateTournamentSettings(settings) {
        try {
            const validation = DataValidator.validateTournamentSettings(settings);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            await firebaseService.update('tournament', { settings });
            
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Настройки обновлены',
                message: 'Настройки турнира сохранены'
            });

            return true;
            
        } catch (error) {
            console.error('❌ Ошибка обновления настроек:', error);
            throw error;
        }
    }

    // Призы зрительских симпатий
    async updateAudienceAwards(awardsData) {
        try {
            await firebaseService.set('audienceAwards', awardsData);
            
            ErrorHandler.showNotification({
                type: 'success',
                title: 'Призы обновлены',
                message: 'Данные призов зрительских симпатий сохранены'
            });

            return true;
            
        } catch (error) {
            console.error('❌ Ошибка обновления призов:', error);
            throw error;
        }
    }

    // Генерация сетки
    async generateBracket(teams, format = 'single_elimination') {
        const teamList = Array.isArray(teams) ? teams : teamsManager.getAllTeams();
        
        if (teamList.length < 2) {
            throw new Error('Для генерации сетки нужно минимум 2 команды');
        }

        let bracket = {};

        switch (format) {
            case 'single_elimination':
                bracket = this.generateSingleEliminationBracket(teamList);
                break;
            case 'double_elimination':
                bracket = this.generateDoubleEliminationBracket(teamList);
                break;
            default:
                throw new Error(`Неизвестный формат: ${format}`);
        }

        await this.updateBracket(bracket);
        return bracket;
    }

    generateSingleEliminationBracket(teams) {
        const bracket = {
            quarterfinals: [],
            semifinals: [],
            final: []
        };

        // Простая реализация для демонстрации
        const shuffled = [...teams].sort(() => Math.random() - 0.5);
        
        // Четвертьфиналы
        for (let i = 0; i < Math.min(4, Math.floor(shuffled.length / 2)); i++) {
            bracket.quarterfinals.push({
                team1: shuffled[i * 2]?.id || '',
                team2: shuffled[i * 2 + 1]?.id || '',
                score1: null,
                score2: null,
                completed: false
            });
        }

        // Полуфиналы
        bracket.semifinals.push(
            { team1: '', team2: '', score1: null, score2: null, completed: false },
            { team1: '', team2: '', score1: null, score2: null, completed: false }
        );

        // Финал
        bracket.final.push({
            team1: '', team2: '', score1: null, score2: null, completed: false
        });

        return bracket;
    }

    generateDoubleEliminationBracket(teams) {
        // Базовая реализация двойной элиминации
        return this.generateSingleEliminationBracket(teams);
    }

    // Утилиты
    getNextMatch() {
        const now = new Date();
        const schedule = this.tournamentData.schedule || [];
        
        return schedule
            .filter(match => match.time && new Date(match.time) > now)
            .sort((a, b) => new Date(a.time) - new Date(b.time))[0];
    }

    getLiveMatches() {
        const bracket = this.tournamentData.bracket || {};
        const liveMatches = [];
        
        Object.values(bracket).forEach(round => {
            if (Array.isArray(round)) {
                round.forEach(match => {
                    if (match.completed === false && (match.score1 !== null || match.score2 !== null)) {
                        liveMatches.push(match);
                    }
                });
            }
        });

        return liveMatches;
    }

    getTournamentProgress() {
        const bracket = this.tournamentData.bracket || {};
        let totalMatches = 0;
        let completedMatches = 0;

        Object.values(bracket).forEach(round => {
            if (Array.isArray(round)) {
                round.forEach(match => {
                    totalMatches++;
                    if (match.completed) {
                        completedMatches++;
                    }
                });
            }
        });

        return totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
    }

    // Экспорт данных
    exportTournamentData() {
        return {
            ...this.tournamentData,
            teams: teamsManager.getAllTeams(),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
    }

    // Очистка
    destroy() {
        this.subscriptions.forEach(unsubscribe => unsubscribe());
        this.subscriptions.clear();
        this.isInitialized = false;
        
        console.log('✅ Tournament Manager уничтожен');
    }
}

// Глобальный экземпляр
export const tournamentManager = new TournamentManager();

export default TournamentManager;