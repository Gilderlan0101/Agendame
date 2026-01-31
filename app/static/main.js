// main.js - Arquivo principal (ATUALIZADO)

// Importar módulos
import { appState } from './appState.js';
import { logoutBtn } from './domElements.js';
import { setupLogin, handleLogout, showLogin, loadUserSession } from './auth.js';
import { setLoading, showAlert, closeModal } from './utils.js';
import {
    openNewServiceModal,
    saveNewService,
    editService,
    saveEditedService,
    activateService,
    deactivateService,
    loadServices
} from './services.js';
import { openNewAppointmentModal, saveNewAppointment } from './modals.js';
import { loadAppointments } from './appointments.js';
import { sendWhatsAppReminder, sendWhatsAppToClient } from './whatsapp.js';
import {
    saveCompanyInfo,
    copyCompanyUrl,
    loadCompanyInfo as loadCompanyInfoModule
} from './company.js';
import { loadClients } from './clients.js';

// IMPORTAR FUNÇÕES DO HOME.JS
import {
    initDashboard,
    refreshDashboard,
    updateTodayAppointmentsCount,
    updateAllCounts
} from './home.js';

// ============================================
// CONFIGURAÇÃO DE EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Configurar logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Configurar tabs
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Configurar filtro de data para agendamentos
    const dateFilter = document.getElementById('appointmentDateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            loadAppointments({ date: this.value });
        });
    }

    // Configurar formulários de modais
    const newServiceForm = document.getElementById('newServiceForm');
    if (newServiceForm) {
        newServiceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveNewService();
        });
    }

    const editServiceForm = document.getElementById('editServiceForm');
    if (editServiceForm) {
        editServiceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveEditedService();
        });
    }

    const newAppointmentForm = document.getElementById('newAppointmentForm');
    if (newAppointmentForm) {
        newAppointmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveNewAppointment();
        });
    }

    // Fechar modais ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
}

// ============================================
// INICIALIZAÇÃO APÓS LOGIN
// ============================================
async function initializeAfterLogin() {
    try {
        console.log('Inicializando após login...');

        // Inicializar dashboard
        initDashboard();

        // Carregar dados iniciais
        await Promise.all([
            loadServices(),
            loadAppointments(),
            loadClients()
        ]);

        // Atualizar todos os contadores
        updateAllCounts();

        // Atualizar dashboard
        refreshDashboard();

        // Ativar a tab dashboard por padrão
        switchTab('dashboard');

        console.log('Sistema inicializado com sucesso');

    } catch (error) {
        console.error('Erro ao inicializar sistema:', error);
        showAlert('Erro ao carregar dados iniciais', 'error');
    }
}

// ============================================
// TROCA DE ABAS (TABS)
// ============================================
function switchTab(tabId) {
    console.log(`Mudando para tab: ${tabId}`);

    // Remover classe active de todas as tabs
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Ativar tab selecionada
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (tabBtn) tabBtn.classList.add('active');

    const tabContent = document.getElementById(`${tabId}Tab`);
    if (tabContent) tabContent.classList.add('active');

    // Carregar dados específicos da tab
    switch(tabId) {
        case 'dashboard':
            // Dashboard já é atualizado automaticamente pelo home.js
            break;
        case 'appointments':
            loadAppointments();
            break;
        case 'services':
            loadServices();
            break;
        case 'clients':
            loadClients();
            break;
        case 'company':
            loadCompanyInfoModule();
            break;
        default:
            console.log(`Tab desconhecida: ${tabId}`);
    }
}

// ============================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Agendame - Aplicação inicializando...');

    // Configurar sistema de login
    setupLogin();

    // Configurar data inicial no filtro de agendamentos
    const dateFilter = document.getElementById('appointmentDateFilter');
    if (dateFilter) {
        const today = new Date().toISOString().split('T')[0];
        dateFilter.value = today;
    }

    // Verificar se há sessão ativa
    const token = localStorage.getItem('agendame_token');

    if (token && token !== 'null') {

        try {
            // Carregar dados do usuário e sessão
            await loadUserSession();

            // Configurar event listeners
            setupEventListeners();

            // Inicializar sistema após login bem-sucedido
            await initializeAfterLogin();

        } catch (error) {
            console.error('Erro ao carregar sessão:', error);
            showAlert('Erro ao restaurar sessão. Faça login novamente.', 'error');
            showLogin();
        }

    } else {
        console.log('Nenhuma sessão encontrada. Exibindo tela de login.');
        showLogin();
        setupEventListeners();
    }

    console.log('Aplicação inicializada');
});

// ============================================
// FUNÇÕES GLOBAIS (para outros módulos chamarem)
// ============================================

/**
 * Função para recarregar dados (usada por outros módulos)
 */
export function refreshData() {
    console.log('Recarregando todos os dados...');
    showAlert('Atualizando dados...', 'info');

    // Recarregar tudo
    Promise.all([
        loadServices(),
        loadAppointments(),
        loadClients()
    ]).then(() => {
        // Atualizar dashboard e contadores
        refreshDashboard();
        updateAllCounts();

        showAlert('Dados atualizados com sucesso!', 'success');
    }).catch(error => {
        console.error('Erro ao recarregar dados:', error);
        showAlert('Erro ao atualizar dados', 'error');
    });
}

// ============================================
// EXPORTAR FUNÇÕES PARA ESCOPO GLOBAL
// (para uso em onclick no HTML)
// ============================================
window.switchTab = switchTab;
window.openNewServiceModal = openNewServiceModal;
window.saveNewService = saveNewService;
window.editService = editService;
window.saveEditedService = saveEditedService;
window.activateService = activateService;
window.deactivateService = deactivateService;
window.openNewAppointmentModal = openNewAppointmentModal;
window.saveNewAppointment = saveNewAppointment;
window.sendWhatsAppReminder = sendWhatsAppReminder;
window.sendWhatsAppToClient = sendWhatsAppToClient;
window.saveCompanyInfo = saveCompanyInfo;
window.copyCompanyUrl = copyCompanyUrl;
window.closeModal = closeModal;
window.refreshData = refreshData; // Exportar refreshData
