// main.js - Arquivo principal CORRIGIDO

// ================================
// IMPORTAÇÕES SIMPLIFICADAS
// ================================

// Importações essenciais
import { appState } from './appState.js';
import { closeModal, debounce, setLoading, showAlert } from './utils.js';

// Lazy imports para módulos pesados
let homeModule = null;
let appointmentsModule = null;
let servicesModule = null;
let clientsModule = null;
let companyModule = null;

// ================================
// CONSTANTES E VARIÁVEIS GLOBAIS
// ================================

let isInitialized = false;
let eventListenersSetup = false;
let loadControllers = {};
const INITIAL_LOAD_DELAY = 100; // ms para initial load

// Observer para lazy loading de tabs
let tabObserver = null;

// ================================
// AUTENTICAÇÃO SIMPLIFICADA
// ================================

/**
 * Verifica autenticação de forma direta
 */
function isAuthenticated() {
    const token = localStorage.getItem('agendame_token') || localStorage.getItem('access_token');
    const user = localStorage.getItem('agendame_user');
    return !!(token && user);
}

/**
 * Protege rotas que requerem autenticação
 */
function protectRoute() {
    const token = localStorage.getItem('agendame_token');
    const isLoginPage = window.location.pathname.includes('/login');

    if (!token && !isLoginPage) {
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `/login?next=${encodeURIComponent(currentPath)}`;
        return false;
    }

    if (token && isLoginPage) {
        window.location.href = '/agendame/dashboard';
        return false;
    }

    return true;
}

/**
 * Inicializa sistema de autenticação SIMPLES
 */
async function initAuth() {
    console.log('🔐 Verificando autenticação...');

    const token = localStorage.getItem('agendame_token');
    if (!token) {
        console.log('📭 Nenhum token encontrado');
        return false;
    }

    // Se temos token, carregar usuário do localStorage
    try {
        const userData = localStorage.getItem('agendame_user');
        if (userData) {
            appState.user = JSON.parse(userData);
            console.log('✅ Usuário autenticado:', appState.user.email);

            // Atualizar UI básica
            updateUserInterface();

            return true;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar usuário:', error);
    }

    return false;
}

/**
 * Atualiza interface do usuário
 */
function updateUserInterface() {
    try {
        if (!appState.user) return;

        // Atualizar nome do usuário
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = appState.user.name ||
                                         appState.user.username ||
                                         appState.user.email ||
                                         'Usuário';
        }

        // Atualizar nome da empresa
        const userBusinessElement = document.getElementById('userBusiness');
        if (userBusinessElement) {
            userBusinessElement.textContent = appState.user.business_name || 'Agendame';
        }

        // Atualizar saudação no dashboard
        const userGreetingElement = document.getElementById('userGreeting');
        if (userGreetingElement) {
            userGreetingElement.textContent = appState.user.name ||
                                             appState.user.username ||
                                             'Usuário';
        }

        // Mostrar/ocultar banner trial
        const trialBanner = document.getElementById('trialBanner');
        if (trialBanner) {
            const isTrial = appState.user.is_trial || localStorage.getItem('is_trial') === '1';
            trialBanner.style.display = isTrial ? 'block' : 'none';

            if (isTrial) {
                const trialDaysElement = document.getElementById('trialDays');
                if (trialDaysElement) {
                    trialDaysElement.textContent = appState.user.days_remaining ?
                        `${appState.user.days_remaining} dias restantes` :
                        '7 dias restantes';
                }
            }
        }

    } catch (error) {
        console.error('Erro ao atualizar interface:', error);
    }
}

// ================================
// INICIALIZAÇÃO SIMPLIFICADA
// ================================

/**
 * Inicializa a aplicação
 */
async function initializeApp() {
    if (isInitialized) return;

    console.time('🚀 Inicialização completa');

    // Verificar autenticação
    if (!isAuthenticated()) {
        protectRoute();
        return;
    }

    // Configurar token
    appState.token = localStorage.getItem('agendame_token');

    // Configurar listeners
    setupOptimizedEventListeners();

    // Carregar dados críticos
    await loadCriticalData();

    // Marcar como inicializado
    isInitialized = true;

    console.timeEnd('🚀 Inicialização completa');
}

/**
 * Carrega dados críticos
 */
async function loadCriticalData() {
    // Mostrar loading se necessário
    const shouldShowLoading = document.querySelector('#loadingOverlay')?.style.display === 'none';
    if (shouldShowLoading) setLoading(true);

    try {
        // 1. Dashboard (prioridade máxima)
        await loadAndInitDashboard();

        // 2. Dados essenciais
        await Promise.race([
            loadEssentialData(),
            new Promise(resolve => setTimeout(resolve, 3000))
        ]);

    } finally {
        if (shouldShowLoading) setLoading(false);
    }
}

/**
 * Carrega e inicializa dashboard
 */
async function loadAndInitDashboard() {
    if (!homeModule) {
        homeModule = await import('./home.js');
    }

    // Inicializar dashboard
    homeModule.initDashboard();

    // Atualizar contadores
    if (homeModule.updateAllCounts) {
        setTimeout(() => {
            homeModule.updateAllCounts();
        }, 100);
    }
}

/**
 * Carrega dados essenciais
 */
async function loadEssentialData() {
    const promises = [];

    // Serviços
    promises.push(loadServicesData());

    // Agendamentos de hoje
    promises.push(loadTodaysAppointments());

    // Executar
    await Promise.allSettled(promises);
}

/**
 * Carrega serviços
 */
async function loadServicesData() {
    if (!servicesModule) {
        servicesModule = await import('./services.js');
    }

    // Verificar cache
    if (appState.services && appState.services.length > 0) {
        return appState.services;
    }

    return servicesModule.loadServices();
}

/**
 * Carrega apenas agendamentos de hoje
 */
async function loadTodaysAppointments() {
    if (!appointmentsModule) {
        appointmentsModule = await import('./appointments.js');
    }

    const today = new Date().toISOString().split('T')[0];
    return appointmentsModule.loadAppointments({ date: today });
}

// ================================
// CONFIGURAÇÃO DE EVENTOS
// ================================

/**
 * Configura event listeners
 */
function setupOptimizedEventListeners() {
    if (eventListenersSetup) return;

    // Event delegation
    document.addEventListener('click', handleDocumentClick, { passive: true });
    document.addEventListener('change', handleDocumentChange, { passive: true });
    document.addEventListener('submit', handleDocumentSubmit, { passive: true });

    // Configurar observer para tabs
    setupTabObserver();

    eventListenersSetup = true;
}

/**
 * Observer para tabs
 */
function setupTabObserver() {
    const tabContents = document.querySelectorAll('.tab-content');

    tabObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const tabId = entry.target.id.replace('Tab', '');
                loadTabOnDemand(tabId);
                tabObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    tabContents.forEach(tab => {
        if (!tab.classList.contains('active')) {
            tabObserver.observe(tab);
        }
    });
}

/**
 * Carrega dados da tab sob demanda
 */
async function loadTabOnDemand(tabId) {
    // Cancelar load anterior
    if (loadControllers[tabId]) {
        loadControllers[tabId].abort();
    }

    const controller = new AbortController();
    loadControllers[tabId] = controller;

    try {
        switch(tabId) {
            case 'appointments':
                const appointmentsMod = await import('./appointments.js');
                await appointmentsMod.loadAppointments();
                break;

            case 'services':
                // Já carregado
                break;

            case 'clients':
                const clientsMod = await import('./clients.js');
                await clientsMod.loadClients();
                break;

            case 'company':
                const companyMod = await import('./company.js');
                await companyMod.loadCompanyData();
                if (companyMod.initCompanyTab) {
                    companyMod.initCompanyTab();
                }
                break;
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.warn(`Erro ao carregar tab ${tabId}:`, error);
        }
    } finally {
        if (loadControllers[tabId] === controller) {
            delete loadControllers[tabId];
        }
    }
}

/**
 * Manipulador de clicks
 */
function handleDocumentClick(e) {
    const target = e.target;

    // Tabs
    if (target.closest('.tab-btn')) {
        const tabBtn = target.closest('.tab-btn');
        const tabId = tabBtn?.dataset?.tab;
        if (tabId) {
            e.preventDefault();
            switchTabOptimized(tabId);
        }
        return;
    }

    // Fechar modal
    if (target.classList.contains('modal')) {
        target.classList.remove('show');
        return;
    }

    // Botão de logout
    if (target.closest('#logoutBtn') || target.closest('[onclick*="logout"]')) {
        e.preventDefault();
        handleLogout();
        return;
    }
}

/**
 * Manipulador de mudanças
 */
function handleDocumentChange(e) {
    const target = e.target;

    // Filtro de data
    if (target.id === 'appointmentDateFilter') {
        debouncedLoadAppointments({ date: target.value });
    }
}

/**
 * Manipulador de submits
 */
function handleDocumentSubmit(e) {
    e.preventDefault();
    const form = e.target;

    switch(form.id) {
        case 'newServiceForm':
            handleNewServiceSubmit(form);
            break;
        case 'newAppointmentForm':
            handleNewAppointmentSubmit(form);
            break;
    }
}

/**
 * Handler para logout
 */
async function handleLogout() {
    if (!confirm('🚪 Deseja sair da sua conta?')) return;

    try {
        const API_BASE_URL = window.location.origin + '/';
        await fetch(`${API_BASE_URL}auth/logout`, {
            method: 'GET',
            credentials: 'include'
        });
    } catch (error) {
        console.warn('⚠️ Erro na chamada de logout:', error);
    } finally {
        // Limpar localStorage
        const items = [
            'agendame_token',
            'agendame_user',
            'access_token',
            'user_id',
            'email',
            'business_name',
            'slug',
            'is_trial',
            'days_remaining'
        ];

        items.forEach(item => localStorage.removeItem(item));

        // Limpar cookies
        document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });

        // Redirecionar para login
        setTimeout(() => {
            window.location.href = '/login';
        }, 500);
    }
}

// ================================
// FUNÇÕES DE INTERFACE
// ================================

/**
 * Alterna entre tabs
 */
function switchTabOptimized(tabId) {
    if (!tabId) return;

    // Botões
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Conteúdo
    document.querySelectorAll('.tab-content').forEach(content => {
        const isActive = content.id === `${tabId}Tab`;
        content.classList.toggle('active', isActive);

        // Parar observer para tab ativa
        if (isActive && tabObserver) {
            tabObserver.unobserve(content);
        }
    });

    // Carregar dados da tab
    setTimeout(() => {
        loadTabOnDemand(tabId).catch(() => {});
    }, 50);
}

/**
 * Handler para novo serviço
 */
async function handleNewServiceSubmit(form) {
    if (!servicesModule) {
        servicesModule = await import('./services.js');
    }

    const formData = new FormData(form);
    const serviceData = Object.fromEntries(formData.entries());

    try {
        await servicesModule.saveNewService(serviceData);
        form.reset();
        closeModal('newServiceModal');
        showAlert('✅ Serviço criado com sucesso!', 'success');
    } catch (error) {
        showAlert('❌ Erro ao criar serviço', 'error');
    }
}

/**
 * Handler para novo agendamento
 */
async function handleNewAppointmentSubmit(form) {
    if (!appointmentsModule) {
        appointmentsModule = await import('./appointments.js');
    }

    const formData = new FormData(form);
    const appointmentData = Object.fromEntries(formData.entries());

    try {
        await appointmentsModule.saveNewAppointment(appointmentData);
        form.reset();
        closeModal('newAppointmentModal');
        showAlert('✅ Agendamento criado com sucesso!', 'success');
    } catch (error) {
        showAlert('❌ Erro ao criar agendamento', 'error');
    }
}

/**
 * Atualiza dados com debounce
 */
const debouncedRefreshData = debounce(async function refreshData() {
    try {
        // Atualizar apenas dados visíveis
        const activeTab = document.querySelector('.tab-content.active')?.id.replace('Tab', '');

        const updates = [];

        // Dashboard sempre
        if (homeModule?.refreshDashboard) {
            updates.push(homeModule.refreshDashboard());
        }

        // Dados da tab ativa
        switch(activeTab) {
            case 'appointments':
                updates.push(loadAllAppointments());
                break;
            case 'services':
                updates.push(loadServicesData());
                break;
            case 'clients':
                updates.push(loadAllClients());
                break;
        }

        await Promise.allSettled(updates);
        showAlert('✅ Dados atualizados!', 'success', 3000);

    } catch (error) {
        showAlert('⚠️ Erro ao atualizar dados', 'warning', 3000);
    }
}, 500);

// ================================
// FUNÇÕES AUXILIARES
// ================================

/**
 * Carrega todos os agendamentos
 */
async function loadAllAppointments() {
    if (!appointmentsModule) {
        appointmentsModule = await import('./appointments.js');
    }
    return appointmentsModule.loadAppointments();
}

/**
 * Carrega todos os clientes
 */
async function loadAllClients() {
    if (!clientsModule) {
        clientsModule = await import('./clients.js');
    }
    return clientsModule.loadClients();
}

// Debounce para carregar agendamentos
const debouncedLoadAppointments = debounce((filters) => {
    if (appointmentsModule?.loadAppointments) {
        appointmentsModule.loadAppointments(filters);
    }
}, 300);

// ================================
// INICIALIZAÇÃO PRINCIPAL
// ================================

/**
 * Inicialização principal
 */
async function initialize() {
    // Verificar se estamos na página correta
    if (!window.location.pathname.includes('/agendame/dashboard')) {
        return;
    }

    // Configurar data filter
    const dateFilter = document.getElementById('appointmentDateFilter');
    if (dateFilter) {
        dateFilter.valueAsDate = new Date();
    }

    // Configurar nome do usuário
    const userData = localStorage.getItem('agendame_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const nameElement = document.getElementById('userName');
            if (nameElement) {
                nameElement.textContent = user.name || user.username || user.email || 'Usuário';
            }
        } catch (e) {
            console.error('Erro ao carregar dados do usuário:', e);
        }
    }

    try {
        // Inicializar auth
        const isAuth = await initAuth();

        if (isAuth) {
            // Inicializar app
            setTimeout(() => {
                initializeApp().catch(console.error);
            }, INITIAL_LOAD_DELAY);
        } else {
            // Redirecionar se não autenticado
            protectRoute();
        }
    } catch (error) {
        console.error('Erro crítico na inicialização:', error);
        showAlert('❌ Erro ao carregar aplicação', 'error');
    }
}

// ================================
// MANIPULADOR DE ERROS
// ================================

window.addEventListener('error', (e) => {
    console.error('💥 Erro:', e.error?.message || e.message);
}, false);

window.addEventListener('unhandledrejection', (e) => {
    console.error('💥 Promise rejeitada:', e.reason);
}, false);

// ================================
// INICIALIZAÇÃO COM PRIORIDADE
// ================================

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    setTimeout(initialize, 0);
}

// ================================
// EXPORTAÇÕES PARA ESCOPO GLOBAL
// ================================

// Funções globais
window.switchTab = switchTabOptimized;
window.refreshData = debouncedRefreshData;
window.closeModal = closeModal;
window.showAlert = showAlert;

// Funções de modal
window.openNewServiceModal = async function() {
    if (!servicesModule) {
        servicesModule = await import('./services.js');
    }

    if (servicesModule.openNewServiceModal) {
        servicesModule.openNewServiceModal();
    }
};

window.openNewAppointmentModal = async function() {
    if (!appointmentsModule) {
        appointmentsModule = await import('./appointments.js');
    }

    if (appointmentsModule.openNewAppointmentModal) {
        appointmentsModule.openNewAppointmentModal();
    }
};

// Cleanup ao sair da página
window.addEventListener('beforeunload', () => {
    // Abortar todos os controllers pendentes
    Object.values(loadControllers).forEach(controller => {
        if (controller && typeof controller.abort === 'function') {
            controller.abort();
        }
    });

    // Limpar observer
    if (tabObserver) {
        tabObserver.disconnect();
    }
});
