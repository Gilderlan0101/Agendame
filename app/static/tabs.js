import { loadDashboardData } from './dashboard.js';
import { loadAppointments } from './appointments.js';
import { loadServices } from './services.js';
import { loadClients } from './clients.js';
import { loadCompanyInfo } from './company.js';

// Trocar de tab
export function switchTab(tabId) {
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
            loadDashboardData();
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
            loadCompanyInfo();
            break;
    }
}
