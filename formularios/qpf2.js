// =============================================
// State
// =============================================
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwjM35PU1rPeBtJFTjSnLdG9T4ivjTVaAGqKFjtyAc-sLxHoA-c72qtT_E3D0xi-yG0/exec";
let scriptUrl = localStorage.getItem('gasUrl') || DEFAULT_SCRIPT_URL;
let photoBase64 = '';
let photoName = '';
let photoMimeType = '';

// =============================================
// Auto-Save Draft (Cache)
// =============================================
const DRAFT_KEY = 'qpf2_draft_data_v1';

function saveDraft() {
    const form = document.getElementById('formFechamento');
    const formData = new FormData(form);
    const draft = {};
    formData.forEach((value, key) => {
        const input = form.querySelector(`[name="${key}"]`);
        // Não salva arquivos de imagem no cache
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
    // Set today's date
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('data').value = `${yyyy}-${mm}-${dd}`;

    // Load Draft if exists
    loadDraft();

    // Auto-save on every input/change
    document.getElementById('formFechamento').addEventListener('input', saveDraft);

    // Update config banner
    updateConfigBanner();

    // Currency mask
    const currencyFields = ['total_debito', 'total_credito', 'total_pix_loja', 'total_pix_conta', 'total_dinheiro'];
    currencyFields.forEach(id => {
        document.getElementById(id).addEventListener('input', function (e) {
            // Allow only digits and comma
            this.value = this.value.replace(/[^0-9,]/g, '');
        });
    });
});

// =============================================
// Config Modal
// =============================================
function openConfigModal() {
    document.getElementById('scriptUrl').value = scriptUrl;
    document.getElementById('configModal').classList.add('show');
}

function closeConfigModal() {
    document.getElementById('configModal').classList.remove('show');
}

function saveScriptUrl() {
    const url = document.getElementById('scriptUrl').value.trim();
    if (!url) {
        showToast('⚠️ Cole a URL do Apps Script', 'error');
        return;
    }
    scriptUrl = url;
    localStorage.setItem('gasUrl', url);
    updateConfigBanner();
    closeConfigModal();
    showToast('✅ URL salva com sucesso!', 'success');
}

function updateConfigBanner() {
    const banner = document.getElementById('configBanner');
    const text = document.getElementById('configText');
    if (scriptUrl) {
        banner.classList.add('configured');
        text.textContent = '✓ Google Apps Script configurado — Clique para alterar';
    } else {
        banner.classList.remove('configured');
        text.textContent = 'Clique aqui para configurar a URL do Google Apps Script';
    }
}

// =============================================
// File Upload
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
            photoBase64 = dataUrl.split(',')[1];
        }
    }
}

// =============================================
// Form Submit
// =============================================
document.getElementById('formFechamento').addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!scriptUrl) {
        openConfigModal();
        showToast('⚠️ Configure a URL do Apps Script primeiro', 'error');
        return;
    }

    const btn = document.getElementById('btnSubmit');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        // Generate timestamp
        const now = new Date();
        const carimbo = now.toLocaleString('pt-BR');

        // Collect data safely
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
            foto_relatorio_base64: typeof photoBase64 !== 'undefined' ? photoBase64 : '',
            foto_nome: typeof photoName !== 'undefined' ? photoName : '',
            foto_mimeType: typeof photoMimeType !== 'undefined' ? photoMimeType : ''
        };
        const response = await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            // Removido application/json para evitar erros de CORS preflight no navegador
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(formData)
        });

        // With no-cors, we can't read the response, but if no error was thrown, it was sent
        showToast('✅ Relatório enviado com sucesso!', 'success');

        // Reset form (keep date and agente)
        const agente = document.getElementById('agente').value;
        const data = document.getElementById('data').value;
        document.getElementById('formFechamento').reset();
        document.getElementById('agente').value = agente;
        document.getElementById('data').value = data;
        photoBase64 = '';
        photoName = '';
        photoMimeType = '';
        const filePreview = document.getElementById('filePreview');
        if (filePreview) filePreview.style.display = 'none';
        const fileUploadArea = document.getElementById('fileUploadArea');
        if (fileUploadArea) fileUploadArea.classList.remove('has-file');
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
// Iframe Toggle
// =============================================
function toggleIframe() {
    const toggle = document.getElementById('iframeToggle');
    const container = document.getElementById('iframeContainer');
    toggle.classList.toggle('open');
    container.classList.toggle('open');
}

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

// Close modal on overlay click
document.getElementById('configModal').addEventListener('click', function (e) {
    if (e.target === this) closeConfigModal();
});

// Close modal on Escape
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeConfigModal();
});
