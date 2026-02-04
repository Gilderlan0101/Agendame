// logout.js - Gerenciamento de logout

/**
 * Realiza logout do usuário
 */
export async function logoutUser() {
    console.log('🚪 Iniciando logout...');

    try {
        // Mostrar loading/confirmação
        showLogoutConfirmation();

        // Chamar API de logout
        const response = await fetch('https://agendame.onrender.com/auth/logout', {
            method: 'GET',
            credentials: 'include', // Importante para enviar cookies
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        console.log('Logout response status:', response.status);

        if (response.ok || response.redirected) {
            // Limpar dados locais mesmo se a resposta não for perfeita
            clearLocalStorage();

            // Redirecionar para login após um breve delay
            setTimeout(() => {
                window.location.href = '/login?success=Logout realizado com sucesso';
            }, 500);

            return true;
        } else {
            // Se a API falhar, ainda tenta limpar localmente
            console.warn('API de logout falhou, limpando localmente...');
            clearLocalStorage();
            window.location.href = '/login';
            return false;
        }

    } catch (error) {
        console.error('Erro durante logout:', error);

        // Fallback: limpar tudo localmente e redirecionar
        clearLocalStorage();
        window.location.href = '/login?error=Erro ao fazer logout';
        return false;
    }
}

/**
 * Limpa todos os dados de autenticação do localStorage
 */
function clearLocalStorage() {
    console.log('🧹 Limpando localStorage...');

    const itemsToRemove = [
        'agendame_token',
        'agendame_user',
        'agendame_company',
        'agendame_slug',
        'business_name',
        'user_data',
        'auth_token',
        'is_trial',
        'trial_days',
        'user_session'
    ];

    itemsToRemove.forEach(item => {
        localStorage.removeItem(item);
    });

    // Limpar sessionStorage também
    sessionStorage.clear();

    console.log('✅ localStorage limpo');
}

/**
 * Mostra confirmação de logout
 */
function showLogoutConfirmation() {
    // Você pode implementar um modal de confirmação aqui
    // Por enquanto, apenas log
    console.log('🔐 Confirmando logout...');
}

/**
 * Mostra loading durante logout
 */
function showLogoutLoading(show = true) {
    const logoutBtn = document.querySelector('[onclick*="logout"]');
    if (logoutBtn) {
        logoutBtn.disabled = show;
        if (show) {
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saindo...';
        } else {
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sair';
        }
    }
}

/**
 * Inicializa botões de logout na página
 */
export function initLogoutButtons() {
    console.log('🔘 Inicializando botões de logout...');

    // Botão do dropdown
    const logoutBtn = document.querySelector('[onclick*="handleLogout"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();

            // Confirmar logout
            if (confirm('Tem certeza que deseja sair?')) {
                showLogoutLoading(true);
                await logoutUser();
                showLogoutLoading(false);
            }
        });
    }

    // Qualquer outro botão com classe .logout-btn
    document.querySelectorAll('.logout-btn, [data-action="logout"]').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            await logoutUser();
        });
    });

    console.log('✅ Botões de logout inicializados');
}

/**
 * Função global para ser chamada do HTML
 */
window.handleLogout = async function() {
    console.log('🖱️ Botão de logout clicado');

    // Verifica se está em uma página de agendamento
    if (window.location.pathname.includes('https://agendame.onrender.com/agendame/')) {
        // Mostra confirmação
        const confirmed = confirm('Tem certeza que deseja sair? Você será redirecionado para a página de login.');

        if (confirmed) {
            await logoutUser();
        }
    } else {
        // Para outras páginas, logout direto
        await logoutUser();
    }
};

/**
 * Logout automático por inatividade (opcional)
 */
export function initInactivityLogout() {
    let inactivityTimer;
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos

    function resetTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            console.log('⏰ Logout automático por inatividade');
            showInactivityWarning();
        }, INACTIVITY_TIMEOUT);
    }

    function showInactivityWarning() {
        // Modal de aviso
        const warningModal = document.createElement('div');
        warningModal.className = 'inactivity-warning';
        warningModal.innerHTML = `
            <div class="warning-content">
                <h3><i class="fas fa-clock"></i> Sessão expirando</h3>
                <p>Sua sessão ficou inativa por muito tempo.</p>
                <p>Você será desconectado em <span id="countdown">60</span> segundos.</p>
                <div class="warning-actions">
                    <button id="stayLoggedIn" class="btn btn-primary">
                        <i class="fas fa-sync"></i> Manter conectado
                    </button>
                    <button id="logoutNow" class="btn btn-secondary">
                        <i class="fas fa-sign-out-alt"></i> Sair agora
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(warningModal);

        let seconds = 60;
        const countdown = setInterval(() => {
            seconds--;
            document.getElementById('countdown').textContent = seconds;

            if (seconds <= 0) {
                clearInterval(countdown);
                logoutUser();
            }
        }, 1000);

        document.getElementById('stayLoggedIn').addEventListener('click', () => {
            clearInterval(countdown);
            warningModal.remove();
            resetTimer();
        });

        document.getElementById('logoutNow').addEventListener('click', () => {
            clearInterval(countdown);
            warningModal.remove();
            logoutUser();
        });
    }

    // Eventos que resetam o timer
    const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
    events.forEach(event => {
        document.addEventListener(event, resetTimer);
    });

    // Iniciar timer
    resetTimer();

    console.log('⏰ Monitor de inatividade iniciado');
}

/**
 * Verifica se o token expirou
 */
export async function checkTokenExpiration() {
    const token = localStorage.getItem('agendame_token');
    if (!token) return false;

    try {
        // Verificar token no backend
        const response = await fetch('https://agendame.onrender.com/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            // Token inválido ou expirado
            console.warn('Token expirado ou inválido, fazendo logout...');
            clearLocalStorage();
            window.location.href = '/login?error=Sessão expirada';
            return false;
        }

        return true;
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        return false;
    }
}

/**
 * Inicializa sistema de logout
 */
export function initLogoutSystem() {
    console.log('🔐 Inicializando sistema de logout...');

    // Inicializar botões
    initLogoutButtons();

    // Verificar token periodicamente (a cada 5 minutos)
    setInterval(checkTokenExpiration, 5 * 60 * 1000);

    // Logout automático por inatividade (opcional)
    // initInactivityLogout();

    console.log('✅ Sistema de logout inicializado');
}

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('/agendame/')) {
        initLogoutSystem();
    }
});

// Exportar para uso global
window.LogoutManager = {
    logout: logoutUser,
    init: initLogoutSystem,
    checkToken: checkTokenExpiration
};
