import { appState } from './appState.js';
import { servicesCount, servicesList } from './domElements.js';
import { setLoading, showAlert } from './utils.js';

// Carregar serviços
export async function loadServices() {
    setLoading(true);

    try {
        // Usar a rota de serviços da empresa
        if (appState.companySlug) {
            const response = await fetch(`/agendame/services`, {
                headers: {
                    'Authorization': `Bearer ${appState.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                appState.services = data.services || [];
                servicesCount.textContent = appState.services.length;
                renderServices(appState.services);
            }
        } else {
            // Usar rota administrativa como fallback
            const response = await fetch('/agendame/services', {
                headers: {
                    'Authorization': `Bearer ${appState.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                appState.services = data || [];
                servicesCount.textContent = appState.services.length;
                renderServices(appState.services);
            }
        }

    } catch (error) {
        showAlert('Erro ao carregar serviços', 'error');
    } finally {
        setLoading(false);
    }
}

// Renderizar serviços
export function renderServices(services) {
    if (!servicesList) return;

    if (!services || services.length === 0) {
        servicesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-cut"></i>
                <h3>Nenhum serviço cadastrado</h3>
                <p>Adicione seus primeiros serviços para começar a receber agendamentos</p>
            </div>
        `;
        return;
    }

    servicesList.innerHTML = services.map(service => {
        const statusClass = (service.is_active === false) ? 'status-inactive' : 'status-active';
        const statusText = (service.is_active === false) ? 'Inativo' : 'Ativo';
        const price = parseFloat(service.price) || 0;

        return `
            <div class="service-item">
                <div class="service-name">${service.name}</div>
                <div class="service-price">R$ ${price.toFixed(2)}</div>
                <div class="service-duration">${service.duration_minutes || service.duration || 60}min</div>
                <div class="service-status ${statusClass}">${statusText}</div>
                <div class="client-actions">
                    <button class="action-btn action-edit" onclick="editService(${service.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn ${service.is_active === false ? 'action-edit' : 'action-remove'}"
                            onclick="${service.is_active === false ? `activateService(${service.id})` : `deactivateService(${service.id})`}">
                        <i class="fas ${service.is_active === false ? 'fa-check' : 'fa-ban'}"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Editar serviço
export function editService(serviceId) {
    const service = appState.services.find(s => s.id === parseInt(serviceId));
    if (!service) {
        showAlert('Serviço não encontrado', 'error');
        return;
    }

    document.getElementById('editServiceId').value = service.id;
    document.getElementById('editServiceName').value = service.name;
    document.getElementById('editServiceDescription').value = service.description || '';
    document.getElementById('editServicePrice').value = service.price;
    document.getElementById('editServiceDuration').value = service.duration_minutes || service.duration || 60;
    document.getElementById('editServiceOrder').value = service.order || 0;
    document.getElementById('editServiceActive').checked = service.is_active !== false;

    document.getElementById('editServiceModal').classList.add('show');
}

// Salvar serviço editado
export async function saveEditedService() {
    const serviceId = document.getElementById('editServiceId').value;
    const serviceName = document.getElementById('editServiceName').value;
    const serviceDescription = document.getElementById('editServiceDescription').value;
    const servicePrice = parseFloat(document.getElementById('editServicePrice').value);
    const serviceDuration = parseInt(document.getElementById('editServiceDuration').value);
    const serviceOrder = parseInt(document.getElementById('editServiceOrder').value);
    const serviceActive = document.getElementById('editServiceActive').checked;

    if (!serviceName || !servicePrice || !serviceDuration) {
        showAlert('Preencha todos os campos obrigatórios', 'error');
        return;
    }

    setLoading(true);

    try {
        // Criar objeto com os nomes de campo que o backend espera
        const requestData = {
            service_id: parseInt(serviceId),
            service_name: serviceName,
            description: serviceDescription,
            price: servicePrice.toString(),
            duration_minutes: serviceDuration,
            order: serviceOrder,
            is_active: serviceActive
        };

        // Remover campos vazios ou undefined
        Object.keys(requestData).forEach(key => {
            if (requestData[key] === undefined || requestData[key] === '') {
                delete requestData[key];
            }
        });

        const response = await fetch(`/agendame/update/service/${serviceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Erro ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        showAlert(result.message || 'Serviço atualizado com sucesso!', 'success');
        closeModal('editServiceModal');
        loadServices();

    } catch (error) {
        console.error('Erro ao atualizar serviço:', error);
        showAlert(error.message || 'Erro ao atualizar serviço', 'error');
    } finally {
        setLoading(false);
    }
}

// Remove um serviço da lista de serviço
// export async function(serviceID){
//     const = btnRemoevService = document.getElementById()
// }

// Abrir modal de novo serviço
export function openNewServiceModal() {
    document.getElementById('newServiceModal').classList.add('show');
}

// Salvar novo serviço
export async function saveNewService() {
    const serviceName = document.getElementById('serviceName').value;
    const serviceDescription = document.getElementById('serviceDescription').value;
    const servicePrice = parseFloat(document.getElementById('servicePrice').value);
    const serviceDuration = parseInt(document.getElementById('serviceDuration').value);
    const serviceOrder = parseInt(document.getElementById('serviceOrder').value);
    const serviceActive = document.getElementById('serviceActive').checked;

    if (!serviceName || !servicePrice || !serviceDuration) {
        showAlert('Preencha todos os campos obrigatórios', 'error');
        return;
    }

    setLoading(true);

    try {

        const response = await fetch('/agendame/register/service', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: serviceName,
                description: serviceDescription,
                price: servicePrice,
                duration_minutes: serviceDuration,
                order: serviceOrder,
                is_active: serviceActive
            })
        });

        if (response.ok) {
            showAlert('Serviço cadastrado com sucesso!', 'success');
            closeModal('newServiceModal');
            document.getElementById('newServiceForm').reset();
            loadServices();
        } else {
            const errorData = await response.json();
            console.debug(errorData);
            throw new Error(errorData.detail || 'Erro ao cadastrar serviço');
        }

    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        setLoading(false);
    }
}

function toggleServiceStatus(serviceId, activate) {
    // Implementar toggle de status
    showAlert(`Funcionalidade de ${activate ? 'ativação' : 'desativação'} ainda não implementada`, 'warning');
}

export function activateService(serviceId) {
    toggleServiceStatus(serviceId, true);
}

export async function deactivateService(serviceId) {
    toggleServiceStatus(serviceId, false);

    // Envia uma requicição para remove um serviço
    try {
        const response = await fetch(`/agendame/remove/service/${serviceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                serviceID: serviceId,

            })
        });

        if (response.ok) {
            await loadServices()
            showAlert('Serviço removido com sucesso!', 'success');

        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao remove serviço');
        }

    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        setLoading(false);
    }

}
