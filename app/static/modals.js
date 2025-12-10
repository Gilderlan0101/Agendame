import { appState } from './appState.js';
import { closeModal } from './utils.js';

// Abrir modal de novo agendamento
export async function openNewAppointmentModal() {
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
export async function saveNewAppointment() {
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
