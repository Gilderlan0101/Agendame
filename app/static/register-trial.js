// API Configuration
const API_BASE_URL = 'https://agendame.onrender.com';
const TRIAL_ENDPOINT = '/auth/signup/free-trial';

// DOM Elements
const trialForm = document.getElementById('trialForm');
const submitBtn = document.getElementById('submitBtn');
const successModal = document.getElementById('successModal');
const loadingOverlay = document.getElementById('loadingOverlay');
const goToDashboardBtn = document.getElementById('goToDashboard');
const copyLinkBtn = document.getElementById('copyLink');

// Modal display elements
const modalUsername = document.getElementById('modalUsername');
const modalEmail = document.getElementById('modalEmail');
const modalBusiness = document.getElementById('modalBusiness');
const modalLink = document.getElementById('modalLink');

// Password strength elements
const passwordInput = document.getElementById('password');
const strengthMeter = document.getElementById('strengthMeter');
const strengthText = document.getElementById('strengthText');

// Initialize phone mask
document.addEventListener('DOMContentLoaded', function() {
    // Initialize phone masks
    initPhoneMask('phone');
    initPhoneMask('whatsapp');

    // Initialize slug validation
    initSlugValidation();

    // Initialize form validation
    initFormValidation();

    // Update countdown every second
    updateCountdown();
    setInterval(updateCountdown, 1000);
});

// Phone mask initialization
function initPhoneMask(fieldId) {
    const input = document.getElementById(fieldId);

    input.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');

        if (value.length > 11) {
            value = value.substring(0, 11);
        }

        if (value.length > 0) {
            value = '(' + value;
        }
        if (value.length > 3) {
            value = value.substring(0, 3) + ') ' + value.substring(3);
        }
        if (value.length > 10) {
            value = value.substring(0, 10) + '-' + value.substring(10, 14);
        }

        e.target.value = value;
    });
}

// Slug validation
function initSlugValidation() {
    const slugInput = document.getElementById('business_slug');

    slugInput.addEventListener('input', function(e) {
        let value = e.target.value.toLowerCase();

        // Replace spaces and special characters with hyphens
        value = value.replace(/[^a-z0-9-]/g, '-');

        // Remove multiple consecutive hyphens
        value = value.replace(/--+/g, '-');

        // Remove leading and trailing hyphens
        value = value.replace(/^-+|-+$/g, '');

        e.target.value = value;
    });
}

// Password strength checker
passwordInput.addEventListener('input', function() {
    const password = this.value;
    const strength = checkPasswordStrength(password);

    strengthMeter.textContent = strength.text;
    strengthMeter.className = `strength-${strength.level}`;

    // Update strength text
    const strengthDescriptions = {
        weak: 'Senha fraca',
        medium: 'Senha média',
        strong: 'Senha forte'
    };

    strengthText.textContent = `Força da senha: ${strengthDescriptions[strength.level]}`;
});

function checkPasswordStrength(password) {
    let score = 0;

    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Complexity checks
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    // Determine strength level
    if (score <= 2) return { level: 'weak', text: 'Fraco' };
    if (score <= 4) return { level: 'medium', text: 'Médio' };
    return { level: 'strong', text: 'Forte' };
}

// Form validation
function initFormValidation() {
    trialForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        await submitForm();
    });
}

function validateForm() {
    const formData = new FormData(trialForm);
    const errors = [];

    // Basic validation
    if (!formData.get('username') || formData.get('username').length < 3) {
        errors.push('Nome de usuário deve ter no mínimo 3 caracteres');
    }

    if (!formData.get('email') || !isValidEmail(formData.get('email'))) {
        errors.push('E-mail inválido');
    }

    if (!formData.get('password') || formData.get('password').length < 8) {
        errors.push('Senha deve ter no mínimo 8 caracteres');
    }

    if (!formData.get('business_name')) {
        errors.push('Nome do estabelecimento é obrigatório');
    }

    if (!formData.get('business_type')) {
        errors.push('Tipo de negócio é obrigatório');
    }

    if (!formData.get('phone') || formData.get('phone').length < 14) {
        errors.push('Telefone inválido');
    }

    if (!formData.get('whatsapp') || formData.get('whatsapp').length < 14) {
        errors.push('WhatsApp inválido');
    }

    if (!formData.get('business_slug') || formData.get('business_slug').length < 3) {
        errors.push('Link personalizado deve ter no mínimo 3 caracteres');
    }

    if (!document.getElementById('terms').checked) {
        errors.push('Você deve aceitar os Termos de Uso');
    }

    // Show errors if any
    if (errors.length > 0) {
        showError(errors.join('<br>'));
        return false;
    }

    return true;
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Form submission
async function submitForm() {
    showLoading(true);

    try {
        // Prepare data
        const formData = new FormData(trialForm);
        const data = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            business_name: formData.get('business_name'),
            business_type: formData.get('business_type'),
            phone: formData.get('phone').replace(/\D/g, ''),
            whatsapp: formData.get('whatsapp').replace(/\D/g, ''),
            business_slug: formData.get('business_slug'),
            status: true
        };

        // Call API
        const response = await fetch(`${API_BASE_URL}${TRIAL_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            let errorMessage = 'Erro ao criar conta';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = response.statusText;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();

        // Store data in localStorage for automatic login
        storeUserData(data, result);

        // Show success modal
        showSuccessModal(data, result);

    } catch (error) {
        console.error('Erro no cadastro:', error);
        showError(error.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
        showLoading(false);
    }
}

// Store user data for automatic login
function storeUserData(formData, apiResult) {
    // Store basic user data
    const userData = {
        username: formData.username,
        email: formData.email,
        business_name: formData.business_name,
        phone: formData.phone,
        days_remaining: apiResult.days_remaining || 7,
        trial: apiResult.trial || true
    };

    localStorage.setItem('agendame_trial_user', JSON.stringify(userData));
    localStorage.setItem('business_name', formData.business_name);

    // Note: In a real implementation, you would also store the token
    // and perform automatic login here
}

// Show success modal
function showSuccessModal(formData, apiResult) {
    modalUsername.textContent = formData.username;
    modalEmail.textContent = formData.email;
    modalBusiness.textContent = formData.business_name;
    modalLink.textContent = `agendame.onrender.com/${formData.business_slug}`;

    successModal.style.display = 'flex';
}

// Show loading state
function showLoading(show) {
    if (show) {
        loadingOverlay.style.display = 'flex';
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    } else {
        loadingOverlay.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-rocket"></i> Criar Minha Conta Trial Premium';
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    `;
    errorDiv.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 10px;">
            <i class="fas fa-exclamation-circle" style="font-size: 20px; margin-top: 2px;"></i>
            <div>
                <strong style="display: block; margin-bottom: 5px;">Erro no Cadastro</strong>
                <div>${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()"
                    style="background: none; border: none; color: white; cursor: pointer; margin-left: auto;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(errorDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.parentElement.removeChild(errorDiv);
        }
    }, 5000);
}

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    `;
    successDiv.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 10px;">
            <i class="fas fa-check-circle" style="font-size: 20px; margin-top: 2px;"></i>
            <div>
                <strong style="display: block; margin-bottom: 5px;">Sucesso!</strong>
                <div>${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()"
                    style="background: none; border: none; color: white; cursor: pointer; margin-left: auto;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(successDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (successDiv.parentElement) {
            successDiv.parentElement.removeChild(successDiv);
        }
    }, 5000);
}

// Toggle password visibility
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
};

// Update countdown timer
function updateCountdown() {
    // This is a static countdown for demonstration
    // In a real app, you would calculate from server time
    const days = document.querySelector('.time-unit:first-child .number');
    const hours = document.querySelectorAll('.time-unit .number')[1];
    const minutes = document.querySelectorAll('.time-unit .number')[2];

    // Simple demo countdown
    let currentMinutes = parseInt(minutes.textContent);
    currentMinutes--;

    if (currentMinutes < 0) {
        currentMinutes = 59;
        let currentHours = parseInt(hours.textContent);
        currentHours--;

        if (currentHours < 0) {
            currentHours = 23;
            let currentDays = parseInt(days.textContent);
            currentDays--;

            if (currentDays < 0) {
                currentDays = 0;
                currentHours = 0;
                currentMinutes = 0;
            }

            days.textContent = currentDays.toString().padStart(2, '0');
        }

        hours.textContent = currentHours.toString().padStart(2, '0');
    }

    minutes.textContent = currentMinutes.toString().padStart(2, '0');
}

// Modal button handlers
goToDashboardBtn.addEventListener('click', function() {
    // Close modal
    successModal.style.display = 'none';

    // Show success message
    showSuccess('Redirecionando para o painel...');

    // In a real implementation, you would:
    // 1. Perform automatic login with the credentials
    // 2. Redirect to dashboard
    // 3. Or show login form with pre-filled email

    // For now, we'll simulate a redirect after 2 seconds
    setTimeout(() => {
        window.location.href = `${API_BASE_URL}/login`;
    }, 2000);
});

copyLinkBtn.addEventListener('click', function() {
    const link = modalLink.textContent;

    navigator.clipboard.writeText(link).then(() => {
        const originalText = copyLinkBtn.innerHTML;
        copyLinkBtn.innerHTML = '<i class="fas fa-check"></i> Link Copiado!';
        copyLinkBtn.style.background = 'var(--success-color)';

        setTimeout(() => {
            copyLinkBtn.innerHTML = originalText;
            copyLinkBtn.style.background = '';
        }, 2000);
    });
});

// Close modal when clicking outside
successModal.addEventListener('click', function(e) {
    if (e.target === successModal) {
        successModal.style.display = 'none';
    }
});

// Add keyboard shortcut for quick form submission (Ctrl/Cmd + Enter)
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (trialForm.checkValidity()) {
            trialForm.dispatchEvent(new Event('submit'));
        }
    }
});

// Auto-format business slug from business name
document.getElementById('business_name').addEventListener('blur', function() {
    const slugInput = document.getElementById('business_slug');

    // Only auto-fill if slug is empty or hasn't been manually modified
    if (!slugInput.dataset.manual && (!slugInput.value || slugInput.value === slugInput.defaultValue)) {
        let slug = this.value.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9\s]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Remove multiple hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

        slugInput.value = slug;
    }
});

// Mark slug as manually modified
document.getElementById('business_slug').addEventListener('input', function() {
    this.dataset.manual = 'true';
});
