// =============================================
// State
// =============================================
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwjM35PU1rPeBtJFTjSnLdG9T4ivjTVaAGqKFjtyAc-sLxHoA-c72qtT_E3D0xi-yG0/exec";
let scriptUrl = localStorage.getItem('gasUrl') || DEFAULT_SCRIPT_URL;
let photoBase64 = '';
let photoName = '';
let photoMimeType = '';

// =============================================
// File Upload / Compression
// =============================================
function handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('⚠️ A imagem deve ter no máximo 5MB', 'error');
        input.value = '';
        return;
    }

    photoName = file.name;
    photoMimeType = file.type || 'image/jpeg';

    // Preview local imediato antes de comprimir
    const urlReader = new FileReader();
    urlReader.onload = function (e) {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('filePreview').style.display = 'block';
        document.getElementById('fileUploadArea').classList.add('has-file');
    };
    urlReader.readAsDataURL(file);

    // Compressão da Imagem
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Pega base64 comprimido
            let dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            // Remove prefixo (data:image/jpeg;base64,) para o Google Apps Script decodificar melhor
            photoBase64 = dataUrl.split(',')[1];
        }
    }
}

// =============================================
// Auto-Save Draft (Cache)
// =============================================
const DRAFT_KEY = 'f3_draft_data_v3';

function saveDraft() {
    const form = document.getElementById('formFechamento');
    const formData = new FormData(form);
    const draft = {};
    formData.forEach((value, key) => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input && input.type !== 'file') {
            draft[key] = value;
        }
    });
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function loadDraft() {
    const draftStr = localStorage.getItem(DRAFT_KEY);
    if (!draftStr) return;
    try {
        const draft = JSON.parse(draftStr);
        const form = document.getElementById('formFechamento');
        Object.keys(draft).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`) || document.getElementById(key);
            if (input && input.type !== 'file') {
                input.value = draft[key];
            }
        });
    } catch (e) {
        console.error('Erro ao ler rascunho', e);
    }
}

function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
}

// =============================================
// Init
// =============================================
document.addEventListener('DOMContentLoaded', function () {
    // Set system datetime
    const now = new Date();
    document.getElementById('data_sistema').value = now.toLocaleString('pt-BR');

    // Set today's date
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    document.getElementById('data').value = `${yyyy}-${mm}-${dd}`;

    // Load Draft if exists
    loadDraft();

    // Auto-save on every input/change
    document.getElementById('formFechamento').addEventListener('input', saveDraft);

    // Currency mask for all currency fields
    document.querySelectorAll('.currency-field').forEach(field => {
        field.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9,]/g, '');
        });
    });
});

// =============================================
// Form Submit
// =============================================
document.getElementById('formFechamento').addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!scriptUrl) {
        showToast('⚠️ URL do Apps Script não configurada', 'error');
        return;
    }

    const btn = document.getElementById('btnSubmit');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        // Generate timestamp
        const now = new Date();
        const carimbo = now.toLocaleString('pt-BR');

        // Collect all form data following the new structure
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

            // Foto Base64
            foto_relatorio_base64: typeof photoBase64 !== 'undefined' ? photoBase64 : '',
            foto_nome: typeof photoName !== 'undefined' ? photoName : '',
            foto_mimeType: typeof photoMimeType !== 'undefined' ? photoMimeType : ''
        };

        const response = await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(formData)
        });

        showToast('✅ Relatório enviado com sucesso!', 'success');

        // Reset form (keep date and agente)
        const agente = document.getElementById('agente').value;
        const data = document.getElementById('data').value;
        document.getElementById('formFechamento').reset();
        document.getElementById('agente').value = agente;
        document.getElementById('data').value = data;

        // Reset foto
        photoBase64 = '';
        photoName = '';
        photoMimeType = '';
        const filePreview = document.getElementById('filePreview');
        if (filePreview) filePreview.style.display = 'none';
        const fileUploadArea = document.getElementById('fileUploadArea');
        if (fileUploadArea) fileUploadArea.classList.remove('has-file');

        // Re-set system date
        document.getElementById('data_sistema').value = new Date().toLocaleString('pt-BR');
        clearDraft();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Erro ao enviar:', error);
        showToast('❌ Erro ao enviar. Verifique a URL do Apps Script.', 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
});

// =============================================
// Toast
// =============================================
function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast--${type}`;

    // Force reflow
    void toast.offsetWidth;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}
