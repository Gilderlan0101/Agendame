import { companyName } from './domElements.js';
import { showAlert, formatDate } from './utils.js';

// Enviar lembrete via WhatsApp
export function sendWhatsAppReminder(appointmentId, phone) {
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
export function sendWhatsAppToClient(phone) {
    const message = `Olá! Esta é uma mensagem do ${companyName.value || 'nossa empresa'}. Como podemos ajudá-lo hoje?`;
    sendWhatsApp(phone, message);
}

// Função geral para enviar WhatsApp
export function sendWhatsApp(phone, message) {
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
