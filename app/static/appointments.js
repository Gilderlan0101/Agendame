import { appState } from './appState.js';
import { allAppointmentsCount, allAppointmentsList } from './domElements.js';
import { setLoading, showAlert, formatDate, formatPhone } from './utils.js';

// Carregar todos os agendamentos (GET com query parameters)
export async function loadAppointments(date = null, isDashboard = false) {
    setLoading(true);

    try {
        // Construir query parameters de acordo com o schema AppointmentsToday
        const params = new URLSearchParams();

        // Data é obrigatória - usar data atual se não fornecida
        const useDate = date || new Date().toISOString().split('T')[0];
        params.append('date', useDate);

        // Status opcional
        params.append('status', 'scheduled');

        // Offset é obrigatório (tem default no schema)
        params.append('offset', '0');

        // Limit é opcional (tem default no schema)
        params.append('limit', '100');

        const url = `/appointments?${params.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();

            if (isDashboard) {
                // Para dashboard, usar apenas agendamentos de hoje
                const today = new Date().toISOString().split('T')[0];
                appState.todayAppointments = (data.appointments || []).filter(
                    app => app.appointment_date && app.appointment_date.startsWith(today)
                );
            } else {
                appState.appointments = data.appointments || [];
                allAppointmentsCount.textContent = data.pagination?.total || appState.appointments.length;
                renderAppointments(appState.appointments, allAppointmentsList, false);
            }
            return data;
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Erro ao carregar agendamentos');
        }

    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        showAlert(error.message || 'Erro ao carregar agendamentos', 'error');

        // Mostrar estado vazio se houver erro
        if (!isDashboard) {
            allAppointmentsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>Erro ao carregar agendamentos</h3>
                    <p>${error.message || 'Não foi possível carregar os agendamentos'}</p>
                </div>
            `;
        }
        return null;
    } finally {
        setLoading(false);
    }
}

// Renderizar agendamentos
export function renderAppointments(appointments, container, isCompact = true) {
    if (!container) return;

    if (!appointments || appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>Nenhum agendamento encontrado</h3>
                <p>${isCompact ? 'Não há agendamentos próximos' : 'Não há agendamentos para esta data'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = appointments.map(app => {
        const statusClass = `status-${app.status || 'scheduled'}`;
        const statusText = app.status === 'scheduled' ? 'Agendado' :
                         app.status === 'confirmed' ? 'Confirmado' :
                         app.status === 'completed' ? 'Concluído' :
                         app.status === 'cancelled' ? 'Cancelado' :
                         app.status === 'no_show' ? 'Não Compareceu' : 'Agendado';

        const price = parseFloat(app.price) || 0;
        const date = app.appointment_date ? formatDate(app.appointment_date) : '';
        const time = app.appointment_time || '';
        const clientName = app.client_name || app.client_full_name || 'Cliente';
        const serviceName = app.service_name || 'Serviço';
        const clientPhone = app.client_phone || '';

        // Formatar preço com vírgula para combinar com o HTML
        const formattedPrice = price.toFixed(2).replace('.', ',');

        if (isCompact) {
            return `
                <div class="client-item">
                    <div class="client-name">${clientName}</div>
                    <div class="client-service">${serviceName}</div>
                    <div class="client-date">${date} ${time}</div>
                    <div class="client-price">R$ ${formattedPrice}</div>
                    <div class="client-status ${statusClass}">${statusText}</div>
                    <div class="client-actions">
                        <button class="action-btn action-whatsapp" onclick="sendWhatsAppReminder(${app.id}, '${clientPhone}')">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="client-item">
                    <div class="client-name">${clientName}</div>
                    <div class="client-phone">${formatPhone(clientPhone)}</div>
                    <div class="client-service">${serviceName}</div>
                    <div class="client-date">${date} ${time}</div>
                    <div class="client-price">R$ ${formattedPrice}</div>
                    <div class="client-status ${statusClass}">${statusText}</div>
                    <div class="client-actions">
                        <button class="action-btn action-whatsapp" onclick="sendWhatsAppReminder(${app.id}, '${clientPhone}')">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                    </div>
                </div>
            `;
        }
    }).join('');
}

// Buscar agendamento por ID
export function getAppointmentById(appointmentId) {
    if (!appState.appointments || appState.appointments.length === 0) {
        return null;
    }

    return appState.appointments.find(app => app.id === parseInt(appointmentId));
}

// Buscar agendamentos com filtros avançados (GET com query parameters)
export async function searchAppointments(filters = {}) {
    setLoading(true);

    try {
        // Construir query parameters
        const params = new URLSearchParams();

        // Data é obrigatória
        params.append('date', filters.date || new Date().toISOString().split('T')[0]);

        // Status opcional
        if (filters.status) params.append('status', filters.status);
        else params.append('status', 'scheduled');

        // Offset é obrigatório
        params.append('offset', filters.offset || '0');

        // Limit opcional
        if (filters.limit) params.append('limit', filters.limit);
        else params.append('limit', '100');

        const url = `/appointments?${params.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            appState.appointments = data.appointments || [];
            allAppointmentsCount.textContent = data.pagination?.total || appState.appointments.length;
            renderAppointments(appState.appointments, allAppointmentsList, false);
            return data;
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Erro ao buscar agendamentos');
        }
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        showAlert(error.message || 'Erro ao buscar agendamentos', 'error');
        return null;
    } finally {
        setLoading(false);
    }
}

/*
// TODO: POST - Criar novo agendamento
export async function createNewAppointment(appointmentData) {
    setLoading(true);

    try {
        const response = await fetch('/appointments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });

        if (response.ok) {
            const data = await response.json();
            showAlert('Agendamento criado com sucesso!', 'success');

            // Recarregar agendamentos
            await loadAppointments();

            return data;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao criar agendamento');
        }
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        showAlert(error.message || 'Erro ao criar agendamento', 'error');
        return null;
    } finally {
        setLoading(false);
    }
}

// TODO: POST - Atualizar agendamento
export async function updateAppointment(appointmentId, appointmentData) {
    setLoading(true);

    try {
        const response = await fetch(`/appointments/${appointmentId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });

        if (response.ok) {
            const data = await response.json();
            showAlert('Agendamento atualizado com sucesso!', 'success');

            // Recarregar agendamentos
            await loadAppointments();

            return data;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao atualizar agendamento');
        }
    } catch (error) {
        console.error('Erro ao atualizar agendamento:', error);
        showAlert(error.message || 'Erro ao atualizar agendamento', 'error');
        return null;
    } finally {
        setLoading(false);
    }
}

// TODO: POST - Deletar agendamento
export async function deleteAppointment(appointmentId) {
    if (!confirm('Tem certeza que deseja excluir este agendamento permanentemente?')) return;

    setLoading(true);

    try {
        const response = await fetch(`/appointments/${appointmentId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'delete' })
        });

        if (response.ok) {
            showAlert('Agendamento excluído com sucesso!', 'success');

            // Recarregar agendamentos
            await loadAppointments();

            return true;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao excluir agendamento');
        }
    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        showAlert(error.message || 'Erro ao excluir agendamento', 'error');
        return false;
    } finally {
        setLoading(false);
    }
}
*/

// Exportar funções para o escopo global
window.loadAppointments = loadAppointments;
window.renderAppointments = renderAppointments;
window.getAppointmentById = getAppointmentById;
window.searchAppointments = searchAppointments;
