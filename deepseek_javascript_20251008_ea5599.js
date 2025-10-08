// js/config/app-config.js
export const AppConfig = {
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyAjUOjB-mQTdI6G4jwsIXGOHGldGBmC6j4",
        authDomain: "illusive-cup.firebaseapp.com",
        databaseURL: "https://illusive-cup-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "illusive-cup",
        storageBucket: "illusive-cup.firebasestorage.app",
        messagingSenderId: "465786550229",
        appId: "1:465786550229:web:9a1d4a3015b9cb0a3caf5c"
    },

    CACHE: {
        TTL: {
            SHORT: 5 * 60 * 1000,      // 5 минут
            MEDIUM: 30 * 60 * 1000,    // 30 минут
            LONG: 24 * 60 * 60 * 1000  // 24 часа
        },
        PREFIX: 'illusive_cup_'
    },

    PERFORMANCE: {
        DEBOUNCE: {
            INPUT: 300,
            RESIZE: 250,
            SCROLL: 100,
            SEARCH: 500
        },
        THROTTLE: {
            SCROLL: 16,  // ~60fps
            RESIZE: 100
        }
    },

    SECURITY: {
        SESSION_TIMEOUT: 30 * 60 * 1000, // 30 минут
        MAX_LOGIN_ATTEMPTS: 5,
        TOKEN_LENGTH: 32
    },

    VALIDATION: {
        TEAM: {
            NAME_MIN: 2,
            NAME_MAX: 50,
            PLAYERS_MIN: 1,
            PLAYERS_MAX: 10
        },
        PLAYER: {
            NAME_MIN: 1,
            NAME_MAX: 30,
            MMR_MIN: 0,
            MMR_MAX: 10000
        }
    },

    UI: {
        ANIMATION_DURATION: 300,
        NOTIFICATION_TIMEOUT: 5000,
        LOADING_DELAY: 200
    }
};

export default AppConfig;