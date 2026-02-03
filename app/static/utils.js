// utils.js - Utilitários gerais do sistema

import { appState } from './appState.js';
import {
    alertContainer,
    alertMessage,
    loadingOverlay,
    loadingSpinner
} from './domElements.js';

// ================================
// LOADING STATES
// ================================
export function setLoading(loading) {
    appState.isLoading = loading;

    if (loadingSpinner) {
        if (loading) {
            loadingSpinner.classList.add('show');
        } else {
            loadingSpinner.classList.remove('show');
        }
    }

    if (loadingOverlay) {
        if (loading) {
            loadingOverlay.classList.add('show');
        } else {
            loadingOverlay.classList.remove('show');
        }
    }
}

// ================================
// ALERTS E NOTIFICAÇÕES
// ================================
export function showAlert(message, type = 'success', duration = 5000) {
    // Se não tiver alertContainer, usar alertMessage como fallback
    const targetContainer = alertContainer || alertMessage;

    if (!targetContainer) {
        console.warn('Container de alerta não encontrado:', message, type);
        return;
    }

    // Criar elemento de alerta
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type}`;
    alertElement.innerHTML = `
        <div class="alert-content">
            <i class="fas ${getAlertIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="alert-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Adicionar ao container
    targetContainer.appendChild(alertElement);

    // Animar entrada
    setTimeout(() => {
        alertElement.classList.add('show');
    }, 10);

    // Auto-remover após duração
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.classList.remove('show');
            setTimeout(() => {
                if (alertElement.parentNode) {
                    alertElement.remove();
                }
            }, 300);
        }
    }, duration);

    // Retornar elemento para controle manual
    return alertElement;
}

function getAlertIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

// ================================
// MODAIS
// ================================
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    }
}

export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    }
}

// ================================
// FORMATAÇÃO DE DADOS
// ================================
export function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

export function formatDateTime(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

export function formatTime(timeString) {
    if (!timeString) return '';
    try {
        // Formatar para HH:MM
        if (timeString.includes(':')) {
            const [hours, minutes] = timeString.split(':');
            return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }
        return timeString;
    } catch (e) {
        return timeString;
    }
}

export function formatPhone(phone) {
    if (!phone) return '';
    const digits = phone.toString().replace(/\D/g, '');

    if (digits.length === 10) {
        return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    } else if (digits.length === 11) {
        return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
    } else if (digits.length === 12) {
        return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`;
    }
    return phone;
}

export function formatPrice(price, includeSymbol = true) {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) return includeSymbol ? 'R$ 0,00' : '0,00';

    const formatted = priceNum.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    return includeSymbol ? `R$ ${formatted}` : formatted;
}

export function formatPriceForBackend(price) {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) return '0.00';
    return priceNum.toFixed(2);
}

// ================================
// VALIDAÇÕES
// ================================
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function isValidPhone(phone) {
    const digits = phone.toString().replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
}

export function isValidDate(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// ================================
// MANIPULAÇÃO DE FORMULÁRIOS
// ================================
export function serializeForm(formElement) {
    const formData = new FormData(formElement);
    const data = {};

    for (let [key, value] of formData.entries()) {
        if (value !== '') {
            data[key] = value;
        }
    }

    return data;
}

export function clearForm(formElement) {
    if (formElement && formElement.reset) {
        formElement.reset();
    } else {
        // Fallback para inputs manuais
        const inputs = formElement.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
    }
}

// ================================
// MANIPULAÇÃO DE LOCALSTORAGE
// ================================
export function saveToLocalStorage(key, data) {
    try {
        const serialized = JSON.stringify(data);
        localStorage.setItem(key, serialized);
        return true;
    } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
        return false;
    }
}

export function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const serialized = localStorage.getItem(key);
        if (serialized === null) {
            return defaultValue;
        }
        return JSON.parse(serialized);
    } catch (error) {
        console.error('Erro ao carregar do localStorage:', error);
        return defaultValue;
    }
}

export function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Erro ao remover do localStorage:', error);
        return false;
    }
}

// ================================
// API HELPER
// ================================
export async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('agendame_token') || appState.token;

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(url, config);

        // Verificar se é erro de autenticação
        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('Sessão expirada. Faça login novamente.');
        }

        // Verificar se é erro de permissão
        if (response.status === 403) {
            throw new Error('Acesso não autorizado.');
        }

        return response;

    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    }
}

function handleUnauthorized() {
    // Limpar tokens
    removeFromLocalStorage('agendame_token');
    removeFromLocalStorage('agendame_user');

    // Redirecionar para login
    setTimeout(() => {
        window.location.href = '/login';
    }, 2000);
}

// ================================
// MANIPULAÇÃO DE DOM
// ================================
export function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    // Atributos
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else if (key === 'textContent') {
            element.textContent = value;
        } else {
            element.setAttribute(key, value);
        }
    });

    // Filhos
    if (Array.isArray(children)) {
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
    }

    return element;
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ================================
// GERADORES DE ID
// ================================
export function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ================================
// FORMATAÇÃO DE TEMPO RELATIVO
// ================================
export function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return `${interval} anos atrás`;
    if (interval === 1) return `1 ano atrás`;

    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return `${interval} meses atrás`;
    if (interval === 1) return `1 mês atrás`;

    interval = Math.floor(seconds / 86400);
    if (interval > 1) return `${interval} dias atrás`;
    if (interval === 1) return `1 dia atrás`;

    interval = Math.floor(seconds / 3600);
    if (interval > 1) return `${interval} horas atrás`;
    if (interval === 1) return `1 hora atrás`;

    interval = Math.floor(seconds / 60);
    if (interval > 1) return `${interval} minutos atrás`;
    if (interval === 1) return `1 minuto atrás`;

    return `agora há pouco`;
}

// ================================
// UTILITÁRIOS DE STRING
// ================================
export function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function truncate(text, maxLength = 50, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + suffix;
}

export function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
}

// ================================
// EXPORTAR FUNÇÕES GLOBAIS
// ================================
window.utils = {
    setLoading,
    showAlert,
    closeModal,
    openModal,
    formatDate,
    formatDateTime,
    formatTime,
    formatPhone,
    formatPrice,
    isValidEmail,
    isValidPhone,
    serializeForm,
    clearForm,
    saveToLocalStorage,
    loadFromLocalStorage,
    removeFromLocalStorage,
    apiFetch,
    timeAgo,
    capitalize,
    truncate,
    slugify
};
