// tabs.js - Gerenciamento otimizado de tabs

// ================================
// CACHE DE ELEMENTOS DO DOM
// ================================
let tabsCache = {
    buttons: null,
    contents: null,
    lastActiveTab: null
};

// Cache de funções de carregamento (lazy loading)
const tabLoaders = {
    dashboard: null,
    appointments: null,
    services: null,
    clients: null,
    company: null
};

// ================================
// FUNÇÕES PRINCIPAIS (OTIMIZADAS)
// ================================

/**
 * Inicializa o sistema de tabs
 */
export function initTabs() {
    console.time('🎯 Inicialização de tabs');

    // Cache de elementos
    tabsCache.buttons = document.querySelectorAll('.tab-btn');
    tabsCache.contents = document.querySelectorAll('.tab-content');

    // Usar delegación de eventos
    document.addEventListener('click', handleTabClick);

    console.timeEnd('🎯 Inicialização de tabs');
}

/**
 * Alterna entre tabs de forma otimizada
 */
export function switchTab(tabId) {
    if (!tabId || tabsCache.lastActiveTab === tabId) return;

    console.time(`🔄 Mudança para tab: ${tabId}`);

    // Atualizar cache
    tabsCache.lastActiveTab = tabId;

    // Atualizar UI usando dataset para performance
    updateTabUI(tabId);

    // Carregar dados da tab (lazy loading)
    loadTabData(tabId).then(() => {
        console.timeEnd(`🔄 Mudança para tab: ${tabId}`);
    });
}

// ================================
// FUNÇÕES AUXILIARES (OTIMIZADAS)
// ================================

/**
 * Atualiza a UI das tabs de forma eficiente
 */
function updateTabUI(activeTabId) {
    if (!tabsCache.buttons || !tabsCache.contents) {
        console.warn('Cache de tabs não inicializado');
        return;
    }

    // Atualizar botões
    tabsCache.buttons.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === activeTabId);
    });

    // Atualizar conteúdos
    tabsCache.contents.forEach(content => {
        const contentId = content.id.replace('Tab', '');
        content.classList.toggle('active', contentId === activeTabId);
    });
}

/**
 * Carrega dados da tab com lazy loading
 */
async function loadTabData(tabId) {
    try {
        switch(tabId) {
            case 'dashboard':
                await loadTabModule('dashboard', './dashboard.js', 'loadDashboardData');
                break;
            case 'appointments':
                await loadTabModule('appointments', './appointments.js', 'loadAppointments');
                break;
            case 'services':
                await loadTabModule('services', './services.js', 'loadServices');
                break;
            case 'clients':
                await loadTabModule('clients', './clients.js', 'loadClients');
                break;
            case 'company':
                await loadTabModule('company', './company.js', 'loadCompanyInfo');
                break;
            default:
                console.warn(`Tab desconhecida: ${tabId}`);
        }
    } catch (error) {
        console.error(`Erro ao carregar tab ${tabId}:`, error);
    }
}

/**
 * Carrega módulo de forma lazy
 */
async function loadTabModule(tabKey, modulePath, functionName) {
    // Verificar se já está carregado
    if (tabLoaders[tabKey]) {
        return await tabLoaders[tabKey]();
    }

    // Carregar módulo dinamicamente
    console.log(`📦 Carregando módulo para ${tabKey}...`);

    const loader = async () => {
        try {
            const module = await import(modulePath);
            if (module[functionName]) {
                return await module[functionName]();
            }
            return null;
        } catch (error) {
            console.error(`Erro ao carregar módulo ${modulePath}:`, error);
            return null;
        }
    };

    // Armazenar no cache
    tabLoaders[tabKey] = loader;
    return await loader();
}

/**
 * Manipulador de click para tabs (delegación)
 */
function handleTabClick(e) {
    const tabBtn = e.target.closest('.tab-btn');
    if (!tabBtn) return;

    e.preventDefault();

    const tabId = tabBtn.dataset.tab;
    if (tabId) {
        switchTab(tabId);
    }
}

/**
 * Retorna a tab ativa atual
 */
export function getActiveTab() {
    return tabsCache.lastActiveTab;
}

/**
 * Retorna todas as tabs disponíveis
 */
export function getAvailableTabs() {
    if (!tabsCache.buttons) return [];

    return Array.from(tabsCache.buttons).map(btn => ({
        id: btn.dataset.tab,
        name: btn.textContent.trim(),
        icon: btn.querySelector('i')?.className || ''
    }));
}

/**
 * Verifica se uma tab está visível
 */
export function isTabVisible(tabId) {
    const tabContent = document.getElementById(`${tabId}Tab`);
    return tabContent?.classList.contains('active') || false;
}

/**
 * Atualiza o cache de tabs (útil após mudanças dinâmicas no DOM)
 */
export function refreshTabCache() {
    tabsCache.buttons = document.querySelectorAll('.tab-btn');
    tabsCache.contents = document.querySelectorAll('.tab-content');
}

/**
 * Adiciona uma nova tab dinamicamente
 */
export function addTab(tabId, tabName, iconClass = 'fas fa-plus') {
    if (!tabsCache.buttons) return false;

    try {
        // Criar botão da tab
        const tabBtn = document.createElement('button');
        tabBtn.className = 'tab-btn';
        tabBtn.dataset.tab = tabId;
        tabBtn.innerHTML = `<i class="${iconClass}"></i> ${tabName}`;

        // Adicionar ao container de tabs
        const tabsContainer = document.querySelector('.tabs');
        if (tabsContainer) {
            tabsContainer.appendChild(tabBtn);

            // Criar conteúdo da tab
            const tabContent = document.createElement('div');
            tabContent.className = 'tab-content';
            tabContent.id = `${tabId}Tab`;
            tabContent.innerHTML = `
                <div class="dashboard-header">
                    <div class="dashboard-title">
                        <h1><i class="${iconClass}"></i> ${tabName}</h1>
                        <p>Gerencie ${tabName.toLowerCase()}</p>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <p>Conteúdo da tab ${tabName}</p>
                    </div>
                </div>
            `;

            // Adicionar ao container de conteúdo
            const mainContent = document.querySelector('.main-content .container');
            if (mainContent) {
                mainContent.appendChild(tabContent);
            }

            // Atualizar cache
            refreshTabCache();

            return true;
        }
    } catch (error) {
        console.error('Erro ao adicionar tab:', error);
    }

    return false;
}

/**
 * Remove uma tab dinamicamente
 */
export function removeTab(tabId) {
    if (!tabsCache.buttons || tabId === 'dashboard') {
        console.warn('Não é possível remover a tab dashboard');
        return false;
    }

    try {
        // Remover botão
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (tabBtn) tabBtn.remove();

        // Remover conteúdo
        const tabContent = document.getElementById(`${tabId}Tab`);
        if (tabContent) tabContent.remove();

        // Se a tab removida estava ativa, ativar dashboard
        if (tabsCache.lastActiveTab === tabId) {
            switchTab('dashboard');
        }

        // Limpar cache do loader
        if (tabLoaders[tabId]) {
            delete tabLoaders[tabId];
        }

        // Atualizar cache
        refreshTabCache();

        return true;
    } catch (error) {
        console.error('Erro ao remover tab:', error);
        return false;
    }
}

/**
 * Adiciona indicador de notificação a uma tab
 */
export function addTabBadge(tabId, count, type = 'info') {
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (!tabBtn) return false;

    // Remover badge existente
    const existingBadge = tabBtn.querySelector('.tab-badge');
    if (existingBadge) {
        existingBadge.remove();
    }

    if (count > 0) {
        const badge = document.createElement('span');
        badge.className = `tab-badge badge-${type}`;
        badge.textContent = count > 99 ? '99+' : count;
        badge.title = `${count} ${count === 1 ? 'notificação' : 'notificações'}`;

        tabBtn.appendChild(badge);
    }

    return true;
}

// ================================
// INICIALIZAÇÃO AUTOMÁTICA
// ================================

// Inicializar tabs quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTabs);
} else {
    // DOM já carregado
    setTimeout(initTabs, 0);
}

// ================================
// EXPORTAÇÕES PARA ESCOPO GLOBAL
// ================================

// Exportar apenas funções essenciais
window.switchTab = switchTab;
window.getActiveTab = getActiveTab;
window.addTabBadge = addTabBadge;
