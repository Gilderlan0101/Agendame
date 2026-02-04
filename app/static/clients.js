// clients.js - Gerenciamento de clientes com UI melhorada

import { appState } from './appState.js';
import { clientsCount, clientsList } from './domElements.js';
import { formatDate, formatPhone, setLoading, showAlert } from './utils.js';
import { sendWhatsAppToClient } from './whatsapp.js';

// ================================
// CARREGAMENTO DE CLIENTES
// ================================

/**
 * Carrega a lista de clientes
 */
export async function loadClients(isDashboard = false) {
    setLoading(true);

    try {
        const response = await fetch('https://agendame.onrender.com/clients', {
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            const clients = data.clients || [];

            // Atualizar appState
            appState.clients = clients;

            if (!isDashboard) {
                updateClientsCount(clients.length);
                renderClients(clients);
            }

            return clients;

        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao carregar clientes');
        }

    } catch (error) {
        console.error('Erro ao carregar clientes:', error);

        if (!isDashboard) {
            showAlert(error.message || 'Erro ao carregar clientes', 'error');
            renderEmptyState('Erro ao carregar clientes', 'fa-exclamation-triangle', 'error');
        }

        return [];

    } finally {
        setLoading(false);
    }
}

// ================================
// RENDERIZAÇÃO DE CLIENTES
// ================================

/**
 * Renderiza a lista de clientes com UI melhorada
 */
export function renderClients(clients) {
    if (!clientsList) return;

    if (!clients || clients.length === 0) {
        renderEmptyState(
            'Nenhum cliente cadastrado',
            'fa-users',
            'info',
            'Os clientes aparecerão aqui após fazerem agendamentos'
        );
        return;
    }

    clientsList.innerHTML = `
        <div class="clients-container">
            <div class="clients-header">
                <div class="client-column">Cliente</div>
                <div class="client-column">Contato</div>
                <div class="client-column">Última Visita</div>
                <div class="client-column">Agendamentos</div>
                <div class="client-column">Ações</div>
            </div>
            <div class="clients-body">
                ${clients.map(client => createClientCard(client)).join('')}
            </div>
        </div>
    `;

    // Adicionar eventos aos botões
    addClientEvents();
}

/**
 * Cria o card de um cliente
 */
function createClientCard(client) {
    const {
        id = '',
        full_name = 'Cliente',
        email = '',
        phone = '',
        created_at = '',
        last_appointment = '',
        total_appointments = 0,
        total_spent = 0,
        notes = ''
    } = client;

    const formattedPhone = formatPhone(phone);
    const formattedDate = formatDate(last_appointment) || 'Nunca';
    const initials = getClientInitials(full_name);
    const clientType = getClientType(total_appointments);
    const clientStatus = getClientStatus(last_appointment);

    return `
        <div class="client-card" data-client-id="${id}">
            <div class="client-info">
                <div class="client-avatar ${clientType}">
                    <span class="avatar-initials">${initials}</span>
                    <span class="avatar-status ${clientStatus}"></span>
                </div>
                <div class="client-details">
                    <h4 class="client-name">${full_name}</h4>
                    ${email ? `<p class="client-email"><i class="fas fa-envelope"></i> ${email}</p>` : ''}
                    ${notes ? `<p class="client-notes"><i class="fas fa-sticky-note"></i> ${notes}</p>` : ''}
                </div>
            </div>

            <div class="client-contact">
                ${phone ? `
                <div class="contact-item">
                    <i class="fas fa-phone"></i>
                    <span>${formattedPhone}</span>
                </div>
                ` : ''}
                <div class="contact-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Desde ${formatDate(created_at)}</span>
                </div>
            </div>

            <div class="client-visit">
                <div class="visit-info">
                    <i class="fas fa-history"></i>
                    <span>Última visita:</span>
                    <strong>${formattedDate}</strong>
                </div>
                ${last_appointment ? `
                <div class="visit-time">
                    <i class="far fa-clock"></i>
                    <span>${getTimeAgo(last_appointment)}</span>
                </div>
                ` : ''}
            </div>

            <div class="client-stats">
                <div class="stat-item">
                    <div class="stat-icon ${clientType}">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${total_appointments}</div>
                        <div class="stat-label">Agendamentos</div>
                    </div>
                </div>
                ${total_spent > 0 ? `
                <div class="stat-item">
                    <div class="stat-icon revenue">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${total_spent.toFixed(2)}</div>
                        <div class="stat-label">Total Gasto</div>
                    </div>
                </div>
                ` : ''}
            </div>

            <div class="client-actions">
                ${phone ? `
                <button class="btn-action btn-whatsapp" data-client-id="${id}" data-phone="${phone}" title="Enviar WhatsApp">
                    <i class="fab fa-whatsapp"></i>
                    <span>WhatsApp</span>
                </button>
                ` : ''}

                <button class="btn-action btn-edit" data-client-id="${id}" title="Editar cliente">
                    <i class="fas fa-edit"></i>
                    <span>Editar</span>
                </button>

                <button class="btn-action btn-history" data-client-id="${id}" title="Ver histórico">
                    <i class="fas fa-history"></i>
                    <span>Histórico</span>
                </button>
            </div>
        </div>
    `;
}

// ================================
// FUNÇÕES AUXILIARES
// ================================

/**
 * Atualiza o contador de clientes
 */
function updateClientsCount(count) {
    if (clientsCount) {
        clientsCount.textContent = count;
    }
}

/**
 * Renderiza estado vazio/erro
 */
function renderEmptyState(title, icon, type = 'info', message = '') {
    const iconClass = type === 'error' ? 'fa-exclamation-triangle text-danger' :
                     type === 'warning' ? 'fa-exclamation-circle text-warning' :
                     'fa-users text-muted';

    const iconColor = type === 'error' ? '#ef4444' :
                     type === 'warning' ? '#f59e0b' : '#9ca3af';

    clientsList.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon" style="color: ${iconColor}">
                <i class="fas ${icon}"></i>
            </div>
            <h3>${title}</h3>
            ${message ? `<p>${message}</p>` : ''}
            <button class="btn btn-primary" onclick="loadClients()">
                <i class="fas fa-sync-alt"></i> Tentar Novamente
            </button>
        </div>
    `;
}

/**
 * Obtém iniciais do cliente
 */
function getClientInitials(name) {
    if (!name) return '?';

    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

/**
 * Determina o tipo do cliente baseado em histórico
 */
function getClientType(appointmentsCount) {
    if (appointmentsCount >= 10) return 'vip';
    if (appointmentsCount >= 5) return 'regular';
    if (appointmentsCount >= 1) return 'new';
    return 'inactive';
}

/**
 * Determina status do cliente baseado na última visita
 */
function getClientStatus(lastAppointment) {
    if (!lastAppointment) return 'inactive';

    const lastVisit = new Date(lastAppointment);
    const now = new Date();
    const diffDays = Math.floor((now - lastVisit) / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return 'active';
    if (diffDays <= 30) return 'recent';
    if (diffDays <= 90) return 'away';
    return 'inactive';
}

/**
 * Calcula tempo desde a última visita
 */
function getTimeAgo(dateString) {
    if (!dateString) return 'Nunca';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
    return `${Math.floor(diffDays / 365)} anos atrás`;
}

/**
 * Adiciona eventos aos botões dos clientes
 */
function addClientEvents() {
    // WhatsApp
    document.querySelectorAll('.btn-whatsapp').forEach(btn => {
        btn.addEventListener('click', function() {
            const phone = this.dataset.phone;
            const clientId = this.dataset.clientId;
            const client = appState.clients?.find(c => c.id == clientId);

            if (client) {
                sendWhatsAppToClient(phone, client.full_name);
            }
        });
    });

    // Editar cliente
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const clientId = this.dataset.clientId;
            editClient(clientId);
        });
    });

    // Ver histórico
    document.querySelectorAll('.btn-history').forEach(btn => {
        btn.addEventListener('click', function() {
            const clientId = this.dataset.clientId;
            viewClientHistory(clientId);
        });
    });
}

// ================================
// FUNÇÕES DE CLIENTE
// ================================

/**
 * Edita informações do cliente
 */
export async function editClient(clientId) {
    const client = appState.clients?.find(c => c.id == clientId);

    if (!client) {
        showAlert('Cliente não encontrado', 'error');
        return;
    }

    // Criar modal de edição
    const modalHTML = `
        <div class="modal" id="editClientModal">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-edit"></i> Editar Cliente</h3>
                        <button class="modal-close" onclick="closeModal('editClientModal')">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="editClientForm">
                            <input type="hidden" id="editClientId" value="${clientId}">

                            <div class="form-group">
                                <label for="editClientName">Nome Completo *</label>
                                <input type="text" id="editClientName" class="form-control"
                                       value="${client.full_name || ''}" required>
                            </div>

                            <div class="form-group">
                                <label for="editClientEmail">E-mail</label>
                                <input type="email" id="editClientEmail" class="form-control"
                                       value="${client.email || ''}">
                            </div>

                            <div class="form-group">
                                <label for="editClientPhone">Telefone *</label>
                                <input type="tel" id="editClientPhone" class="form-control"
                                       value="${client.phone || ''}" required>
                            </div>

                            <div class="form-group">
                                <label for="editClientNotes">Observações</label>
                                <textarea id="editClientNotes" class="form-control" rows="3">${client.notes || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeModal('editClientModal')">Cancelar</button>
                        <button class="btn btn-primary" onclick="saveClientChanges(${clientId})">Salvar Alterações</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Adicionar modal ao DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Mostrar modal
    const modal = document.getElementById('editClientModal');
    modal.classList.add('show');
}

/**
 * Salva alterações do cliente
 */
export async function saveClientChanges(clientId) {
    try {
        const clientName = document.getElementById('editClientName')?.value;
        const clientEmail = document.getElementById('editClientEmail')?.value;
        const clientPhone = document.getElementById('editClientPhone')?.value;
        const clientNotes = document.getElementById('editClientNotes')?.value;

        if (!clientName || !clientPhone) {
            showAlert('Nome e telefone são obrigatórios', 'error');
            return;
        }

        setLoading(true);

        const response = await fetch(`/clients/${clientId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name: clientName,
                email: clientEmail,
                phone: clientPhone,
                notes: clientNotes
            })
        });

        if (response.ok) {
            showAlert('Cliente atualizado com sucesso!', 'success');
            closeModal('editClientModal');
            await loadClients();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao atualizar cliente');
        }

    } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        showAlert(error.message, 'error');
    } finally {
        setLoading(false);
    }
}

/**
 * Visualiza histórico do cliente
 */
export async function viewClientHistory(clientId) {
    try {
        const response = await fetch(`/clients/${clientId}/appointments`, {
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const appointments = data.appointments || [];

            // Criar modal de histórico
            const historyHTML = createHistoryModal(clientId, appointments);

            // Adicionar ao DOM
            document.body.insertAdjacentHTML('beforeend', historyHTML);

            // Mostrar modal
            const modal = document.getElementById('clientHistoryModal');
            modal.classList.add('show');
        }

    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        showAlert('Erro ao carregar histórico do cliente', 'error');
    }
}

/**
 * Cria modal de histórico do cliente
 */
function createHistoryModal(clientId, appointments) {
    const client = appState.clients?.find(c => c.id == clientId);

    return `
        <div class="modal" id="clientHistoryModal">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-history"></i> Histórico de ${client?.full_name || 'Cliente'}</h3>
                        <button class="modal-close" onclick="closeModal('clientHistoryModal')">×</button>
                    </div>
                    <div class="modal-body">
                        ${appointments.length > 0 ? `
                            <div class="timeline">
                                ${appointments.map(apt => `
                                    <div class="timeline-item">
                                        <div class="timeline-marker ${getAppointmentStatusClass(apt.status)}"></div>
                                        <div class="timeline-content">
                                            <div class="timeline-date">${formatDate(apt.date)} às ${apt.time}</div>
                                            <div class="timeline-title">${apt.service_name}</div>
                                            <div class="timeline-desc">
                                                <span class="status-badge ${getAppointmentStatusClass(apt.status)}">
                                                    ${getAppointmentStatusText(apt.status)}
                                                </span>
                                                <span class="timeline-price">R$ ${parseFloat(apt.price || 0).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="empty-history">
                                <i class="fas fa-history"></i>
                                <p>Nenhum agendamento no histórico</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ================================
// FUNÇÕES AUXILIARES DE STATUS
// ================================

function getAppointmentStatusClass(status) {
    const classes = {
        'scheduled': 'status-scheduled',
        'confirmed': 'status-confirmed',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled',
        'no_show': 'status-no-show'
    };
    return classes[status] || 'status-scheduled';
}

function getAppointmentStatusText(status) {
    const texts = {
        'scheduled': 'Agendado',
        'confirmed': 'Confirmado',
        'completed': 'Concluído',
        'cancelled': 'Cancelado',
        'no_show': 'Não Compareceu'
    };
    return texts[status] || 'Agendado';
}

// ================================
// EXPORTAÇÕES GLOBAIS
// ================================

window.loadClients = loadClients;
window.renderClients = renderClients;
window.editClient = editClient;
window.saveClientChanges = saveClientChanges;
window.viewClientHistory = viewClientHistory;
