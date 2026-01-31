// app/auth.js

import { appState } from './appState.js';
import { userName, loginPage, dashboardPage, loginForm } from './domElements.js';
import { showAlert, setLoading } from './utils.js';

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

            const loginData = await response.json();

            // 1. TOKEN (do login response)
            appState.token = loginData.access_token;
            localStorage.setItem('agendame_token', loginData.access_token);

            // 2. Dados básicos do login response
            appState.user = {
                id: loginData.user_id || loginData.id,
                username: loginData.username,
                email: loginData.email,
                business_name: loginData.business_name,
                token_type: loginData.token_type
            };
            localStorage.setItem('agendame_user', JSON.stringify(appState.user));

            // 3. Company slug do login response
            if (loginData.slog) {
                appState.companySlug = loginData.slog;
                localStorage.setItem('agendame_slug', loginData.slog);
            }

            // ================================
            // AGORA BUSCAR DADOS COMPLETOS DO /auth/me
            // ================================
            await loadCompleteUserData();

            // ⭐⭐ IMPORTANTE: SALVAR NOME DA EMPRESA AQUI ⭐⭐
            // Depois de carregar dados completos, temos a company
            if (appState.company && appState.company.name) {
                localStorage.setItem('business_name', appState.company.name);
                console.log('Nome da empresa salvo:', appState.company.name);
            }

            showAlert('Login realizado com sucesso!', 'success');
            showDashboard();

        } catch (error) {
            showAlert(error.message || 'Erro ao fazer login', 'error');
            console.error('Erro no login:', error);
        } finally {
            setLoading(false);
        }
    });
}

// ================================
// CARREGAR DADOS COMPLETOS DO USUÁRIO (/auth/me)
// ================================
async function loadCompleteUserData() {
    try {
        const token = localStorage.getItem('agendame_token');

        if (!token) {
            throw new Error('Token não encontrado');
        }

        const response = await fetch('/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao carregar dados do usuário');
        }

        const userData = await response.json();

        // ================================
        // ATUALIZAR USER STATE COM DADOS COMPLETOS
        // ================================
        appState.user = {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            phone: userData.phone || null,
            status: userData.status ?? true,
            photo: userData.photo || null,
            name: userData.name, // "Corte Supremo Barber & Spa"
            business_name: userData.name, // mesmo que name
            slug: userData.slug // "corte-supremo-barber-spa"
        };
        localStorage.setItem('agendame_user', JSON.stringify(appState.user));

        // ================================
        // COMPANY STATE
        // ================================
        appState.company = {
            id: userData.id, // mesmo user_id
            name: userData.name, // ⭐⭐ AQUI ESTÁ O NOME DA EMPRESA ⭐⭐
            business_name: userData.name,
            slug: userData.slug,
            email: userData.email,
            phone: userData.phone || null,
            photo: userData.photo || null
        };
        localStorage.setItem('agendame_company', JSON.stringify(appState.company));

        // ================================
        // COMPANY SLUG
        // ================================
        appState.companySlug = userData.slug;
        localStorage.setItem('agendame_slug', userData.slug);

        // ================================
        // COMPANY INFO
        // ================================
        appState.companyInfo = {
            id: userData.id,
            name: userData.name, // ⭐⭐ AQUI TAMBÉM ⭐⭐
            business_name: userData.name,
            slug: userData.slug,
            email: userData.email,
            phone: userData.phone || null,
            photo: userData.photo || null
        };
        localStorage.setItem('agendame_company_info', JSON.stringify(appState.companyInfo));

        // ================================
        // ⭐⭐ SALVAR NOME DA EMPRESA SEPARADAMENTE ⭐⭐
        // ================================
        if (userData.name) {
            localStorage.setItem('business_name', userData.name);
            console.log('Nome da empresa configurado:', userData.name);
        }

        // ================================
        // ATUALIZAR UI
        // ================================
        if (userName) {
            userName.textContent = userData.username || userData.name || userData.email || 'Usuário';
        }

        return userData;

    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        throw error;
    }
}

// ================================
// LOAD SESSION (ao carregar a página)
// ================================
export async function loadUserSession() {
    setLoading(true);

    try {
        const token = localStorage.getItem('agendame_token');

        if (!token) {
            throw new Error('Sem sessão ativa');
        }

        appState.token = token;

        // Carregar dados completos do /auth/me
        await loadCompleteUserData();

        // ⭐⭐ Verificar se business_name está salvo
        let businessName = localStorage.getItem('business_name');
        if (!businessName && appState.company?.name) {
            localStorage.setItem('business_name', appState.company.name);
            console.log('Business name recuperado do appState:', appState.company.name);
        }

        showDashboard();
        console.log('Sessão carregada com sucesso');

    } catch (error) {
        console.error('Erro ao carregar sessão:', error);
        showAlert('Sessão expirada. Faça login novamente.', 'error');
        clearSession();
        showLogin();
    } finally {
        setLoading(false);
    }
}

// ================================
// LOGOUT
// ================================
export function handleLogout() {
    if (confirm('Deseja sair da sua conta?')) {
        clearSession();
        showAlert('Logout realizado com sucesso!', 'success');
        showLogin();
        if (loginForm) loginForm.reset();
    }
}

// ================================
// LIMPAR SESSÃO
// ================================
function clearSession() {
    // Limpar localStorage
    localStorage.removeItem('agendame_token');
    localStorage.removeItem('agendame_user');
    localStorage.removeItem('agendame_company');
    localStorage.removeItem('agendame_slug');
    localStorage.removeItem('agendame_company_info');
    localStorage.removeItem('business_name'); // ⭐⭐ LIMPAR TAMBÉM ⭐⭐

    // Limpar appState
    appState.token = null;
    appState.user = null;
    appState.company = null;
    appState.companySlug = null;
    appState.companyInfo = null;
    appState.services = [];
    appState.clients = [];
    appState.appointments = [];
    appState.todayAppointments = [];
}

// ================================
// UI STATES
// ================================
export function showLogin() {
    if (loginPage) loginPage.style.display = 'flex';
    if (dashboardPage) dashboardPage.style.display = 'none';
}

export function showDashboard() {
    if (loginPage) loginPage.style.display = 'none';
    if (dashboardPage) dashboardPage.style.display = 'block';
}

// ================================
// VERIFICAR AUTENTICAÇÃO
// ================================
export function isAuthenticated() {
    return !!appState.token && !!appState.user;
}

// ================================
// GETTERS
// ================================
export function getToken() {
    return appState.token;
}

export function getUser() {
    return appState.user;
}

export function getCompany() {
    return appState.company;
}

export function getCompanySlug() {
    return appState.companySlug;
}

export function getCompanyName() {
    // ⭐⭐ MÚLTIPLAS FORMAS DE PEGAR O NOME ⭐⭐
    return appState.company?.name ||
           appState.user?.name ||
           appState.user?.business_name ||
           localStorage.getItem('business_name') ||
           '';
}

// ================================
// FUNÇÃO ESPECÍFICA PARA PEGAR BUSINESS NAME
// ================================
export function getBusinessName() {
    // 1. Tenta do localStorage primeiro
    let businessName = localStorage.getItem('business_name');

    // 2. Se não tiver, tenta do appState
    if (!businessName) {
        businessName = appState.company?.name ||
                      appState.user?.name ||
                      appState.user?.business_name ||
                      'Minha Empresa';

        // Salva no localStorage para uso futuro
        if (businessName !== 'Minha Empresa') {
            localStorage.setItem('business_name', businessName);
        }
    }

    return businessName;
}

// ================================
// VALIDAR SESSÃO
// ================================
export function validateSession() {
    if (!isAuthenticated()) {
        showAlert('Sessão expirada. Faça login novamente.', 'error');
        clearSession();
        showLogin();
        return false;
    }
    return true;
}
