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
        particle.style.left = `${Math.random
