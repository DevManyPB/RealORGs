// js/auth.js
const db = new Database();

function initAuth() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Verificar si ya está logueado
    if (db.currentUser && window.location.pathname.includes('login.html')) {
        window.location.href = 'dashboard.html';
    }
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (db.authenticate(username, password)) {
        window.location.href = 'dashboard.html';
    } else {
        alert('Credenciales incorrectas');
    }
}

function logout() {
    db.logout();
    window.location.href = 'login.html';
}