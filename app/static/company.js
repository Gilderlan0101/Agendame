// company.js

import { appState } from './appState.js';
import {
    companyName,
    companyType,
    companyPhone,
    companyWhatsApp,
    companySlug, // Este é o INPUT
    companyUrl   // Este é o SPAN
} from './domElements.js';
import { setLoading, showAlert } from './utils.js';

// ================================
// API HELPER
// ================================
async function apiFetch(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${appState.token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
}

// ================================
// GET COMPANY SLUG
// ================================
export async function getCompanySlug() {
    try {
        // Se já estiver no estado → não refaz request
        if (appState.company?.slug) {
            return appState.company.slug;
        }

        // Rota única de verdade
        const response = await apiFetch('/auth/me');

        if (!response.ok) {
            throw new Error('Falha ao obter empresa do usuário');
        }

        const data = await response.json();

        appState.company = {
            ...appState.company,
            ...data
        };

        localStorage.setItem('agendame_company', JSON.stringify(appState.company));

        return data.slug || data.business_slug;

    } catch (error) {
        console.error('Erro ao obter slug da empresa:', error);
        return null;
    }
}

// ================================
// LOAD COMPANY INFO
// ================================
export async function loadCompanyInfo() {
    setLoading(true);

    try {
        // Primeiro, tentar obter o slug do usuário
        const slug = await getCompanySlug();

        if (!slug) {
            // Fallback: buscar informações do usuário diretamente
            const response = await apiFetch('/auth/me');

            if (!response.ok) {
                throw new Error('Falha ao buscar dados do usuário');
            }

            const userData = await response.json();

            // Preencher com dados do usuário
            appState.company = {
                name: userData.business_name || '',
                type: userData.business_type || '',
                phone: userData.phone || '',
                whatsapp: userData.whatsapp || '',
                slug: userData.business_slug || '',
                url_default: userData.business_slug || ''
            };
        } else {
            // Se tem slug, buscar informações completas da empresa
            const response = await apiFetch(`/agendame/${slug}/info`);

            if (!response.ok) {
                throw new Error('Falha ao buscar dados da empresa');
            }

            const company = await response.json();
            appState.company = company;
        }

        // ================================
        // UI UPDATE
        // ================================
        if (companyName) {
            companyName.value = appState.company?.name || appState.company?.business_name || '';
        }

        if (companyType) {
            companyType.value = appState.company?.type || appState.company?.business_type || '';
        }

        if (companyPhone) {
            companyPhone.value = appState.company?.phone || '';
        }

        if (companyWhatsApp) {
            companyWhatsApp.value = appState.company?.whatsapp || '';
        }

        if (companySlug) {
            // O INPUT recebe apenas o slug
            companySlug.value = appState.company?.slug || appState.company?.business_slug || '';
        }

        if (companyUrl) {
            // O SPAN recebe a URL completa
            const baseUrl = window.location.origin;
            const slug = appState.company?.slug || appState.company?.business_slug || '';
            if (slug) {
                companyUrl.textContent = `${baseUrl}/agendame/${slug}`;
            } else {
                companyUrl.textContent = 'URL não disponível';
            }
        }

        // Salvar no localStorage para consistência
        localStorage.setItem('agendame_company', JSON.stringify(appState.company));
        if (appState.company?.slug || appState.company?.business_slug) {
            localStorage.setItem('agendame_slug', appState.company.slug || appState.company.business_slug);
        }

    } catch (error) {
        console.error('Erro ao carregar informações da empresa:', error);
        showAlert('Erro ao carregar dados da empresa', 'error');

        // Fallback: usar dados do localStorage
        const storedCompany = localStorage.getItem('agendame_company');
        if (storedCompany) {
            try {
                appState.company = JSON.parse(storedCompany);

                if (companyName) companyName.value = appState.company?.name || '';
                if (companySlug) companySlug.value = appState.company?.slug || '';
                if (companyUrl) {
                    const baseUrl = window.location.origin;
                    const slug = appState.company?.slug || '';
                    companyUrl.textContent = slug ? `${baseUrl}/agendame/${slug}` : 'URL não disponível';
                }
            } catch (e) {
                console.error('Erro ao parsear empresa do localStorage:', e);
            }
        }

    } finally {
        setLoading(false);
    }
}

// ================================
// SAVE COMPANY INFO
// ================================
export async function saveCompanyInfo() {
    setLoading(true);

    try {
        const payload = {
            name: companyName?.value || '',
            business_name: companyName?.value || '',
            type: companyType?.value || '',
            business_type: companyType?.value || '',
            phone: companyPhone?.value || '',
            whatsapp: companyWhatsApp?.value || ''
        };

        // Tentar salvar via endpoint de empresa
        let response;
        if (appState.company?.slug) {
            response = await apiFetch(`/agendame/${appState.company.slug}/update`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            // Fallback: atualizar usuário
            response = await apiFetch('/auth/update', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) {
            throw new Error('Falha ao salvar dados da empresa');
        }

        const result = await response.json();

        // Atualizar estado
        if (result.user) {
            appState.company = {
                ...appState.company,
                ...result.user,
                name: result.user.business_name,
                type: result.user.business_type,
                slug: result.user.business_slug
            };
        } else if (result.company) {
            appState.company = result.company;
        }

        // Atualizar localStorage
        localStorage.setItem('agendame_company', JSON.stringify(appState.company));
        if (appState.company?.slug) {
            localStorage.setItem('agendame_slug', appState.company.slug);
        }

        // Atualizar URL
        if (companyUrl && appState.company?.slug) {
            const baseUrl = window.location.origin;
            companyUrl.textContent = `${baseUrl}/agendame/${appState.company.slug}`;
        }

        showAlert('Dados da empresa atualizados com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao salvar informações da empresa:', error);
        showAlert(error.message || 'Erro ao salvar empresa', 'error');
    } finally {
        setLoading(false);
    }
}

// ================================
// COPY URL
// ================================
export function copyCompanyUrl() {
    const urlText = companyUrl?.textContent;
    const urlInput = companySlug?.value;

    // Tentar pegar do span primeiro, depois do input
    const urlToCopy = urlText || (urlInput ? `${window.location.origin}/agendame/${urlInput}` : '');

    if (!urlToCopy || urlToCopy === 'Carregando...' || urlToCopy === 'URL não disponível') {
        showAlert('URL da empresa não disponível', 'warning');
        return;
    }

    navigator.clipboard.writeText(urlToCopy).then(() => {
        showAlert('URL copiada para a área de transferência!', 'success');
    }).catch(err => {
        console.error('Erro ao copiar URL:', err);
        showAlert('Erro ao copiar URL', 'error');
    });
}

// ================================
// EXPORT FUNCTIONS TO WINDOW
// ================================
window.loadCompanyInfo = loadCompanyInfo;
window.saveCompanyInfo = saveCompanyInfo;
window.copyCompanyUrl = copyCompanyUrl;
