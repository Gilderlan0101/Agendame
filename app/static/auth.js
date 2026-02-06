// auth.js - Gerenciamento de autenticação

let currentUser = null;
let authToken = null;

// Configurações baseadas no ambiente
const IS_PRODUCTION = window.location.protocol === 'https:' || window.location.hostname !== 'localhost';
const API_BASE_URL = window.location.origin + '/'; // URL do backend

/**
 * Inicializa o sistema de autenticação
 */
window.initAuth = function() {
    console.log('🔐 Inicializando sistema de autenticação...');
    console.log(`🌍 Ambiente: ${IS_PRODUCTION ? 'Produção' : 'Desenvolvimento'}`);
    console.log(`🌐 API Base: ${API_BASE_URL}`);

    // Verificar se há token salvo
    authToken = getCookie('access_token') || localStorage.getItem('agendame_token');

    if (authToken) {
        console.log('📝 Token encontrado, verificando validade...');
        return validateTokenAndLoadUser();
    }

    console.log('📭 Nenhum token encontrado, usuário não autenticado');
    return Promise.resolve(false);
};

/**
 * Realiza login do usuário
 */
window.loginUser = async function(email, password) {
    console.log('🔐 Tentando login para:', email);

    try {
        // Mostrar loading
        showLoading(true);

        // Preparar dados do formulário
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        console.log('📤 Enviando requisição de login...');

        // Fazer requisição de login
        const response = await fetch(`${API_BASE_URL}auth/login`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            credentials: 'include',
        });

        console.log('📥 Resposta recebida:', response.status, response.statusText);

        if (!response.ok) {
            let errorMessage = 'Credenciais inválidas';

            try {
                // Tentar ler o corpo da resposta
                const text = await response.text();
                console.log('📄 Corpo da resposta (erro):', text);

                if (text) {
                    const errorData = JSON.parse(text);
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                }
            } catch (e) {
                console.log('❌ Não foi possível parsear JSON de erro:', e);
                if (response.status === 401) {
                    errorMessage = 'E-mail ou senha incorretos';
                } else if (response.status === 403) {
                    errorMessage = 'Conta desativada ou sem acesso';
                } else if (response.status === 404) {
                    errorMessage = 'Endpoint não encontrado. Verifique a URL.';
                } else if (response.status >= 500) {
                    errorMessage = 'Erro interno do servidor. Tente novamente.';
                }
            }

            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('✅ Dados recebidos do login:', data);
        localStorage.setItem('days_remaining', data.days_remaining || 0);


        // Salvar token (se vier na resposta)
        if (data.access_token) {
            authToken = data.access_token;
            saveToken(data.access_token);
            console.log('💾 Token salvo com sucesso');
        }

        if (data.is_trial) {
            localStorage.setItem('is_trial', '1');
            console.log('🎯 Conta trial detectada');
        }

        // Salvar dados básicos do usuário do login
        if (data.user_id && data.email) {
            currentUser = {
                id: data.user_id,
                email: data.email,
                username: data.username || data.email.split('@')[0],
                business_name: data.business_name || 'Minha Empresa',
                is_trial: data.is_trial || false,
                slug: data.slug || '',
                days_remaining: data.days_remaining || 0
            };



            localStorage.setItem('agendame_user', JSON.stringify(currentUser));
            localStorage.setItem('agendame_token', authToken);
            localStorage.setItem('user_id', currentUser.id);
            localStorage.setItem('days_remaining', currentUser.days_remaining || 0);
        }

        // Tentar carregar dados completos do usuário
        try {
            await loadUserData();
        } catch (loadError) {
            console.warn('⚠️ Não foi possível carregar dados completos, usando dados básicos:', loadError);
        }

        // Mostrar mensagem de sucesso
        showMessage('Login realizado com sucesso!', 'success');

        // Redirecionar para dashboard ou próxima URL
        redirectAfterLogin();

        return true;

    } catch (error) {
        console.error('🚨 Erro completo no login:', error);

        let userMessage = error.message;
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            userMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (error.message.includes('fetch')) {
            userMessage = 'Não foi possível conectar ao servidor.';
        }

        showMessage(userMessage, 'error');
        return false;

    } finally {
        showLoading(false);
    }
};

/**
 * Carrega dados COMPLETOS do usuário atual
 */
async function loadUserData() {
    try {
        console.log('👤 Carregando dados completos do usuário...');

        // Verificar se temos token
        if (!authToken) {
            console.warn('⚠️ Nenhum token disponível para carregar dados');
            throw new Error('Token não disponível');
        }

        const response = await fetch(`${API_BASE_URL}auth/me`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            credentials: 'include',
        });

        if (response.ok) {
            const userData = await response.json();
            console.log('✅ Dados completos do usuário carregados:', true);

            // Atualizar currentUser com dados completos
            currentUser = userData;

            // Atualizar localStorage com dados completos
            localStorage.setItem('agendame_user', JSON.stringify(currentUser));
            localStorage.setItem('is_trial', currentUser.is_trial ? '1' : '0');
            localStorage.setItem('id', currentUser.id);

            // Atualizar interface
            updateUserInterface();

            return currentUser;
        } else {
            const errorText = await response.text();
            console.warn('⚠️ Não foi possível carregar dados completos do usuário:', response.status, errorText);

            // Tentar usar dados básicos se disponíveis
            const storedUser = localStorage.getItem('agendame_user');
            if (storedUser) {
                currentUser = JSON.parse(storedUser);
                console.log('↩️ Usando dados básicos armazenados localmente');
                return currentUser;
            }

            throw new Error('Não foi possível carregar dados do usuário');
        }

    } catch (error) {
        console.error('🚨 Erro ao carregar dados do usuário:', error);
        throw error;
    }
}

/**
 * Atualiza a interface com dados do usuário
 */
function updateUserInterface() {
    try {
        if (!currentUser) {
            console.warn('⚠️ Nenhum usuário disponível para atualizar interface');
            return;
        }

        // Atualizar nome do usuário
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = currentUser.name || currentUser.username || currentUser.email || 'Usuário';
        }

        // Atualizar nome da empresa
        const userBusinessElement = document.getElementById('userBusiness');
        if (userBusinessElement) {
            userBusinessElement.textContent = currentUser.business_name || 'Agendame';
        }

        // Atualizar saudação no dashboard
        const userGreetingElement = document.getElementById('userGreeting');
        if (userGreetingElement) {
            userGreetingElement.textContent = currentUser.name || currentUser.username || 'Usuário';
        }

        // Mostrar/ocultar banner trial
        const trialBanner = document.getElementById('trialBanner');
        if (trialBanner) {
            const isTrial = currentUser.is_trial || localStorage.getItem('is_trial') === '1';
            trialBanner.style.display = isTrial ? 'block' : 'none';

            if (isTrial) {
                const trialDaysElement = document.getElementById('trialDays');
                if (trialDaysElement) {
                    trialDaysElement.textContent = currentUser.days_remaining ? `${currentUser.days_remaining} dias restantes` : '7 dias restantes';
                }
            }
        }

        console.log('✅ Interface atualizada com dados do usuário');

    } catch (error) {
        console.error('Erro ao atualizar interface:', error);
    }
}

/**
 * Valida o token e carrega usuário
 */
async function validateTokenAndLoadUser() {
    try {
        console.log('🔍 Validando token...');

        const response = await fetch(`${API_BASE_URL}auth/me`, {
            headers: {
                'Accept': 'application/json',
            },
            credentials: 'include',
        });

        console.log('🔐 Status da validação:', response.status);

        if (response.ok) {
            currentUser = await response.json();
            console.log('✅ Token válido, usuário:', currentUser.email);

            // Atualizar localStorage
            localStorage.setItem('agendame_user', JSON.stringify(currentUser));
            localStorage.setItem('agendame_token', authToken);

            // Atualizar interface
            updateUserInterface();

            return true;
        } else {
            console.warn('⚠️ Token inválido ou expirado:', response.status);
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
window.logoutUser = function() {
    console.log('🚪 Realizando logout...');

    // Mostrar loading
    showLogoutLoading(true);

    // Chamar API de logout
    fetch(`${API_BASE_URL}auth/logout`, {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        console.log('Logout API response:', response.status);

        // Limpar dados locais independentemente da resposta
        clearAuth();

        // Redirecionar para login
        setTimeout(() => {
            window.location.href = '/login?success=Logout realizado com sucesso';
        }, 500);
    })
    .catch(error => {
        console.error('Erro ao chamar API de logout:', error);

        // Mesmo com erro, limpar localmente e redirecionar
        clearAuth();
        window.location.href = '/login?error=Erro durante logout';
    })
    .finally(() => {
        showLogoutLoading(false);
    });
};

/**
 * Mostra loading durante logout
 */
function showLogoutLoading(show) {
    const logoutBtn = document.querySelector('[onclick*="logout"], [onclick*="Logout"]');
    if (logoutBtn) {
        logoutBtn.disabled = show;
        logoutBtn.innerHTML = show
            ? '<i class="fas fa-spinner fa-spin"></i> Saindo...'
            : '<i class="fas fa-sign-out-alt"></i> Sair';
    }
}

/**
 * Limpa todos os dados de autenticação
 */
function clearAuth() {
    console.log('🧹 Limpando dados de autenticação...');

    // Limpar cookies
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

        // Remover cookies relacionados a autenticação
        if (name.includes('token') || name.includes('auth') || name.includes('session')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
    }

    // Limpar localStorage
    const itemsToRemove = [
        'agendame_token',
        'agendame_user',
        'agendame_company',
        'agendame_slug',
        'business_name',
        'is_trial',
        'user_data',
        'auth_token',
        'refresh_token',
        'user_id',
        'days_remaining'
    ];

    itemsToRemove.forEach(item => {
        localStorage.removeItem(item);
    });

    // Limpar sessionStorage
    sessionStorage.clear();

    // Limpar variáveis
    currentUser = null;
    authToken = null;

    console.log('✅ Dados de autenticação limpos');
}

/**
 * Verifica se o usuário está autenticado
 */
window.isAuthenticated = function() {
    return !!authToken && !!currentUser;
};

/**
 * Obtém o usuário atual
 */
window.getUser = function() {
    return currentUser;
};

/**
 * Obtém o token atual
 */
window.getToken = function() {
    return authToken;
};

/**
 * Salva token no cookie e localStorage
 */
function saveToken(token) {
    console.log('💾 Salvando token...');

    // Salvar no cookie (para o middleware)
    const secure = IS_PRODUCTION;
    document.cookie = `access_token=${token}; path=/; max-age=3600; ${secure ? 'Secure; ' : ''}SameSite=Lax`;

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
        if (type === 'error') {
            alert(`Erro: ${message}`);
        } else if (type === 'success') {
            alert(`Sucesso: ${message}`);
        } else {
            alert(message);
        }
        return;
    }

    // Remover alertas anteriores do mesmo tipo
    const existingAlerts = alertContainer.querySelectorAll(`.alert-${type}`);
    existingAlerts.forEach(alert => {
        if (alert.parentElement === alertContainer) {
            alert.remove();
        }
    });

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <div class="alert-content">
            <i class="fas fa-${getIconForType(type)}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="alert-close">
                <i class="fas fa-times"></i>
            </button>
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

function getIconForType(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
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
window.protectRoute = function() {
    console.log('🛡️ Verificando proteção de rota...');
    console.log('📍 Caminho atual:', window.location.pathname);

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
};

/**
 * Inicializa formulário de login
 */
window.initLoginForm = function() {
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
    const success = urlParams.get('success');

    if (trialEmail) {
        document.getElementById('email').value = trialEmail;
        showMessage('✨ Conta trial criada com sucesso! Faça login para acessar.', 'success');
    }

    if (error) {
        showMessage(decodeURIComponent(error), 'error');
    }

    if (success) {
        showMessage(decodeURIComponent(success), 'success');
    }

    console.log('✅ Formulário de login inicializado');
};

/**
 * Inicializa botão de logout
 */
window.initLogoutButton = function() {
    // Botão por ID
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (confirm('Tem certeza que deseja sair?')) {
                logoutUser();
            }
        });
    }

    // Botões por classe
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Tem certeza que deseja sair?')) {
                logoutUser();
            }
        });
    });
};

/**
 * Função para alternar visibilidade da senha
 */
window.initPasswordToggle = function() {
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
};

/**
 * Testa a conexão com o servidor
 */
window.testConnection = async function() {
    try {
        console.log('📡 Testando conexão com o servidor...');
        const response = await fetch(`${API_BASE_URL}health`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Conexão OK:', data);
            return true;
        } else {
            console.warn('⚠️ Servidor respondeu mas com erro:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Não foi possível conectar ao servidor:', error);
        return false;
    }
};

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado, inicializando auth...');
    console.log('🌐 URL atual:', window.location.href);

    // Testar conexão primeiro
    testConnection().then(isConnected => {
        if (!isConnected) {
            console.warn('⚠️ Cuidado: Problemas de conexão detectados');
            showMessage('Problemas de conexão com o servidor. Verifique sua internet.', 'warning');
        }
    });

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
        }).catch(error => {
            console.error('❌ Erro na inicialização da autenticação:', error);
            protectRoute();
        });
    }
});

// Exportar funções para uso global
window.AgendameAuth = {
    login: loginUser,
    logout: logoutUser,
    isAuthenticated: isAuthenticated,
    getUser: getUser,
    getToken: getToken,
    protectRoute: protectRoute,
    testConnection: testConnection
};
