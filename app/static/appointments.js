import { appState } from './appState.js';
import { allAppointmentsCount, allAppointmentsList } from './domElements.js';
import { setLoading, showAlert } from './utils.js';

// Funções auxiliares
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    } catch (e) {
        return dateString;
    }
}

function formatTime(timeString) {
    if (!timeString) return '';
    try {
        // Formatar para HH:MM
        if (timeString.includes(':')) {
            return timeString.substring(0, 5);
        }
        return timeString;
    } catch (e) {
        return timeString;
    }
}

function formatPhone(phone) {
    if (!phone) return 'Não informado';

    // Remove caracteres não numéricos
    const cleaned = phone.toString().replace(/\D/g, '');

    if (cleaned.length === 11) {
        return `(${cleaned.substring(0,2)}) ${cleaned.substring(2,7)}-${cleaned.substring(7)}`;
    } else if (cleaned.length === 10) {
        return `(${cleaned.substring(0,2)}) ${cleaned.substring(2,6)}-${cleaned.substring(6)}`;
    }
    return phone;
}

// Mapeamento de status
const statusMap = {
    'scheduled': { text: 'Agendado', class: 'status-scheduled' },
    'confirmed': { text: 'Confirmado', class: 'status-confirmed' },
    'completed': { text: 'Concluído', class: 'status-completed' },
    'cancelled': { text: 'Cancelado', class: 'status-cancelled' },
    'no_show': { text: 'Não Compareceu', class: 'status-no-show' }
};


// função global que guarda a quantiade de agendamentos ativos



// Carregar todos os agendamentos da empresa
export async function loadAppointments(filters = {}) {
    setLoading(true);

    try {
        // Construir query string baseada nos filtros
        const queryParams = new URLSearchParams();

        if (filters.start_date) {
            queryParams.append('start_date', filters.start_date);
        }

        if (filters.end_date) {
            queryParams.append('end_date', filters.end_date);
        }

        if (filters.status && filters.status !== 'all') {
            queryParams.append('status', filters.status);
        }

        if (filters.date) {
            // Para filtro de data única, usar como start_date e end_date
            queryParams.append('start_date', filters.date);
            queryParams.append('end_date', filters.date);
        }

        const queryString = queryParams.toString();
        const url = `/company/appointments${queryString ? `?${queryString}` : ''}`;


        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();

            // Armazenar no estado da aplicação
            appState.appointments = data.appointments || [];
            appState.totalAppointments = data.total || 0;

            // Salva a quandide de agendametos


            // Atualizar contador
            if (allAppointmentsCount) {
                allAppointmentsCount.textContent = data.total || appState.appointments.length;
            }

            // Renderizar lista
            if (allAppointmentsList) {
                renderAppointments(appState.appointments, allAppointmentsList);
            }

            return data;

        } else {
            let errorMessage = 'Erro ao carregar agendamentos';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
            } catch (e) {
                errorMessage = `Erro ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        showAlert(error.message || 'Erro ao carregar agendamentos', 'error');

        // Mostrar estado vazio se houver erro
        if (allAppointmentsList) {
            allAppointmentsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>Erro ao carregar agendamentos</h3>
                    <p>${error.message || 'Não foi possível carregar os agendamentos'}</p>
                    <button class="btn btn-primary" onclick="window.loadAppointments()">
                        Tentar novamente
                    </button>
                </div>
            `;
        }
        return null;
    } finally {
        setLoading(false);
    }
}

// Renderizar agendamentos - ATUALIZADO para novo formato
export function renderAppointments(appointments, container, isCompact = false) {
    if (!container) return;

    if (!appointments || appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>Nenhum agendamento encontrado</h3>
                <p>${isCompact ? 'Não há agendamentos próximos' : 'Não há agendamentos para o período selecionado'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = appointments.map(app => {
        // Extrair dados do novo formato
        const appId = app.id || 0;
        const status = app.status || 'scheduled';
        const statusInfo = statusMap[status] || statusMap.scheduled;

        // Dados do cliente
        const clientName = app.client?.name || app.client_name || 'Cliente não informado';
        const clientPhone = app.client?.phone || app.client_phone || '';
        const clientId = app.client?.client_id || app.client_id || null;

        // Dados do serviço
        const serviceName = app.service?.name || app.service_name || 'Serviço não informado';
        const serviceId = app.service?.id || app.service_id || null;
        const servicePrice = parseFloat(app.service?.price || app.price || 0);

        // Dados do agendamento
        const appointmentDate = app.date || app.appointment_date || '';
        const appointmentTime = app.time || app.appointment_time || '';
        const notes = app.notes || '';
        const createdAt = app.created_at || '';

        // Formatações
        const formattedDate = formatDate(appointmentDate);
        const formattedTime = formatTime(appointmentTime);
        const formattedPrice = servicePrice.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        const formattedPhone = formatPhone(clientPhone);
        const formattedCreatedAt = createdAt ? new Date(createdAt).toLocaleString('pt-BR') : '';

        // Escapar caracteres especiais para eventos
        const safeClientPhone = clientPhone.toString().replace(/'/g, "\\'");
        const safeClientName = clientName.toString().replace(/'/g, "\\'");
        const safeServiceName = serviceName.toString().replace(/'/g, "\\'");

        if (isCompact) {
            // Layout compacto (para dashboards)
            return `
                <div class="client-item" data-appointment-id="${appId}">
                    <div class="client-info">
                        <div class="client-name">${clientName}</div>
                        <div class="client-service">${serviceName}</div>
                        <div class="client-details">
                            <span class="client-date"><i class="far fa-calendar"></i> ${formattedDate}</span>
                            <span class="client-time"><i class="far fa-clock"></i> ${formattedTime}</span>
                            <span class="client-price"><i class="fas fa-money-bill-wave"></i> R$ ${formattedPrice}</span>
                        </div>
                    </div>
                    <div class="client-actions">
                        <span class="client-status ${statusInfo.class}">${statusInfo.text}</span>
                        ${clientPhone ? `
                        <button class="action-btn action-whatsapp"
                                onclick="sendWhatsAppReminder(${appId}, '${safeClientPhone}', '${safeClientName}', '${formattedDate}', '${formattedTime}', '${safeServiceName}', ${servicePrice})"
                                title="Enviar lembrete por WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            // Layout completo (para lista de agendamentos)
            return `
                <div class="client-item" data-appointment-id="${appId}">
                    <div class="client-info">
                        <div class="client-header">
                            <div class="client-name">${clientName}</div>
                            <div class="client-service">${serviceName}</div>
                        </div>
                        <div class="client-details">
                            <div class="detail-group">
                                <span class="detail-label"><i class="fas fa-phone"></i> Telefone:</span>
                                <span class="detail-value">${formattedPhone}</span>
                            </div>
                            <div class="detail-group">
                                <span class="detail-label"><i class="far fa-calendar"></i> Data:</span>
                                <span class="detail-value">${formattedDate} às ${formattedTime}</span>
                            </div>
                            <div class="detail-group">
                                <span class="detail-label"><i class="fas fa-money-bill-wave"></i> Valor:</span>
                                <span class="detail-value">R$ ${formattedPrice}</span>
                            </div>
                            ${notes ? `
                            <div class="detail-group">
                                <span class="detail-label"><i class="fas fa-sticky-note"></i> Observações:</span>
                                <span class="detail-value">${notes}</span>
                            </div>
                            ` : ''}
                            <div class="detail-group">
                                <span class="detail-label"><i class="far fa-clock"></i> Criado em:</span>
                                <span class="detail-value">${formattedCreatedAt}</span>
                            </div>
                        </div>
                    </div>
                    <div class="client-actions">
                        <span class="client-status ${statusInfo.class}">${statusInfo.text}</span>
                        <div class="action-buttons">
                            ${clientPhone ? `
                            <button class="action-btn action-whatsapp"
                                    onclick="sendWhatsAppReminder(${appId}, '${safeClientPhone}', '${safeClientName}', '${formattedDate}', '${formattedTime}', '${safeServiceName}', ${servicePrice})"
                                    title="Enviar lembrete por WhatsApp">
                                <i class="fab fa-whatsapp"></i>
                            </button>
                            ` : ''}
                            <button class="action-btn action-view"
                                    onclick="viewAppointmentDetails(${appId})"
                                    title="Ver detalhes">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn action-edit"
                                    onclick="editAppointment(${appId})"
                                    title="Editar agendamento">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
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

// Buscar agendamentos com filtros
export async function searchAppointments(filters = {}) {
    setLoading(true);

    try {
        // Chama a função loadAppointments com os filtros
        const result = await loadAppointments(filters);
        return result;

    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        showAlert(error.message || 'Erro ao buscar agendamentos', 'error');
        return null;
    } finally {
        setLoading(false);
    }
}

// Função para enviar lembrete por WhatsApp
export function sendWhatsAppReminder(appointmentId, phone, clientName, date = '', time = '', serviceName = '', price = 0) {
    if (!phone) {
        showAlert('Número de telefone não disponível', 'warning');
        return;
    }

    // Remove todos os não números do telefone
    const cleanPhone = phone.toString().replace(/\D/g, '');

    // Verifica se é um número brasileiro
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
        // Criar mensagem personalizada
        const message = encodeURIComponent(
            `Olá ${clientName}! Lembrete do seu agendamento:\n\n` +
            `📅 *Data:* ${date || 'Não informada'}\n` +
            `⏰ *Horário:* ${time || 'Não informado'}\n` +
            `💇 *Serviço:* ${serviceName || 'Não informado'}\n` +
            `💰 *Valor:* R$ ${price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n\n` +
            `Por favor, confirme sua presença.`
        );

        // Criar URL do WhatsApp com mensagem pré-preenchida
        const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${message}`;

        // Abrir em nova aba
        window.open(whatsappUrl, '_blank');

        // Opcional: marcar como enviado no sistema
        markWhatsAppAsSent(appointmentId);

        showAlert('Mensagem pronta para envio! O WhatsApp será aberto.', 'success');
    } else {
        showAlert('Número de telefone inválido. Precisa ter 10 ou 11 dígitos.', 'error');
    }
}

// Marcar WhatsApp como enviado (mock - você precisará implementar a API real)
async function markWhatsAppAsSent(appointmentId) {
    try {
        // TODO: Implementar chamada real à API
        // Exemplo:
        // await fetch(`/appointments/${appointmentId}/whatsapp`, {
        //     method: 'POST',
        //     headers: {
        //         'Authorization': `Bearer ${appState.token}`,
        //         'Content-Type': 'application/json'
        //     }
        // });


        // Atualizar localmente
        const appointment = getAppointmentById(appointmentId);
        if (appointment) {
            appointment.whatsapp_sent = true; // Adicione este campo se existir
        }
    } catch (error) {
        console.error('Erro ao marcar WhatsApp como enviado:', error);
    }
}

// Ver detalhes do agendamento
export function viewAppointmentDetails(appointmentId) {
    const appointment = getAppointmentById(appointmentId);
    if (!appointment) {
        showAlert('Agendamento não encontrado', 'error');
        return;
    }

    // Extrair dados
    const clientName = appointment.client?.name || appointment.client_name || 'Não informado';
    const clientPhone = appointment.client?.phone || appointment.client_phone || '';
    const serviceName = appointment.service?.name || appointment.service_name || 'Não informado';
    const servicePrice = parseFloat(appointment.service?.price || appointment.price || 0);
    const appointmentDate = appointment.date || appointment.appointment_date || '';
    const appointmentTime = appointment.time || appointment.appointment_time || '';
    const notes = appointment.notes || '';
    const createdAt = appointment.created_at || '';
    const status = appointment.status || 'scheduled';
    const statusInfo = statusMap[status] || statusMap.scheduled;

    // Formatar dados
    const formattedDate = formatDate(appointmentDate);
    const formattedTime = formatTime(appointmentTime);
    const formattedPrice = servicePrice.toLocaleString('pt-BR', {minimumFractionDigits: 2});
    const formattedPhone = formatPhone(clientPhone);
    const formattedCreatedAt = createdAt ? new Date(createdAt).toLocaleString('pt-BR') : '';

    // Criar HTML dos detalhes
    const detailsHTML = `
        <div class="appointment-details">
            <h3><i class="fas fa-calendar-check"></i> Detalhes do Agendamento</h3>
            <div class="detail-section">
                <h4><i class="fas fa-user"></i> Informações do Cliente</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Nome:</strong>
                        <span>${clientName}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Telefone:</strong>
                        <span>${formattedPhone}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-cut"></i> Informações do Serviço</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Serviço:</strong>
                        <span>${serviceName}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Valor:</strong>
                        <span>R$ ${formattedPrice}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-calendar-alt"></i> Data e Hora</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Data:</strong>
                        <span>${formattedDate}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Hora:</strong>
                        <span>${formattedTime}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-info-circle"></i> Status e Outras Informações</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Status:</strong>
                        <span class="${statusInfo.class}">${statusInfo.text}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Criado em:</strong>
                        <span>${formattedCreatedAt}</span>
                    </div>
                </div>
                ${notes ? `
                <div class="detail-item-full">
                    <strong>Observações:</strong>
                    <p>${notes}</p>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    // Mostrar modal
    showModal('Detalhes do Agendamento', detailsHTML);
}

// Editar agendamento (função stub - implemente conforme necessário)
export function editAppointment(appointmentId) {
    const appointment = getAppointmentById(appointmentId);
    if (!appointment) {
        showAlert('Agendamento não encontrado', 'error');
        return;
    }

    // TODO: Implementar lógica de edição
    showAlert('Funcionalidade de edição em desenvolvimento', 'info');
}

// Função para mostrar modal
export function showModal(title, content) {
    // Remover modal existente
    const existingOverlay = document.querySelector('.modal-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Criar overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // Criar modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
            ${content}
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

// Filtrar agendamentos localmente
export function filterLocalAppointments(filters) {
    if (!appState.appointments || appState.appointments.length === 0) {
        return [];
    }

    let filtered = [...appState.appointments];

    // Filtrar por status
    if (filters.status && filters.status !== 'all') {
        filtered = filtered.filter(app => app.status === filters.status);
    }

    // Filtrar por data
    if (filters.date) {
        const filterDate = new Date(filters.date).toISOString().split('T')[0];
        filtered = filtered.filter(app => {
            const appDate = app.date || app.appointment_date;
            if (!appDate) return false;
            const formattedAppDate = new Date(appDate).toISOString().split('T')[0];
            return formattedAppDate === filterDate;
        });
    }

    // Filtrar por nome do cliente
    if (filters.clientName) {
        const searchTerm = filters.clientName.toLowerCase();
        filtered = filtered.filter(app => {
            const client = app.client || {};
            const name = (client.name || '').toLowerCase();
            const clientName = (app.client_name || '').toLowerCase();
            return name.includes(searchTerm) || clientName.includes(searchTerm);
        });
    }

    // Filtrar por serviço
    if (filters.serviceName) {
        const searchTerm = filters.serviceName.toLowerCase();
        filtered = filtered.filter(app => {
            const service = app.service || {};
            const serviceName = (service.name || '').toLowerCase();
            return serviceName.includes(searchTerm);
        });
    }

    return filtered;
}

// Carregar agendamentos de hoje (para dashboard)
export async function loadTodayAppointments() {
    const today = new Date().toISOString().split('T')[0];
    return await loadAppointments({
        start_date: today,
        end_date: today,
        status: 'all'
    });
}

// Carregar próximos agendamentos (próximos 7 dias)
export async function loadUpcomingAppointments() {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const startDate = today.toISOString().split('T')[0];
    const endDate = nextWeek.toISOString().split('T')[0];

    return await loadAppointments({
        start_date: start_date,
        end_date: end_date,
        status: 'scheduled' // Apenas agendados
    });
}

// Função para recarregar agendamentos
export function reloadAppointments(filters = {}) {
    return loadAppointments(filters);
}

// Exportar funções para o escopo global
window.loadAppointments = loadAppointments;
window.loadTodayAppointments = loadTodayAppointments;
window.loadUpcomingAppointments = loadUpcomingAppointments;
window.renderAppointments = renderAppointments;
window.getAppointmentById = getAppointmentById;
window.searchAppointments = searchAppointments;
window.sendWhatsAppReminder = sendWhatsAppReminder;
window.viewAppointmentDetails = viewAppointmentDetails;
window.editAppointment = editAppointment;
window.reloadAppointments = reloadAppointments;
window.filterLocalAppointments = filterLocalAppointments;
window.showModal = showModal;
