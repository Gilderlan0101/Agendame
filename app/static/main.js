// main.js - Arquivo principal otimizado para performance

import {
    getUser,
    initAuth,
    isAuthenticated,
    protectRoute
} from './auth.js';

import {
    loadAppointments,
} from './appointments.js';
import { appState } from './appState.js';
import { logoutBtn } from './domElements.js';
import { openNewAppointmentModal, saveNewAppointment } from './modals.js';
import {
    loadServices,
    openNewServiceModal,
    saveNewService
} from './services.js';
import { closeModal, debounce, setLoading, showAlert } from './utils.js';

import { loadClients } from './clients.js';

// IMPORTAR FUNÇÕES DO HOME.JS
import {
    initDashboard,
    refreshDashboard,
    updateAllCounts
} from './home.js';

import { initCompanyTab, loadCompanyData } from './company.js';

// ================================
// CONSTANTES E VARIÁVEIS GLOBAIS
// ================================
let isInitialized = false;
let eventListenersSetup = false;

// ================================
// INICIALIZAÇÃO OTIMIZADA
// ================================

/**
 * Inicializa a aplicação após autenticação (Otimizada)
 */
async function initializeApp() {
    if (isInitialized) {
        console.log('⚠️ Aplicação já inicializada');
        return;
    }

    console.time('🚀 Inicialização da aplicação');

    // Verificar autenticação
    if (!isAuthenticated()) {
        console.log('❌ Usuário não autenticado');
        protectRoute();
        return;
    }

    try {
        // Carregar dados do usuário (sem bloco try-catch interno)
        const user = getUser();
        console.log('👤 Usuário autenticado:', user.email);

        // Atualizar appState uma única vez
        appState.user = user;
        appState.token = localStorage.getItem('agendame_token');

        // Configurar listeners apenas uma vez
        if (!eventListenersSetup) {
            setupEventListeners();
            eventListenersSetup = true;
        }

        // Carregar dados iniciais de forma otimizada
        await loadInitialData();

        // Marcar como inicializado
        isInitialized = true;

        console.timeEnd('🚀 Inicialização da aplicação');

    } catch (error) {
        console.error('🚨 Erro crítico ao inicializar aplicação:', error);
        showAlert('❌ Erro ao carregar dados da aplicação', 'error');
    }
}

/**
 * Carrega dados iniciais de forma otimizada
 */
async function loadInitialData() {
    console.time('📊 Carregamento de dados iniciais');

    // Verificar se é conta trial
    if (appState.user?.is_trial) {
        requestIdleCallback(() => showTrialBanner());
    }

    // Carregar dados em paralelo, mas com controle
    const promises = [];

    // Dashboard primeiro (mais importante)
    promises.push(new Promise(resolve => {
        requestAnimationFrame(() => {
            initDashboard();
            resolve();
        });
    }));

    // Dados principais em segundo plano
    promises.push(
        loadServices().catch(e => console.warn('Erro ao carregar serviços:', e))
    );
    promises.push(
        loadAppointments().catch(e => console.warn('Erro ao carregar agendamentos:', e))
    );
    promises.push(
        loadClients().catch(e => console.warn('Erro ao carregar clientes:', e))
    );

    // Aguardar todos em paralelo
    await Promise.all(promises);

    // Atualizar UI após carregamento
    requestAnimationFrame(() => {
        updateAllCounts();
        refreshDashboard();
    });

    // Mostrar dashboard como tab padrão
    setTimeout(() => switchTab('dashboard'), 100);

    console.timeEnd('📊 Carregamento de dados iniciais');
}

// ================================
// CONFIGURAÇÃO DE EVENTOS (OTIMIZADA)
// ================================

/**
 * Configura event listeners com debounce e delegación
 */
function setupEventListeners() {
    console.time('🎯 Configuração de event listeners');

    // Usar delegación de eventos para elementos dinâmicos
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('change', handleGlobalChange);
    document.addEventListener('submit', handleGlobalSubmit);

    // Configurar botão de logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('🚪 Deseja sair da sua conta?')) {
                window.AgendameAuth.logout();
            }
        });
    }

    // Tabs - delegación
    const tabsContainer = document.querySelector('.tabs');
    if (tabsContainer) {
        tabsContainer.addEventListener('click', function(e) {
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                const tabId = tabBtn.getAttribute('data-tab');
                switchTab(tabId);
            }
        });
    }

    // Botão de upgrade trial
    setupTrialUpgradeButton();

    console.timeEnd('🎯 Configuração de event listeners');
}

/**
 * Manipulador global de clicks (delegación)
 */
function handleGlobalClick(e) {
    const target = e.target;

    // Fechar modal ao clicar fora
    if (target.classList.contains('modal')) {
        target.classList.remove('show');
        return;
    }

    // Fechar dropdown ao clicar fora
    const dropdown = target.closest('.dropdown');
    if (!dropdown && document.querySelector('.dropdown-menu.show')) {
        document.querySelector('.dropdown-menu.show').classList.remove('show');
    }
}

/**
 * Manipulador global de mudanças (delegación)
 */
function handleGlobalChange(e) {
    const target = e.target;

    // Filtro de data de agendamentos
    if (target.id === 'appointmentDateFilter') {
        debouncedLoadAppointments({ date: target.value });
    }
}

/**
 * Manipulador global de submits (delegación)
 */
function handleGlobalSubmit(e) {
    const target = e.target;

    // Formulário de novo serviço
    if (target.id === 'newServiceForm') {
        e.preventDefault();
        saveNewService();
        return;
    }

    // Formulário de editar serviço
    if (target.id === 'editServiceForm') {
        e.preventDefault();
        if (window.saveEditedService) {
            window.saveEditedService();
        }
        return;
    }

    // Formulário de novo agendamento
    if (target.id === 'newAppointmentForm') {
        e.preventDefault();
        saveNewAppointment();
        return;
    }
}

// Debounce para carregar agendamentos
const debouncedLoadAppointments = debounce(loadAppointments, 300);

// ================================
// FUNÇÕES DE INTERFACE (OTIMIZADAS)
// ================================

/**
 * Alterna entre tabs de forma otimizada
 */
function switchTab(tabId) {
    if (!tabId) return;

    console.time(`🔄 Mudança para tab: ${tabId}`);

    // Atualizar botões com dataset para performance
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Atualizar conteúdo com dataset
    document.querySelectorAll('.tab-content').forEach(content => {
        const contentId = content.id.replace('Tab', '');
        content.classList.toggle('active', contentId === tabId);
    });

    // Carregar dados específicos da tab de forma lazy
    loadTabData(tabId);

    console.timeEnd(`🔄 Mudança para tab: ${tabId}`);
}

/**
 * Carrega dados específicos da tab (lazy loading)
 */
async function loadTabData(tabId) {
    switch(tabId) {
        case 'appointments':
            await loadAppointments();
            break;
        case 'services':
            await loadServices();
            break;
        case 'clients':
            await loadClients();
            break;
        case 'company':
            // Carregar dados da empresa apenas quando acessada
            await loadCompanyData();
            initCompanyTab();
            break;
        default:
            // Dashboard não precisa carregar dados extras
            break;
    }
}

/**
 * Mostra banner de trial (carregamento lazy)
 */
function showTrialBanner() {
    if (document.getElementById('trialBanner')) return;

    const daysRemaining = appState.user?.days_remaining || 7;

    // Usar template literal otimizado
    const bannerHTML = `
        <div class="trial-banner" id="trialBanner">
            <div class="container">
                <div class="trial-content">
                    <i class="fas fa-gem"></i>
                    <div class="trial-text">
                        <strong>CONTA PREMIUM TRIAL</strong>
                        <span id="trialDays">${daysRemaining} ${daysRemaining === 1 ? 'DIA' : 'DIAS'} RESTANTES</span>
                    </div>
                    <button class="btn btn-sm btn-upgrade" onclick="showTrialUpgradeModal()">
                        <i class="fas fa-bolt"></i> Fazer Upgrade
                    </button>
                </div>
            </div>
        </div>
    `;

    // Inserir após o header
    const header = document.querySelector('header');
    if (header) {
        header.insertAdjacentHTML('afterend', bannerHTML);
    }
}

/**
 * Configura botão de upgrade do trial
 */
function setupTrialUpgradeButton() {
    // Usar delegación em vez de event listener individual
    document.addEventListener('click', function(e) {
        if (e.target.closest('.btn-upgrade')) {
            e.preventDefault();
            showTrialUpgradeModal();
        }
    });
}

/**
 * Mostra modal de upgrade do trial
 */
function showTrialUpgradeModal() {
    const modal = document.getElementById('trialUpgradeModal');
    if (modal) {
        modal.classList.add('show');
        return;
    }

    // Criar modal apenas quando necessário
    const modalHTML = `
        <div class="modal" id="trialUpgradeModal">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-crown"></i> Upgrade para Premium</h3>
                        <button class="modal-close" onclick="closeModal('trialUpgradeModal')">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="upgrade-content">
                            <div class="upgrade-icon">
                                <i class="fas fa-gem"></i>
                            </div>
                            <h4>Mantenha todos os seus dados!</h4>
                            <p>Seu trial está acabando. Faça upgrade para manter acesso completo ao sistema.</p>
                            <div class="upgrade-features">
                                <div class="feature"><i class="fas fa-check"></i> Acesso vitalício</div>
                                <div class="feature"><i class="fas fa-check"></i> Suporte 24/7</div>
                                <div class="feature"><i class="fas fa-check"></i> Relatórios avançados</div>
                                <div class="feature"><i class="fas fa-check"></i> Atualizações constantes</div>
                            </div>
                            <div class="price-card">
                                <div class="price">R$ 19,99</div>
                                <div class="period">/mês • Cancele quando quiser</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="handleTrialUpgrade()">
                            <i class="fas fa-bolt"></i> Fazer Upgrade Agora
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Função para recarregar dados (otimizada)
 */
export async function refreshData() {
    console.time('🔄 Recarregamento de dados');

    // Mostrar feedback imediato
    showAlert('🔄 Atualizando dados...', 'info');

    // Carregar dados em paralelo
    const [services, appointments, clients] = await Promise.allSettled([
        loadServices(),
        loadAppointments(),
        loadClients()
    ]);

    // Atualizar UI após carregamento
    requestAnimationFrame(() => {
        refreshDashboard();
        updateAllCounts();

        // Verificar se houve erros
        const errors = [services, appointments, clients]
            .filter(result => result.status === 'rejected')
            .map(result => result.reason);

        if (errors.length === 0) {
            showAlert('✅ Dados atualizados com sucesso!', 'success');
        } else {
            showAlert(`⚠️ ${errors.length} ${errors.length === 1 ? 'erro' : 'erros'} ao atualizar dados`, 'warning');
        }
    });

    console.timeEnd('🔄 Recarregamento de dados');
}

// ================================
// INICIALIZAÇÃO PRINCIPAL (OTIMIZADA)
// ================================

/**
 * Inicialização principal otimizada
 */
async function initialize() {
    console.time('⏱️ Inicialização completa');

    // Configurar data filter padrão (deferido)
    requestIdleCallback(() => {
        const dateFilter = document.getElementById('appointmentDateFilter');
        if (dateFilter) {
            dateFilter.value = new Date().toISOString().split('T')[0];
        }
    });

    // Verificar autenticação
    const isAuth = await initAuth();

    // Inicializar apenas se estiver na página correta e autenticado
    if (window.location.pathname.includes('/agendame/dashboard')) {
        if (isAuth) {
            await initializeApp();
        } else {
            protectRoute();
        }
    }

    console.timeEnd('⏱️ Inicialização completa');
}

// ================================
// MANIPULADOR DE ERROS GLOBAL
// ================================

// Capturar erros não tratados
window.addEventListener('error', function(e) {
    console.error('💥 Erro global capturado:', e.error);
    // Não mostrar alerta para evitar poluição visual
});

// Capturar promessas não tratadas
window.addEventListener('unhandledrejection', function(e) {
    console.error('💥 Promise rejeitada não tratada:', e.reason);
});

// ================================
// INICIALIZAÇÃO
// ================================

// Usar DOMContentLoaded com verificação de performance
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    // DOM já carregado
    setTimeout(initialize, 0);
}

// ================================
// EXPORTAÇÕES PARA ESCOPO GLOBAL (OTIMIZADAS)
// ================================

// Expor apenas funções essenciais
Object.assign(window, {
    switchTab,
    openNewServiceModal,
    saveNewService,
    openNewAppointmentModal,
    saveNewAppointment,
    closeModal,
    refreshData,

    // Funções de serviços (carregadas sob demanda)
    get editService() {
        return import('./services.js').then(module => module.editService);
    },
    get saveEditedService() {
        return import('./services.js').then(module => module.saveEditedService);
    },

    // Funções de WhatsApp (carregadas sob demanda)
    get sendWhatsAppReminder() {
        return import('./whatsapp.js').then(module => module.sendWhatsAppReminder);
    },
    get sendWhatsAppToClient() {
        return import('./whatsapp.js').then(module => module.sendWhatsAppToClient);
    },

    // Funções de empresa (já importadas)
    saveCompanyInfo: () => {
        if (window.saveCompanyData) return window.saveCompanyData();
        console.warn('Função saveCompanyData não disponível');
    },
    copyCompanyUrl: () => {
        if (window.copyCompanyURL) return window.copyCompanyURL();
        console.warn('Função copyCompanyURL não disponível');
    }
});
