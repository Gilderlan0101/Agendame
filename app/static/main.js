// main.js - Arquivo principal otimizado para performance máxima

// ================================
// IMPORTAÇÕES OTIMIZADAS (lazy loading)
// ================================

// Importações imediatas (essenciais)
import { appState } from './appState.js';
import { closeModal, debounce, setLoading, showAlert } from './utils.js';

// Lazy imports para módulos pesados
let authModule = null;
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
const INITIAL_LOAD_DELAY = 50; // ms para initial load

// Observer para lazy loading de tabs
let tabObserver = null;

// ================================
// INICIALIZAÇÃO ULTRA OTIMIZADA
// ================================

/**
 * Inicializa a aplicação com carregamento prioritário
 */
async function initializeApp() {
    if (isInitialized) return;

    console.time('🚀 Inicialização completa');

    // Verificar autenticação de forma não-bloqueante
    const auth = await loadAuthModule();
    if (!auth.isAuthenticated()) {
        auth.protectRoute();
        return;
    }

    // Configurar dados básicos do usuário
    const user = auth.getUser();
    appState.user = user;
    appState.token = localStorage.getItem('agendame_token');

    // Configurar listeners otimizados
    setupOptimizedEventListeners();

    // Carregar dados de forma incremental
    await loadCriticalData();

    // Marcar como inicializado
    isInitialized = true;

    console.timeEnd('🚀 Inicialização completa');
}

/**
 * Carrega módulo de auth sob demanda
 */
async function loadAuthModule() {
    if (!authModule) {
        authModule = await import('./auth.js');
    }
    return authModule;
}

/**
 * Carrega dados críticos (prioridade máxima)
 */
async function loadCriticalData() {
    // Mostrar apenas loading se necessário (evitar flicker)
    const shouldShowLoading = document.querySelector('#loadingOverlay')?.style.display === 'none';
    if (shouldShowLoading) setLoading(true);

    try {
        // 1. Dashboard (prioridade máxima)
        await loadAndInitDashboard();

        // 2. Dados essenciais em paralelo (mas com limite)
        await Promise.race([
            loadEssentialData(),
            new Promise(resolve => setTimeout(resolve, 3000)) // Timeout de segurança
        ]);

        // 3. Dados secundários (lazy)
        setTimeout(() => {
            loadSecondaryData().catch(() => {});
        }, 100);

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

    // Inicializar dashboard de forma não-bloqueante
    requestAnimationFrame(() => {
        homeModule.initDashboard();

        // Atualizar contadores após microtask
        Promise.resolve().then(() => {
            if (homeModule.updateAllCounts) {
                homeModule.updateAllCounts();
            }
        });
    });
}

/**
 * Carrega dados essenciais com limite de concorrência
 */
async function loadEssentialData() {
    // Limitar a 2 requisições simultâneas
    const queue = [];

    // Serviços (alto impacto no UI)
    queue.push(loadServicesData());

    // Agendamentos de hoje (crítico)
    queue.push(loadTodaysAppointments());

    // Executar com concorrência controlada
    await executeWithConcurrency(queue, 2);
}

/**
 * Carrega dados secundários (baixa prioridade)
 */
async function loadSecondaryData() {
    // Usar requestIdleCallback para baixa prioridade
    if ('requestIdleCallback' in window) {
        requestIdleCallback(async () => {
            await Promise.allSettled([
                loadAllAppointments(),
                loadAllClients(),
                loadCompanyDataLazy()
            ]);
        });
    } else {
        // Fallback para navegadores antigos
        setTimeout(async () => {
            await Promise.allSettled([
                loadAllAppointments(),
                loadAllClients()
            ]);
        }, 1000);
    }
}

/**
 * Executa promises com limite de concorrência
 */
async function executeWithConcurrency(promises, maxConcurrent = 3) {
    const results = [];

    for (let i = 0; i < promises.length; i += maxConcurrent) {
        const batch = promises.slice(i, i + maxConcurrent);
        const batchResults = await Promise.allSettled(batch);
        results.push(...batchResults);

        // Pequena pausa entre batches para não sobrecarregar
        if (i + maxConcurrent < promises.length) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    return results;
}

// ================================
// CARREGAMENTO DE DADOS POR MÓDULO
// ================================

/**
 * Carrega serviços com cache
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

    // Carregar apenas hoje por padrão
    const today = new Date().toISOString().split('T')[0];
    return appointmentsModule.loadAppointments({ date: today });
}

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

/**
 * Carrega dados da empresa lazy
 */
async function loadCompanyDataLazy() {
    if (!companyModule) {
        companyModule = await import('./company.js');
    }
    return companyModule.loadCompanyData();
}

// ================================
// CONFIGURAÇÃO DE EVENTOS OTIMIZADA
// ================================

/**
 * Configura event listeners ultra otimizados
 */
function setupOptimizedEventListeners() {
    if (eventListenersSetup) return;

    // Usar event delegation para tudo
    document.addEventListener('click', handleDocumentClick, { passive: true });
    document.addEventListener('change', handleDocumentChange, { passive: true });
    document.addEventListener('submit', handleDocumentSubmit, { passive: true });

    // Configurar Intersection Observer para lazy loading de tabs
    setupTabObserver();

    eventListenersSetup = true;
}

/**
 * Observer para carregar tabs sob demanda
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
 * Carrega dados da tab apenas quando necessário
 */
async function loadTabOnDemand(tabId) {
    // Cancelar load anterior se existir
    if (loadControllers[tabId]) {
        loadControllers[tabId].abort();
    }

    // Criar novo AbortController para esta tab
    const controller = new AbortController();
    loadControllers[tabId] = controller;

    try {
        switch(tabId) {
            case 'appointments':
                const mod = await import('./appointments.js');
                await mod.loadAppointments();
                break;

            case 'services':
                // Já carregado durante inicialização
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
 * Manipulador de clicks otimizado
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

    // Botões de ação com data attributes
    if (target.dataset?.action) {
        handleDataAction(target);
        return;
    }
}

/**
 * Manipulador de mudanças otimizado
 */
function handleDocumentChange(e) {
    const target = e.target;

    // Filtro de data
    if (target.id === 'appointmentDateFilter') {
        debouncedLoadAppointments({ date: target.value });
    }
}

/**
 * Manipulador de submits otimizado
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
 * Manipulador de ações via data attributes
 */
async function handleDataAction(element) {
    const action = element.dataset.action;
    const id = element.dataset.id;

    switch(action) {
        case 'edit-service':
            if (!servicesModule) {
                servicesModule = await import('./services.js');
            }
            servicesModule.editService(id);
            break;

        case 'delete-service':
            confirmDelete('service', id);
            break;

        case 'view-appointment':
            if (!appointmentsModule) {
                appointmentsModule = await import('./appointments.js');
            }
            appointmentsModule.viewAppointmentDetails(id);
            break;
    }
}

// ================================
// FUNÇÕES DE INTERFACE OTIMIZADAS
// ================================

/**
 * Alterna entre tabs com performance
 */
function switchTabOptimized(tabId) {
    if (!tabId) return;

    // Atualizar UI de forma otimizada
    requestAnimationFrame(() => {
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
    });

    // Carregar dados da tab (deferido)
    setTimeout(() => {
        loadTabOnDemand(tabId).catch(() => {});
    }, 50);
}

/**
 * Handler para logout
 */
async function handleLogout() {
    if (!confirm('🚪 Deseja sair da sua conta?')) return;

    const auth = await loadAuthModule();
    auth.logout();
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

// ================================
// FUNÇÕES GLOBAIS OTIMIZADAS
// ================================

/**
 * Atualiza dados com debounce e cache
 */
const debouncedRefreshData = debounce(async function refreshData() {
    console.time('🔄 Refresh otimizado');

    // Mostrar feedback mínimo
    const alertShown = showAlert('🔄 Atualizando...', 'info', 2000);

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

        if (!alertShown) {
            showAlert('✅ Dados atualizados!', 'success', 3000);
        }

    } catch (error) {
        showAlert('⚠️ Erro ao atualizar dados', 'warning', 3000);
    }

    console.timeEnd('🔄 Refresh otimizado');
}, 500);

/**
 * Mostra modal de novo serviço (lazy)
 */
async function openNewServiceModal() {
    if (!servicesModule) {
        servicesModule = await import('./services.js');
    }

    // Carregar seletor de serviços apenas quando necessário
    const serviceSelect = document.querySelector('#newServiceForm select');
    if (serviceSelect && serviceSelect.options.length <= 1) {
        await loadServicesData();
    }

    servicesModule.openNewServiceModal();
}

/**
 * Mostra modal de novo agendamento (lazy)
 */
async function openNewAppointmentModal() {
    if (!appointmentsModule) {
        appointmentsModule = await import('./appointments.js');
    }

    // Carregar serviços para o select
    await loadServicesData();

    appointmentsModule.openNewAppointmentModal();
}

// Debounce otimizado
const debouncedLoadAppointments = debounce((filters) => {
    if (appointmentsModule?.loadAppointments) {
        appointmentsModule.loadAppointments(filters);
    }
}, 300);

// ================================
// INICIALIZAÇÃO PRINCIPAL
// ================================

/**
 * Inicialização principal com performance
 */
async function initialize() {
    // Verificar se estamos na página correta
    if (!window.location.pathname.includes('/agendame/dashboard')) {
        return;
    }

    // Configurações iniciais não-bloqueantes
    requestIdleCallback(() => {
        // Configurar data filter
        const dateFilter = document.getElementById('appointmentDateFilter');
        if (dateFilter) {
            dateFilter.valueAsDate = new Date();
        }

        // Configurar nome do usuário se disponível
        const userName = localStorage.getItem('user_name');
        if (userName) {
            const nameElement = document.getElementById('userName');
            if (nameElement) {
                nameElement.textContent = userName;
            }
        }
    });

    // Inicializar auth e app
    try {
        const auth = await loadAuthModule();
        await auth.initAuth();

        if (auth.isAuthenticated()) {
            // Delay mínimo para UI responder
            setTimeout(() => {
                initializeApp().catch(console.error);
            }, INITIAL_LOAD_DELAY);
        } else {
            auth.protectRoute();
        }
    } catch (error) {
        console.error('Erro crítico na inicialização:', error);
        showAlert('❌ Erro ao carregar aplicação', 'error');
    }
}

// ================================
// MANIPULADOR DE ERROS GLOBAL
// ================================

// Capturar erros de forma não-bloqueante
if (window.addEventListener) {
    window.addEventListener('error', (e) => {
        if (e.error && e.error.message) {
            console.error('💥 Erro:', e.error.message, e.error.stack);
        }
    }, false);

    window.addEventListener('unhandledrejection', (e) => {
        console.error('💥 Promise rejeitada:', e.reason);
    }, false);
}

// ================================
// INICIALIZAÇÃO COM PRIORIDADE
// ================================

// Estratégia de carregamento baseada em readyState
if (document.readyState === 'loading') {
    // DOM ainda carregando, aguardar evento
    document.addEventListener('DOMContentLoaded', () => {
        requestIdleCallback(initialize, { timeout: 1000 });
    });
} else {
    // DOM pronto, inicializar no próximo ciclo
    setTimeout(() => {
        if (document.hidden) {
            // Página em background, esperar visibilidade
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    initialize();
                }
            });
        } else {
            initialize();
        }
    }, 0);
}

// ================================
// EXPORTAÇÕES PARA ESCOPO GLOBAL
// ================================

// Exportar apenas funções essenciais com lazy loading
const globalExports = {
    // Funções básicas
    switchTab: switchTabOptimized,
    refreshData: debouncedRefreshData,
    closeModal,

    // Modais (lazy)
    openNewServiceModal,
    openNewAppointmentModal,

    // Configurações
    setConfig: (key, value) => {
        appState.config = appState.config || {};
        appState.config[key] = value;
    },

    // Utils
    showAlert,

    // Lazy getters para funcionalidades pesadas
    get editService() {
        return (id) => {
            import('./services.js').then(module => {
                if (module.editService) module.editService(id);
            });
        };
    },

    get saveEditedService() {
        return () => {
            import('./services.js').then(module => {
                if (module.saveEditedService) module.saveEditedService();
            });
        };
    }
};

// Atribuir ao window de forma segura
Object.keys(globalExports).forEach(key => {
    if (!window[key]) {
        window[key] = globalExports[key];
    }
});

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
