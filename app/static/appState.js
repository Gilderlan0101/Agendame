// app/appState.js

// Estado da aplicação
export const appState = {
    // Autenticação
    token: localStorage.getItem('agendame_token') || null,

    // Usuário (dados do /auth/me)
    user: (() => {
        try {
            const userData = localStorage.getItem('agendame_user');
            return userData ? JSON.parse(userData) : null;
        } catch {
            return null;
        }
    })(),

    // Empresa (mesmos dados do usuário no seu caso)
    company: (() => {
        try {
            const companyData = localStorage.getItem('agendame_company');
            return companyData ? JSON.parse(companyData) : null;
        } catch {
            return null;
        }
    })(),

    // Slug da empresa
    companySlug: localStorage.getItem('agendame_slug') || null,

    // Informações da empresa (para compatibilidade)
    companyInfo: (() => {
        try {
            const companyInfo = localStorage.getItem('agendame_company_info');
            return companyInfo ? JSON.parse(companyInfo) : null;
        } catch {
            return null;
        }
    })(),

    // Dados da aplicação
    services: [],
    clients: [],
    appointments: [],
    todayAppointments: [],

    // Estado da UI
    isLoading: false
};

// Helper para debug
export function logAppState() {
    console.log('=== APP STATE ===');
    console.log('Token:', appState.token ? 'Presente' : 'Ausente');
    console.log('User:', appState.user);
    console.log('Company:', appState.company);
    console.log('Company Slug:', appState.companySlug);
    console.log('Company Info:', appState.companyInfo);
    console.log('=================');
}
