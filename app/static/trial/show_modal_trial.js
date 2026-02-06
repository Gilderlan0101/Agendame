// show_modal_trial.js - Versão Silenciosa

// Função responsável por fechar o modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// Função responsável por abrir o modal
function showTrialUpgradeModal() {
    const modal = document.getElementById('trialUpgradeModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Verificar se é conta trial e exibir banner
function checkAndShowTrial() {
    // Buscar dados do usuário
    let userData = null;
    let isTrialUser = false;
    let daysRemaining = 0;

    // 1. Tentar de agendame_user
    try {
        const storedUser = localStorage.getItem('agendame_user');
        if (storedUser) {
            userData = JSON.parse(storedUser);
            isTrialUser = userData.is_trial === true || userData.is_trial === 'true';
            daysRemaining = userData.days_remaining || 0;
        }
    } catch (e) {
        // Silencioso - não mostrar erro
    }

    // 2. Se não encontrou, tentar localStorage direto
    if (!userData || Object.keys(userData).length === 0) {
        const isTrialFlag = localStorage.getItem('is_trial');
        const daysRemainingStr = localStorage.getItem('days_remaining');

        isTrialUser = isTrialFlag === 'true' || isTrialFlag === '1';
        daysRemaining = daysRemainingStr ? parseInt(daysRemainingStr) : 0;
    }

    // 3. Verificar elementos HTML
    const trialBanner = document.getElementById('trialBanner');
    const trialDays = document.getElementById('trialDays');

    if (!trialBanner || !trialDays) {
        return; // Elementos não existem
    }

    // Mostrar/ocultar banner
    if (isTrialUser) {
        trialBanner.style.display = 'block';
        trialDays.textContent = `${daysRemaining} dias restantes`;

        // Se restam 3 dias ou menos, destacar
        if (daysRemaining <= 3) {
            trialBanner.style.background = 'linear-gradient(135deg, #f59e0b, #fbbf24)';
            trialBanner.style.color = '#000';

            // Se for 0 ou negativo, mostrar modal de urgência
            if (daysRemaining <= 0) {
                setTimeout(() => {
                    showUpgradeModal('Seu período de trial expirou! Faça upgrade para continuar usando.');
                }, 1000);
            } else if (daysRemaining <= 3) {
                setTimeout(() => {
                    showUpgradeModal(`Faltam apenas ${daysRemaining} dias para seu trial expirar!`);
                }, 1500);
            }
        }
    } else {
        trialBanner.style.display = 'none';
    }
}

// Função pública para verificar trial
function isTrial() {
    checkAndShowTrial();
}

// Trocar entre tabs
function switchTab(tabId) {
    // Esconde todas as tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove classe active de todos os botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostra a tab selecionada
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Ativa o botão correspondente
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// Inicializar quando o DOM estiver carregado
function initTrialSystem() {
    // Verificar trial
    checkAndShowTrial();

    // Configurar tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    if (tabButtons.length > 0) {
        tabButtons.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                switchTab(tabId);
            });
        });
    }

    // Configurar dropdown do usuário
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', function() {
            dropdownMenu.classList.remove('show');
        });
    }
}

// Função auxiliar para atualizar dados do trial
function updateTrialData(newData) {
    // Atualizar localStorage
    let userData = JSON.parse(localStorage.getItem('agendame_user') || '{}');

    // Mesclar novos dados
    userData = { ...userData, ...newData };

    // Salvar no localStorage
    localStorage.setItem('agendame_user', JSON.stringify(userData));

    // Atualizar valores individuais também (para compatibilidade)
    if (newData.hasOwnProperty('is_trial')) {
        localStorage.setItem('is_trial', newData.is_trial);
    }
    if (newData.hasOwnProperty('days_remaining')) {
        localStorage.setItem('days_remaining', newData.days_remaining);
    }

    // Atualizar banner
    setTimeout(() => {
        checkAndShowTrial();
    }, 100);

    return userData;
}

// Função para mostrar modal de upgrade com mensagem customizada
function showUpgradeModal(message = null) {
    const modal = document.getElementById('trialUpgradeModal');
    if (!modal) {
        return;
    }

    // Se houver mensagem customizada, atualizar
    if (message) {
        const messageElement = modal.querySelector('.modal-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }

    // Abrir modal
    modal.classList.add('show');
}

// Adicionar funções ao objeto window para acesso global
window.closeModal = closeModal;
window.showTrialUpgradeModal = showTrialUpgradeModal;
window.isTrial = checkAndShowTrial;
window.switchTab = switchTab;
window.initTrialSystem = initTrialSystem;
window.updateTrialData = updateTrialData;
window.showUpgradeModal = showUpgradeModal;

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Pequeno delay para garantir que outros scripts carregaram
    setTimeout(() => {
        initTrialSystem();

        // Adicionar evento para banner de trial
        const closeBannerBtn = document.getElementById('closeTrialBanner');
        if (closeBannerBtn) {
            closeBannerBtn.addEventListener('click', function() {
                const trialBanner = document.getElementById('trialBanner');
                if (trialBanner) {
                    trialBanner.style.display = 'none';
                }
            });
        }

        // Fechar modal ao clicar fora
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('show');
                }
            });
        });

        // Fechar modal com botão X
        const closeButtons = document.querySelectorAll('.modal .close');
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                }
            });
        });

        // Forçar verificação após 1 segundo (para garantir)
        setTimeout(checkAndShowTrial, 1000);

    }, 100);
});

// Verificar trial periodicamente (a cada 30 segundos)
setInterval(() => {
    checkAndShowTrial();
}, 30000);

// Função para lidar com upgrade do trial
window.handleTrialUpgrade = function() {
    // Fechar modal
    closeModal('trialUpgradeModal');

    // Aqui você implementaria a lógica de pagamento
    // Por enquanto, apenas mostre uma mensagem
    window.showAlert('Redirecionando para página de upgrade...', 'info');

    // Simular redirecionamento
    setTimeout(() => {
        window.open('https://agendame.onrender.com/', '_blank');
    }, 1000);
};
