// main.js - Arquivo principal
// Importar módulos
import { appState } from './appState.js';
import { logoutBtn } from './domElements.js';
import { setupLogin, handleLogout, loadUserData, showLogin } from './auth.js';
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
    loadCompanyInfo as loadCompanyInfoModule,
    getCompanySlug
} from './company.js';
import { refreshData, loadDashboardData } from './dashboard.js';
import { loadClients } from './clients.js';

// Configurar event listeners
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
            loadAppointments(this.value);
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

// Função para inicializar após login bem-sucedido
async function initializeAfterLogin() {
    try {
        // Carregar dados do dashboard inicialmente
        await loadDashboardData();

        // Configurar auto-refresh se necessário
        // setupDashboardAutoRefresh(5); // Descomente se quiser auto-refresh
    } catch (error) {
        console.error('Erro ao inicializar dashboard:', error);
    }
}

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado. Verificando token...');

    // Configurar login
    setupLogin();

    if (appState.token && appState.token !== 'null') {
        console.log('Token encontrado. Carregando dados do usuário...');
        loadUserData().then(() => {
            // Após carregar dados do usuário, inicializar dashboard
            initializeAfterLogin();
        });
    } else {
        console.log('Nenhum token encontrado. Mostrando login.');
        showLogin();
    }

    setupEventListeners();

    // Configurar data inicial no filtro
    const dateFilter = document.getElementById('appointmentDateFilter');
    if (dateFilter) {
        dateFilter.value = new Date().toISOString().split('T')[0];
    }
});

// Função switchTab atualizada
function switchTab(tabId) {
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
            // CORREÇÃO: Removido loadDashboardData() duplicado
            refreshData(); // Esta função já chama loadDashboardData()
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
    }
}

// Exportar funções para o escopo global (para onclick no HTML)
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
window.refreshData = refreshData;
window.loadDashboardData = loadDashboardData;
