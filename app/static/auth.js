// auth.js - Gerenciamento de autenticação

let currentUser = null;
let authToken = null;

/**
 * Inicializa o sistema de autenticação
 */
export function initAuth() {
    console.log('🔐 Inicializando sistema de autenticação...');

    // Verificar se há token salvo
    authToken = getCookie('access_token') || localStorage.getItem('agendame_token');

    if (authToken) {
        console.log('📝 Token encontrado, verificando validade...');
        return validateTokenAndLoadUser();
    }

    console.log('📭 Nenhum token encontrado, usuário não autenticado');
    return Promise.resolve(false);
}

/**
 * Realiza login do usuário
 */
export async function loginUser(email, password) {
    console.log('🔐 Tentando login para:', email);

    try {
        // Mostrar loading
        showLoading(true);

        // Preparar dados do formulário no formato OAuth2
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        // Fazer requisição de login
        const response = await fetch('/auth/login', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            let errorMessage = 'Credenciais inválidas';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
            } catch (e) {
                // Se não conseguir parsear JSON, usar status
                if (response.status === 401) {
                    errorMessage = 'E-mail ou senha incorretos';
                } else if (response.status === 403) {
                    errorMessage = 'Conta desativada ou sem acesso';
                }
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();

        // Salvar token (se vier na resposta)
        if (data.access_token) {
            authToken = data.access_token;
            saveToken(data.access_token);
        }

        if (data.is_trial){
            localStorage.setItem('is_trial', '1');
        }

        // Carregar informações do usuário
        await loadUserData();

        // Mostrar mensagem de sucesso
        showMessage('Login realizado com sucesso!', 'success');

        // Redirecionar para dashboard ou próxima URL
        redirectAfterLogin();

        return true;

    } catch (error) {
        console.error('🚨 Erro no login:', error);
        showMessage(error.message || 'Erro ao realizar login', 'error');
        return false;

    } finally {
        showLoading(false);
    }
}

/**
 * Carrega dados do usuário atual
 */
async function loadUserData() {
    try {
        console.log('👤 Carregando dados do usuário...');

        const response = await fetch('/auth/me', {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            currentUser = await response.json();
            console.log('✅ Dados do usuário carregados:', currentUser);

            // Salvar no localStorage para persistência
            localStorage.setItem('agendame_user', JSON.stringify(currentUser));
            localStorage.setItem('agendame_token', authToken);
            localStorage.setItem('is_trial', currentUser.is_trial ? '1' : '0');

            return currentUser;
        } else {
            console.warn('⚠️ Não foi possível carregar dados do usuário');
            currentUser = {
                email: 'usuario@exemplo.com',
                name: 'Usuário'
            };
            return currentUser;
        }

    } catch (error) {
        console.error('🚨 Erro ao carregar dados do usuário:', error);
        // Criar usuário básico em caso de erro
        currentUser = {
            email: 'usuario@exemplo.com',
            name: 'Usuário'
        };
        return currentUser;
    }
}

/**
 * Valida o token e carrega usuário
 */
async function validateTokenAndLoadUser() {
    try {
        console.log('🔍 Validando token...');

        const response = await fetch('/auth/me', {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            currentUser = await response.json();
            console.log('✅ Token válido, usuário:', currentUser.email);

            // Atualizar localStorage
            localStorage.setItem('agendame_user', JSON.stringify(currentUser));
            localStorage.setItem('agendame_token', authToken);

            return true;
        } else {
            console.warn('⚠️ Token inválido ou expirado');
            clearAuth();
            return false;
        }

    } catch (error) {
        console.error('🚨 Erro ao validar token:', error);
        clearAuth();
        return false;
    }
}

/**
 * Realiza logout
 */
export function logoutUser() {
    console.log('🚪 Realizando logout...');

    // Chamar API de logout
    fetch('/auth/logout', {
        method: 'GET',
        credentials: 'include'
    }).catch(error => {
        console.error('Erro ao chamar API de logout:', error);
    });

    // Limpar dados locais
    clearAuth();

    // Redirecionar para login
    window.location.href = '/login';
}

/**
 * Limpa todos os dados de autenticação
 */
function clearAuth() {
    console.log('🧹 Limpando dados de autenticação...');

    // Limpar cookies
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // Limpar localStorage
    localStorage.removeItem('agendame_token');
    localStorage.removeItem('agendame_user');
    localStorage.removeItem('agendame_company');
    localStorage.removeItem('agendame_slug');
    localStorage.removeItem('business_name');

    // Limpar variáveis
    currentUser = null;
    authToken = null;
}

/**
 * Verifica se o usuário está autenticado
 */
export function isAuthenticated() {
    return !!authToken && !!currentUser;
}

/**
 * Obtém o usuário atual
 */
export function getUser() {
    return currentUser;
}

/**
 * Obtém o token atual
 */
export function getToken() {
    return authToken;
}

/**
 * Salva token no cookie e localStorage
 */
function saveToken(token) {
    console.log('💾 Salvando token...');

    // Salvar no cookie (para o middleware)
    document.cookie = `access_token=${token}; path=/; max-age=3600; SameSite=Lax`;

    // Salvar no localStorage (para o frontend)
    localStorage.setItem('agendame_token', token);
    authToken = token;
}

/**
 * Obtém cookie por nome
 */
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

/**
 * Redireciona após login bem-sucedido
 */
function redirectAfterLogin() {
    const urlParams = new URLSearchParams(window.location.search);
    const nextUrl = urlParams.get('next') || '/agendame/dashboard';

    console.log(`🔄 Redirecionando para: ${nextUrl}`);

    // Pequeno delay para mostrar mensagem de sucesso
    setTimeout(() => {
        window.location.href = nextUrl;
    }, 1500);
}

/**
 * Mostra mensagem na interface
 */
function showMessage(message, type = 'info') {
    console.log(`📢 ${type}: ${message}`);

    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        console.warn('Container de alertas não encontrado');
        alert(message); // Fallback
        return;
    }

    // Remover alertas anteriores
    const existingAlerts = alertContainer.querySelectorAll('.alert');
    existingAlerts.forEach(alert => {
        if (alert.parentElement === alertContainer) {
            alert.remove();
        }
    });

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <div class="alert-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    alertContainer.appendChild(alertDiv);

    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (alertDiv.parentElement === alertContainer) {
            alertDiv.remove();
        }
    }, 5000);
}

/**
 * Mostra/oculta loading
 */
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loginBtn = document.getElementById('loginBtn');

    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    if (loginBtn) {
        loginBtn.disabled = show;
        loginBtn.innerHTML = show
            ? '<i class="fas fa-spinner fa-spin"></i> Autenticando...'
            : '<i class="fas fa-sign-in-alt"></i> Entrar na Conta';
    }
}

/**
 * Protege rotas que requerem autenticação
 */
export function protectRoute() {
    console.log('🛡️ Verificando proteção de rota...');

    // Se não estiver autenticado e não estiver na página de login
    if (!isAuthenticated() && !window.location.pathname.includes('/login')) {
        console.log('🔒 Acesso negado, redirecionando para login...');

        // Salvar a URL atual para redirecionar após login
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `/login?next=${encodeURIComponent(currentPath)}`;
        return false;
    }

    // Se estiver na página de login mas já autenticado, redirecionar para dashboard
    if (isAuthenticated() && window.location.pathname.includes('/login')) {
        console.log('✅ Já autenticado, redirecionando para dashboard...');
        window.location.href = '/agendame/dashboard';
        return false;
    }

    return true;
}

/**
 * Inicializa formulário de login
 */
export function initLoginForm() {
    console.log('📝 Inicializando formulário de login...');

    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.error('❌ Formulário de login não encontrado!');
        return;
    }

    // Configurar submit do formulário
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showMessage('Por favor, preencha todos os campos', 'warning');
            return;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showMessage('Por favor, insira um email válido', 'warning');
            return;
        }

        // Tentar login
        await loginUser(email, password);
    });

    // Preencher email de trial se veio do registro
    const urlParams = new URLSearchParams(window.location.search);
    const trialEmail = urlParams.get('email');
    const error = urlParams.get('error');

    if (trialEmail) {
        document.getElementById('email').value = trialEmail;
        showMessage('✨ Conta trial criada com sucesso! Faça login para acessar.', 'success');
    }

    if (error) {
        showMessage(decodeURIComponent(error), 'error');
    }

    console.log('✅ Formulário de login inicializado');
}

/**
 * Inicializa botão de logout
 */
export function initLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();

            if (confirm('Tem certeza que deseja sair?')) {
                logoutUser();
            }
        });
    }
}

/**
 * Função para alternar visibilidade da senha
 */
export function initPasswordToggle() {
    const toggleBtn = document.querySelector('.toggle-password');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const icon = this.querySelector('i');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    }
}

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado, inicializando auth...');

    // Inicializar funcionalidades do login
    if (window.location.pathname.includes('/login')) {
        initLoginForm();
        initPasswordToggle();
    }

    // Inicializar botão de logout se existir
    initLogoutButton();

    // Verificar autenticação para páginas protegidas
    if (window.location.pathname.includes('/agendame/')) {
        initAuth().then(isValid => {
            if (!isValid) {
                console.log('❌ Autenticação falhou, redirecionando...');
                protectRoute();
            } else {
                console.log('✅ Usuário autenticado, permitindo acesso');
            }
        });
    }
});

// Exportar funções para uso global
window.AgendameAuth = {
    login: loginUser,
    logout: logoutUser,
    isAuthenticated,
    getUser,
    getToken,
    protectRoute
};
