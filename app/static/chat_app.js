// chat_app.js - Aplicação de chat para agendamento

// Obter slug da empresa da URL
function getCompanySlugFromURL() {
    // Remove a base URL e pega o último segmento
    const path = window.location.pathname;
    const pathParts = path.split('/').filter(part => part.trim() !== '');

    // Se acessar /agendame/{slug}
    if (pathParts[0] === 'agendame' && pathParts.length > 1) {
        return pathParts[1];
    }
    // Se acessar diretamente /{slug}
    else if (pathParts.length === 1) {
        return pathParts[0];
    }
    // Se não encontrar, usa um fallback
    return null;
}

// Inicializar com o slug da empresa
let companySlug = getCompanySlugFromURL();

// Se não encontrou na URL, tenta pegar do template se estiver disponível
if (!companySlug && window.companySlugFromTemplate) {
    companySlug = window.companySlugFromTemplate;
}

// Remover query parameters se existirem
if (companySlug && companySlug.includes('?')) {
    companySlug = companySlug.split('?')[0];
}

// Estado do chat
const chatState = {
    companySlug: companySlug, // Armazena o slug
    step: -1,
    userName: "",
    userPhone: "",
    selectedService: null,
    selectedDate: null,
    selectedTime: null,
    clientId: null,
    companyInfo: null,
    services: [],
    availableDates: [],
    availableTimes: [],
    isLoading: false
};

// Elementos DOM
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const inputContainer = document.getElementById('inputContainer');
const typingIndicator = document.getElementById('typingIndicator');
const successContainer = document.getElementById('successContainer');
const appointmentDetails = document.getElementById('appointmentDetails');
const newBookingBtn = document.getElementById('newBookingBtn');
const businessName = document.getElementById('businessName');
const businessType = document.getElementById('businessType');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const warningMessage = document.getElementById('warningMessage');
const warningText = document.getElementById('warningText');
const loadingSpinner = document.getElementById('loadingSpinner');
const helpBtn = document.getElementById('helpBtn');

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Inicializando chat para empresa:', companySlug);

    // Verificar se tem slug
    if (!chatState.companySlug) {
        console.error('Não foi possível identificar o slug da empresa na URL');
        showErrorMessage('Empresa não encontrada. Verifique o link de agendamento.');
        return;
    }

    try {
        // Carregar informações da empresa
        await loadCompanyInfo();

        // Configurar eventos
        setupEventListeners();

        // Iniciar o chat
        startChat();

    } catch (error) {
        console.error('Erro ao inicializar:', error);
        showErrorMessage('Erro ao carregar informações da empresa. Por favor, tente novamente.');
    }
});

// ============================================
// CONFIGURAÇÃO DE EVENTOS
// ============================================

function setupEventListeners() {
    // Enviar mensagem
    sendBtn.addEventListener('click', handleSendMessage);

    // Enter no input
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });

    // Habilitar botão quando digitar
    chatInput.addEventListener('input', function() {
        if (chatInput.value.trim().length > 0) {
            sendBtn.disabled = false;
        } else {
            sendBtn.disabled = true;
        }
    });

    // Botões de ação
    newBookingBtn.addEventListener('click', resetChat);
    helpBtn.addEventListener('click', showHelpOptions);
}

// ============================================
// FUNÇÕES DE CARREGAMENTO DE DADOS
// ============================================

// Carregar informações da empresa
async function loadCompanyInfo() {
    showLoading(true);
    try {
        console.log(`Buscando informações da empresa: ${companySlug}`);

        const response = await fetch(`/services/${companySlug}?search_by=auto&is_active=true`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Empresa não encontrada');
        }

        const data = await response.json();
        console.log('Dados da empresa recebidos:', data);

        chatState.companyInfo = {
            name: data.company,
            slug: data.company_slug,
            username: data.company_username
        };
        chatState.services = data.services || [];

        // Atualizar header
        businessName.textContent = chatState.companyInfo.name;
        businessType.textContent = chatState.companyInfo.username || 'Empresa';

        console.log(`Empresa carregada: ${chatState.companyInfo.name}`);
        console.log(`Serviços disponíveis: ${chatState.services.length}`);

    } catch (error) {
        console.error('Erro ao carregar empresa:', error);
        showErrorMessage(error.message || 'Empresa não encontrada. Verifique o link de agendamento.');
        throw error;
    } finally {
        showLoading(false);
    }
}

// Buscar horários disponíveis para um serviço e data
async function getAvailableTimes(serviceId, date) {
    showLoading(true);
    try {
        console.log(`Buscando horários para serviço ${serviceId} na data ${date}`);

        const response = await fetch(`/services/${companySlug}/available-times?service_id=${serviceId}&date=${date}&search_by=auto`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar horários disponíveis');
        }

        const data = await response.json();
        console.log('Horários disponíveis:', data.available_times);

        return data.available_times || [];

    } catch (error) {
        console.error('Erro ao carregar horários:', error);
        showErrorMessage('Erro ao carregar horários disponíveis');
        return [];
    } finally {
        showLoading(false);
    }
}

// Gerar próximas datas (próximos 7 dias)
function generateNextDates() {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        // Não incluir domingo (0) e sábado (6) se quiser
        if (date.getDay() !== 0 && date.getDay() !== 6) {
            dates.push(date.toISOString().split('T')[0]);
        }
    }

    return dates;
}

// ============================================
// FLUXO DO CHAT
// ============================================

// Iniciar o chat
function startChat() {
    if (!chatState.companyInfo) {
        addMessageToChat("Desculpe, não foi possível carregar as informações da empresa. Por favor, tente novamente mais tarde.", "bot");
        return;
    }

    // Saudação inicial
    addMessageToChat(`Olá! Bem-vindo(a) ao sistema de agendamento da ${chatState.companyInfo.name}.`, "bot");

    // Aguardar e enviar a primeira pergunta
    setTimeout(() => {
        askForName();
    }, 800);
}

// Perguntar o nome
function askForName() {
    showTypingIndicator();

    setTimeout(() => {
        hideTypingIndicator();
        hideMessages();
        addMessageToChat("Para começarmos, por favor, informe seu nome completo:", "bot");
        chatState.step = 0;
        enableInput();
        chatInput.focus();
        chatInput.placeholder = "Digite seu nome completo...";
    }, 1000);
}

// Perguntar o telefone
function askForPhone() {
    showTypingIndicator();

    setTimeout(() => {
        hideTypingIndicator();
        addMessageToChat(`Perfeito, ${chatState.userName}! Agora preciso do seu telefone com DDD (apenas números):`, "bot");
        chatState.step = 1;
        enableInput();
        chatInput.focus();
        chatInput.placeholder = "Ex: 11999998888";
    }, 800);
}

// Mostrar opções de serviço
function askForService() {
    showTypingIndicator();

    setTimeout(() => {
        hideTypingIndicator();

        if (chatState.services.length === 0) {
            showNoServicesMessage();
            return;
        }

        addMessageToChat("Agora, qual serviço você gostaria de agendar?", "bot");

        // Criar opções de serviços
        let servicesHtml = '';

        chatState.services.forEach(service => {
            if (service.is_active) {
                const durationText = service.duration_minutes ? `${service.duration_minutes}min` : '60min';
                const priceFormatted = parseFloat(service.price).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });

                servicesHtml += `
                    <button class="option-btn" data-service-id="${service.id}">
                        <div>
                            <div class="service-name">${service.name}</div>
                            <div class="service-duration">${durationText}</div>
                        </div>
                        <div class="service-price">R$ ${priceFormatted}</div>
                    </button>
                `;
            }
        });

        addMessageToChat(`
            <div class="chat-options" id="serviceOptions">
                ${servicesHtml}
            </div>
        `, "bot");

        // Adicionar event listeners aos botões de serviço
        setTimeout(() => {
            document.querySelectorAll('#serviceOptions .option-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const serviceId = parseInt(this.getAttribute('data-service-id'));
                    selectService(serviceId);
                });
            });
        }, 100);

        chatState.step = 2;
        disableInput();

    }, 800);
}

// Mostrar opções de data
async function askForDate() {
    showTypingIndicator();

    setTimeout(async () => {
        hideTypingIndicator();

        const selectedService = chatState.services.find(s => s.id === chatState.selectedService);

        // Gerar próximas datas
        const dates = generateNextDates();

        if (dates.length === 0) {
            addMessageToChat("Infelizmente não há datas disponíveis para agendamento nos próximos dias.", "bot");

            addMessageToChat(`
                <div class="chat-options">
                    <button class="option-btn" id="contactBusiness">Entrar em contato</button>
                </div>
            `, "bot");

            setTimeout(() => {
                document.getElementById('contactBusiness').addEventListener('click', () => {
                    showContactOptions();
                });
            }, 100);
            return;
        }

        addMessageToChat(`Perfeito! Agora escolha uma data para o serviço: ${selectedService.name}`, "bot");

        // Criar opções de datas
        let datesHtml = '';

        dates.forEach(date => {
            const dateObj = new Date(date);
            const day = dateObj.getDate().toString().padStart(2, '0');
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const weekday = getWeekdayName(dateObj.getDay());
            const formattedDate = `${day}/${month}`;

            datesHtml += `
                <button class="date-btn" data-date="${date}">
                    ${weekday}<br>
                    <strong>${formattedDate}</strong>
                </button>
            `;
        });

        addMessageToChat(`
            <div class="date-selector" id="dateOptions">
                ${datesHtml}
            </div>
        `, "bot");

        // Adicionar event listeners aos botões de data
        setTimeout(() => {
            document.querySelectorAll('#dateOptions .date-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const date = this.getAttribute('data-date');
                    selectDate(date);
                });
            });
        }, 100);

        chatState.step = 3;

    }, 800);
}

// Mostrar opções de horário
async function askForTime() {
    showTypingIndicator();

    setTimeout(async () => {
        hideTypingIndicator();

        const selectedService = chatState.services.find(s => s.id === chatState.selectedService);
        const formattedDate = formatDateForDisplay(chatState.selectedDate);

        // Buscar horários disponíveis
        const times = await getAvailableTimes(chatState.selectedService, chatState.selectedDate);

        if (times.length === 0) {
            addMessageToChat(`Infelizmente não há horários disponíveis para ${selectedService.name} na data ${formattedDate}.`, "bot");

            addMessageToChat(`
                <div class="chat-options">
                    <button class="option-btn" id="chooseAnotherDate">Escolher outra data</button>
                    <button class="option-btn" id="chooseAnotherService">Escolher outro serviço</button>
                </div>
            `, "bot");

            setTimeout(() => {
                document.getElementById('chooseAnotherDate').addEventListener('click', () => {
                    askForDate();
                });
                document.getElementById('chooseAnotherService').addEventListener('click', () => {
                    askForService();
                });
            }, 100);
            return;
        }

        addMessageToChat(`Excelente! Agora escolha um horário para ${formattedDate}:`, "bot");

        // Criar opções de horários
        let timesHtml = '';

        times.forEach(time => {
            // Verificar se é um horário recomendado (primeiros horários do dia)
            const hour = parseInt(time.split(':')[0]);
            const isRecommended = hour >= 9 && hour <= 11;

            timesHtml += `
                <button class="time-btn ${isRecommended ? 'recommended' : ''}" data-time="${time}">
                    ${time}
                </button>
            `;
        });

        addMessageToChat(`
            <div class="time-selector" id="timeOptions">
                ${timesHtml}
            </div>
        `, "bot");

        // Adicionar event listeners aos botões de horário
        setTimeout(() => {
            document.querySelectorAll('#timeOptions .time-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const time = this.getAttribute('data-time');
                    selectTime(time);
                });
            });
        }, 100);

        chatState.step = 4;

    }, 800);
}

// Criar agendamento
async function createAppointment() {
    showLoading(true);

    try {
        const selectedService = chatState.services.find(s => s.id === chatState.selectedService);

        const appointmentData = {
            service_id: chatState.selectedService,
            appointment_date: chatState.selectedDate,
            appointment_time: chatState.selectedTime,
            client_name: chatState.userName,
            client_phone: chatState.userPhone,
            search_by: "auto",
            notes: `Agendamento online via chat - ${selectedService.name}`
        };

        console.log('Criando agendamento:', appointmentData);

        const response = await fetch(`/services/${companySlug}/book`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao criar agendamento');
        }

        const data = await response.json();
        console.log('Agendamento criado:', data);

        // Mostrar confirmação
        showLoading(false);
        completeBooking(data);

    } catch (error) {
        showLoading(false);
        console.error('Erro ao criar agendamento:', error);

        addMessageToChat(`Desculpe, ocorreu um erro ao criar seu agendamento: ${error.message}`, "bot");

        // Oferecer opção de recomeçar
        addMessageToChat(`
            <div class="chat-options">
                <button class="option-btn" id="tryAgain">Tentar novamente</button>
                <button class="option-btn" id="contactSupport">Entrar em contato</button>
            </div>
        `, "bot");

        setTimeout(() => {
            document.getElementById('tryAgain').addEventListener('click', () => {
                askForTime();
            });
            document.getElementById('contactSupport').addEventListener('click', () => {
                showContactOptions();
            });
        }, 100);
    }
}

// Finalizar agendamento
function completeBooking(data) {
    addMessageToChat(`✅ Agendamento confirmado! Seus dados foram salvos com sucesso.`, "bot");

    // Mostrar sucesso após um breve delay
    setTimeout(() => {
        showSuccessMessage(data);
    }, 1500);

    chatState.step = 5;
    disableInput();
}

// ============================================
// SELEÇÃO DE OPÇÕES
// ============================================

// Selecionar serviço
function selectService(serviceId) {
    // Remover seleção anterior
    if (document.querySelector('#serviceOptions')) {
        document.querySelectorAll('#serviceOptions .option-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    // Marcar como selecionado
    const selectedBtn = document.querySelector(`#serviceOptions .option-btn[data-service-id="${serviceId}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }

    const selectedService = chatState.services.find(s => s.id === serviceId);
    chatState.selectedService = serviceId;

    // Adicionar mensagem do usuário
    addMessageToChat(`Serviço: ${selectedService.name} (R$ ${parseFloat(selectedService.price).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })})`, "user");

    // Limpar e ir para próxima etapa
    clearChatOptions();
    setTimeout(() => {
        askForDate();
    }, 800);
}

// Selecionar data
function selectDate(date) {
    // Remover seleção anterior
    if (document.querySelector('#dateOptions')) {
        document.querySelectorAll('#dateOptions .date-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    // Marcar como selecionado
    const selectedBtn = document.querySelector(`#dateOptions .date-btn[data-date="${date}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }

    chatState.selectedDate = date;

    // Adicionar mensagem do usuário
    addMessageToChat(`Data: ${formatDateForDisplay(date)}`, "user");

    // Limpar e ir para próxima etapa
    clearChatOptions();
    setTimeout(() => {
        askForTime();
    }, 800);
}

// Selecionar horário
function selectTime(time) {
    // Remover seleção anterior
    if (document.querySelector('#timeOptions')) {
        document.querySelectorAll('#timeOptions .time-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    // Marcar como selecionado
    const selectedBtn = document.querySelector(`#timeOptions .time-btn[data-time="${time}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }

    chatState.selectedTime = time;

    // Adicionar mensagem do usuário
    addMessageToChat(`Horário: ${time}`, "user");

    // Limpar e ir para próxima etapa
    clearChatOptions();

    // Confirmar agendamento
    setTimeout(() => {
        confirmAppointment();
    }, 800);
}

// Confirmar agendamento
async function confirmAppointment() {
    showTypingIndicator();

    setTimeout(async () => {
        hideTypingIndicator();

        const selectedService = chatState.services.find(s => s.id === chatState.selectedService);
        const formattedDate = formatDateForDisplay(chatState.selectedDate);

        addMessageToChat(`Perfeito! Vou confirmar seu agendamento:`, "bot");
        addMessageToChat(`
            <div class="appointment-summary">
                <p><strong>Serviço:</strong> ${selectedService.name}</p>
                <p><strong>Valor:</strong> R$ ${parseFloat(selectedService.price).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}</p>
                <p><strong>Data:</strong> ${formattedDate}</p>
                <p><strong>Horário:</strong> ${chatState.selectedTime}</p>
                <p><strong>Cliente:</strong> ${chatState.userName}</p>
                <p><strong>Telefone:</strong> ${formatPhoneNumber(chatState.userPhone)}</p>
            </div>
        `, "bot");

        addMessageToChat("Deseja confirmar este agendamento?", "bot");

        addMessageToChat(`
            <div class="chat-options">
                <button class="option-btn confirm-btn" id="confirmAppointmentBtn">Sim, confirmar agendamento</button>
                <button class="option-btn cancel-btn" id="cancelAppointmentBtn">Não, quero alterar</button>
            </div>
        `, "bot");

        setTimeout(() => {
            document.getElementById('confirmAppointmentBtn').addEventListener('click', async () => {
                await createAppointment();
            });

            document.getElementById('cancelAppointmentBtn').addEventListener('click', () => {
                // Voltar para seleção de horário
                askForTime();
            });
        }, 100);

    }, 800);
}

// ============================================
// FUNÇÕES AUXILIARES DO CHAT
// ============================================

// Adicionar mensagem ao chat
function addMessageToChat(message, sender = "bot") {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageDiv.innerHTML = `
        <div class="message-content">
            ${message}
            <div class="message-time">${timeString}</div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Lidar com envio de mensagem
function handleSendMessage() {
    const message = chatInput.value.trim();

    if (message.length === 0) return;

    // Adicionar mensagem do usuário
    addMessageToChat(message, "user");

    // Limpar input
    chatInput.value = '';
    sendBtn.disabled = true;

    // Processar resposta baseado no passo atual
    switch (chatState.step) {
        case 0: // Nome
            chatState.userName = message;
            setTimeout(() => {
                askForPhone();
            }, 800);
            break;

        case 1: // Telefone
            const phone = message.replace(/\D/g, '');
            if (phone.length < 10 || phone.length > 11) {
                addMessageToChat("Por favor, digite um telefone válido com DDD (10 ou 11 dígitos).", "bot");
                setTimeout(() => {
                    askForPhone();
                }, 800);
            } else {
                chatState.userPhone = phone;
                setTimeout(() => {
                    askForService();
                }, 800);
            }
            break;
    }
}

// ============================================
// FUNÇÕES DE INTERFACE
// ============================================

// Habilitar input
function enableInput() {
    chatInput.disabled = false;
    chatInput.placeholder = "Digite sua resposta aqui...";
    sendBtn.disabled = true;
    inputContainer.classList.remove('hidden');
}

// Desabilitar input
function disableInput() {
    chatInput.disabled = true;
    sendBtn.disabled = true;
}

// Limpar opções do chat
function clearChatOptions() {
    const chatOptions = document.querySelectorAll('.chat-options, .date-selector, .time-selector');
    chatOptions.forEach(el => {
        if (el.parentNode) {
            el.parentNode.removeChild(el);
        }
    });
}

// Mostrar indicador de digitação
function showTypingIndicator() {
    typingIndicator.classList.add('show');
}

// Esconder indicador de digitação
function hideTypingIndicator() {
    typingIndicator.classList.remove('show');
}

// Mostrar loading
function showLoading(show) {
    if (show) {
        loadingSpinner.classList.add('show');
    } else {
        loadingSpinner.classList.remove('show');
    }
}

// Mostrar mensagem de sucesso
function showSuccessMessage(data) {
    // Preencher detalhes do agendamento
    const selectedService = chatState.services.find(s => s.id === chatState.selectedService);

    appointmentDetails.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Serviço:</span>
            <span class="detail-value">${selectedService.name}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Valor:</span>
            <span class="detail-value">R$ ${parseFloat(selectedService.price).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Data:</span>
            <span class="detail-value">${formatDateForDisplay(chatState.selectedDate)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Horário:</span>
            <span class="detail-value">${chatState.selectedTime}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Cliente:</span>
            <span class="detail-value">${chatState.userName}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Telefone:</span>
            <span class="detail-value">${formatPhoneNumber(chatState.userPhone)}</span>
        </div>
    `;

    // Mostrar container de sucesso
    successContainer.classList.add('show');
    inputContainer.classList.add('hidden');
    chatMessages.classList.add('hidden');
}

// Mostrar mensagem de erro
function showErrorMessage(message) {
    errorText.textContent = message;
    errorMessage.classList.add('show');
}

// Esconder mensagem de erro
function hideErrorMessage() {
    errorMessage.classList.remove('show');
}

// Mostrar mensagem de aviso
function showWarningMessage(message) {
    warningText.textContent = message;
    warningMessage.classList.add('show');
}

// Esconder mensagem de aviso
function hideWarningMessage() {
    warningMessage.classList.remove('show');
}

// Esconder mensagens
function hideMessages() {
    errorMessage.classList.remove('show');
    warningMessage.classList.remove('show');
}

// Mostrar mensagem de sem serviços
function showNoServicesMessage() {
    addMessageToChat("Desculpe, não há serviços disponíveis para agendamento no momento.", "bot");

    addMessageToChat(`
        <div class="chat-options">
            <button class="option-btn" id="contactBusiness">Entrar em contato com a empresa</button>
        </div>
    `, "bot");

    setTimeout(() => {
        document.getElementById('contactBusiness').addEventListener('click', () => {
            showContactOptions();
        });
    }, 100);
}

// Mostrar opções de contato
function showContactOptions() {
    const phoneNumber = "5511999998888"; // Número da empresa (substitua pelo real)
    const whatsappUrl = `https://wa.me/${phoneNumber}`;

    addMessageToChat("Você pode entrar em contato com a empresa através dos seguintes meios:", "bot");

    addMessageToChat(`
        <div class="chat-options">
            <a href="${whatsappUrl}" target="_blank" class="option-btn">
                <i class="fab fa-whatsapp"></i> WhatsApp
            </a>
            <a href="tel:${phoneNumber}" class="option-btn">
                <i class="fas fa-phone"></i> Telefone
            </a>
            <button class="option-btn" id="backToChat">
                <i class="fas fa-arrow-left"></i> Voltar ao chat
            </button>
        </div>
    `, "bot");

    setTimeout(() => {
        document.getElementById('backToChat').addEventListener('click', () => {
            clearChatOptions();
            startChat();
        });
    }, 100);
}

// Mostrar opções de ajuda
function showHelpOptions() {
    // Implementar lógica de ajuda
    alert("Precisa de ajuda? Entre em contato com o suporte da empresa.");
}

// Reiniciar chat
function resetChat() {
    // Resetar estado
    chatState.step = -1;
    chatState.userName = "";
    chatState.userPhone = "";
    chatState.selectedService = null;
    chatState.selectedDate = null;
    chatState.selectedTime = null;
    chatState.clientId = null;

    // Limpar chat
    chatMessages.innerHTML = '';
    successContainer.classList.remove('show');
    chatMessages.classList.remove('hidden');
    inputContainer.classList.remove('hidden');

    // Começar novamente
    startChat();
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

// Formatar data para exibição
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const weekday = getWeekdayName(date.getDay());

    return `${weekday}, ${day}/${month}/${year}`;
}

// Obter nome do dia da semana
function getWeekdayName(weekday) {
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return weekdays[weekday];
}

// Formatar número de telefone
function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    } else if (cleaned.length === 11) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    }
    return phone;
}

// Rolagem automática para baixo
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Inicializar estilos CSS para o resumo
const style = document.createElement('style');
style.textContent = `
    .appointment-summary {
        background-color: var(--card-dark);
        border-radius: 10px;
        padding: 15px;
        margin: 10px 0;
        border-left: 4px solid var(--primary-color);
    }

    .appointment-summary p {
        margin: 5px 0;
        color: var(--text-light);
    }

    .appointment-summary strong {
        color: var(--primary-light);
    }

    .confirm-btn {
        background-color: var(--accent-color) !important;
    }

    .cancel-btn {
        background-color: var(--error-color) !important;
    }

    .hidden {
        display: none !important;
    }
`;
document.head.appendChild(style);
