// Estado da aplicação
const appState = {
    token: localStorage.getItem('agendame_token'),
    user: null,
    companyInfo: null,
    services: [],
    clients: [],
    appointments: [],
    todayAppointments: [],
    isLoading: false,
    companySlug: null
};

export { appState };
