// js/utils/data-validator.js
import AppConfig from '../config/app-config.js';

export class DataValidator {
    static validateTeam(teamData) {
        const errors = [];
        const warnings = [];
        
        if (!teamData) {
            errors.push('Данные команды обязательны');
            return { isValid: false, errors, warnings };
        }

        // Валидация названия
        if (!teamData.name || teamData.name.trim().length === 0) {
            errors.push('Название команды обязательно');
        } else {
            const name = teamData.name.trim();
            if (name.length < AppConfig.VALIDATION.TEAM.NAME_MIN) {
                errors.push(`Название команды должно содержать минимум ${AppConfig.VALIDATION.TEAM.NAME_MIN} символа`);
            }
            if (name.length > AppConfig.VALIDATION.TEAM.NAME_MAX) {
                errors.push(`Название команды не должно превышать ${AppConfig.VALIDATION.TEAM.NAME_MAX} символов`);
            }
            if (!/^[\p{L}\p{N}\s\-_]+$/u.test(name)) {
                errors.push('Название команды содержит недопустимые символы');
            }
        }

        // Валидация состава
        if (!Array.isArray(teamData.players)) {
            errors.push('Команда должна иметь список игроков');
        } else {
            if (teamData.players.length < AppConfig.VALIDATION.TEAM.PLAYERS_MIN) {
                errors.push(`Команда должна иметь минимум ${AppConfig.VALIDATION.TEAM.PLAYERS_MIN} игрока`);
            }
            if (teamData.players.length > AppConfig.VALIDATION.TEAM.PLAYERS_MAX) {
                errors.push(`Команда не может иметь больше ${AppConfig.VALIDATION.TEAM.PLAYERS_MAX} игроков`);
            }

            // Валидация каждого игрока
            teamData.players.forEach((player, index) => {
                const playerErrors = this.validatePlayer(player, index);
                errors.push(...playerErrors);
            });

            // Проверка уникальности игроков
            const playerNames = teamData.players.map(p => p.name?.toLowerCase().trim()).filter(Boolean);
            const uniqueNames = new Set(playerNames);
            if (uniqueNames.size !== playerNames.length) {
                warnings.push('Обнаружены игроки с одинаковыми именами');
            }

            // Проверка ролей
            const roles = teamData.players.map(p => p.role?.toLowerCase().trim()).filter(Boolean);
            const roleCounts = roles.reduce((acc, role) => {
                acc[role] = (acc[role] || 0) + 1;
                return acc;
            }, {});
            
            Object.entries(roleCounts).forEach(([role, count]) => {
                if (count > 1) {
                    warnings.push(`Роль "${role}" назначена ${count} игрокам`);
                }
            });
        }

        // Валидация MMR команды
        if (teamData.mmr !== undefined && teamData.mmr !== null) {
            const mmrErrors = this.validateMMR(teamData.mmr, 'Команда');
            errors.push(...mmrErrors);
        }

        // Предупреждения
        if (!teamData.slogan || teamData.slogan.trim().length === 0) {
            warnings.push('Рекомендуется добавить слоган команды');
        }

        if (teamData.players && teamData.players.length < 5) {
            warnings.push('Рекомендуется иметь 5 игроков для полноценной команды');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    static validatePlayer(player, index) {
        const errors = [];
        const playerPrefix = `Игрок ${index + 1}:`;
        
        if (!player) {
            errors.push(`${playerPrefix} данные игрока обязательны`);
            return errors;
        }

        // Валидация имени
        if (!player.name || player.name.trim().length === 0) {
            errors.push(`${playerPrefix} имя обязательно`);
        } else {
            const name = player.name.trim();
            if (name.length < AppConfig.VALIDATION.PLAYER.NAME_MIN) {
                errors.push(`${playerPrefix} имя должно содержать минимум ${AppConfig.VALIDATION.PLAYER.NAME_MIN} символ`);
            }
            if (name.length > AppConfig.VALIDATION.PLAYER.NAME_MAX) {
                errors.push(`${playerPrefix} имя не должно превышать ${AppConfig.VALIDATION.PLAYER.NAME_MAX} символов`);
            }
            if (!/^[\p{L}\p{N}\s\-_]+$/u.test(name)) {
                errors.push(`${playerPrefix} имя содержит недопустимые символы`);
            }
        }

        // Валидация роли
        if (!player.role || player.role.trim().length === 0) {
            errors.push(`${playerPrefix} роль обязательна`);
        } else {
            const role = player.role.trim();
            if (role.length > 20) {
                errors.push(`${playerPrefix} роль не должна превышать 20 символов`);
            }
        }

        // Валидация MMR
        if (player.mmr !== undefined && player.mmr !== null) {
            const mmrErrors = this.validateMMR(player.mmr, playerPrefix);
            errors.push(...mmrErrors);
        }

        return errors;
    }
    
    static validateMMR(mmr, prefix = '') {
        const errors = [];
        
        if (typeof mmr !== 'number' || isNaN(mmr)) {
            errors.push(`${prefix} MMR должен быть числом`);
            return errors;
        }
        
        if (!Number.isInteger(mmr)) {
            errors.push(`${prefix} MMR должен быть целым числом`);
        }
        
        if (mmr < AppConfig.VALIDATION.PLAYER.MMR_MIN) {
            errors.push(`${prefix} MMR не может быть отрицательным`);
        }
        
        if (mmr > AppConfig.VALIDATION.PLAYER.MMR_MAX) {
            errors.push(`${prefix} MMR не может превышать ${AppConfig.VALIDATION.PLAYER.MMR_MAX}`);
        }
        
        return errors;
    }
    
    static validateBracketMatch(match) {
        const errors = [];
        const warnings = [];
        
        if (!match) {
            errors.push('Данные матча обязательны');
            return { isValid: false, errors, warnings };
        }

        // Валидация команд
        if (match.team1 && match.team2 && match.team1 === match.team2) {
            errors.push('Команда не может играть против себя');
        }

        if ((match.team1 && !match.team2) || (!match.team1 && match.team2)) {
            warnings.push('Одна из команд не выбрана');
        }

        // Валидация счета
        if (match.score1 !== null && match.score2 !== null) {
            if (typeof match.score1 !== 'number' || typeof match.score2 !== 'number') {
                errors.push('Счет должен быть числом');
            } else {
                if (match.score1 < 0 || match.score2 < 0) {
                    errors.push('Счет не может быть отрицательным');
                }
                
                if (!Number.isInteger(match.score1) || !Number.isInteger(match.score2)) {
                    errors.push('Счет должен быть целым числом');
                }
                
                if (match.score1 === match.score2 && match.score1 > 0) {
                    warnings.push('Ничейный результат в матче');
                }
            }
        }

        // Валидация статуса завершения
        if (match.completed && (!match.score1 !== null || !match.score2 !== null)) {
            warnings.push('Завершенный матч должен иметь счет');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    static validateSchedule(scheduleItem) {
        const errors = [];
        const warnings = [];
        
        if (!scheduleItem) {
            errors.push('Данные расписания обязательны');
            return { isValid: false, errors, warnings };
        }

        // Валидация времени
        if (!scheduleItem.time) {
            errors.push('Время матча обязательно');
        } else {
            if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(scheduleItem.time)) {
                errors.push('Неверный формат времени (используйте HH:MM)');
            }
        }

        // Валидация стадии
        if (!scheduleItem.stage) {
            errors.push('Стадия турнира обязательна');
        } else {
            const validStages = ['Групповой этап', 'Плей-офф', 'Четвертьфинал', 'Полуфинал', 'Финал'];
            if (!validStages.includes(scheduleItem.stage)) {
                warnings.push(`Неизвестная стадия турнира: ${scheduleItem.stage}`);
            }
        }

        // Валидация команд/названия матча
        if (!scheduleItem.match && (!scheduleItem.team1 || !scheduleItem.team2)) {
            errors.push('Необходимо указать команды или название матча');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    static validateTournamentSettings(settings) {
        const errors = [];
        const warnings = [];
        
        if (!settings) {
            errors.push('Настройки турнира обязательны');
            return { isValid: false, errors, warnings };
        }

        // Валидация формата
        if (!settings.format) {
            errors.push('Формат турнира обязателен');
        } else {
            const validFormats = ['round_robin', 'single_elimination', 'double_elimination'];
            if (!validFormats.includes(settings.format)) {
                errors.push('Неверный формат турнира');
            }
        }

        // Валидация количества групп
        if (settings.groups === undefined || settings.groups === null) {
            errors.push('Количество групп обязательно');
        } else {
            if (!Number.isInteger(settings.groups) || settings.groups < 1) {
                errors.push('Количество групп должно быть положительным целым числом');
            }
            if (settings.groups > 8) {
                warnings.push('Рекомендуется не более 8 групп');
            }
        }

        // Валидация команд для плей-офф
        if (settings.advancingTeams === undefined || settings.advancingTeams === null) {
            errors.push('Количество команд для плей-офф обязательно');
        } else {
            if (!Number.isInteger(settings.advancingTeams) || settings.advancingTeams < 1) {
                errors.push('Количество команд для плей-офф должно быть положительным целым числом');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    static sanitizeInput(input) {
        if (input === null || input === undefined) return '';
        if (typeof input !== 'string') return String(input).trim();
        
        return input
            .trim()
            .replace(/[<>&"']/g, (char) => {
                const entities = {
                    '<': '&lt;',
                    '>': '&gt;', 
                    '&': '&amp;',
                    '"': '&quot;',
                    "'": '&#x27;'
                };
                return entities[char] || char;
            });
    }

    static sanitizeTeamData(teamData) {
        if (!teamData) return null;
        
        const sanitized = { ...teamData };
        
        // Санитизация строковых полей
        if (sanitized.name) sanitized.name = this.sanitizeInput(sanitized.name);
        if (sanitized.slogan) sanitized.slogan = this.sanitizeInput(sanitized.slogan);
        
        // Санитизация игроков
        if (Array.isArray(sanitized.players)) {
            sanitized.players = sanitized.players.map(player => ({
                ...player,
                name: this.sanitizeInput(player.name),
                role: this.sanitizeInput(player.role)
            })).filter(player => 
                player.name && player.role && 
                player.name.length >= AppConfig.VALIDATION.PLAYER.NAME_MIN &&
                player.name.length <= AppConfig.VALIDATION.PLAYER.NAME_MAX
            );
        }
        
        // Расчет MMR
        if (Array.isArray(sanitized.players) && sanitized.players.length > 0) {
            const totalMMR = sanitized.players.reduce((sum, player) => {
                return sum + (Number.isInteger(player.mmr) ? player.mmr : 0);
            }, 0);
            sanitized.mmr = Math.round(totalMMR / sanitized.players.length);
        }
        
        return sanitized;
    }

    static generateTeamId() {
        return 'team_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    static normalizeTeamStructure(teamData, teamId = null) {
        return {
            id: teamId || this.generateTeamId(),
            name: teamData.name || 'Новая команда',
            slogan: teamData.slogan || '',
            players: Array.isArray(teamData.players) ? teamData.players : [],
            mmr: teamData.mmr || 0,
            createdAt: teamData.createdAt || Date.now(),
            updatedAt: Date.now()
        };
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

export default DataValidator;