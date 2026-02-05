import { appState } from './appState.js';
import { servicesCount, servicesList } from './domElements.js';
import { setLoading, showAlert } from './utils.js';

// Carregar serviços DA EMPRESA (rota administrativa)
export async function loadServices() {
    setLoading(true);

    try {
        console.log('Carregando serviços da empresa...');
        console.log('Token no appState:', appState.token ? 'Presente' : 'Ausente');

        // Rota administrativa para empresa logada
        // IMPORTANTE: Remover o Authorization header se estiver usando cookies
        const response = await fetch(`/agendame/services`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
                // NÃO enviar Authorization header se usar cookies
                // 'Authorization': `Bearer ${appState.token}`
            },
            credentials: 'include', // IMPORTANTE: Envia cookies
        });

        console.log('Resposta status:', response.status);
        console.log('Resposta headers:', response.headers);

        if (response.ok) {
            const data = await response.json();
            console.log('Dados recebidos:', data);

            // Formatar os serviços para o formato esperado
            appState.services = Array.isArray(data) ? data : (data.services || data || []);

            // Atualizar contador
            if (servicesCount) {
                servicesCount.textContent = appState.services.length;
            }

            renderServices(appState.services);

        } else {
            let errorMessage = 'Erro ao carregar serviços';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
                // Tentar ler como texto se não for JSON
                const text = await response.text();
                console.error('Erro texto:', text);
                errorMessage = `Erro ${response.status}: ${response.statusText}`;
            }
            console.error('Erro completo:', errorMessage);
            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error('Erro no catch:', error);
        showAlert(error.message || 'Erro ao carregar serviços', 'error');

        // Mostrar estado vazio
        if (servicesList) {
            servicesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro ao carregar serviços</h3>
                    <p>${error.message || 'Não foi possível carregar os serviços'}</p>
                    <button class="btn btn-primary" onclick="window.loadServices()">
                        Tentar novamente
                    </button>
                </div>
            `;
        }
    } finally {
        setLoading(false);
    }
}

// Renderizar serviços - ATUALIZADO para lidar com diferentes formatos
export function renderServices(services) {
    if (!servicesList) {
        return;
    }

    console.log('Renderizando serviços:', services);

    if (!services || services.length === 0) {
        servicesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-cut"></i>
                <h3>Nenhum serviço cadastrado</h3>
                <p>Adicione seus primeiros serviços para começar a receber agendamentos</p>
                <button class="btn btn-primary" onclick="openNewServiceModal()">
                    <i class="fas fa-plus"></i> Adicionar Serviço
                </button>
            </div>
        `;
        return;
    }

    servicesList.innerHTML = services.map(service => {
        // Log para debug
        console.log('Processando serviço:', service);

        // Extrair dados com fallbacks para diferentes formatos de API
        const serviceId = service.id || service.service_id || 0;
        const serviceName = service.name || service.service_name || 'Serviço sem nome';
        const serviceDescription = service.description || '';
        const servicePrice = parseFloat(service.price || service.service_price || 0);
        const serviceDuration = service.duration_minutes || service.duration || 60;
        const serviceOrder = service.order || 0;
        const isActive = service.is_active !== undefined ? service.is_active :
                        (service.active !== undefined ? service.active : true);

        const statusClass = isActive === false ? 'status-inactive' : 'status-active';
        const statusText = isActive === false ? 'Inativo' : 'Ativo';

        return `
            <div class="service-item" data-service-id="${serviceId}">
                <div class="service-info">
                    <div class="service-header">
                        <div class="service-name">${serviceName}</div>
                        <div class="service-price">R$ ${servicePrice.toFixed(2)}</div>
                    </div>
                    ${serviceDescription ? `<div class="service-description">${serviceDescription}</div>` : ''}
                    <div class="service-details">
                        <span class="service-duration"><i class="far fa-clock"></i> ${serviceDuration}min</span>
                        <span class="service-order"><i class="fas fa-sort-numeric-up"></i> Ordem: ${serviceOrder}</span>
                    </div>
                </div>
                <div class="service-actions">
                    <span class="service-status ${statusClass}">${statusText}</span>
                    <div class="action-buttons">
                        <button class="action-btn action-edit"
                                onclick="editService(${serviceId})"
                                title="Editar serviço">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${isActive === false ? `
                        <button class="action-btn action-activate"
                                onclick="activateService(${serviceId})"
                                title="Ativar serviço">
                            <i class="fas fa-check"></i>
                        </button>
                        ` : `
                        <button class="action-btn action-deactivate"
                                onclick="deactivateService(${serviceId})"
                                title="Desativar serviço">
                            <i class="fas fa-ban"></i>
                        </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    console.log('Serviços renderizados com sucesso');
}

// Editar serviço
export function editService(serviceId) {
    console.log('Editando serviço ID:', serviceId);

    const service = appState.services.find(s => {
        const id = s.id || s.service_id;
        return id === parseInt(serviceId);
    });

    if (!service) {
        showAlert('Serviço não encontrado', 'error');
        return;
    }

    // Preencher formulário com valores do serviço
    const serviceName = service.name || service.service_name || '';
    const serviceDescription = service.description || '';
    const servicePrice = parseFloat(service.price || service.service_price || 0);
    const serviceDuration = service.duration_minutes || service.duration || 60;
    const serviceOrder = service.order || 0;
    const serviceActive = service.is_active !== undefined ? service.is_active :
                         (service.active !== undefined ? service.active : true);

    document.getElementById('editServiceId').value = serviceId;
    document.getElementById('editServiceName').value = serviceName;
    document.getElementById('editServiceDescription').value = serviceDescription;
    document.getElementById('editServicePrice').value = servicePrice;
    document.getElementById('editServiceDuration').value = serviceDuration;
    document.getElementById('editServiceOrder').value = serviceOrder;
    document.getElementById('editServiceActive').checked = serviceActive;

    // Mostrar modal
    const modal = document.getElementById('editServiceModal');
    if (modal) {
        modal.classList.add('show');
        console.log('Modal de edição aberto');
    }
}

// Salvar serviço editado - CORRIGIDO
export async function saveEditedService() {
    const serviceId = document.getElementById('editServiceId').value;
    const serviceName = document.getElementById('editServiceName').value.trim();
    const serviceDescription = document.getElementById('editServiceDescription').value.trim();
    const servicePrice = parseFloat(document.getElementById('editServicePrice').value);
    const serviceDuration = parseInt(document.getElementById('editServiceDuration').value);
    const serviceOrder = parseInt(document.getElementById('editServiceOrder').value) || 0;
    const serviceActive = document.getElementById('editServiceActive').checked;

    console.log('Salvando serviço editado:', {
        serviceId, serviceName, serviceDescription, servicePrice, serviceDuration, serviceOrder, serviceActive
    });

    // Validação
    if (!serviceName || isNaN(servicePrice) || servicePrice <= 0 || isNaN(serviceDuration) || serviceDuration <= 0) {
        showAlert('Preencha todos os campos obrigatórios corretamente', 'error');
        return;
    }

    setLoading(true);

    try {
        // Preparar dados para a API
        const requestData = {
            name: serviceName,
            description: serviceDescription || null,
            price: servicePrice.toFixed(2), // Enviar como string
            duration_minutes: serviceDuration,
            order: serviceOrder,
            is_active: serviceActive
        };

        console.log('Enviando dados:', requestData);

        // Enviar para API
        const response = await fetch(`/agendame/update/service/${serviceId}`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
                // NÃO enviar Authorization se usar cookies
                // 'Authorization': `Bearer ${appState.token}`
            },
            body: JSON.stringify(requestData),
            credentials: 'include', // IMPORTANTE
        });

        console.log('Resposta status:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('Resultado:', result);

            showAlert(result.message || 'Serviço atualizado com sucesso!', 'success');

            // Fechar modal
            const modal = document.getElementById('editServiceModal');
            if (modal) modal.classList.remove('show');

            // Recarregar serviços
            await loadServices();

        } else {
            let errorMessage = 'Erro ao atualizar serviço';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
                console.error('Erro detalhado:', errorData);
            } catch (e) {
                // Tentar ler como texto
                const text = await response.text();
                console.error('Erro texto:', text);
                errorMessage = `Erro ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error('Erro ao atualizar serviço:', error);
        showAlert(error.message || 'Erro ao atualizar serviço', 'error');
    } finally {
        setLoading(false);
    }
}

// Abrir modal de novo serviço
export function openNewServiceModal() {
    const modal = document.getElementById('newServiceModal');
    if (modal) {
        // Limpar formulário
        const form = document.getElementById('newServiceForm');
        if (form) form.reset();

        // Definir valores padrão
        document.getElementById('serviceOrder').value = 0;
        document.getElementById('serviceDuration').value = 60;
        document.getElementById('serviceActive').checked = true;

        modal.classList.add('show');
        console.log('Modal de novo serviço aberto');
    }
}

// Salvar novo serviço - CORRIGIDO
export async function saveNewService() {
    const serviceName = document.getElementById('serviceName').value.trim();
    const serviceDescription = document.getElementById('serviceDescription').value.trim();
    const servicePrice = parseFloat(document.getElementById('servicePrice').value);
    const serviceDuration = parseInt(document.getElementById('serviceDuration').value);
    const serviceOrder = parseInt(document.getElementById('serviceOrder').value) || 0;
    const serviceActive = document.getElementById('serviceActive').checked;

    console.log('Criando novo serviço:', {
        serviceName, serviceDescription, servicePrice, serviceDuration, serviceOrder, serviceActive
    });

    // Validação
    if (!serviceName || isNaN(servicePrice) || servicePrice <= 0 || isNaN(serviceDuration) || serviceDuration <= 0) {
        showAlert('Preencha todos os campos obrigatórios corretamente', 'error');
        return;
    }

    setLoading(true);

    try {
        // Preparar dados para a API
        const requestData = {
            name: serviceName,
            description: serviceDescription || null,
            price: servicePrice.toFixed(2), // Enviar como string
            duration_minutes: serviceDuration,
            order: serviceOrder,
            is_active: serviceActive
        };

        console.log('Enviando dados:', requestData);

        // Enviar para API
        const response = await fetch('/agendame/register/service', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
                // NÃO enviar Authorization se usar cookies
                // 'Authorization': `Bearer ${appState.token}`
            },
            body: JSON.stringify(requestData),
            credentials: 'include', // IMPORTANTE
        });

        console.log('Resposta status:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('Resultado:', result);

            showAlert('Serviço cadastrado com sucesso!', 'success');

            // Fechar modal
            const modal = document.getElementById('newServiceModal');
            if (modal) modal.classList.remove('show');

            // Limpar formulário
            const form = document.getElementById('newServiceForm');
            if (form) form.reset();

            // Recarregar serviços
            await loadServices();

        } else {
            let errorMessage = 'Erro ao cadastrar serviço';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
                console.error('Erro detalhado:', errorData);
            } catch (e) {
                // Tentar ler como texto
                const text = await response.text();
                console.error('Erro texto:', text);
                errorMessage = `Erro ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error('Erro ao cadastrar serviço:', error);
        showAlert(error.message || 'Erro ao cadastrar serviço', 'error');
    } finally {
        setLoading(false);
    }
}

// Ativar serviço
export async function activateService(serviceId) {
    console.log('Ativando serviço ID:', serviceId);

    if (!confirm('Deseja ativar este serviço?')) return;

    setLoading(true);

    try {
        // Enviar requisição para ativar
        const response = await fetch(`/agendame/update/service/${serviceId}`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                is_active: true
            })
        });

        console.log('Resposta ativar:', response.status);

        if (response.ok) {
            const result = await response.json();
            showAlert(result.message || 'Serviço ativado com sucesso!', 'success');
            await loadServices();
        } else {
            let errorMessage = 'Erro ao ativar serviço';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
            } catch (e) {
                errorMessage = `Erro ${response.status}`;
            }
            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error('Erro ao ativar serviço:', error);
        showAlert(error.message || 'Erro ao ativar serviço', 'error');
    } finally {
        setLoading(false);
    }
}

// Desativar/remover serviço
export async function deactivateService(serviceId) {
    console.log('Desativando/removendo serviço ID:', serviceId);

    const action = confirm('Deseja desativar este serviço? (Clique OK para desativar, Cancelar para remover)');

    setLoading(true);

    try {
        if (action === true) {
            // Desativar (marcar como inativo)
            console.log('Desativando serviço...');
            const response = await fetch(`/agendame/update/service/${serviceId}`, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    is_active: false
                })
            });

            console.log('Resposta desativar:', response.status);

            if (response.ok) {
                const result = await response.json();
                showAlert(result.message || 'Serviço desativado com sucesso!', 'success');
            } else {
                let errorMessage = 'Erro ao desativar serviço';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorMessage;
                } catch (e) {
                    errorMessage = `Erro ${response.status}`;
                }
                throw new Error(errorMessage);
            }
        } else {
            // Remover completamente
            console.log('Removendo serviço...');
            const deleteResponse = await fetch(`/agendame/remove/service/${serviceId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                },
                credentials: 'include',
            });

            console.log('Resposta deletar:', deleteResponse.status);

            if (deleteResponse.ok) {
                const result = await deleteResponse.json();
                showAlert(result.message || 'Serviço removido com sucesso!', 'success');
            } else {
                let errorMessage = 'Erro ao remover serviço';
                try {
                    const errorData = await deleteResponse.json();
                    errorMessage = errorData.detail || errorMessage;
                } catch (e) {
                    errorMessage = `Erro ${deleteResponse.status}`;
                }
                throw new Error(errorMessage);
            }
        }

        // Recarregar serviços
        await loadServices();

    } catch (error) {
        console.error('Erro:', error);
        showAlert(error.message || 'Erro ao processar serviço', 'error');
    } finally {
        setLoading(false);
    }
}

// Exportar funções para escopo global
window.loadServices = loadServices;
window.renderServices = renderServices;
window.editService = editService;
window.saveEditedService = saveEditedService;
window.openNewServiceModal = openNewServiceModal;
window.saveNewService = saveNewService;
window.activateService = activateService;
window.deactivateService = deactivateService;
