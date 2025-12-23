import api from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login').value;
            const password = document.getElementById('password').value;

            errorMessage.style.display = 'none';
            errorMessage.textContent = '';

            try {
                const response = await api.login(email, password);
                
                if (response.token) {
                    localStorage.setItem('token', response.token);
                    localStorage.setItem('user', JSON.stringify(response.user));
                    
                    window.location.href = '../html/dashboard.html';
                }
            } catch (error) {
                errorMessage.textContent = 'Неверный логин или пароль';
                errorMessage.style.display = 'block';
                console.error('Login error:', error);
            }
        });
    }

    const protectedPages = ['dashboard.html', 'table.html', 'users.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '../index.html';
        }
    }
});

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../index.html';
}

export function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}