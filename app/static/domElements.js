// Elementos DOM
const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');
const loginForm = document.getElementById('loginForm');
const alertMessage = document.getElementById('alertMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');

// Elementos de estatísticas
const todayRevenue = document.getElementById('todayRevenue');
const todayAppointmentsEl = document.getElementById('todayAppointments');
const totalClients = document.getElementById('totalClients');
const activeServices = document.getElementById('activeServices');
const nextAppointmentsCount = document.getElementById('nextAppointmentsCount');
const nextAppointmentsList = document.getElementById('nextAppointmentsList');
const allAppointmentsCount = document.getElementById('allAppointmentsCount');
const allAppointmentsList = document.getElementById('allAppointmentsList');
const servicesCount = document.getElementById('servicesCount');
const servicesList = document.getElementById('servicesList');
const clientsCount = document.getElementById('clientsCount');
const clientsList = document.getElementById('clientsList');

// Elementos da empresa
const companyName = document.getElementById('companyName');
const companyType = document.getElementById('companyType');
const companyPhone = document.getElementById('companyPhone');
const companyWhatsApp = document.getElementById('companyWhatsApp');
const companySlug = document.getElementById('companySlug');
const companyUrl = document.getElementById('companyUrl');

export {
    loginPage, dashboardPage, loginForm, alertMessage, loadingSpinner,
    logoutBtn, userName, todayRevenue, todayAppointmentsEl, totalClients,
    activeServices, nextAppointmentsCount, nextAppointmentsList,
    allAppointmentsCount, allAppointmentsList, servicesCount, servicesList,
    clientsCount, clientsList, companyName, companyType, companyPhone,
    companyWhatsApp, companySlug, companyUrl
};
