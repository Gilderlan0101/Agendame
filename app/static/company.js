import { appState } from './appState.js';
import { companyName, companyType, companyPhone, companyWhatsApp, companySlug, companyUrl } from './domElements.js';
import { setLoading, showAlert } from './utils.js';

// Obter slug da empresa
export async function getCompanySlug() {
    try {
        // Buscar informações da empresa usando a rota que você tem
        if (appState.user && appState.user.username) {
            // Tentar usar o username como slug (baseado no seu exemplo)
            appState.companySlug = appState.user.username;

            // Verificar se a empresa existe
            const response = await fetch(`/agendame/${appState.companySlug}/info`, {
                headers: {
                    'Authorization': `Bearer ${appState.token}`
                }
            });

            if (response.ok) {
                const companyData = await response.json();
                appState.companyInfo = companyData.company;
            } else {
                // Tentar usar o email sem o domínio
                if (appState.user.email) {
                    const possibleSlug = appState.user.email.split('@')[0];
                    appState.companySlug = possibleSlug;
                }
            }
        }
    } catch (error) {
        return error
    }
}

// Carregar informações da empresa
export async function loadCompanyInfo() {
    setLoading(true);

    try {
        // Primeiro, buscar dados do usuário
        const userResponse = await fetch('/auth/me', {
            headers: {
                'Authorization': `Bearer ${appState.token}`
            }
        });

        if (userResponse.ok) {
            const userData = await userResponse.json();

            // Tentar buscar informações da empresa usando o slug
            if (appState.companySlug) {
                const companyResponse = await fetch(`/agendame/${appState.companySlug}/info`, {
                    headers: {
                        'Authorization': `Bearer ${appState.token}`
                    }
                });

                if (companyResponse.ok) {
                    const companyData = await companyResponse.json();
                    const company = companyData.company;

                    companyName.value = company.name || '';
                    companyType.value = company.type || '';
                    companyPhone.value = company.phone || '';
                    companyWhatsApp.value = company.whatsapp || '';
                    companySlug.value = company.slug || '';

                    const baseUrl = window.location.origin;
                    companyUrl.textContent = `${baseUrl}/agendame/${company.slug || ''}`;
                }
            }

            // Se não conseguiu buscar pela rota da empresa, usar dados do usuário
            if (!companyName.value && userData.username) {
                companyName.value = userData.username || 'Minha Empresa';
                companyType.value = 'Barbearia/Salão';
                companySlug.value = userData.username || 'minha-empresa';

                const baseUrl = window.location.origin;
                companyUrl.textContent = `${baseUrl}/agendame/${userData.username || 'minha-empresa'}`;
            }
        }

    } catch (error) {
        // Usar dados do usuário como fallback
        if (appState.user) {
            companyName.value = appState.user.business_name || appState.user.username || 'Minha Empresa';
            companyType.value = appState.user.business_type || 'Barbearia/Salão';
            companyPhone.value = appState.user.phone || '';
            companyWhatsApp.value = appState.user.whatsapp || '';
            companySlug.value = appState.user.business_slug || appState.user.username || 'minha-empresa';

            const baseUrl = window.location.origin;
            companyUrl.textContent = `${baseUrl}/agendame/${appState.user.business_slug || appState.user.username || 'minha-empresa'}`;
        }
    } finally {
        setLoading(false);
    }
}

// Salvar informações da empresa
export async function saveCompanyInfo() {
    setLoading(true);

    try {
        // Você precisará criar uma rota para atualizar informações da empresa
        showAlert('Funcionalidade de atualização de empresa ainda não implementada', 'warning');

    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        setLoading(false);
    }
}

// Copiar URL da empresa
export function copyCompanyUrl() {
    const url = companyUrl.textContent;
    navigator.clipboard.writeText(url).then(() => {
        showAlert('URL copiada para a área de transferência!', 'success');
    });
}
