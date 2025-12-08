// Estado da aplicação
const appState = {
    token: localStorage.getItem('agendame_token'),
    user: null,
    companyInfo: null,
    services: [],
    clients: [],
    appointments: [],
    todayAppointments: [],
    isLoading: false,
    companySlug: null
};

// Elementos DOM
const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');
const loginForm = document.getElementById('loginForm');
const alertMessage = document.getElementById('alertMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');

// Elementos de estatísticas
const todayRevenue = document.getElementById('todayRevenue');
const todayAppointmentsEl = document.getElementById('todayAppointments');
const totalClients = document.getElementById('totalClients');
const activeServices = document.getElementById('activeServices');
const nextAppointmentsCount = document.getElementById('nextAppointmentsCount');
const nextAppointmentsList = document.getElementById('nextAppointmentsList');
const allAppointmentsCount = document.getElementById('allAppointmentsCount');
const allAppointmentsList = document.getElementById('allAppointmentsList');
const servicesCount = document.getElementById('servicesCount');
const servicesList = document.getElementById('servicesList');
const clientsCount = document.getElementById('clientsCount');
const clientsList = document.getElementById('clientsList');

// Elementos da empresa
const companyName = document.getElementById('companyName');
const companyType = document.getElementById('companyType');
const companyPhone = document.getElementById('companyPhone');
const companyWhatsApp = document.getElementById('companyWhatsApp');
const companySlug = document.getElementById('companySlug');
const companyUrl = document.getElementById('companyUrl');

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado. Verificando token...');
    if (appState.token && appState.token !== 'null') {
        console.log('Token encontrado:', appState.token.substring(0, 20) + '...');
        loadUserData();
    } else {
        console.log('Nenhum token encontrado. Mostrando login.');
        showLogin();
    }

    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Configurar logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Configurar tabs
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Configurar filtro de data para agendamentos
    const dateFilter = document.getElementById('appointmentDateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            loadAppointments(this.value);
        });
    }

    // Configurar formulários de modais
    const newServiceForm = document.getElementById('newServiceForm');
    if (newServiceForm) {
        newServiceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveNewService();
        });
    }

    const editServiceForm = document.getElementById('editServiceForm');
    if (editServiceForm) {
        editServiceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveEditedService();
        });
    }

    const newAppointmentForm = document.getElementById('newAppointmentForm');
    if (newAppointmentForm) {
        newAppointmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveNewAppointment();
        });
    }

    // Fechar modais ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
}

// Mostrar/ocultar loading
function setLoading(loading) {
    appState.isLoading = loading;
    if (loading) {
        loadingSpinner.classList.add('show');
    } else {
        loadingSpinner.classList.remove('show');
    }
}

// Mostrar alerta
function showAlert(message, type = 'success') {
    alertMessage.textContent = message;
    alertMessage.className = `alert alert-${type} show`;

    setTimeout(() => {
        alertMessage.classList.remove('show');
    }, 5000);
}

// Mostrar página de login
function showLogin() {
    console.log('Mostrando página de login');
    loginPage.style.display = 'flex';
    dashboardPage.style.display = 'none';
}

// Mostrar dashboard
function showDashboard() {
    console.log('Mostrando dashboard');
    loginPage.style.display = 'none';
    dashboardPage.style.display = 'block';
    loadDashboardData();
}

// Trocar de tab
function switchTab(tabId) {
    // Remover classe active de todas as tabs
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Ativar tab selecionada
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (tabBtn) tabBtn.classList.add('active');

    const tabContent = document.getElementById(`${tabId}Tab`);
    if (tabContent) tabContent.classList.add('active');

    // Carregar dados específicos da tab
    switch(tabId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'appointments':
            loadAppointments();
            break;
        case 'services':
            loadServices();
            break;
        case 'clients':
            loadClients();
            break;
        case 'company':
            loadCompanyInfo();
            break;
    }
}

// Login
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('Tentando fazer login...');

    // Mostrar loading
    setLoading(true);

    try {
        const formData = new URLSearchParams();
        formData.append('username', document.getElementById('email').value);
        formData.append('password', document.getElementById('password').value);

        console.log('Enviando requisição para /auth/login');
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        console.log('Resposta recebida:', response.status);

        if (!response.ok) {
            let errorMessage = 'Credenciais inválidas';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
            } catch (e) {}
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('Login bem-sucedido! Token:', data.access_token ? data.access_token.substring(0, 20) + '...' : 'não encontrado');

        // Salvar token
        appState.token = data.access_token;
        localStorage.setItem('agendame_token', data.access_token);

        // Salvar dados do usuário
        appState.user = {
            id: data.user_id,
            username: data.username,
            email: data.email,
            business_name: data.business_name,
            business_slug: data.business_slug
        };

        // Atualizar nome no menu
        userName.textContent = data.username || data.email || 'Usuário';

        showAlert('Login realizado com sucesso!', 'success');
        showDashboard();

    } catch (error) {
        console.error('Erro no login:', error);
        showAlert(error.message || 'Erro ao fazer login', 'error');
    } finally {
        setLoading(false);
    }
});

// Logout
function handleLogout() {
    if (confirm('Deseja sair da sua conta?')) {
        localStorage.removeItem('agendame_token');
        appState.token = null;
        appState.user = null;
        showAlert('Logout realizado com sucesso!', 'success');
        showLogin();
        loginForm.reset();
    }
}

// Carregar dados do usuário
async function loadUserData() {
    setLoading(true);

    try {
        console.log('Carregando dados do usuário...');
        const response = await fetch('/auth/me', {
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Sessão expirada');
        }

        const data = await response.json();
        appState.user = data;
        userName.textContent = data.username || data.email || 'Usuário';
        console.log('Dados do usuário carregados:', data);

        // Obter o slug da empresa para usar nas rotas
        await getCompanySlug();

        showDashboard();

    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        showAlert('Sessão expirada. Faça login novamente.', 'error');
        localStorage.removeItem('agendame_token');
        showLogin();
    } finally {
        setLoading(false);
    }
}

// Obter slug da empresa
async function getCompanySlug() {
    try {
        // Buscar informações da empresa usando a rota que você tem
        if (appState.user && appState.user.username) {
            // Tentar usar o username como slug (baseado no seu exemplo)
            appState.companySlug = appState.user.username;

            // Verificar se a empresa existe
            const response = await fetch(`/agendame/${appState.companySlug}/info`, {
                headers: {
                    'Authorization': `Bearer ${appState.token}`
                }
            });

            if (response.ok) {
                const companyData = await response.json();
                appState.companyInfo = companyData.company;
                console.log('Informações da empresa carregadas:', companyData.company);
            } else {
                console.log('Empresa não encontrada com slug:', appState.companySlug);
                // Tentar usar o email sem o domínio
                if (appState.user.email) {
                    const possibleSlug = appState.user.email.split('@')[0];
                    appState.companySlug = possibleSlug;
                }
            }
        }
    } catch (error) {
        console.error('Erro ao obter slug da empresa:', error);
    }
}

// Carregar dados do dashboard
async function loadDashboardData() {
    setLoading(true);

    try {
        console.log('Carregando dados do dashboard...');

        // Se não temos o slug, tentar obtê-lo
        if (!appState.companySlug && appState.user) {
            await getCompanySlug();
        }

        // Se temos slug, carregar dados da empresa
        if (appState.companySlug) {
            // Carregar informações da empresa
            const companyResponse = await fetch(`/agendame/${appState.companySlug}/info`, {
                headers: {
                    'Authorization': `Bearer ${appState.token}`
                }
            });

            if (companyResponse.ok) {
                const companyData = await companyResponse.json();
                appState.companyInfo = companyData.company;
                appState.services = companyData.services || [];

                console.log('Dados da empresa carregados:', companyData.company.name);
                console.log('Serviços carregados:', appState.services.length);

                // Atualizar estatísticas com dados básicos
                updateDashboardStats();
            }
        }

        // Carregar serviços do painel administrativo
        const servicesResponse = await fetch('/agendame/services', {
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (servicesResponse.ok) {
            const servicesData = await servicesResponse.json();
            // Esta rota retorna array direto, não precisa de .services
            appState.services = servicesData || [];
            console.log('Serviços administrativos carregados:', appState.services.length);
        }

        // Carregar agendamentos do dia usando a rota correta
        const today = new Date().toISOString().split('T')[0];

        // Primeiro, precisamos de uma rota para agendamentos do dia
        // Vamos tentar buscar todos os agendamentos e filtrar
        const appointmentsResponse = await fetch(`/appointments?date=${today}`, {
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (appointmentsResponse.ok) {
            const appointmentsData = await appointmentsResponse.json();
            appState.todayAppointments = appointmentsData.appointments || [];
            console.log('Agendamentos de hoje:', appState.todayAppointments.length);
        } else {
            // Se a rota não existir, tentar obter da empresa
            if (appState.companySlug) {
                // Você precisará criar uma rota para agendamentos por empresa
                // Por enquanto, vamos deixar vazio
                appState.todayAppointments = [];
            }
        }

        // Carregar clientes
        const clientsResponse = await fetch('/clients', {
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (clientsResponse.ok) {
            const clientsData = await clientsResponse.json();
            appState.clients = clientsData.clients || [];
            console.log('Clientes carregados:', appState.clients.length);
        }

        // Atualizar estatísticas
        updateDashboardStats();

        // Carregar próximos agendamentos
        loadNextAppointments();

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showAlert('Erro ao carregar dados do dashboard', 'error');
    } finally {
        setLoading(false);
    }
}

// Atualizar estatísticas do dashboard
function updateDashboardStats() {
    // Ganho hoje
    const todayRevenueValue = appState.todayAppointments.reduce((sum, app) => {
        return sum + (parseFloat(app.price) || 0);
    }, 0);
    todayRevenue.textContent = `R$ ${todayRevenueValue.toFixed(2)}`;

    // Agendamentos hoje
    todayAppointmentsEl.textContent = appState.todayAppointments.length;

    // Total de clientes
    totalClients.textContent = appState.clients.length;

    // Serviços ativos
    const activeServicesCount = appState.services.filter(s => s.is_active !== false).length;
    activeServices.textContent = activeServicesCount;
}

// Carregar próximos agendamentos
function loadNextAppointments() {
    const today = new Date().toISOString().split('T')[0];

    // Filtrar agendamentos de hoje e do futuro
    const upcomingAppointments = appState.todayAppointments.filter(app => {
        const appDate = app.appointment_date || today;
        return appDate >= today && app.status !== 'completed' && app.status !== 'cancelled';
    });

    // Ordenar por horário
    upcomingAppointments.sort((a, b) => {
        const timeA = a.appointment_time || '23:59';
        const timeB = b.appointment_time || '23:59';
        return timeA.localeCompare(timeB);
    });

    nextAppointmentsCount.textContent = upcomingAppointments.length;
    renderAppointments(upcomingAppointments.slice(0, 5), nextAppointmentsList, true);
}

// Carregar todos os agendamentos
async function loadAppointments(date = null) {
    setLoading(true);

    try {
        let url = '/appointments';
        if (date) {
            url += `?date=${date}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            appState.appointments = data.appointments || [];
            allAppointmentsCount.textContent = appState.appointments.length;
            renderAppointments(appState.appointments, allAppointmentsList, false);
        } else {
            // Se a rota não existir, mostrar mensagem
            showAlert('Rota de agendamentos não disponível', 'error');
            allAppointmentsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>Rota não disponível</h3>
                    <p>A rota de agendamentos ainda não foi implementada</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        showAlert('Erro ao carregar agendamentos', 'error');
    } finally {
        setLoading(false);
    }
}

// Renderizar agendamentos
function renderAppointments(appointments, container, isCompact = true) {
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

        if (isCompact) {
            return `
                <div class="client-item">
                    <div class="client-name">${app.client_name || app.client_full_name || 'Cliente'}</div>
                    <div class="client-service">${app.service_name || 'Serviço'}</div>
                    <div class="client-date">${date} ${time}</div>
                    <div class="client-price">R$ ${price.toFixed(2)}</div>
                    <div class="client-status ${statusClass}">${statusText}</div>
                    <div class="client-actions">
                        <button class="action-btn action-whatsapp" onclick="sendWhatsAppReminder(${app.id}, '${app.client_phone}')">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="client-item">
                    <div class="client-name">${app.client_name || app.client_full_name || 'Cliente'}</div>
                    <div class="client-phone">${formatPhone(app.client_phone)}</div>
                    <div class="client-service">${app.service_name || 'Serviço'}</div>
                    <div class="client-date">${date} ${time}</div>
                    <div class="client-price">R$ ${price.toFixed(2)}</div>
                    <div class="client-status ${statusClass}">${statusText}</div>
                    <div class="client-actions">
                        <button class="action-btn action-whatsapp" onclick="sendWhatsAppReminder(${app.id}, '${app.client_phone}')">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="action-btn action-remove" onclick="cancelAppointment(${app.id})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }
    }).join('');
}

// Carregar serviços
async function loadServices() {
    setLoading(true);

    try {
        // Usar a rota de serviços da empresa
        if (appState.companySlug) {
            const response = await fetch(`/agendame/${appState.companySlug}/services`, {
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
        console.error('Erro ao carregar serviços:', error);
        showAlert('Erro ao carregar serviços', 'error');
    } finally {
        setLoading(false);
    }
}

// Renderizar serviços
function renderServices(services) {
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

// Carregar clientes
async function loadClients() {
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
            clientsCount.textContent = clients.length;
            renderClients(clients);
        }

    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        showAlert('Erro ao carregar clientes', 'error');
    } finally {
        setLoading(false);
    }
}

// Renderizar clientes
function renderClients(clients) {
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

// Carregar informações da empresa
async function loadCompanyInfo() {
    setLoading(true);

    try {
        // Primeiro, buscar dados do usuário
        const userResponse = await fetch('/auth/me', {
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (userResponse.ok) {
            const userData = await userResponse.json();

            // Tentar buscar informações da empresa usando o slug
            if (appState.companySlug) {
                const companyResponse = await fetch(`/agendame/${appState.companySlug}/info`, {
                    headers: {
                        'Authorization': `Bearer ${appState.token}`
                    }
                });

                if (companyResponse.ok) {
                    const companyData = await companyResponse.json();
                    const company = companyData.company;

                    companyName.value = company.name || '';
                    companyType.value = company.type || '';
                    companyPhone.value = company.phone || '';
                    companyWhatsApp.value = company.whatsapp || '';
                    companySlug.value = company.slug || '';

                    const baseUrl = window.location.origin;
                    companyUrl.textContent = `${baseUrl}/agendame/${company.slug || ''}`;
                }
            }

            // Se não conseguiu buscar pela rota da empresa, usar dados do usuário
            if (!companyName.value && userData.username) {
                companyName.value = userData.username || 'Minha Empresa';
                companyType.value = 'Barbearia/Salão';
                companySlug.value = userData.username || 'minha-empresa';

                const baseUrl = window.location.origin;
                companyUrl.textContent = `${baseUrl}/agendame/${userData.username || 'minha-empresa'}`;
            }
        }

    } catch (error) {
        console.error('Erro ao carregar informações da empresa:', error);
        // Usar dados do usuário como fallback
        if (appState.user) {
            companyName.value = appState.user.business_name || appState.user.username || 'Minha Empresa';
            companyType.value = appState.user.business_type || 'Barbearia/Salão';
            companyPhone.value = appState.user.phone || '';
            companyWhatsApp.value = appState.user.whatsapp || '';
            companySlug.value = appState.user.business_slug || appState.user.username || 'minha-empresa';

            const baseUrl = window.location.origin;
            companyUrl.textContent = `${baseUrl}/agendame/${appState.user.business_slug || appState.user.username || 'minha-empresa'}`;
        }
    } finally {
        setLoading(false);
    }
}

// Abrir modal de novo serviço
function openNewServiceModal() {
    document.getElementById('newServiceModal').classList.add('show');
}

// Salvar novo serviço
async function saveNewService() {
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
            loadDashboardData();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao cadastrar serviço');
        }

    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        setLoading(false);
    }
}

// Editar serviço
function editService(serviceId) {
    const service = appState.services.find(s => s.id === serviceId);
    if (!service) return;

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
async function saveEditedService() {
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
        // Você precisará criar uma rota PUT para atualizar serviços
        // Por enquanto, vamos usar a rota que você tem
        showAlert('Funcionalidade de edição ainda não implementada', 'warning');
        closeModal('editServiceModal');

        // Se você tiver uma rota PUT, use:
        /*
        const response = await fetch(`/agendame/services/${serviceId}`, {
            method: 'PUT',
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
            showAlert('Serviço atualizado com sucesso!', 'success');
            closeModal('editServiceModal');
            loadServices();
            loadDashboardData();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao atualizar serviço');
        }
        */

    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        setLoading(false);
    }
}

// Ativar/desativar serviço
async function toggleServiceStatus(serviceId, activate) {
    setLoading(true);

    try {
        // Você precisará criar uma rota PATCH para alternar status
        showAlert(`Funcionalidade de ${activate ? 'ativação' : 'desativação'} ainda não implementada`, 'warning');

        // Se você tiver uma rota PATCH, use:
        /*
        const response = await fetch(`/agendame/services/${serviceId}/toggle`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (response.ok) {
            showAlert(`Serviço ${activate ? 'ativado' : 'desativado'} com sucesso!`, 'success');
            loadServices();
            loadDashboardData();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao alterar status do serviço');
        }
        */

    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        setLoading(false);
    }
}

function activateService(serviceId) {
    toggleServiceStatus(serviceId, true);
}

function deactivateService(serviceId) {
    toggleServiceStatus(serviceId, false);
}

// Abrir modal de novo agendamento
async function openNewAppointmentModal() {
    // Carregar serviços para o select
    const serviceSelect = document.getElementById('appointmentService');
    if (!serviceSelect) return;

    serviceSelect.innerHTML = '<option value="">Selecione um serviço...</option>';

    appState.services.forEach(service => {
        if (service.is_active !== false) {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.name} - R$ ${(parseFloat(service.price) || 0).toFixed(2)}`;
            serviceSelect.appendChild(option);
        }
    });

    // Definir data padrão para hoje
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointmentDate').value = today;

    document.getElementById('newAppointmentModal').classList.add('show');
}

// Salvar novo agendamento
async function saveNewAppointment() {
    const clientName = document.getElementById('appointmentClientName').value;
    const clientPhone = document.getElementById('appointmentClientPhone').value;
    const serviceId = document.getElementById('appointmentService').value;
    const appointmentDate = document.getElementById('appointmentDate').value;
    const appointmentTime = document.getElementById('appointmentTime').value;
    const notes = document.getElementById('appointmentNotes').value;

    if (!clientName || !clientPhone || !serviceId || !appointmentDate || !appointmentTime) {
        showAlert('Preencha todos os campos obrigatórios', 'error');
        return;
    }

    setLoading(true);

    try {
        // Primeiro, buscar o slug da empresa
        if (!appState.companySlug) {
            await getCompanySlug();
        }

        if (!appState.companySlug) {
            throw new Error('Empresa não configurada');
        }

        // Usar a rota de agendamento via link
        const response = await fetch(`/agendame/${appState.companySlug}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name: clientName,
                phone: clientPhone,
                service_id: parseInt(serviceId),
                preferred_time: appointmentTime,
                total_appointments: 0,
                notes: notes
            })
        });

        if (response.ok) {
            showAlert('Agendamento criado com sucesso!', 'success');
            closeModal('newAppointmentModal');
            document.getElementById('newAppointmentForm').reset();
            loadAppointments();
            loadDashboardData();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao criar agendamento');
        }

    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        setLoading(false);
    }
}

// Cancelar agendamento
async function cancelAppointment(appointmentId) {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;

    setLoading(true);

    try {
        // Você precisará criar uma rota para cancelar agendamentos
        showAlert('Funcionalidade de cancelamento ainda não implementada', 'warning');

        // Se você tiver uma rota PATCH, use:
        /*
        const response = await fetch(`/appointments/${appointmentId}/cancel`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (response.ok) {
            showAlert('Agendamento cancelado com sucesso!', 'success');
            loadAppointments();
            loadDashboardData();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao cancelar agendamento');
        }
        */

    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        setLoading(false);
    }
}

// Enviar lembrete via WhatsApp
function sendWhatsAppReminder(appointmentId, phone) {
    // Buscar informações do agendamento
    const appointment = appState.appointments.find(a => a.id === appointmentId) ||
                       appState.todayAppointments.find(a => a.id === appointmentId);

    if (!appointment) {
        showAlert('Agendamento não encontrado', 'error');
        return;
    }

    const message = `Olá ${appointment.client_name || appointment.client_full_name || 'Cliente'}! ☺️ Lembramos que seu agendamento para ${appointment.service_name} está marcado para ${formatDate(appointment.appointment_date)} às ${appointment.appointment_time}. Estamos te esperando!`;
    sendWhatsApp(phone, message);
}

// Enviar mensagem WhatsApp para cliente
function sendWhatsAppToClient(phone) {
    const message = `Olá! Esta é uma mensagem do ${companyName.value || 'nossa empresa'}. Como podemos ajudá-lo hoje?`;
    sendWhatsApp(phone, message);
}

// Função geral para enviar WhatsApp
function sendWhatsApp(phone, message) {
    if (!phone) {
        showAlert('Número de telefone inválido', 'error');
        return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
        showAlert('Número de telefone inválido', 'error');
        return;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappURL, '_blank');
}

// Salvar informações da empresa
async function saveCompanyInfo() {
    setLoading(true);

    try {
        // Você precisará criar uma rota para atualizar informações da empresa
        showAlert('Funcionalidade de atualização de empresa ainda não implementada', 'warning');

        // Se você tiver uma rota PUT, use:
        /*
        const response = await fetch('/company/update', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                business_name: companyName.value,
                business_type: companyType.value,
                phone: companyPhone.value,
                whatsapp: companyWhatsApp.value
            })
        });

        if (response.ok) {
            showAlert('Informações da empresa salvas com sucesso!', 'success');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao salvar informações');
        }
        */

    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        setLoading(false);
    }
}

// Copiar URL da empresa
function copyCompanyUrl() {
    const url = companyUrl.textContent;
    navigator.clipboard.writeText(url).then(() => {
        showAlert('URL copiada para a área de transferência!', 'success');
    });
}

// Fechar modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// Atualizar dados
function refreshData() {
    switchTab('dashboard');
}

// Funções utilitárias
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
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
        return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    } else if (digits.length === 11) {
        return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
    }
    return phone;
}

// Configurar data inicial no filtro
const dateFilter = document.getElementById('appointmentDateFilter');
if (dateFilter) {
    dateFilter.value = new Date().toISOString().split('T')[0];
}

// Exportar funções para o escopo global
window.switchTab = switchTab;
window.openNewServiceModal = openNewServiceModal;
window.saveNewService = saveNewService;
window.editService = editService;
window.saveEditedService = saveEditedService;
window.activateService = activateService;
window.deactivateService = deactivateService;
window.openNewAppointmentModal = openNewAppointmentModal;
window.saveNewAppointment = saveNewAppointment;
window.cancelAppointment = cancelAppointment;
window.sendWhatsAppReminder = sendWhatsAppReminder;
window.sendWhatsAppToClient = sendWhatsAppToClient;
window.saveCompanyInfo = saveCompanyInfo;
window.copyCompanyUrl = copyCompanyUrl;
window.closeModal = closeModal;
window.refreshData = refreshData;
