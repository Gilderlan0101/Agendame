import { appState } from './appState.js';
import { closeModal, setLoading, showAlert } from './utils.js';
import { loadAppointments } from './appointments.js';

// Abrir modal de novo agendamento
export async function openNewAppointmentModal() {
    // Carregar serviços para o select
    const serviceSelect = document.getElementById('appointmentService');
    if (!serviceSelect) return;

    serviceSelect.innerHTML = '<option value="">Selecione um serviço...</option>';

    if (appState.services && appState.services.length > 0) {
        appState.services.forEach(service => {
            const isActive = service.is_active !== false;
            const serviceId = service.id || service.service_id;
            const serviceName = service.name || service.service_name || 'Serviço sem nome';
            const servicePrice = parseFloat(service.price || service.service_price || 0);

            if (isActive) {
                const option = document.createElement('option');
                option.value = serviceId;
                option.textContent = `${serviceName} - R$ ${servicePrice.toFixed(2)}`;
                serviceSelect.appendChild(option);
            }
        });
    } else {
        showAlert('Carregue os serviços primeiro', 'warning');
        return;
    }

    // Definir data padrão para hoje
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointmentDate').value = today;

    // Definir hora padrão (próxima hora cheia)
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    const hourStr = nextHour.getHours().toString().padStart(2, '0') + ':00';
    document.getElementById('appointmentTime').value = hourStr;

    // Mostrar modal
    const modal = document.getElementById('newAppointmentModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Salvar novo agendamento INTERNO
export async function saveNewAppointment() {
    const clientName = document.getElementById('appointmentClientName').value.trim();
    const clientPhone = document.getElementById('appointmentClientPhone').value.trim();
    const serviceId = document.getElementById('appointmentService').value;
    const appointmentDate = document.getElementById('appointmentDate').value;
    const appointmentTime = document.getElementById('appointmentTime').value;
    const notes = document.getElementById('appointmentNotes').value.trim();

    // Validação
    if (!clientName || !clientPhone || !serviceId || !appointmentDate || !appointmentTime) {
        showAlert('Preencha todos os campos obrigatórios', 'error');
        return;
    }

    // Validar formato do telefone
    const phoneRegex = /^(\d{10,11})$/;
    const cleanPhone = clientPhone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
        showAlert('Telefone inválido. Use DDD + número (10 ou 11 dígitos)', 'error');
        return;
    }

    // Validar formato da hora
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(appointmentTime)) {
        showAlert('Horário inválido. Use formato HH:MM', 'error');
        return;
    }

    setLoading(true);

    try {
        console.log('Criando agendamento interno...', {
            clientName, clientPhone, serviceId, appointmentDate, appointmentTime
        });

        // Usar a nova rota interna de agendamento
        const response = await fetch('/agendame/appointments/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${appState.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_name: clientName,
                client_phone: clientPhone,
                service_id: parseInt(serviceId),
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                notes: notes || null
            })
        });

        console.log('Resposta da API:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('Agendamento criado:', result);

            showAlert(result.message || 'Agendamento criado com sucesso!', 'success');

            // Fechar modal
            const modal = document.getElementById('newAppointmentModal');
            if (modal) modal.classList.remove('show');

            // Limpar formulário
            const form = document.getElementById('newAppointmentForm');
            if (form) form.reset();

            // Recarregar lista de agendamentos
            if (typeof loadAppointments === 'function') {
                await loadAppointments();
            }

        } else {
            let errorMessage = 'Erro ao criar agendamento';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
            } catch (e) {
                errorMessage = `Erro ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        showAlert(error.message || 'Erro ao criar agendamento', 'error');
    } finally {
        setLoading(false);
    }
}

// Exportar funções para escopo global
window.openNewAppointmentModal = openNewAppointmentModal;
window.saveNewAppointment = saveNewAppointment;
