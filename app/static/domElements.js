// domElements.js - Elementos DOM do Agendame

// ================================
// PÁGINAS E SEÇÕES PRINCIPAIS
// ================================
const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');

// ================================
// FORMULÁRIOS E CONTROLES
// ================================
const loginForm = document.getElementById('loginForm');
const newServiceForm = document.getElementById('newServiceForm');
const editServiceForm = document.getElementById('editServiceForm');
const newAppointmentForm = document.getElementById('newAppointmentForm');
const appointmentDateFilter = document.getElementById('appointmentDateFilter');

// ================================
// MENSAGENS E LOADING
// ================================
const alertMessage = document.getElementById('alertMessage');
const alertContainer = document.getElementById('alertContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const loadingOverlay = document.getElementById('loadingOverlay');

// ================================
// NAVEGAÇÃO E USUÁRIO
// ================================
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const userGreeting = document.getElementById('userGreeting');
const userBusiness = document.getElementById('userBusiness');
const dropdownToggle = document.querySelector('.dropdown-toggle');
const dropdownMenu = document.querySelector('.dropdown-menu');

// ================================
// TABS E CONTEÚDO
// ================================
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Dashboard Tab
const dashboardTab = document.getElementById('dashboardTab');
const appointmentsTab = document.getElementById('appointmentsTab');
const servicesTab = document.getElementById('servicesTab');
const clientsTab = document.getElementById('clientsTab');
const companyTab = document.getElementById('companyTab');

// ================================
// ESTATÍSTICAS DO DASHBOARD
// ================================
const todayRevenue = document.getElementById('todayRevenue');
const todayAppointmentsEl = document.getElementById('todayAppointments');
const totalClients = document.getElementById('totalClients');
const activeServices = document.getElementById('activeServices');

// ================================
// LISTAS E TABELAS
// ================================
const nextAppointmentsList = document.getElementById('nextAppointmentsList');
const allAppointmentsCount = document.getElementById('allAppointmentsCount');
const allAppointmentsList = document.getElementById('allAppointmentsList');
const servicesCount = document.getElementById('servicesCount');
const servicesList = document.getElementById('servicesList');
const clientsCount = document.getElementById('clientsCount');
const clientsList = document.getElementById('clientsList');

// ================================
// ELEMENTOS DA EMPRESA (COMPANY TAB)
// ================================
const companyName = document.getElementById('companyName');
const companyType = document.getElementById('companyType');
const companyPhone = document.getElementById('companyPhone');
const companyWhatsApp = document.getElementById('companyWhatsApp');
const companySlug = document.getElementById('companySlug');
const companyUrl = document.getElementById('companyUrl');

// ================================
// MODAIS
// ================================
const newServiceModal = document.getElementById('newServiceModal');
const editServiceModal = document.getElementById('editServiceModal');
const newAppointmentModal = document.getElementById('newAppointmentModal');
const trialUpgradeModal = document.getElementById('trialUpgradeModal');
const modalCloses = document.querySelectorAll('.modal-close');

// ================================
// BOTÕES E AÇÕES
// ================================
const trialBanner = document.getElementById('trialBanner');
const trialDays = document.getElementById('trialDays');
const trialUpgradeBtn = document.querySelector('.btn-upgrade');

// Botões do Dashboard
const newServiceBtn = document.querySelector('[onclick*="openNewServiceModal"]');
const newAppointmentBtn = document.querySelector('[onclick*="openNewAppointmentModal"]');
const refreshDataBtn = document.querySelector('[onclick*="refreshData"]');

// Botões da aba Agendamentos
const appointmentNewBtn = document.querySelector('#appointmentsTab .btn-success');

// Botões da aba Serviços
const servicesNewBtn = document.querySelector('#servicesTab .btn-primary');

// Botões da aba Empresa
const companySaveBtn = document.querySelector('#companyTab .form-actions .btn-primary');
const companyCopyBtn = document.querySelector('#companyTab .btn-outline');

// ================================
// FORMULÁRIOS DE MODAIS
// ================================

// Modal Novo Serviço
const serviceName = document.getElementById('serviceName');
const serviceDescription = document.getElementById('serviceDescription');
const servicePrice = document.getElementById('servicePrice');
const serviceDuration = document.getElementById('serviceDuration');
const serviceOrder = document.getElementById('serviceOrder');
const serviceActive = document.getElementById('serviceActive');

// Modal Editar Serviço
const editServiceId = document.getElementById('editServiceId');
const editServiceName = document.getElementById('editServiceName');
const editServiceDescription = document.getElementById('editServiceDescription');
const editServicePrice = document.getElementById('editServicePrice');
const editServiceDuration = document.getElementById('editServiceDuration');
const editServiceOrder = document.getElementById('editServiceOrder');
const editServiceActive = document.getElementById('editServiceActive');

// Modal Novo Agendamento
const appointmentClientName = document.getElementById('appointmentClientName');
const appointmentClientPhone = document.getElementById('appointmentClientPhone');
const appointmentService = document.getElementById('appointmentService');
const appointmentDate = document.getElementById('appointmentDate');
const appointmentTime = document.getElementById('appointmentTime');
const appointmentNotes = document.getElementById('appointmentNotes');

// ================================
// CAMPOS DE ENTRADA E SELETORES
// ================================
const inputPrefix = document.querySelector('.input-prefix');
const formSelects = document.querySelectorAll('.form-select');

// ================================
// CARTÕES E ELEMENTOS VISUAIS
// ================================
const statCards = document.querySelectorAll('.stat-card');
const cardHeaders = document.querySelectorAll('.card-header');
const cardLinks = document.querySelectorAll('.card-link');
const activityItems = document.querySelectorAll('.activity-item');
const chartBars = document.querySelectorAll('.chart-bar');

// ================================
// GRIDS E LAYOUTS
// ================================
const statsGrid = document.querySelector('.stats-grid');
const dashboardGrid = document.querySelector('.dashboard-grid');
const servicesGrid = document.querySelector('.services-grid');
const formGrid = document.querySelector('.form-grid');

// ================================
// EXPORTAÇÃO DOS ELEMENTOS
// ================================
export {
    activeServices, activityItems, alertContainer,
    // Mensagens e Loading
    alertMessage, allAppointmentsCount,
    allAppointmentsList, appointmentClientName,
    appointmentClientPhone, appointmentDate, appointmentDateFilter, appointmentNewBtn, appointmentNotes, appointmentService, appointmentsTab, appointmentTime, cardHeaders,
    cardLinks, chartBars, clientsCount,
    clientsList, clientsTab, companyCopyBtn,
    // Empresa
    companyName, companyPhone, companySaveBtn, companySlug, companyTab, companyType, companyUrl, companyWhatsApp, dashboardGrid, dashboardPage, dashboardTab, dropdownMenu, dropdownToggle, editServiceActive, editServiceDescription, editServiceDuration, editServiceForm, editServiceId, editServiceModal, editServiceName, editServiceOrder, editServicePrice, formGrid, formSelects,
    // Campos
    inputPrefix, loadingOverlay, loadingSpinner,
    // Formulários
    loginForm,
    // Páginas
    loginPage,
    // Navegação e Usuário
    logoutBtn, modalCloses, newAppointmentBtn, newAppointmentForm, newAppointmentModal, newServiceBtn, newServiceForm,
    // Modais
    newServiceModal,
    // Listas
    nextAppointmentsList, refreshDataBtn, serviceActive, serviceDescription, serviceDuration,
    // Formulários de Modais
    serviceName, serviceOrder, servicePrice, servicesCount, servicesGrid, servicesList, servicesNewBtn, servicesTab,
    // Elementos visuais
    statCards,
    // Grids
    statsGrid,
    // Tabs
    tabButtons,
    tabContents, todayAppointmentsEl,
    // Estatísticas
    todayRevenue, totalClients,
    // Botões
    trialBanner,
    trialDays,
    trialUpgradeBtn, trialUpgradeModal, userBusiness, userGreeting, userName
};
