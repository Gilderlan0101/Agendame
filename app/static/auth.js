import { appState } from './appState.js';
import { userName, loginPage, dashboardPage, loginForm } from './domElements.js';
import { showAlert, setLoading } from './utils.js';
import { getCompanySlug } from './company.js';

// Login
export function setupLogin() {
    if (!loginForm) return;

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Mostrar loading
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

            // Salvar token
            appState.token = data.access_token;
            localStorage.setItem('agendame_token', data.access_token);

            // Salvar dados do usuário
            appState.user = {
                id: data.user_id,
                username: data.username,
                email: data.email,
                business_name: data.business_name,
                business_slug: data.business_slug
            };

            // Atualizar nome no menu
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

// Logout
export function handleLogout() {
    if (confirm('Deseja sair da sua conta?')) {
        localStorage.removeItem('agendame_token');
        appState.token = null;
        appState.user = null;
        showAlert('Logout realizado com sucesso!', 'success');
        showLogin();
        loginForm.reset();
    }
}

// Mostrar página de login
export function showLogin() {
    loginPage.style.display = 'flex';
    dashboardPage.style.display = 'none';
}

// Mostrar dashboard
export function showDashboard() {
    loginPage.style.display = 'none';
    dashboardPage.style.display = 'block';
}

// Carregar dados do usuário
export async function loadUserData() {
    setLoading(true);

    try {
        const response = await fetch('/auth/me', {
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Sessão expirada');
        }

        const data = await response.json();
        appState.user = data;
        userName.textContent = data.username || data.email || 'Usuário';

        // Obter o slug da empresa para usar nas rotas
        await getCompanySlug();

        showDashboard();

    } catch (error) {
        showAlert('Sessão expirada. Faça login novamente.', 'error');
        localStorage.removeItem('agendame_token');
        showLogin();
    } finally {
        setLoading(false);
    }
}
