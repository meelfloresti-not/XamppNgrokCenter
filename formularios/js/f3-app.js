// =============================================
// F3 App - Lógica Específica da Loja Formosa
// =============================================

const DRAFT_KEY = 'f3_draft_data_v3';

document.addEventListener('DOMContentLoaded', function () {
    // Set system datetime
    const now = new Date();
    document.getElementById('data_sistema').value = now.toLocaleString('pt-BR');

    // Set today's date
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    document.getElementById('data').value = `${yyyy}-${mm}-${dd}`;

    // Load Draft se existir
    if (typeof loadDraft === 'function') loadDraft('formFechamento', DRAFT_KEY);

    // Auto-save on every input/change
    document.getElementById('formFechamento').addEventListener('input', () => {
        if (typeof saveDraft === 'function') saveDraft('formFechamento', DRAFT_KEY);
    });

    // Currency mask for all currency fields
    document.querySelectorAll('.currency-field').forEach(field => {
        field.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9,]/g, '');
        });
    });
});

// =============================================
// Form Submit Formosa (F3)
// =============================================
document.getElementById('formFechamento').addEventListener('submit', async function (e) {
    e.preventDefault();

    const btn = document.getElementById('btnSubmit');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const now = new Date();
        const carimbo = now.toLocaleString('pt-BR');

        // Criação dinâmica do DTO lendo todos os IDs mapeados
        const formData = {
            loja: 'F3',
            carimbo: carimbo,
            data_sistema: document.getElementById('data_sistema')?.value || '',
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

            // Rosas
            rosas_iniciou: Number(document.getElementById('rosas_iniciou')?.value) || 0,
            rosas_reposicao: Number(document.getElementById('rosas_reposicao')?.value) || 0,
            rosas_vendidas: Number(document.getElementById('rosas_vendidas')?.value) || 0,
            rosas_sobras: Number(document.getElementById('rosas_sobras')?.value) || 0,
            rosas_descartadas: Number(document.getElementById('rosas_descartadas')?.value) || 0,

            // Vasos
            vasos_iniciou: Number(document.getElementById('vasos_iniciou')?.value) || 0,
            vasos_reposicao: Number(document.getElementById('vasos_reposicao')?.value) || 0,
            vasos_vendidos: Number(document.getElementById('vasos_vendidos')?.value) || 0,
            vasos_sobras: Number(document.getElementById('vasos_sobras')?.value) || 0,
            vasos_descartados: Number(document.getElementById('vasos_descartados')?.value) || 0,

            // Vasos Decorados
            vasos_dec_iniciou: Number(document.getElementById('vasos_dec_iniciou')?.value) || 0,
            vasos_dec_reposicao: Number(document.getElementById('vasos_dec_reposicao')?.value) || 0,
            vasos_dec_vendidos: Number(document.getElementById('vasos_dec_vendidos')?.value) || 0,
            vasos_dec_sobras: Number(document.getElementById('vasos_dec_sobras')?.value) || 0,
            vasos_dec_descartados: Number(document.getElementById('vasos_dec_descartados')?.value) || 0,

            // Velas
            velas_vendidas: Number(document.getElementById('velas_vendidas')?.value) || 0,
            velas_descartadas: Number(document.getElementById('velas_descartadas')?.value) || 0,

            // Plaquinhas
            plaquinhas_vendidas: Number(document.getElementById('plaquinhas_vendidas')?.value) || 0,
            plaquinhas_descartadas: Number(document.getElementById('plaquinhas_descartadas')?.value) || 0,

            // Terços Brancos
            tercos_vendidos: Number(document.getElementById('tercos_vendidos')?.value) || 0,
            tercos_descartados: Number(document.getElementById('tercos_descartados')?.value) || 0,

            // Cata-vento
            catavento_vendidos: Number(document.getElementById('catavento_vendidos')?.value) || 0,
            catavento_descartados: Number(document.getElementById('catavento_descartados')?.value) || 0,

            // Lenço Descartável
            lenco_vendidos: Number(document.getElementById('lenco_vendidos')?.value) || 0,
            lenco_descartados: Number(document.getElementById('lenco_descartados')?.value) || 0,

            // Observações
            observacoes: document.getElementById('observacoes')?.value.trim() || '',

            // Financeiro – Maquininha Diversos
            debito_diversos: document.getElementById('debito_diversos')?.value.trim() || '0',
            credito_diversos: document.getElementById('credito_diversos')?.value.trim() || '0',
            pix_diversos: document.getElementById('pix_diversos')?.value.trim() || '0',
            dinheiro_diversos: document.getElementById('dinheiro_diversos')?.value.trim() || '0',

            // Financeiro – Maquininha Coroas
            debito_coroas: document.getElementById('debito_coroas')?.value.trim() || '0',
            credito_coroas: document.getElementById('credito_coroas')?.value.trim() || '0',
            pix_coroas: document.getElementById('pix_coroas')?.value.trim() || '0',
            dinheiro_coroas: document.getElementById('dinheiro_coroas')?.value.trim() || '0',

            // Financeiro – Maquininha Café Diversos
            debito_cafe: document.getElementById('debito_cafe')?.value.trim() || '0',
            credito_cafe: document.getElementById('credito_cafe')?.value.trim() || '0',
            pix_cafe: document.getElementById('pix_cafe')?.value.trim() || '0',
            dinheiro_cafe: document.getElementById('dinheiro_cafe')?.value.trim() || '0',

            // Pagamento por Link
            link_quantidade: Number(document.getElementById('link_quantidade')?.value) || 0,
            link_valor: document.getElementById('link_valor')?.value.trim() || '0',

            // Foto Base64 via window originada do image.js
            foto_relatorio_base64: window.photoBase64 || '',
            foto_nome: window.photoName || '',
            foto_mimeType: window.photoMimeType || ''
        };

        await gasPost(formData);

        showToast('✅ Relatório enviado com sucesso!', 'success');

        // Reset form keeping date and agente
        const agente = document.getElementById('agente').value;
        const data = document.getElementById('data').value;
        document.getElementById('formFechamento').reset();
        document.getElementById('agente').value = agente;
        document.getElementById('data').value = data;

        // Limpar foto via image.js
        if (typeof resetPhotoGlobals === 'function') resetPhotoGlobals();

        document.getElementById('data_sistema').value = new Date().toLocaleString('pt-BR');
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
