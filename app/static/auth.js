// app/auth.js

import { appState } from './appState.js';
import { userName, loginPage, dashboardPage, loginForm } from './domElements.js';
import { showAlert, setLoading } from './utils.js';
import { getCompanySlug } from './company.js';

// ================================
// LOGIN
// ================================
export function setupLogin() {
    if (!loginForm) return;

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        setLoading(true);

        try {
            const formData = new URLSearchParams();
            formData.append('username', document.getElementById('email').value);
            formData.append('password', document.getElementById('password').value);

            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });

            if (!response.ok) {
                let errorMessage = 'Credenciais inválidas';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorMessage;
                } catch (e) {}
                throw new Error(errorMessage);
            }

            const data = await response.json();

            // ================================
            // TOKEN
            // ================================
            appState.token = data.access_token;
            localStorage.setItem('agendame_token', data.access_token);

            // ================================
            // USER STATE
            // ================================
            appState.user = {
                id: data.user_id,
                username: data.username,
                email: data.email,
                phone: data.phone || null,
                status: data.status ?? true,
            };

            // ================================
            // COMPANY STATE
            // ================================
            appState.company = {
                business_name: data.business_name,
                slug: data.slog, // vindo do backend
            };

            // ================================
            // LOCAL STORAGE (persistência)
            // ================================
            localStorage.setItem('agendame_user', JSON.stringify(appState.user));
            localStorage.setItem('agendame_company', JSON.stringify(appState.company));
            localStorage.setItem('agendame_slug', data.slog);

            // ================================
            // UI
            // ================================
            userName.textContent = data.username || data.email || 'Usuário';

            showAlert('Login realizado com sucesso!', 'success');
            showDashboard();

        } catch (error) {
            showAlert(error.message || 'Erro ao fazer login', 'error');
        } finally {
            setLoading(false);
        }
    });
}

// ================================
// LOGOUT
// ================================
export function handleLogout() {
    if (confirm('Deseja sair da sua conta?')) {

        localStorage.removeItem('agendame_token');
        localStorage.removeItem('agendame_user');
        localStorage.removeItem('agendame_company');
        localStorage.removeItem('agendame_slug');

        appState.token = null;
        appState.user = null;
        appState.company = null;

        showAlert('Logout realizado com sucesso!', 'success');
        showLogin();
        loginForm.reset();
    }
}

// ================================
// UI STATES
// ================================
export function showLogin() {
    loginPage.style.display = 'flex';
    dashboardPage.style.display = 'none';
}

export function showDashboard() {
    loginPage.style.display = 'none';
    dashboardPage.style.display = 'block';
}

// ================================
// LOAD SESSION
// ================================
export async function loadUserData() {
    setLoading(true);

    try {
        const token = localStorage.getItem('agendame_token');

        if (!token) throw new Error('Sem sessão');

        appState.token = token;

        const response = await fetch('/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Sessão expirada');
        }

        const data = await response.json();

        // ================================
        // USER STATE
        // ================================
        appState.user = {
            id: data.id,
            username: data.username,
            email: data.email,
            phone: data.phone || null,
            status: data.status ?? true,
            photo: data.photo || null,
            companySlug: data.slog || "SEM"
        };

        localStorage.setItem('agendame_user', JSON.stringify(appState.user));

        userName.textContent = data.username || data.email || 'Usuário';

        // ================================
        // COMPANY SLUG
        // ================================
        const slug = await getCompanySlug();
        appState.company = {
            slug
        };

        localStorage.setItem('agendame_company', JSON.stringify(appState.company));
        localStorage.setItem('agendame_slug', slug);

        showDashboard();

    } catch (error) {
        showAlert('Sessão expirada. Faça login novamente.', 'error');

        localStorage.removeItem('agendame_token');
        localStorage.removeItem('agendame_user');
        localStorage.removeItem('agendame_company');
        localStorage.removeItem('agendame_slug');

        appState.token = null;
        appState.user = null;
        appState.company = null;

        showLogin();
    } finally {
        setLoading(false);
    }
}
