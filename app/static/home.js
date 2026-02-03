// home.js - Módulo para dashboard e estatísticas (versão atualizada)

import { appState } from './appState.js';
import { loadAppointments, updateNextAppointmentsList } from './appointments.js';
import {
    todayRevenue,
    todayAppointmentsEl,
    totalClients,
    activeServices,
    nextAppointmentsList,
    allAppointmentsCount,
    servicesCount,
    clientsCount,
    userName,
    userGreeting,
    userBusiness
} from './domElements.js';
import { setLoading, showAlert } from './utils.js';

// ================================
// ESTATÍSTICAS DO DASHBOARD
// ================================

/**
 * Atualiza o contador de agendamentos de hoje
 */
export async function updateTodayAppointmentsCount() {
    if (!todayAppointmentsEl) return;

    try {
        const today = new Date().toISOString().split('T')[0];
        let count = 0;

        if (appState.appointments && Array.isArray(appState.appointments)) {
            const todayApps = appState.appointments.filter(appointment => {
                const appDate = appointment.date || appointment.appointment_date;
                const isToday = appDate === today;
                const isValidStatus = appointment.status !== 'cancelled' &&
                                     appointment.status !== 'no_show';
                return isToday && isValidStatus;
            });
            count = todayApps.length;
        }

        todayAppointmentsEl.textContent = count;
        return count;

    } catch (error) {
        console.error('Erro ao atualizar contador de agendamentos de hoje:', error);
        todayAppointmentsEl.textContent = '0';
        return 0;
    }
}

/**
 * Atualiza a receita de hoje
 */
export function updateTodayRevenue() {
    if (!todayRevenue) return;

    try {
        const today = new Date().toISOString().split('T')[0];
        let totalRevenue = 0;

        if (appState.appointments && Array.isArray(appState.appointments)) {
            const todayRevenueApps = appState.appointments.filter(appointment => {
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
        todayRevenue.textContent = formattedRevenue;

        return totalRevenue;

    } catch (error) {
        console.error('Erro ao calcular receita de hoje:', error);
        todayRevenue.textContent = 'R$ 0,00';
        return 0;
    }
}

/**
 * Atualiza o contador de clientes
 */
export async function updateClientsCount() {
    if (!totalClients) return;

    try {
        const clientCount = appState.clients?.length || 0;
        totalClients.textContent = clientCount;
        return clientCount;

    } catch (error) {
        console.error('Erro ao atualizar contador de clientes:', error);
        totalClients.textContent = '0';
        return 0;
    }
}

/**
 * Atualiza o contador de serviços ativos
 */
export function updateActiveServicesCount() {
    if (!activeServices) return;

    try {
        const activeServicesCount = appState.services?.filter(s => s.is_active !== false).length || 0;
        activeServices.textContent = activeServicesCount;
        return activeServicesCount;

    } catch (error) {
        console.error('Erro ao atualizar contador de serviços:', error);
        activeServices.textContent = '0';
        return 0;
    }
}

/**
 * Atualiza todos os contadores
 */
export function updateAllCounts() {
    try {
        console.log('Atualizando todos os contadores...');

        // Atualizar contador de agendamentos totais
        if (allAppointmentsCount && appState.appointments) {
            const totalAppointments = appState.appointments.length;
            allAppointmentsCount.textContent = totalAppointments;
        }

        // Atualizar contador de serviços
        if (servicesCount && appState.services) {
            const totalServices = appState.services.length;
            servicesCount.textContent = totalServices;
        }

        // Atualizar contador de clientes
        if (clientsCount && appState.clients) {
            const totalClients = appState.clients.length;
            clientsCount.textContent = totalClients;
        }

        console.log('Contadores atualizados com sucesso');

    } catch (error) {
        console.error('Erro ao atualizar contadores:', error);
    }
}

// ================================
// PRÓXIMOS AGENDAMENTOS
// ================================

/**
 * Atualiza a lista de próximos agendamentos no dashboard
 */
export async function updateNextAppointments() {
    if (!nextAppointmentsList) return;

    try {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        let upcomingApps = [];

        if (appState.appointments && Array.isArray(appState.appointments)) {
            upcomingApps = appState.appointments.filter(appointment => {
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

        // Renderizar lista
        if (upcomingApps.length === 0) {
            nextAppointmentsList.innerHTML = `
                <div class="appointments-list-empty">
                    <i class="fas fa-calendar-check"></i>
                    <p>Nenhum agendamento para os próximos 7 dias</p>
                </div>
            `;
            return;
        }

        nextAppointmentsList.innerHTML = upcomingApps.map(appointment => {
            const clientName = appointment.client?.name || appointment.client_name || 'Cliente não informado';
            const serviceName = appointment.service?.name || appointment.service_name || 'Serviço não informado';
            const appDate = appointment.date || appointment.appointment_date;
            const appTime = appointment.time || appointment.appointment_time || '--:--';
            const status = appointment.status || 'scheduled';

            const formattedDate = formatDateDisplay(appDate);
            const statusClass = getStatusClass(status);
            const statusText = getStatusText(status);

            return `
                <div class="appointment-item upcoming-appointment" data-appointment-id="${appointment.id}">
                    <div class="appointment-info">
                        <div class="appointment-client">
                            <strong>${clientName}</strong>
                            <span class="appointment-service">${serviceName}</span>
                        </div>
                        <div class="appointment-datetime">
                            <i class="far fa-calendar"></i>
                            <span>${formattedDate} às ${appTime}</span>
                        </div>
                    </div>
                    <div class="appointment-status ${statusClass}">
                        ${statusText}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao atualizar próximos agendamentos:', error);
        nextAppointmentsList.innerHTML = `
            <div class="appointments-list-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar agendamentos</p>
            </div>
        `;
    }
}

// ================================
// INFORMAÇÕES DO USUÁRIO
// ================================

/**
 * Atualiza o nome do usuário no dashboard
 */
export function updateUserName() {
    if (!userName || !userGreeting || !userBusiness) return;

    try {
        const userData = appState.user || JSON.parse(localStorage.getItem('agendame_user') || '{}');

        // Nome para saudação (primeiro nome)
        const firstName = (userData.name || '').split(' ')[0] || 'Usuário';
        if (userGreeting) {
            userGreeting.textContent = firstName;
        }

        // Nome completo
        if (userName) {
            userName.textContent = userData.name || userData.email || 'Usuário';
        }

        // Nome da empresa
        if (userBusiness) {
            userBusiness.textContent = userData.business_name || 'Agendame';
        }

    } catch (error) {
        console.error('Erro ao atualizar nome do usuário:', error);
        if (userGreeting) userGreeting.textContent = 'Usuário';
        if (userName) userName.textContent = 'Usuário';
        if (userBusiness) userBusiness.textContent = 'Agendame';
    }
}

// ================================
// DASHBOARD COMPLETO
// ================================

/**
 * Atualiza todo o dashboard de uma vez
 */
export async function refreshDashboard() {
    console.log('🔄 Atualizando dashboard...');

    setLoading(true);

    try {
        // 1. Informações do usuário
        updateUserName();

        // 2. Estatísticas principais
        updateTodayAppointmentsCount();
        updateTodayRevenue();
        updateClientsCount();
        updateActiveServicesCount();

        // 3. Contadores gerais
        updateAllCounts();

        // 4. Próximos agendamentos
        await updateNextAppointments();

        // 5. Efeito visual de atualização
        highlightUpdatedCards();

        console.log('✅ Dashboard atualizado com sucesso');

    } catch (error) {
        console.error('🚨 Erro ao atualizar dashboard:', error);
        showAlert('Erro ao atualizar dashboard', 'error');
    } finally {
        setLoading(false);
    }
}

/**
 * Efeito visual para cards atualizados
 */
function highlightUpdatedCards() {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.classList.add('updated');
        setTimeout(() => {
            card.classList.remove('updated');
        }, 1000);
    });
}

/**
 * Inicializa o dashboard
 */
export function initDashboard() {
    console.log('🚀 Inicializando dashboard...');

    // Verificar se está na aba dashboard
    const dashboardTab = document.getElementById('dashboardTab');
    if (!dashboardTab || !dashboardTab.classList.contains('active')) {
        return;
    }

    // Configurar eventos
    setupDashboardEvents();

    // Carregar dados iniciais
    refreshDashboard();

    console.log('✅ Dashboard inicializado');
}

/**
 * Configura eventos do dashboard
 */
function setupDashboardEvents() {
    // Botão de atualizar no dashboard
    const refreshBtn = document.querySelector('[onclick*="refreshData"]');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshDashboard);
    }

    // Cards clicáveis
    document.querySelectorAll('.stat-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function() {
            const title = this.querySelector('h3')?.textContent;
            if (title?.includes('Agendamentos')) {
                window.switchTab('appointments');
            } else if (title?.includes('Clientes')) {
                window.switchTab('clients');
            } else if (title?.includes('Serviços')) {
                window.switchTab('services');
            }
        });
    });
}

// ================================
// FUNÇÕES AUXILIARES
// ================================

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

// ================================
// ESTILOS DINÂMICOS
// ================================

/**
 * Adiciona estilos dinâmicos para o dashboard
 */
function addDynamicStyles() {
    if (document.getElementById('dashboard-styles')) return;

    const style = document.createElement('style');
    style.id = 'dashboard-styles';
    style.textContent = `
        /* Animações para atualização */
        @keyframes highlight {
            0% {
                transform: translateY(0);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            50% {
                transform: translateY(-4px);
                box-shadow: 0 6px 16px rgba(138, 43, 226, 0.2);
            }
            100% {
                transform: translateY(0);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
        }

        .stat-card.updated {
            animation: highlight 0.6s ease;
        }

        /* Estilos para próximos agendamentos */
        .appointment-item.upcoming-appointment {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            border-radius: 8px;
            background: #fff;
            margin-bottom: 8px;
            border: 1px solid #e5e7eb;
            transition: all 0.2s ease;
        }

        .appointment-item.upcoming-appointment:hover {
            border-color: #8a2be2;
            box-shadow: 0 2px 8px rgba(138, 43, 226, 0.1);
        }

        .appointment-info {
            flex: 1;
        }

        .appointment-client {
            margin-bottom: 4px;
        }

        .appointment-client strong {
            font-weight: 600;
            color: #1f2937;
        }

        .appointment-service {
            font-size: 14px;
            color: #6b7280;
            margin-left: 8px;
        }

        .appointment-datetime {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            color: #4b5563;
        }

        .appointment-datetime i {
            color: #8a2be2;
        }

        .appointment-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
        }

        .status-scheduled {
            background: #eff6ff;
            color: #1d4ed8;
        }

        .status-confirmed {
            background: #dcfce7;
            color: #166534;
        }

        .status-completed {
            background: #f0f9ff;
            color: #0369a1;
        }

        .status-cancelled {
            background: #fee2e2;
            color: #991b1b;
        }

        .status-no-show {
            background: #fef3c7;
            color: #92400e;
        }

        /* Estados vazios/erro */
        .appointments-list-empty,
        .appointments-list-error {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
        }

        .appointments-list-empty i,
        .appointments-list-error i {
            font-size: 48px;
            margin-bottom: 16px;
            display: block;
        }

        .appointments-list-empty i {
            color: #d1d5db;
        }

        .appointments-list-error i {
            color: #ef4444;
        }

        /* Estatísticas interativas */
        .stat-card {
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
    `;
    document.head.appendChild(style);
}

// ================================
// INICIALIZAÇÃO
// ================================

// Adicionar estilos quando o módulo for carregado
addDynamicStyles();

// ================================
// EXPORTAÇÕES PARA ESCOPO GLOBAL
// ================================

window.refreshDashboard = refreshDashboard;
window.initDashboard = initDashboard;
window.updateTodayAppointmentsCount = updateTodayAppointmentsCount;
window.updateAllCounts = updateAllCounts;
