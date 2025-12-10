import { appState } from './appState.js';
import {
    todayRevenue, todayAppointmentsEl, totalClients, activeServices,
    nextAppointmentsCount, nextAppointmentsList
} from './domElements.js';
import { setLoading, showAlert, formatDate } from './utils.js';
import { getCompanySlug } from './company.js';
import { loadAppointments } from './appointments.js';
import { loadServices } from './services.js';
import { loadClients } from './clients.js';

// Carregar dados do dashboard
export async function loadDashboardData() {
    setLoading(true);

    try {
        console.log('Carregando dados do dashboard...');

        // Carregar estatísticas via API dedicada
        await loadDashboardStats();

        // Se não temos o slug, tentar obtê-lo
        if (!appState.companySlug && appState.user) {
            await getCompanySlug();
        }

        // Carregar dados da empresa se tivermos slug
        if (appState.companySlug) {
            await loadCompanyDashboardData();
        }

        // Carregar dados administrativos adicionais
        await loadAdminDashboardData();

        // Atualizar estatísticas
        updateDashboardStats();

        // Carregar próximos agendamentos
        await loadUpcomingAppointments();

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showAlert('Erro ao carregar dados do dashboard', 'error');
    } finally {
        setLoading(false);
    }
}

// Carregar estatísticas do dashboard via API
async function loadDashboardStats() {
    try {
        const response = await fetch('/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (response.ok) {
            const data = await response.json();

            // Atualizar estatísticas principais
            if (data.stats) {
                // CORREÇÃO: Formatando para R$ 0,00 (com vírgula)
                todayRevenue.textContent = `R$ ${(data.stats.today_revenue || 0).toFixed(2).replace('.', ',')}`;
                todayAppointmentsEl.textContent = data.stats.today_appointments || 0;
                totalClients.textContent = data.stats.total_clients || 0;
                activeServices.textContent = data.stats.total_services || 0;
            }

            // Armazenar próximos agendamentos
            if (data.upcoming_appointments) {
                appState.upcomingAppointments = data.upcoming_appointments;
                nextAppointmentsCount.textContent = data.upcoming_appointments.length;
                renderUpcomingAppointments(data.upcoming_appointments);
            }

            return true;
        }
        return false;
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        return false;
    }
}

// Carregar dados da empresa para o dashboard
async function loadCompanyDashboardData() {
    try {
        const companyResponse = await fetch(`/agendame/${appState.companySlug}/info`, {
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (companyResponse.ok) {
            const companyData = await companyResponse.json();
            appState.companyInfo = companyData.company;
            appState.services = companyData.services || [];
        }
    } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error);
    }
}

// Carregar dados administrativos
async function loadAdminDashboardData() {
    try {
        // Carregar serviços administrativos
        const servicesResponse = await fetch('/agendame/services', {
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (servicesResponse.ok) {
            const servicesData = await servicesResponse.json();
            appState.services = servicesData || [];
        }

        // Carregar agendamentos de hoje
        const today = new Date().toISOString().split('T')[0];
        await loadAppointments(today, true);

        // Carregar clientes (somente para contagem)
        const clientsResponse = await fetch('/clients?limit=1');
        if (clientsResponse.ok) {
            const clientsData = await clientsResponse.json();
            appState.clients = clientsData.clients || [];
        }

    } catch (error) {
        console.error('Erro ao carregar dados administrativos:', error);
    }
}

// Se mudar a rota para POST no backend:
async function loadUpcomingAppointments() {
    try {
        const today = new Date().toISOString().split('T')[0];

        const response = await fetch(`/appointments`, {
            method: 'POST', // Mude para POST se permitir body
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "date": today,
                "status": "scheduled",
                "limit": 0,
                "offset": 0
            })
        });

        // Restante do código permanece igual...
    } catch (error) {
        console.error('Erro ao carregar próximos agendamentos:', error);
    }
}

// Renderizar próximos agendamentos - CORRIGIDA para o HTML
function renderUpcomingAppointments(appointments) {
    if (!nextAppointmentsList) return;

    if (!appointments || appointments.length === 0) {
        nextAppointmentsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>Nenhum agendamento próximo</h3>
                <p>Não há agendamentos para hoje ou futuro próximo</p>
            </div>
        `;
        return;
    }

    // CORREÇÃO: Usar a mesma estrutura do HTML (grid-template-columns: 1fr 1fr 1fr 1fr 1fr)
    nextAppointmentsList.innerHTML = appointments.map(app => {
        const price = parseFloat(app.price) || 0;
        const date = app.appointment_date ? formatDate(app.appointment_date) : '';
        const time = app.appointment_time || '';
        const clientName = app.client_name || app.client_full_name || 'Cliente';
        const serviceName = app.service_name || 'Serviço';
        const clientPhone = app.client_phone || '';

        // Status em português
        const statusText = app.status === 'scheduled' ? 'Agendado' :
                          app.status === 'confirmed' ? 'Confirmado' : 'Agendado';
        const statusClass = `status-${app.status || 'scheduled'}`;

        return `
            <div class="client-item">
                <div class="client-name">${clientName}</div>
                <div class="client-service">${serviceName}</div>
                <div class="client-date">${date} ${time}</div>
                <div class="client-price">R$ ${price.toFixed(2).replace('.', ',')}</div>
                <div class="client-status ${statusClass}">${statusText}</div>
                <div class="client-actions">
                    <button class="action-btn action-whatsapp" onclick="sendWhatsAppReminder(${app.id}, '${clientPhone}')">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Atualizar estatísticas do dashboard (fallback)
export function updateDashboardStats() {
    // Usar dados do state se as APIs falharem
    if (appState.todayAppointments && appState.todayAppointments.length > 0) {
        const todayRevenueValue = appState.todayAppointments.reduce((sum, app) => {
            return sum + (parseFloat(app.price) || 0);
        }, 0);

        if (todayRevenue.textContent === 'R$ 0,00' || todayRevenue.textContent === 'R$ 0.00') {
            // CORREÇÃO: Formatar com vírgula
            todayRevenue.textContent = `R$ ${todayRevenueValue.toFixed(2).replace('.', ',')}`;
        }

        if (todayAppointmentsEl.textContent === '0') {
            todayAppointmentsEl.textContent = appState.todayAppointments.length;
        }
    }

    if (appState.clients && appState.clients.length > 0 && totalClients.textContent === '0') {
        totalClients.textContent = appState.clients.length;
    }

    if (appState.services && appState.services.length > 0 && activeServices.textContent === '0') {
        const activeServicesCount = appState.services.filter(s => s.is_active !== false).length;
        activeServices.textContent = activeServicesCount;
    }
}

// Obter estatísticas resumidas
export function getDashboardStats() {
    // CORREÇÃO: Converter texto para número corretamente
    const todayRevenueText = todayRevenue.textContent.replace('R$ ', '').replace(',', '.');
    return {
        todayRevenue: parseFloat(todayRevenueText) || 0,
        todayAppointments: parseInt(todayAppointmentsEl.textContent || 0),
        totalClients: parseInt(totalClients.textContent || 0),
        activeServices: parseInt(activeServices.textContent || 0),
        upcomingAppointments: parseInt(nextAppointmentsCount.textContent || 0)
    };
}

// Verificar se há novos agendamentos
export async function checkForNewAppointments() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/appointments?date=${today}`, {
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const newAppointments = data.appointments || [];

            // Verificar se há novos agendamentos desde a última verificação
            const lastCheck = appState.lastAppointmentCheck || 0;
            const newCount = newAppointments.filter(app => {
                const appDate = new Date(app.created_at || app.appointment_date);
                return appDate.getTime() > lastCheck;
            }).length;

            // Atualizar timestamp da última verificação
            appState.lastAppointmentCheck = Date.now();

            return {
                hasNew: newCount > 0,
                count: newCount,
                message: newCount > 0 ? `${newCount} novo(s) agendamento(s)` : null
            };
        }
        return { hasNew: false, count: 0, message: null };
    } catch (error) {
        console.error('Erro ao verificar novos agendamentos:', error);
        return { hasNew: false, count: 0, message: null };
    }
}

// Atualizar dados
export function refreshData() {
    console.log('Atualizando dados do dashboard...');
    loadDashboardData();
}

// Configurar auto-refresh do dashboard
export function setupDashboardAutoRefresh(intervalMinutes = 5) {
    // Limpar intervalo anterior se existir
    if (appState.dashboardRefreshInterval) {
        clearInterval(appState.dashboardRefreshInterval);
    }

    // Configurar novo intervalo
    appState.dashboardRefreshInterval = setInterval(() => {
        console.log('Auto-refresh do dashboard...');
        loadDashboardData();
    }, intervalMinutes * 60 * 1000);

    console.log(`Dashboard configurado para auto-refresh a cada ${intervalMinutes} minutos`);
}

// Parar auto-refresh
export function stopDashboardAutoRefresh() {
    if (appState.dashboardRefreshInterval) {
        clearInterval(appState.dashboardRefreshInterval);
        appState.dashboardRefreshInterval = null;
        console.log('Auto-refresh do dashboard parado');
    }
}

// Função para renderizar agendamentos específica do dashboard
export function renderDashboardAppointments(appointments, container) {
    renderUpcomingAppointments(appointments);
}

// Exportar funções para escopo global
window.refreshData = refreshData;
window.loadDashboardData = loadDashboardData;
window.renderUpcomingAppointments = renderUpcomingAppointments;  // Adicionado para acesso global
