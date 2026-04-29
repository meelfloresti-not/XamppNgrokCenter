// =============================================
// API MODULE - CSE2 
// =============================================
// Interage com window.APP_CONFIG e window.pendingQueue

async function enviarParaGAS(registro, acao, tentativa = 1) {
    if (!window.APP_CONFIG) return false;
    const MAX_TENTATIVAS = 3;

    try {
        if (tentativa === 1) {
            showToast('Enviando para planilha...', 'info');
        } else {
            showToast(`Tentativa ${tentativa}/${MAX_TENTATIVAS}...`, 'info');
        }

        const payload = { 
            origem: APP_CONFIG.ORIGEM, 
            acao: acao, 
            registro: registro 
        };

        const response = await fetch(APP_CONFIG.SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        let data = {};

        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Resposta inválida:', text);
            throw new Error('Resposta inválida do servidor');
        }

        if (data.success) {
            showToast('✓ Salvo na planilha com sucesso!', 'success');
            return true;
        } else {
            throw new Error(data.error || 'Erro desconhecido');
        }

    } catch (error) {
        console.error(`GAS error (tentativa ${tentativa}):`, error);

        // Retry automático
        if (tentativa < MAX_TENTATIVAS) {
            const delay = Math.pow(2, tentativa) * 1000; // 2s, 4s
            showToast(`Falha no envio. Tentando novamente em ${delay / 1000}s...`, 'error');
            await new Promise(r => setTimeout(r, delay));
            return enviarParaGAS(registro, acao, tentativa + 1);
        }

        // Fila de pendentes global (administrada pelo app.js)
        showToast('Não foi possível enviar. Salvo na fila de pendentes.', 'error');
        if (window.pushToPending) {
            window.pushToPending(registro, acao);
        }
        return false;
    }
}

async function sincronizarGAS() {
    if (!window.APP_CONFIG) return false;

    showLoading('Baixando dados da nuvem...');
    showToast('Baixando dados da nuvem...', 'info');
    try {
        const getUrl = APP_CONFIG.SCRIPT_URL + (APP_CONFIG.SCRIPT_URL.includes('?') ? '&' : '?') + 'acao=listar&origem=' + APP_CONFIG.ORIGEM;
        const res = await fetch(getUrl);
        const data = await res.json();

        if (data.error) {
            showToast('Erro do servidor: ' + data.error, 'error');
            return null;
        } else if (data.registros) {
            showToast('Sincronização concluída com sucesso!', 'success');
            return data.registros;
        }
    } catch (e) {
        showToast('Erro ao puxar dados da nuvem.', 'error');
        console.error('GAS GET Error:', e);
        return null;
    } finally {
        hideLoading();
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
