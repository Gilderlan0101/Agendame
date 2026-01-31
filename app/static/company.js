// company.js

import { appState } from './appState.js';
import {
    companyName,
    companyType,
    companyPhone,
    companyWhatsApp,
    companySlug,
    companyUrl
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

        return data.slug;

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
        const slug = await getCompanySlug();

        if (!slug) {
            throw new Error('Empresa não vinculada ao usuário');
        }

        const response = await apiFetch(`/agendame/${slug}/info`);

        if (!response.ok) {
            throw new Error('Falha ao buscar dados da empresa');
        }

        const company = await response.json();


        // ================================
        // STATE
        // ================================
        appState.company = company;
        localStorage.setItem('agendame_company', JSON.stringify(company));
        localStorage.setItem('agendame_slug', company.slug);


        // ================================
        // UI
        // ================================
        companyName.value = company.name || '';
        companyType.value = company.type || '';
        companyPhone.value = company.phone || '';
        companyWhatsApp.value = company.whatsapp || '';
        companySlug.value = company.companySlug || '';
        companyUrl.value = company.url_default || '';


        const baseUrl = window.location.origin;
        companyUrl.textContent = `${baseUrl}/agendame/${company.slug}`;

    } catch (error) {
        console.error(error);
        showAlert('Erro ao carregar dados da empresa', 'error');

        // fallback mínimo
        if (appState.company) {
            companyName.value = appState.company.name || '';
            companySlug.value = appState.company.companySlug || '';
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
        if (!appState.company?.slug) {
            throw new Error('Empresa não identificada');
        }

        const payload = {
            name: companyName.value,
            type: companyType.value,
            phone: companyPhone.value,
            whatsapp: companyWhatsApp.value
        };

        const response = await apiFetch(
            `/agendame/${appState.company.slug}/update`,
            {
                method: 'PUT',
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            throw new Error('Falha ao salvar dados da empresa');
        }

        const updated = await response.json();

        appState.company = updated.company;
        localStorage.setItem('agendame_company', JSON.stringify(appState.company));

        showAlert('Dados da empresa atualizados com sucesso!', 'success');

    } catch (error) {
        console.error(error);
        showAlert(error.message || 'Erro ao salvar empresa', 'error');
    } finally {
        setLoading(false);
    }
}

// ================================
// COPY URL
// ================================
export function copyCompanyUrl() {
    const url = companyUrl.textContent;

    if (!url) {
        showAlert('URL da empresa não disponível', 'warning');
        return;
    }

    navigator.clipboard.writeText(url).then(() => {
        showAlert('URL copiada para a área de transferência!', 'success');
    });
}
