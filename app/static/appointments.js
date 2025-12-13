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

// Carregar todos os agendamentos
export async function loadAppointments(date = null, isDashboard = false) {
    setLoading(true);

    try {
        // Data é obrigatória - usar data atual se não fornecida
        const useDate = date || new Date().toISOString().split('T')[0];

        // Preparar dados para a requisição
        const requestData = {
            date: useDate,
            offset: 0,
            limit: 100,
            // status: 'scheduled' // Descomente se quiser filtrar por status específico
        };

        const response = await fetch('/appointments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Dados recebidos da API:', data);

            if (isDashboard) {
                // Para dashboard, usar apenas agendamentos de hoje
                const today = new Date().toISOString().split('T')[0];
                appState.todayAppointments = (data.appointments || []).filter(
                    app => app.appointment_date && app.appointment_date.includes(today)
                );

                // Se estiver no dashboard, renderize os agendamentos de hoje
                if (allAppointmentsList) {
                    renderAppointments(appState.todayAppointments, allAppointmentsList, true);
                }
            } else {
                // Para a lista completa
                appState.appointments = data.appointments || [];
                appState.pagination = data.pagination || {};

                if (allAppointmentsCount) {
                    allAppointmentsCount.textContent = data.pagination?.total || appState.appointments.length;
                }
                if (allAppointmentsList) {
                    renderAppointments(appState.appointments, allAppointmentsList, false);
                }
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

// Renderizar agendamentos - CORRIGIDO
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
        // Garantir que temos valores válidos
        const appId = app.id || 0;
        const status = app.status || 'scheduled';
        const statusClass = `status-${status}`;

        // Texto do status
        let statusText = 'Agendado';
        switch(status) {
            case 'confirmed': statusText = 'Confirmado'; break;
            case 'completed': statusText = 'Concluído'; break;
            case 'cancelled': statusText = 'Cancelado'; break;
            case 'no_show': statusText = 'Não Compareceu'; break;
            default: statusText = 'Agendado';
        }

        const price = parseFloat(app.price) || 0;
        const date = app.appointment_date ? formatDate(app.appointment_date) : 'Data não informada';
        const time = app.appointment_time || 'Horário não informado';
        const clientName = app.client_name || app.client_full_name || 'Cliente não informado';
        const serviceName = app.service_name || 'Serviço não informado';
        const clientPhone = app.client_phone || '';
        const notes = app.notes || '';
        const whatsappSent = app.whatsapp_sent || false;

        // Formatar preço
        const formattedPrice = price.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        // Escapar caracteres especiais para o onclick
        const safeClientPhone = clientPhone.toString().replace(/'/g, "\\'");
        const safeClientName = clientName.toString().replace(/'/g, "\\'");
        const safeServiceName = serviceName.toString().replace(/'/g, "\\'");

        // Função para criar mensagem padrão do WhatsApp
        const createWhatsAppMessage = () => {
            const message = encodeURIComponent(
                `Olá ${clientName}! Lembrete do seu agendamento:\n` +
                `📅 Data: ${date}\n` +
                `⏰ Horário: ${time}\n` +
                `💇 Serviço: ${serviceName}\n` +
                `💰 Valor: R$ ${formattedPrice}\n\n` +
                `Por favor, confirme sua presença.`
            );
            return message;
        };

        if (isCompact) {
            return `
                <div class="client-item" data-appointment-id="${appId}">
                    <div class="client-info">
                        <div class="client-name">${clientName}</div>
                        <div class="client-service">${serviceName}</div>
                        <div class="client-details">
                            <span class="client-date"><i class="far fa-calendar"></i> ${date}</span>
                            <span class="client-time"><i class="far fa-clock"></i> ${time}</span>
                            <span class="client-price"><i class="fas fa-money-bill-wave"></i> R$ ${formattedPrice}</span>
                        </div>
                    </div>
                    <div class="client-actions">
                        <span class="client-status ${statusClass}">${statusText}</span>
                        ${clientPhone ? `
                        <button class="action-btn action-whatsapp ${whatsappSent ? 'whatsapp-sent' : ''}"
                                onclick="sendWhatsAppReminder(${appId}, '${safeClientPhone}', '${safeClientName}', '${date}', '${time}', '${safeServiceName}', ${price})"
                                title="${whatsappSent ? 'Lembrete já enviado' : 'Enviar lembrete por WhatsApp'}">
                            <i class="fab fa-whatsapp"></i>
                            ${whatsappSent ? '<span class="whatsapp-check">✓</span>' : ''}
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="client-item" data-appointment-id="${appId}">
                    <div class="client-info">
                        <div class="client-name">${clientName}</div>
                        <div class="client-service">${serviceName}</div>
                        <div class="client-details">
                            <span class="client-phone"><i class="fas fa-phone"></i> ${formatPhone(clientPhone)}</span>
                            <span class="client-date"><i class="far fa-calendar"></i> ${date}</span>
                            <span class="client-time"><i class="far fa-clock"></i> ${time}</span>
                            <span class="client-price"><i class="fas fa-money-bill-wave"></i> R$ ${formattedPrice}</span>
                            ${notes ? `<span class="client-notes"><i class="fas fa-sticky-note"></i> ${notes}</span>` : ''}
                        </div>
                    </div>
                    <div class="client-actions">
                        <span class="client-status ${statusClass}">${statusText}</span>
                        ${clientPhone ? `
                        <button class="action-btn action-whatsapp ${whatsappSent ? 'whatsapp-sent' : ''}"
                                onclick="sendWhatsAppReminder(${appId}, '${safeClientPhone}', '${safeClientName}', '${date}', '${time}', '${safeServiceName}', ${price})"
                                title="${whatsappSent ? 'Lembrete já enviado' : 'Enviar lembrete por WhatsApp'}">
                            <i class="fab fa-whatsapp"></i>
                            ${whatsappSent ? '<span class="whatsapp-check">✓</span>' : ''}
                        </button>
                        ` : ''}
                        <button class="action-btn action-view"
                                onclick="viewAppointmentDetails(${appId})"
                                title="Ver detalhes">
                            <i class="fas fa-eye"></i>
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

// Buscar agendamentos com filtros
export async function searchAppointments(filters = {}) {
    setLoading(true);

    try {
        const requestData = {
            date: filters.date || new Date().toISOString().split('T')[0],
            offset: filters.offset || 0,
            limit: filters.limit || 100
        };

        // Adicionar status apenas se especificado
        if (filters.status && filters.status !== 'all') {
            requestData.status = filters.status;
        }

        const response = await fetch('/appointments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (response.ok) {
            const data = await response.json();
            appState.appointments = data.appointments || [];
            appState.pagination = data.pagination || {};

            if (allAppointmentsCount) {
                allAppointmentsCount.textContent = data.pagination?.total || appState.appointments.length;
            }
            if (allAppointmentsList) {
                renderAppointments(appState.appointments, allAppointmentsList, false);
            }
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

// Função para enviar lembrete por WhatsApp - MELHORADA
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

// Marcar WhatsApp como enviado (mock - você precisa implementar a API)
async function markWhatsAppAsSent(appointmentId) {
    try {
        // Aqui você faria uma requisição para sua API
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
            appointment.whatsapp_sent = true;
        }
    } catch (error) {
        console.error('Erro ao marcar WhatsApp como enviado:', error);
    }
}

// Ver detalhes do agendamento - MELHORADA
export function viewAppointmentDetails(appointmentId) {
    const appointment = getAppointmentById(appointmentId);
    if (!appointment) {
        showAlert('Agendamento não encontrado', 'error');
        return;
    }

    // Formatar os dados para exibição
    const detailsHTML = `
        <div class="appointment-details">
            <h3><i class="fas fa-calendar-check"></i> Detalhes do Agendamento</h3>

            <div class="detail-row">
                <strong>Cliente:</strong>
                <span>${appointment.client_name || 'Não informado'}</span>
            </div>

            <div class="detail-row">
                <strong>Telefone:</strong>
                <span>${formatPhone(appointment.client_phone || '')}</span>
            </div>

            <div class="detail-row">
                <strong>Serviço:</strong>
                <span>${appointment.service_name || 'Não informado'}</span>
            </div>

            <div class="detail-row">
                <strong>Data:</strong>
                <span>${formatDate(appointment.appointment_date || '')}</span>
            </div>

            <div class="detail-row">
                <strong>Horário:</strong>
                <span>${appointment.appointment_time || 'Não informado'}</span>
            </div>

            <div class="detail-row">
                <strong>Valor:</strong>
                <span>R$ ${(parseFloat(appointment.price) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>

            <div class="detail-row">
                <strong>Status:</strong>
                <span class="status-${appointment.status || 'scheduled'}">
                    ${appointment.status === 'scheduled' ? 'Agendado' :
                      appointment.status === 'confirmed' ? 'Confirmado' :
                      appointment.status === 'completed' ? 'Concluído' :
                      appointment.status === 'cancelled' ? 'Cancelado' :
                      appointment.status === 'no_show' ? 'Não Compareceu' : 'Agendado'}
                </span>
            </div>

            ${appointment.notes ? `
            <div class="detail-row">
                <strong>Observações:</strong>
                <span>${appointment.notes}</span>
            </div>
            ` : ''}

            <div class="detail-row">
                <strong>WhatsApp:</strong>
                <span>${appointment.whatsapp_sent ? '✅ Enviado' : '❌ Não enviado'}</span>
            </div>

            <div class="detail-row">
                <strong>Criado em:</strong>
                <span>${new Date(appointment.created_at || '').toLocaleString('pt-BR')}</span>
            </div>
        </div>
    `;

    // Usar um modal ou alerta customizado
    showModal('Detalhes do Agendamento', detailsHTML);
}

// Função para mostrar modal (simples)
function showModal(title, content) {
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

// Função para recarregar agendamentos
export function reloadAppointments() {
    return loadAppointments();
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
            if (!app.appointment_date) return false;
            const appDate = new Date(app.appointment_date).toISOString().split('T')[0];
            return appDate === filterDate;
        });
    }

    // Filtrar por nome do cliente
    if (filters.clientName) {
        const searchTerm = filters.clientName.toLowerCase();
        filtered = filtered.filter(app => {
            const name = (app.client_name || '').toLowerCase();
            const fullName = (app.client_full_name || '').toLowerCase();
            return name.includes(searchTerm) || fullName.includes(searchTerm);
        });
    }

    // Filtrar por serviço
    if (filters.serviceName) {
        const searchTerm = filters.serviceName.toLowerCase();
        filtered = filtered.filter(app =>
            (app.service_name || '').toLowerCase().includes(searchTerm)
        );
    }

    return filtered;
}

// Exportar funções para o escopo global
window.loadAppointments = loadAppointments;
window.renderAppointments = renderAppointments;
window.getAppointmentById = getAppointmentById;
window.searchAppointments = searchAppointments;
window.sendWhatsAppReminder = sendWhatsAppReminder;
window.viewAppointmentDetails = viewAppointmentDetails;
window.reloadAppointments = reloadAppointments;
window.filterLocalAppointments = filterLocalAppointments;
window.showModal = showModal;
