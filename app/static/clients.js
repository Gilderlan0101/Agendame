import { appState } from './appState.js';
import { clientsCount, clientsList } from './domElements.js';
import { setLoading, showAlert, formatPhone } from './utils.js';
import { sendWhatsAppToClient } from './whatsapp.js';

// Carregar clientes
export async function loadClients(isDashboard = false) {
    setLoading(true);

    try {
        const response = await fetch('/clients', {
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const clients = data.clients || [];

            if (!isDashboard) {
                clientsCount.textContent = clients.length;
                renderClients(clients);
            }
        }

    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        if (!isDashboard) {
            showAlert('Erro ao carregar clientes', 'error');
        }
    } finally {
        setLoading(false);
    }
}

// Renderizar clientes
export function renderClients(clients) {
    if (!clientsList) return;

    if (!clients || clients.length === 0) {
        clientsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>Nenhum cliente cadastrado</h3>
                <p>Os clientes aparecerão aqui após fazerem agendamentos</p>
            </div>
        `;
        return;
    }

    clientsList.innerHTML = clients.map(client => {
        return `
            <div class="client-item">
                <div class="client-name">${client.full_name || 'Cliente'}</div>
                <div class="client-phone">${formatPhone(client.phone)}</div>
                <div class="client-service">${client.last_service || 'Nenhum serviço'}</div>
                <div class="client-date">${client.total_appointments || 0} agendamentos</div>
                <div class="client-actions">
                    <button class="action-btn action-whatsapp" onclick="sendWhatsAppToClient('${client.phone}')">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}
