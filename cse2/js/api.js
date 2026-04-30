// =============================================
// API MODULE - CSE2 (PHP Local / XAMPP)
// =============================================
// Comunicação com o backend PHP local via fetch.
// Substitui o antigo envio para Google Apps Script.
// Interage com window.APP_CONFIG e window.pendingQueue.

const API_BASE = (function() {
    // Detectar a base URL automaticamente
    const path = window.location.pathname;
    const base = path.substring(0, path.lastIndexOf('/'));
    return base + '/api';
})();

/**
 * Envia uma movimentação (salvar ou excluir) para o backend PHP.
 */
async function enviarParaAPI(registro, acao, tentativa = 1) {
    if (!window.APP_CONFIG) return false;
    const MAX_TENTATIVAS = 3;

    try {
        if (tentativa === 1) {
            showToast('Salvando no servidor...', 'info');
        } else {
            showToast(`Tentativa ${tentativa}/${MAX_TENTATIVAS}...`, 'info');
        }

        const payload = {
            origem: APP_CONFIG.ORIGEM,
            acao: acao,
            registro: registro
        };

        const response = await fetch(API_BASE + '/movimentacoes.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showToast('✓ Salvo com sucesso!', 'success');
            // Se salvou uma movimentação nova, atualizar o ID local com o ID do MySQL
            if (acao === 'salvar' && data.id && registro) {
                registro.idMovimentacao = data.id;
            }
            return true;
        } else {
            throw new Error(data.error || 'Erro desconhecido');
        }

    } catch (error) {
        console.error(`API error (tentativa ${tentativa}):`, error);

        // Retry automático
        if (tentativa < MAX_TENTATIVAS) {
            const delay = Math.pow(2, tentativa) * 1000;
            showToast(`Falha no envio. Tentando novamente em ${delay / 1000}s...`, 'error');
            await new Promise(r => setTimeout(r, delay));
            return enviarParaAPI(registro, acao, tentativa + 1);
        }

        // Fila de pendentes global
        showToast('Não foi possível salvar. Adicionado à fila de pendentes.', 'error');
        if (window.pushToPending) {
            window.pushToPending(registro, acao);
        }
        return false;
    }
}

// Alias para compatibilidade (o app.js chama enviarParaGAS)
const enviarParaGAS = enviarParaAPI;

/**
 * Sincroniza dados buscando do backend PHP local.
 */
async function sincronizarAPI() {
    if (!window.APP_CONFIG) return null;

    showLoading('Carregando dados do servidor...');
    showToast('Carregando dados do servidor...', 'info');
    try {
        const url = API_BASE + '/movimentacoes.php?acao=listar&origem=' + APP_CONFIG.ORIGEM;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.success) {
            showToast('Erro do servidor: ' + (data.error || ''), 'error');
            return null;
        }

        if (data.registros) {
            showToast(`✓ ${data.registros.length} registros carregados!`, 'success');
            return data.registros;
        }

        return [];
    } catch (e) {
        showToast('Erro ao conectar com o servidor.', 'error');
        console.error('API GET Error:', e);
        return null;
    } finally {
        hideLoading();
    }
}

// Alias para compatibilidade
const sincronizarGAS = sincronizarAPI;

/**
 * Busca alertas de estoque do backend.
 */
async function carregarAlertasAPI() {
    if (!window.APP_CONFIG) return {};
    try {
        const url = API_BASE + '/alertas.php?origem=' + APP_CONFIG.ORIGEM;
        const res = await fetch(url);
        const data = await res.json();
        return data.success ? (data.alertas || {}) : {};
    } catch (e) {
        console.error('Erro ao carregar alertas:', e);
        return {};
    }
}

/**
 * Salva alerta de estoque no backend.
 */
async function salvarAlertaAPI(material, local, medio, minimo) {
    try {
        const res = await fetch(API_BASE + '/alertas.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ material, local, medio, minimo })
        });
        const data = await res.json();
        return data.success;
    } catch (e) {
        console.error('Erro ao salvar alerta:', e);
        return false;
    }
}

// Escutas de status online
window.addEventListener('online', () => {
    updateOnlineStatus();
    showToast('Conexão restaurada! Enviando pendentes...', 'success');
    if (window.processPendingQueue) window.processPendingQueue();
});

window.addEventListener('offline', () => {
    updateOnlineStatus();
    showToast('Sem conexão. Dados serão salvos localmente.', 'error');
});
