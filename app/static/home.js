// home.js - Módulo para estatísticas e dashboard
import { appState } from './appState.js'
import { loadAppointments } from './appointments.js'
// ============================================
// ELEMENTOS DO DOM PARA DASHBOARD
// ============================================

// Elementos de estatísticas (IDs existentes no seu HTML)
let todayAppointmentsEl;
let todayRevenueEl;
let totalClientsEl;
let activeServicesEl;
let nextAppointmentsCountEl;
let nextAppointmentsListEl;

// Elementos de contagem
let allAppointmentsCountEl;
let servicesCountEl;
let clientsCountEl;

// Elementos de listas
let allAppointmentsListEl;
let servicesListEl;
let clientsListEl;

// Elemento de nome do usuário
let userNameEl;

// ============================================
// INICIALIZAÇÃO DOS ELEMENTOS DOM
// ============================================

/**
 * Inicializa os elementos DOM
 */
function initDomElements() {
    todayAppointmentsEl = document.getElementById('todayAppointments');
    todayRevenueEl = document.getElementById('todayRevenue');
    totalClientsEl = document.getElementById('totalClients');
    activeServicesEl = document.getElementById('activeServices');
    nextAppointmentsCountEl = document.getElementById('nextAppointmentsCount');
    nextAppointmentsListEl = document.getElementById('nextAppointmentsList');

    allAppointmentsCountEl = document.getElementById('allAppointmentsCount');
    servicesCountEl = document.getElementById('servicesCount');
    clientsCountEl = document.getElementById('clientsCount');

    allAppointmentsListEl = document.getElementById('allAppointmentsList');
    servicesListEl = document.getElementById('servicesList');
    clientsListEl = document.getElementById('clientsList');

    userNameEl = document.getElementById('userName');

    console.log('Elementos DOM inicializados para dashboard');
}

// ============================================
// FUNÇÕES DE ESTATÍSTICAS E DASHBOARD
// ============================================

export async function quantityAppointments(){
    let total = await loadAppointments();
    return total.total
}


/**
 * Atualiza o contador de agendamentos de hoje no dashboard
 */
export async function updateTodayAppointmentsCount() {
    if (!todayAppointmentsEl) initDomElements();

    try {
        const today = new Date().toISOString().split('T')[0];
        let count = 0;

        if (window.appState?.appointments && Array.isArray(window.appState.appointments)) {
            const todayApps = window.appState.appointments.filter(appointment => {
                const appDate = appointment.date || appointment.appointment_date;
                const isToday = appDate === today;
                const isValidStatus = appointment.status !== 'cancelled' &&
                                     appointment.status !== 'no_show';
                return isToday && isValidStatus;
            });

        }

        count = await quantityAppointments()

        todayAppointmentsEl.textContent = count;
        return count;

    } catch (error) {
        console.error('Erro ao atualizar contador de agendamentos de hoje:', error);
        todayAppointmentsEl.textContent = '0';
        return 0;
    }
}

/**
 * Atualiza a receita de hoje no dashboard
 */
export function updateTodayRevenue() {
    if (!todayRevenueEl) initDomElements();

    try {
        const today = new Date().toISOString().split('T')[0];
        let totalRevenue = 0;

        if (window.appState?.appointments && Array.isArray(window.appState.appointments)) {
            const todayRevenueApps = window.appState.appointments.filter(appointment => {
                const appDate = appointment.date || appointment.appointment_date;
                const isValidStatus = appointment.status === 'confirmed' ||
                                     appointment.status === 'completed';
                return appDate === today && isValidStatus;
            });

            todayRevenueApps.forEach(appointment => {
                const price = parseFloat(appointment.price || appointment.service?.price || 0);
                if (!isNaN(price)) {
                    totalRevenue += price;
                }
            });
        }

        const formattedRevenue = formatCurrency(totalRevenue);
        todayRevenueEl.textContent = formattedRevenue;

        return totalRevenue;

    } catch (error) {
        console.error('Erro ao calcular receita de hoje:', error);
        todayRevenueEl.textContent = 'R$ 0,00';
        return 0;
    }
}


// Carregar clientes
export async function loadClients(isDashboard = false) {


    try {
        let quantity_clients = 0
        const response = await fetch('/clients', {
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const clients = data.clients || [];
            quantity_clients =  data.clients.length;
            return quantity_clients
        }

        return 0

    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        if (!isDashboard) {
            console.log('Erro ao carregar clientes', 'error');
        }
    }
}


/**
 * Atualiza o contador de clientes no dashboard
 */
export  async function updateClientsCount() {
    if (!totalClientsEl) initDomElements();

    try {

        let real_value_of_clients = await await loadClients()


        const clientCount = window.appState?.clients?.length || appState.clients.length || real_value_of_clients  ;
        totalClientsEl.textContent = clientCount;
        return clientCount;

    } catch (error) {
        console.error('Erro ao atualizar contador de clientes:', error);
        totalClientsEl.textContent = '0';
        return 0;
    }
}

/**
 * Atualiza o contador de serviços ativos no dashboard
 */
export function updateActiveServicesCount() {
    if (!activeServicesEl) initDomElements();

    try {
        const activeServices = window.appState?.services?.filter(s => s.is_active !== false).length || appState.services.length;
        activeServicesEl.textContent = activeServices;
        return activeServices;

    } catch (error) {
        console.error('Erro ao atualizar contador de serviços:', error);
        activeServicesEl.textContent = '0';
        return 0;
    }
}

/**
 * Atualiza contadores gerais da aplicação
 */
export function updateAllCounts() {
    try {
        console.log('Atualizando todos os contadores...');

        if (!allAppointmentsCountEl || !servicesCountEl || !clientsCountEl) {
            initDomElements();
        }

        // Atualizar contador de agendamentos totais
        if (allAppointmentsCountEl && window.appState?.appointments) {
            const totalAppointments = window.appState.appointments.length;
            allAppointmentsCountEl.textContent = totalAppointments;
            console.log(`Total agendamentos: ${totalAppointments}`);
        }

        // Atualizar contador de serviços
        if (servicesCountEl && window.appState?.services) {
            const totalServices = window.appState.services.length;
            servicesCountEl.textContent = totalServices;
        }

        // Atualizar contador de clientes
        if (clientsCountEl && window.appState?.clients) {
            const totalClients = window.appState.clients.length;
            clientsCountEl.textContent = totalClients;
        }

        console.log('Contadores atualizados com sucesso');

    } catch (error) {
        console.error('Erro ao atualizar contadores:', error);
    }
}

/**
 * Atualiza a lista de próximos agendamentos
 */
export function updateNextAppointments() {
    if (!nextAppointmentsListEl || !nextAppointmentsCountEl) {
        initDomElements();
    }

    try {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        let upcomingApps = [];

        if (window.appState?.appointments && Array.isArray(window.appState.appointments)) {
            upcomingApps = window.appState.appointments.filter(appointment => {
                const appDateStr = appointment.date || appointment.appointment_date;
                if (!appDateStr) return false;

                const appDate = new Date(appDateStr);
                const isValidDate = appDate >= today && appDate <= nextWeek;
                const isValidStatus = appointment.status !== 'cancelled' &&
                                     appointment.status !== 'no_show' &&
                                     appointment.status !== 'completed';

                return isValidDate && isValidStatus;
            });

            // Ordenar por data mais próxima
            upcomingApps.sort((a, b) => {
                const dateA = new Date(a.date || a.appointment_date);
                const dateB = new Date(b.date || b.appointment_date);
                return dateA - dateB;
            });

            // Limitar a 5 agendamentos
            upcomingApps = upcomingApps.slice(0, 5);
        }

        // Atualizar contador
        nextAppointmentsCountEl.textContent = upcomingApps.length;

        // Renderizar lista
        if (upcomingApps.length === 0) {
            nextAppointmentsListEl.innerHTML = `
                <div style="padding: 40px 20px; text-align: center; color: #666;">
                    <i class="fas fa-calendar-check" style="font-size: 48px; color: #ddd;"></i>
                    <p style="margin-top: 15px;">Nenhum agendamento para os próximos 7 dias</p>
                </div>
            `;
            return;
        }

        nextAppointmentsListEl.innerHTML = upcomingApps.map(appointment => {
            const clientName = appointment.client?.name || appointment.client_name || 'Cliente não informado';
            const clientPhone = appointment.client?.phone || appointment.client_phone || '';
            const serviceName = appointment.service?.name || appointment.service_name || 'Serviço não informado';
            const appDate = appointment.date || appointment.appointment_date;
            const appTime = appointment.time || appointment.appointment_time || '--:--';
            const price = appointment.price || appointment.service?.price || 0;
            const status = appointment.status || 'scheduled';

            const formattedDate = formatDateDisplay(appDate);
            const formattedPrice = formatCurrency(price);
            const statusClass = getStatusClass(status);
            const statusText = getStatusText(status);

            return `
                <div class="client-item">
                    <div class="client-name">${clientName}</div>
                    <div class="client-phone">${clientPhone}</div>
                    <div class="client-service">${serviceName}</div>
                    <div class="client-date">${formattedDate} às ${appTime}</div>
                    <div class="client-price">${formattedPrice}</div>
                    <div class="client-status ${statusClass}">${statusText}</div>
                    <div class="client-actions">
                        <button class="action-btn action-whatsapp"
                                onclick="window.sendWhatsAppReminder('${clientPhone}')"
                                title="Enviar WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="action-btn action-view"
                                onclick="viewAppointment(${appointment.id})"
                                title="Ver detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao atualizar próximos agendamentos:', error);
        nextAppointmentsListEl.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px;"></i>
                <p style="margin-top: 15px;">Erro ao carregar agendamentos</p>
            </div>
        `;
    }
}

/**
 * Atualiza o nome do usuário no dashboard
 */
export function updateUserName() {
    if (!userNameEl) initDomElements();

    try {
        const userName = window.appState?.user?.name ||
                        window.appState?.user?.username ||
                        'Usuário';

        userNameEl.textContent = userName;

        // Atualizar também o avatar com as iniciais
        const avatarEl = document.querySelector('.avatar');
        if (avatarEl) {
            const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
            if (initials.length > 0) {
                avatarEl.textContent = initials;
                avatarEl.setAttribute('title', `Sair (${userName})`);
            }
        }

    } catch (error) {
        console.error('Erro ao atualizar nome do usuário:', error);
        userNameEl.textContent = 'Usuário';
    }
}

/**
 * Atualiza todo o dashboard de uma vez
 */
export function refreshDashboard() {
    console.log('Atualizando dashboard...');

    try {
        // 1. Atualizar nome do usuário
        updateUserName();

        // 2. Estatísticas principais
        updateTodayAppointmentsCount();
        updateTodayRevenue();
        updateClientsCount();
        updateActiveServicesCount();

        // 3. Contadores gerais
        updateAllCounts();

        // 4. Próximos agendamentos
        updateNextAppointments();

        console.log('Dashboard atualizado com sucesso');
        return true;

    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
        return false;
    }
}

/**
 * Atualiza uma aba específica do dashboard
 */
export function updateTab(tabId) {

    switch(tabId) {
        case 'dashboardTab':
            refreshDashboard();
            break;
        case 'appointmentsTab':
            updateAppointmentsTab();
            break;
        case 'servicesTab':
            updateServicesTab();
            break;
        case 'clientsTab':
            updateClientsTab();
            break;
        case 'companyTab':
            // A empresa é atualizada pelo company.js
            break;
    }
}

/**
 * Atualiza a aba de agendamentos
 */
function updateAppointmentsTab() {
    if (!allAppointmentsListEl || !allAppointmentsCountEl) {
        initDomElements();
    }

    try {
        const appointments = window.appState?.appointments || [];
        allAppointmentsCountEl.textContent = appointments.length;

        if (appointments.length === 0) {
            allAppointmentsListEl.innerHTML = `
                <div style="padding: 40px 20px; text-align: center; color: #666;">
                    <i class="fas fa-calendar-times" style="font-size: 48px; color: #ddd;"></i>
                    <p style="margin-top: 15px;">Nenhum agendamento cadastrado</p>
                </div>
            `;
            return;
        }

        allAppointmentsListEl.innerHTML = appointments.map(appointment => {
            const clientName = appointment.client?.name || appointment.client_name || 'Cliente não informado';
            const clientPhone = appointment.client?.phone || appointment.client_phone || '';
            const serviceName = appointment.service?.name || appointment.service_name || 'Serviço não informado';
            const appDate = appointment.date || appointment.appointment_date;
            const appTime = appointment.time || appointment.appointment_time || '--:--';
            const price = appointment.price || appointment.service?.price || 0;
            const status = appointment.status || 'scheduled';

            const formattedDate = formatDateFull(appDate);
            const formattedPrice = formatCurrency(price);
            const statusClass = getStatusClass(status);
            const statusText = getStatusText(status);

            return `
                <div class="client-item">
                    <div class="client-name">${clientName}</div>
                    <div class="client-phone">${clientPhone}</div>
                    <div class="client-service">${serviceName}</div>
                    <div class="client-date">${formattedDate} às ${appTime}</div>
                    <div class="client-price">${formattedPrice}</div>
                    <div class="client-status ${statusClass}">${statusText}</div>
                    <div class="client-actions">
                        <button class="action-btn action-whatsapp"
                                onclick="window.sendWhatsAppReminder('${clientPhone}')"
                                title="Enviar WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="action-btn action-edit"
                                onclick="window.editAppointment('${appointment.id}')"
                                title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao atualizar lista de agendamentos:', error);
        allAppointmentsListEl.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px;"></i>
                <p style="margin-top: 15px;">Erro ao carregar agendamentos</p>
            </div>
        `;
    }
}

/**
 * Atualiza a aba de serviços
 */
function updateServicesTab() {
    if (!servicesListEl || !servicesCountEl) {
        initDomElements();
    }

    try {
        const services = window.appState?.services || [];
        servicesCountEl.textContent = services.length;

        if (services.length === 0) {
            servicesListEl.innerHTML = `
                <div style="padding: 40px 20px; text-align: center; color: #666;">
                    <i class="fas fa-cut" style="font-size: 48px; color: #ddd;"></i>
                    <p style="margin-top: 15px;">Nenhum serviço cadastrado</p>
                </div>
            `;
            return;
        }

        servicesListEl.innerHTML = services.map(service => {
            const isActive = service.is_active !== false;
            const duration = service.duration || 60;
            const price = service.price || 0;

            const formattedPrice = formatCurrency(price);
            const statusClass = isActive ? 'status-active' : 'status-inactive';
            const statusText = isActive ? 'Ativo' : 'Inativo';

            return `
                <div class="service-item">
                    <div class="service-name">${service.name}</div>
                    <div class="service-price">${formattedPrice}</div>
                    <div class="service-duration">${duration} min</div>
                    <div class="service-status ${statusClass}">${statusText}</div>
                    <div class="client-actions">
                        <button class="action-btn action-edit"
                                onclick="window.editService('${service.id}')"
                                title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn ${isActive ? 'action-remove' : 'action-whatsapp'}"
                                onclick="${isActive ? `window.deactivateService('${service.id}')` : `window.activateService('${service.id}')`}"
                                title="${isActive ? 'Desativar' : 'Ativar'}">
                            <i class="fas fa-${isActive ? 'ban' : 'check'}"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao atualizar lista de serviços:', error);
        servicesListEl.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px;"></i>
                <p style="margin-top: 15px;">Erro ao carregar serviços</p>
            </div>
        `;
    }
}

/**
 * Atualiza a aba de clientes
 */
function updateClientsTab() {
    if (!clientsListEl || !clientsCountEl) {
        initDomElements();
    }

    try {
        const clients = window.appState?.clients || [];
        clientsCountEl.textContent = clients.length;

        if (clients.length === 0) {
            clientsListEl.innerHTML = `
                <div style="padding: 40px 20px; text-align: center; color: #666;">
                    <i class="fas fa-users" style="font-size: 48px; color: #ddd;"></i>
                    <p style="margin-top: 15px;">Nenhum cliente cadastrado</p>
                </div>
            `;
            return;
        }

        clientsListEl.innerHTML = clients.map(client => {
            const phone = client.phone || '';
            const email = client.email || '';
            const totalAppointments = client.appointments_count || 0;

            return `
                <div class="client-item">
                    <div class="client-name">${client.name || 'Não informado'}</div>
                    <div class="client-phone">${phone}</div>
                    <div class="client-service">${email}</div>
                    <div class="client-date">${totalAppointments} agendamentos</div>
                    <div class="client-actions">
                        <button class="action-btn action-whatsapp"
                                onclick="window.sendWhatsAppToClient('${phone}')"
                                title="Enviar WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="action-btn action-edit"
                                onclick="window.editClient('${client.id}')"
                                title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao atualizar lista de clientes:', error);
        clientsListEl.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px;"></i>
                <p style="margin-top: 15px;">Erro ao carregar clientes</p>
            </div>
        `;
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Formata valor monetário
 */
function formatCurrency(value) {
    const numValue = parseFloat(value) || 0;
    return numValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

/**
 * Formata data para exibição
 */
function formatDateDisplay(dateString) {
    if (!dateString) return '--/--/----';

    try {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Hoje';
        }

        if (date.toDateString() === tomorrow.toDateString()) {
            return 'Amanhã';
        }

        return date.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short'
        });

    } catch (error) {
        return dateString;
    }
}

/**
 * Formata data completa
 */
function formatDateFull(dateString) {
    if (!dateString) return '--/--/----';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    } catch (error) {
        return dateString;
    }
}

/**
 * Retorna classe CSS para status
 */
function getStatusClass(status) {
    const statusClasses = {
        'scheduled': 'status-scheduled',
        'confirmed': 'status-confirmed',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled',
        'no_show': 'status-no-show'
    };
    return statusClasses[status] || 'status-scheduled';
}

/**
 * Retorna texto para status
 */
function getStatusText(status) {
    const statusTexts = {
        'scheduled': 'Agendado',
        'confirmed': 'Confirmado',
        'completed': 'Concluído',
        'cancelled': 'Cancelado',
        'no_show': 'Não Compareceu'
    };
    return statusTexts[status] || 'Agendado';
}

// ============================================
// INICIALIZAÇÃO
// ============================================

/**
 * Inicializa o dashboard
 */
export function initDashboard() {
    console.log('Inicializando dashboard...');

    // Inicializar elementos DOM
    initDomElements();

    // Adicionar estilos dinâmicos
    addDynamicStyles();

    console.log('Dashboard inicializado');
}

/**
 * Adiciona estilos dinâmicos
 */
function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Animações para atualização */
        @keyframes highlight {
            0% { background-color: rgba(138, 43, 226, 0.1); }
            100% { background-color: transparent; }
        }

        .stat-card.updated {
            animation: highlight 1s ease;
        }

        /* Status adicional */
        .status-no-show {
            background-color: #fee2e2;
            color: #dc2626;
        }

        /* Estilo para ação de visualização */
        .action-view {
            background-color: var(--info-color);
        }

        .action-view:hover {
            background-color: #2563eb;
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// FUNÇÕES AUXILIARES GLOBAIS
// ============================================

/**
 * Função para visualizar detalhes do agendamento
 */
function viewAppointment(appointmentId) {
    // Implementar a visualização de detalhes
    alert(`Detalhes do agendamento: ${appointmentId}`);
}

// ============================================
// EXPORTAÇÕES PARA ESCOPO GLOBAL
// ============================================

// Exportar funções para serem usadas em outros módulos
window.refreshDashboard = refreshDashboard;
window.updateTab = (tabId) => updateTab(tabId + 'Tab');
