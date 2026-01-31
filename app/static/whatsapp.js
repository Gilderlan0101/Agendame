import { companyName } from './domElements.js';
import { showAlert, formatDate } from './utils.js';
import { appState } from './appState.js';

// ============================================
// FUNÇÕES PRINCIPAIS DE WHATSAPP
// ============================================

/**
 * Envia lembrete de agendamento via WhatsApp
 * @param {number} appointmentId - ID do agendamento
 * @param {string} phone - Telefone do cliente (opcional, busca do appointment se não fornecido)
 */
export function sendWhatsAppReminder(appointmentId, phone = null) {
    try {

        // Buscar informações do agendamento
        let appointment = null;

        // Tentar encontrar em diferentes arrays
        if (appState.appointments && appState.appointments.length > 0) {
            appointment = appState.appointments.find(a => a.id === parseInt(appointmentId));
        }

        if (!appointment && appState.todayAppointments && appState.todayAppointments.length > 0) {
            appointment = appState.todayAppointments.find(a => a.id === parseInt(appointmentId));
        }

        if (!appointment) {
            console.error('Agendamento não encontrado:', appointmentId);
            showAlert('Agendamento não encontrado', 'error');
            return;
        }


        // Usar telefone fornecido ou buscar do agendamento
        const clientPhone = phone ||
                           appointment.client_phone ||
                           appointment.client?.phone ||
                           appointment.phone;

        if (!clientPhone) {
            console.error('Telefone não disponível para o agendamento:', appointmentId);
            showAlert('Telefone do cliente não disponível', 'error');
            return;
        }

        // Preparar dados para a mensagem
        const clientName = appointment.client_name ||
                          appointment.client?.name ||
                          appointment.client_full_name ||
                          'Cliente';

        const serviceName = appointment.service_name ||
                           appointment.service?.name ||
                           'serviço';

        const appointmentDate = appointment.date ||
                               appointment.appointment_date ||
                               new Date().toISOString().split('T')[0];

        const appointmentTime = appointment.time ||
                               appointment.appointment_time ||
                               '--:--';

        const formattedDate = formatDate(appointmentDate);

        // Buscar dados da empresa do appState
        const companyData = appState.company || appState.companyInfo || appState.user;
        const businessName = companyData?.business_name ||
                            companyData?.name ||
                            companyName?.value ||
                            'nosso salão';

        const companyPhone = companyData?.phone ||
                            companyData?.whatsapp ||
                            appState.user?.phone;

        // Criar mensagem personalizada
        const message = createAppointmentReminderMessage({
            clientName,
            serviceName,
            appointmentDate: formattedDate,
            appointmentTime,
            businessName,
            companyPhone
        });

        // Enviar WhatsApp
        sendWhatsAppMessage(clientPhone, message, {
            type: 'reminder',
            appointmentId,
            clientName,
            serviceName
        });

    } catch (error) {
        console.error('Erro ao enviar lembrete WhatsApp:', error);
        showAlert('Erro ao enviar lembrete: ' + error.message, 'error');
    }
}

/**
 * Envia mensagem WhatsApp para cliente (contato geral)
 * @param {string} phone - Telefone do cliente
 * @param {string} customMessage - Mensagem personalizada (opcional)
 */
export function sendWhatsAppToClient(phone, customMessage = null) {
    try {

        // Validar telefone
        if (!phone) {
            showAlert('Número de telefone inválido', 'error');
            return;
        }

        // Buscar dados da empresa do appState
        const companyData = appState.company || appState.companyInfo || appState.user;
        const businessName = companyData?.business_name ||
                            companyData?.name ||
                            companyName?.value ||
                            'nossa empresa';

        const companyPhone = companyData?.phone ||
                            companyData?.whatsapp ||
                            appState.user?.phone;

        // Criar mensagem
        const message = customMessage || createWelcomeMessage({
            businessName,
            companyPhone
        });

        // Enviar WhatsApp
        sendWhatsAppMessage(phone, message, {
            type: 'contact',
            businessName
        });

    } catch (error) {
        console.error('Erro ao enviar WhatsApp para cliente:', error);
        showAlert('Erro ao enviar mensagem: ' + error.message, 'error');
    }
}

/**
 * Envia mensagem de confirmação de agendamento
 * @param {Object} appointmentData - Dados do agendamento
 */
export function sendAppointmentConfirmation(appointmentData) {
    try {

        const {
            clientName,
            clientPhone,
            serviceName,
            appointmentDate,
            appointmentTime,
            price,
            confirmationCode
        } = appointmentData;

        if (!clientPhone) {
            console.error('Telefone do cliente não fornecido');
            return;
        }

        // Buscar dados da empresa
        const companyData = appState.company || appState.companyInfo || appState.user;
        const businessName = companyData?.business_name ||
                            companyData?.name ||
                            'nosso salão';

        const formattedDate = formatDate(appointmentDate);
        const formattedPrice = typeof price === 'number' ?
                              price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) :
                              price || 'a combinar';

        // Criar mensagem de confirmação
        const message = createAppointmentConfirmationMessage({
            clientName: clientName || 'Cliente',
            serviceName: serviceName || 'serviço',
            appointmentDate: formattedDate,
            appointmentTime: appointmentTime || '--:--',
            price: formattedPrice,
            confirmationCode: confirmationCode || `AGD${Date.now().toString().slice(-6)}`,
            businessName
        });

        // Enviar WhatsApp
        sendWhatsAppMessage(clientPhone, message, {
            type: 'confirmation',
            confirmationCode,
            clientName
        });

    } catch (error) {
        console.error('Erro ao enviar confirmação:', error);
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Envia mensagem WhatsApp
 * @param {string} phone - Telefone
 * @param {string} message - Mensagem
 * @param {Object} metadata - Metadados para logging
 */
export function sendWhatsAppMessage(phone, message, metadata = {}) {
    try {
        // Limpar e validar telefone
        const cleanPhone = phone.replace(/\D/g, '');

        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
            showAlert('Número de telefone inválido. Precisa ter 10 ou 11 dígitos (com DDD)', 'error');
            return;
        }

        // Adicionar código do Brasil se não tiver
        let whatsappNumber = cleanPhone;
        if (!whatsappNumber.startsWith('55')) {
            whatsappNumber = '55' + whatsappNumber;
        }

        // Codificar mensagem
        const encodedMessage = encodeURIComponent(message);
        const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;



        // Abrir WhatsApp em nova aba
        window.open(whatsappURL, '_blank', 'noopener,noreferrer');

        // Mostrar confirmação
        showAlert('WhatsApp aberto! A mensagem está pronta para envio.', 'success');

        // Opcional: Log no console para debug

        // Opcional: Marcar como enviado no backend (se tiver API)
        // markWhatsAppAsSent(metadata);

    } catch (error) {
        console.error('Erro ao abrir WhatsApp:', error);
        showAlert('Erro ao abrir WhatsApp: ' + error.message, 'error');
    }
}

/**
 * Cria mensagem de lembrete de agendamento
 */
function createAppointmentReminderMessage(data) {
    return `*${data.businessName.toUpperCase()} - Lembrete de Agendamento* 🎯

👋 Olá ${data.clientName}!

Este é um lembrete do seu agendamento conosco:

📅 *Data:* ${data.appointmentDate}
⏰ *Horário:* ${data.appointmentTime}
💇 *Serviço:* ${data.serviceName}

📍 *Local:* ${data.businessName}
📞 *Contato:* ${data.companyPhone || '(consulte nosso site)'}

_⚠️ Por favor, confirme sua presença respondendo esta mensagem com "✅ Confirmado" ou "❌ Cancelar"._

Chegue com 10 minutos de antecedência.
Estamos ansiosos para atendê-lo! 💫

Atenciosamente,
Equipe ${data.businessName} ✂️`;
}

/**
 * Cria mensagem de confirmação de agendamento
 */
function createAppointmentConfirmationMessage(data) {
    return `*${data.businessName.toUpperCase()} - Agendamento Confirmado* ✅

👋 Olá ${data.clientName}!

Seu agendamento foi *CONFIRMADO* com sucesso! 🎉

📅 *Data:* ${data.appointmentDate}
⏰ *Horário:* ${data.appointmentTime}
💇 *Serviço:* ${data.serviceName}
💰 *Valor:* ${data.price}
🔢 *Código:* ${data.confirmationCode}

📍 *Local:* ${data.businessName}

_💡 Dicas importantes:_
• Chegue com 10 minutos de antecedência
• Traga este código para identificação
• Em caso de atraso, avise-nos

Para cancelar ou reagendar, entre em contato conosco.

Agradecemos pela preferência! 🙏

Atenciosamente,
Equipe ${data.businessName} ✂️`;
}

/**
 * Cria mensagem de boas-vindas/contato
 */
function createWelcomeMessage(data) {
    return `*${data.businessName.toUpperCase()}* 👋

Olá! Somos da ${data.businessName}.

Como podemos ajudá-lo hoje? 🎯

*Nossos serviços:*
✂️ Corte de Cabelo
💇‍♀️ Penteados
🧖‍♀️ Tratamentos Capilares
💅 Manicure e Pedicure
✨ E muito mais!

*Horário de atendimento:*
Segunda a Sexta: 9h às 19h
Sábado: 9h às 17h

📍 *Localização:* [Endereço aqui]
📞 *Contato:* ${data.companyPhone || '(11) 99999-9999'}

Deseja agendar um horário ou tirar alguma dúvida?

Estamos à disposição! 💫

Atenciosamente,
Equipe ${data.businessName}`;
}

/**
 * Marca WhatsApp como enviado no backend (opcional)
 */
async function markWhatsAppAsSent(metadata) {
    try {
        // Se você tiver uma API para marcar WhatsApp como enviado
        if (appState.token && metadata.appointmentId) {
            await fetch(`/agendame/appointments/${metadata.appointmentId}/whatsapp`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${appState.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sent_at: new Date().toISOString(),
                    message_type: metadata.type
                })
            });

        }
    } catch (error) {
        console.error('Erro ao marcar WhatsApp como enviado:', error);
        // Não mostrar erro para o usuário
    }
}

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

/**
 * Formata telefone para exibição
 */
export function formatPhoneNumber(phone) {
    if (!phone) return 'Não informado';

    const cleaned = phone.toString().replace(/\D/g, '');

    if (cleaned.length === 11) {
        return `(${cleaned.substring(0,2)}) ${cleaned.substring(2,7)}-${cleaned.substring(7)}`;
    } else if (cleaned.length === 10) {
        return `(${cleaned.substring(0,2)}) ${cleaned.substring(2,6)}-${cleaned.substring(6)}`;
    }

    return phone;
}

/**
 * Gera link direto do WhatsApp
 */
export function generateWhatsAppLink(phone, message = '') {
    const cleanPhone = phone.replace(/\D/g, '');
    let whatsappNumber = cleanPhone;

    if (!whatsappNumber.startsWith('55')) {
        whatsappNumber = '55' + whatsappNumber;
    }

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${whatsappNumber}${message ? `?text=${encodedMessage}` : ''}`;
}

// ============================================
// EXPORTAÇÕES PARA ESCOPO GLOBAL
// ============================================

window.sendWhatsAppReminder = sendWhatsAppReminder;
window.sendWhatsAppToClient = sendWhatsAppToClient;
window.sendWhatsAppMessage = sendWhatsAppMessage;
window.sendAppointmentConfirmation = sendAppointmentConfirmation;
window.formatPhoneNumber = formatPhoneNumber;
window.generateWhatsAppLink = generateWhatsAppLink;
