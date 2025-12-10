import { appState } from './appState.js';
import { alertMessage, loadingSpinner } from './domElements.js';

// Mostrar/ocultar loading
export function setLoading(loading) {
    appState.isLoading = loading;
    if (loading) {
        loadingSpinner.classList.add('show');
    } else {
        loadingSpinner.classList.remove('show');
    }
}

// Mostrar alerta
export function showAlert(message, type = 'success') {
    alertMessage.textContent = message;
    alertMessage.className = `alert alert-${type} show`;

    setTimeout(() => {
        alertMessage.classList.remove('show');
    }, 5000);
}

// Fechar modal
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// Formatadores de dados
export function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    } catch (e) {
        return dateString;
    }
}

export function formatPhone(phone) {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
        return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    } else if (digits.length === 11) {
        return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
    }
    return phone;
}

// Formatar preço para backend
export function formatPriceForBackend(price) {
    // Garantir que o preço seja enviado como string com 2 casas decimais
    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) return '0.00';
    return priceNum.toFixed(2);
}
