// companyTab.js - Gerenciamento da aba Empresa

import { appState } from './appState.js';
import { setLoading, showAlert } from './utils.js';

// ================================
// ELEMENTOS DOM DA ABA EMPRESA
// ================================
export const companyElements = {
    name: document.getElementById('companyName'),
    type: document.getElementById('companyType'),
    phone: document.getElementById('companyPhone'),
    whatsapp: document.getElementById('companyWhatsApp'),
    slug: document.getElementById('companySlug'),
    url: document.getElementById('companyUrl')
};

// ================================
// API HELPER
// ================================
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('agendame_token') || appState.token;

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        headers
    });
}

// ================================
// CARREGAR INFORMAÇÕES DA EMPRESA
// ================================
export async function loadCompanyData() {
    console.log('🏢 Carregando dados da empresa...');
    setLoading(true);

    try {
        // Carregar dados do usuário
        const userResponse = await apiFetch('/auth/me');

        if (!userResponse.ok) {
            throw new Error('Falha ao carregar dados do usuário');
        }

        const userData = await userResponse.json();
        console.log('📋 Dados do usuário:', userData);

        // Atualizar appState
        appState.user = { ...appState.user, ...userData };

        // Preparar dados da empresa
        const companyData = {
            name: userData.business_name || userData.name || '',
            type: userData.business_type || userData.type || '',
            phone: userData.phone || '',
            whatsapp: userData.whatsapp || userData.phone || '',
            slug: userData.business_slug || userData.slug || '',
            url: (userData.business_slug || userData.slug) ?
                `${window.location.origin}/agendame/${userData.business_slug || userData.slug}` :
                'URL não configurada'
        };

        // Atualizar appState.company
        appState.company = companyData;

        // Atualizar localStorage para consistência
        localStorage.setItem('agendame_user', JSON.stringify({
            ...JSON.parse(localStorage.getItem('agendame_user') || '{}'),
            ...userData
        }));

        localStorage.setItem('agendame_company', JSON.stringify(companyData));

        // Atualizar UI
        updateCompanyUI();

        // Atualizar cabeçalho com nome da empresa
        updateHeaderInfo(userData);

        console.log('✅ Dados da empresa carregados:', companyData);

    } catch (error) {
        console.error('🚨 Erro ao carregar dados da empresa:', error);

        // Fallback: tentar carregar do localStorage
        try {
            const storedUser = JSON.parse(localStorage.getItem('agendame_user') || '{}');
            const storedCompany = JSON.parse(localStorage.getItem('agendame_company') || '{}');

            if (storedUser.business_name || storedCompany.name) {
                appState.user = { ...appState.user, ...storedUser };
                appState.company = { ...appState.company, ...storedCompany };
                updateCompanyUI();
                updateHeaderInfo(storedUser);
                console.log('📂 Dados carregados do localStorage');
            } else {
                showAlert('⚠️ Não foi possível carregar os dados da empresa', 'warning');
            }
        } catch (localError) {
            console.error('Erro ao carregar do localStorage:', localError);
            showAlert('❌ Erro ao carregar dados da empresa', 'error');
        }

    } finally {
        setLoading(false);
    }
}

// ================================
// ATUALIZAR UI DA EMPRESA
// ================================
function updateCompanyUI() {
    console.log('🎨 Atualizando UI da empresa...');

    const { name, type, phone, whatsapp, slug, url } = companyElements;
    const company = appState.company || {};

    if (name) name.value = company.name || '';
    if (type) type.value = company.type || '';
    if (phone) phone.value = company.phone || '';
    if (whatsapp) whatsapp.value = company.whatsapp || '';
    if (slug) slug.value = company.slug || '';

    if (url) {
        if (company.url && company.url !== 'URL não configurada') {
            url.textContent = company.url;
            url.href = company.url;
            url.style.cursor = 'pointer';
            url.title = 'Clique para visitar';
        } else {
            url.textContent = 'URL não configurada';
            url.href = '#';
            url.style.cursor = 'default';
            url.title = '';
        }
    }

    console.log('✅ UI da empresa atualizada');
}

// ================================
// ATUALIZAR INFORMAÇÕES DO HEADER
// ================================
function updateHeaderInfo(userData) {
    const userName = document.getElementById('userName');
    const userBusiness = document.getElementById('userBusiness');
    const userGreeting = document.getElementById('userGreeting');

    if (userName) {
        userName.textContent = userData.name || userData.email || 'Usuário';
    }

    if (userBusiness) {
        userBusiness.textContent = userData.business_name || 'Minha Empresa';
    }

    if (userGreeting) {
        const firstName = (userData.name || '').split(' ')[0] || 'Usuário';
        userGreeting.textContent = firstName;
    }
}

// ================================
// SALVAR INFORMAÇÕES DA EMPRESA
// ================================
export async function saveCompanyData() {
    console.log('💾 Salvando dados da empresa...');
    setLoading(true);

    try {
        const { name, type, phone, whatsapp } = companyElements;

        // Validar campos obrigatórios
        if (!name?.value?.trim()) {
            throw new Error('O nome da empresa é obrigatório');
        }

        // Preparar payload
        const payload = {
            business_name: name.value.trim(),
            business_type: type?.value?.trim() || '',
            phone: phone?.value?.trim() || '',
            whatsapp: whatsapp?.value?.trim() || phone?.value?.trim() || ''
        };

        console.log('📤 Enviando payload:', payload);

        // Atualizar via API
        const response = await apiFetch('/auth/update', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Falha na API: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('📥 Resposta da API:', result);

        // Atualizar appState
        if (result.user) {
            appState.user = { ...appState.user, ...result.user };
            appState.company = {
                name: result.user.business_name || result.user.name || '',
                type: result.user.business_type || result.user.type || '',
                phone: result.user.phone || '',
                whatsapp: result.user.whatsapp || result.user.phone || '',
                slug: result.user.business_slug || result.user.slug || '',
                url: (result.user.business_slug || result.user.slug) ?
                    `${window.location.origin}/agendame/${result.user.business_slug || result.user.slug}` :
                    'URL não configurada'
            };

            // Atualizar localStorage
            localStorage.setItem('agendame_user', JSON.stringify({
                ...JSON.parse(localStorage.getItem('agendame_user') || '{}'),
                ...result.user
            }));

            localStorage.setItem('agendame_company', JSON.stringify(appState.company));

            // Atualizar UI
            updateCompanyUI();
            updateHeaderInfo(result.user);

            showAlert('✅ Dados da empresa salvos com sucesso!', 'success');

            // Atualizar dados gerais do sistema
            if (window.refreshData) {
                window.refreshData();
            }
        } else {
            throw new Error('Resposta inesperada da API');
        }

    } catch (error) {
        console.error('🚨 Erro ao salvar empresa:', error);
        showAlert(`❌ ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
}

// ================================
// COPIAR URL DA EMPRESA
// ================================
export function copyCompanyURL() {
    console.log('📋 Copiando URL da empresa...');

    const { url } = companyElements;
    const company = appState.company || {};

    let urlToCopy = '';

    if (url && url.textContent && url.textContent !== 'URL não configurada') {
        urlToCopy = url.textContent;
    } else if (company.url && company.url !== 'URL não configurada') {
        urlToCopy = company.url;
    } else if (company.slug) {
        urlToCopy = `${window.location.origin}/agendame/${company.slug}`;
    }

    if (!urlToCopy) {
        showAlert('⚠️ URL não disponível para copiar', 'warning');
        return;
    }

    navigator.clipboard.writeText(urlToCopy).then(() => {
        showAlert('✅ URL copiada para a área de transferência!', 'success');

        // Feedback visual
        const copyBtn = document.querySelector('#companyTab .btn-outline');
        if (copyBtn) {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
            copyBtn.style.background = '#10b981';
            copyBtn.style.color = 'white';

            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.style.background = '';
                copyBtn.style.color = '';
            }, 2000);
        }
    }).catch(err => {
        console.error('🚨 Erro ao copiar URL:', err);
        showAlert('❌ Erro ao copiar URL', 'error');
    });
}

// ================================
// INICIALIZAR ABA EMPRESA
// ================================
export function initCompanyTab() {
    console.log('🏢 Inicializando aba Empresa...');

    // Configurar evento de salvar
    const saveButton = document.querySelector('#companyTab .form-actions .btn-primary');
    if (saveButton) {
        saveButton.addEventListener('click', saveCompanyData);
        console.log('✅ Botão de salvar configurado');
    } else {
        console.warn('⚠️ Botão de salvar não encontrado');
    }

    // Configurar botão de copiar URL
    const copyButton = document.querySelector('#companyTab .btn-outline');
    if (copyButton) {
        copyButton.addEventListener('click', copyCompanyURL);
        console.log('✅ Botão de copiar URL configurado');
    }

    // Atualizar campos em tempo real
    const { name, type, phone, whatsapp } = companyElements;

    [name, type, phone, whatsapp].forEach(input => {
        if (input) {
            input.addEventListener('input', function() {
                const saveBtn = document.querySelector('#companyTab .form-actions .btn-primary');
                if (saveBtn) {
                    saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
                }
            });
        }
    });

    // Carregar dados se a aba já estiver ativa
    if (document.getElementById('companyTab')?.classList.contains('active')) {
        loadCompanyData();
    }

    console.log('✅ Aba Empresa inicializada');
}

// ================================
// EXPORTAR PARA ESCOPO GLOBAL
// ================================
window.loadCompanyData = loadCompanyData;
window.saveCompanyInfo = saveCompanyData;
window.copyCompanyUrl = copyCompanyURL;
