// =============================================
// FFQP App - Lógica Específica da Loja Quarta Parada
// =============================================

const DRAFT_KEY = 'qpf2_draft_data_v1';

document.addEventListener('DOMContentLoaded', function () {
    // Set today's date
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('data').value = `${yyyy}-${mm}-${dd}`;

    // Load Draft if exists
    if (typeof loadDraft === 'function') loadDraft('formFechamento', DRAFT_KEY);

    // Auto-save on every input/change
    document.getElementById('formFechamento').addEventListener('input', () => {
        if (typeof saveDraft === 'function') saveDraft('formFechamento', DRAFT_KEY);
    });

    // Currency mask
    const currencyFields = ['total_debito', 'total_credito', 'total_pix_loja', 'total_pix_conta', 'total_dinheiro'];
    currencyFields.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', function (e) {
                this.value = this.value.replace(/[^0-9,]/g, '');
            });
        }
    });
});

// =============================================
// Form Submit Formosa (QPF2)
// =============================================
document.getElementById('formFechamento').addEventListener('submit', async function (e) {
    e.preventDefault();

    const btn = document.getElementById('btnSubmit');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const now = new Date();
        const carimbo = now.toLocaleString('pt-BR');

        const formData = {
            loja: 'FFQP',
            carimbo: carimbo,
            data: document.getElementById('data')?.value || '',
            agente: document.getElementById('agente')?.value.trim() || '',
            velorios: Number(document.getElementById('velorios')?.value) || 0,
            sepultamento_direto: Number(document.getElementById('sepultamento_direto')?.value) || 0,
            masculinos: Number(document.getElementById('masculinos')?.value) || 0,
            femininos: Number(document.getElementById('femininos')?.value) || 0,
            total_compras: Number(document.getElementById('total_compras')?.value) || 0,
            // Coroas
            coroas_iniciou: Number(document.getElementById('coroas_iniciou')?.value) || 0,
            coroas_reposicao: Number(document.getElementById('coroas_reposicao')?.value) || 0,
            coroas_vendidas: Number(document.getElementById('coroas_vendidas')?.value) || 0,
            coroas_retirar: Number(document.getElementById('coroas_retirar')?.value) || 0,
            coroas_descartadas: Number(document.getElementById('coroas_descartadas')?.value) || 0,
            coroas_saiu_consolare: Number(document.getElementById('coroas_saiu_consolare')?.value) || 0,
            coroas_saiu_anjo_luz: Number(document.getElementById('coroas_saiu_anjo_luz')?.value) || 0,
            // Vasos
            vasos_brancos_iniciou: Number(document.getElementById('vasos_brancos_iniciou')?.value) || 0,
            vasos_coloridos_iniciou: Number(document.getElementById('vasos_coloridos_iniciou')?.value) || 0,
            vasos_vendidos_loja: Number(document.getElementById('vasos_vendidos_loja')?.value) || 0,
            vasos_brancos_finalizou: Number(document.getElementById('vasos_brancos_finalizou')?.value) || 0,
            vasos_coloridos_finalizou: Number(document.getElementById('vasos_coloridos_finalizou')?.value) || 0,
            vasos_finalizou_total: Number(document.getElementById('vasos_finalizou_total')?.value) || 0,
            descarte_vasos: Number(document.getElementById('descarte_vasos')?.value) || 0,
            descarte_vasos_cores: document.getElementById('descarte_vasos_cores')?.value.trim() || '',
            // Rosas - Pacotes
            rosas_brancas_iniciou: Number(document.getElementById('rosas_brancas_iniciou')?.value) || 0,
            rosas_brancas_finalizou: Number(document.getElementById('rosas_brancas_finalizou')?.value) || 0,
            rosas_amarelas_iniciou: Number(document.getElementById('rosas_amarelas_iniciou')?.value) || 0,
            rosas_amarelas_finalizou: Number(document.getElementById('rosas_amarelas_finalizou')?.value) || 0,
            rosas_vermelhas_iniciou: Number(document.getElementById('rosas_vermelhas_iniciou')?.value) || 0,
            rosas_vermelhas_finalizou: Number(document.getElementById('rosas_vermelhas_finalizou')?.value) || 0,
            rosas_rosa_iniciou: Number(document.getElementById('rosas_rosa_iniciou')?.value) || 0,
            rosas_rosa_finalizou: Number(document.getElementById('rosas_rosa_finalizou')?.value) || 0,
            rosas_champanhe_iniciou: Number(document.getElementById('rosas_champanhe_iniciou')?.value) || 0,
            rosas_champanhe_finalizou: Number(document.getElementById('rosas_champanhe_finalizou')?.value) || 0,
            rosas_mistas_iniciou: Number(document.getElementById('rosas_mistas_iniciou')?.value) || 0,
            rosas_mistas_finalizou: Number(document.getElementById('rosas_mistas_finalizou')?.value) || 0,
            // Rosas - Gerais
            rosas_vendidas_loja: Number(document.getElementById('rosas_vendidas_loja')?.value) || 0,
            rosas_expositor_inicio: Number(document.getElementById('rosas_expositor_inicio')?.value) || 0,
            rosas_expositor_finalizou: Number(document.getElementById('rosas_expositor_finalizou')?.value) || 0,
            rosas_abertas_plantao: Number(document.getElementById('rosas_abertas_plantao')?.value) || 0,
            rosas_pacotes_finalizou_total: Number(document.getElementById('rosas_pacotes_finalizou_total')?.value) || 0,
            descarte_rosas: Number(document.getElementById('descarte_rosas')?.value) || 0,
            descarte_rosas_cores: document.getElementById('descarte_rosas_cores')?.value.trim() || '',
            // Outras Flores
            crisantemos_vaso_iniciou: Number(document.getElementById('crisantemos_vaso_iniciou')?.value) || 0,
            crisantemos_vaso_finalizou: Number(document.getElementById('crisantemos_vaso_finalizou')?.value) || 0,
            crisantemos_maco_iniciou: Number(document.getElementById('crisantemos_maco_iniciou')?.value) || 0,
            crisantemos_maco_finalizou: Number(document.getElementById('crisantemos_maco_finalizou')?.value) || 0,
            tango_iniciou: Number(document.getElementById('tango_iniciou')?.value) || 0,
            tango_finalizou: Number(document.getElementById('tango_finalizou')?.value) || 0,
            gipsofila_iniciou: Number(document.getElementById('gipsofila_iniciou')?.value) || 0,
            gipsofila_finalizou: Number(document.getElementById('gipsofila_finalizou')?.value) || 0,
            lisiantus_iniciou: Number(document.getElementById('lisiantus_iniciou')?.value) || 0,
            lisiantus_finalizou: Number(document.getElementById('lisiantus_finalizou')?.value) || 0,
            // Logística
            total_reposicao: Number(document.getElementById('total_reposicao')?.value) || 0,
            mat_cooperflora: document.getElementById('mat_cooperflora')?.value || '',
            mat_carlos: document.getElementById('mat_carlos')?.value || '',
            mat_guadalupe: document.getElementById('mat_guadalupe')?.value || '',
            velas_vendidas: Number(document.getElementById('velas_vendidas')?.value) || 0,
            velas_descartadas: Number(document.getElementById('velas_descartadas')?.value) || 0,
            plaquinhas_vendidas: Number(document.getElementById('plaquinhas_vendidas')?.value) || 0,
            plaquinhas_descarte: Number(document.getElementById('plaquinhas_descarte')?.value) || 0,
            observacoes: document.getElementById('observacoes')?.value.trim() || '',
            total_debito: document.getElementById('total_debito')?.value.trim() || '0',
            total_credito: document.getElementById('total_credito')?.value.trim() || '0',
            total_pix_loja: document.getElementById('total_pix_loja')?.value.trim() || '0',
            total_pix_conta: document.getElementById('total_pix_conta')?.value.trim() || '0',
            total_dinheiro: document.getElementById('total_dinheiro')?.value.trim() || '0',
            tercos_vendidos: document.getElementById('tercos_vendidos')?.value.trim() || '',
            // Foto Base64
            foto_relatorio_base64: window.photoBase64 || '',
            foto_nome: window.photoName || '',
            foto_mimeType: window.photoMimeType || ''
        };
        
        await gasPost(formData);

        showToast('✅ Relatório enviado com sucesso!', 'success');

        const agente = document.getElementById('agente').value;
        const data = document.getElementById('data').value;
        document.getElementById('formFechamento').reset();
        document.getElementById('agente').value = agente;
        document.getElementById('data').value = data;
        
        if (typeof resetPhotoGlobals === 'function') resetPhotoGlobals();
        if (typeof clearDraft === 'function') clearDraft(DRAFT_KEY);

        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Erro ao enviar:', error);
        showToast('❌ Erro ao enviar. ' + error.message, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
});
