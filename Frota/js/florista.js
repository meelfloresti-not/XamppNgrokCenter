const API_BASE     = 'php/api.php';
const API_PRODUCAO = 'php/atualizar_producao.php';

let floristaNome  = '';
let osSelecionada = '';

// ─── Helpers ───────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.borderLeft = type === 'error' ? '4px solid #ff3b30' : '4px solid #34c759';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
}
function showLoading() { document.getElementById('loading').classList.add('active'); }
function hideLoading() { document.getElementById('loading').classList.remove('active'); }
function switchView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ─── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    floristaNome = localStorage.getItem('frota_florista');
    if (floristaNome) {
        document.getElementById('inputFlorista').value = floristaNome;
        document.getElementById('headerName').textContent = '🌸 ' + floristaNome;
        carregarOS();
    }

    // Polling a cada 10 segundos
    setInterval(() => {
        if (floristaNome && document.getElementById('viewLista').classList.contains('active')) {
            carregarOS(true);
        }
    }, 10000);
});

function acessarSistema() {
    const nome = document.getElementById('inputFlorista').value.trim();
    if (!nome) return showToast('Selecione seu nome.', 'error');
    floristaNome = nome;
    localStorage.setItem('frota_florista', nome);
    document.getElementById('headerName').textContent = '🌸 ' + nome;
    carregarOS();
}

function sair() {
    localStorage.removeItem('frota_florista');
    floristaNome = '';
    document.getElementById('headerName').textContent = '🌸 Florista';
    switchView('viewLogin');
}

// ─── Carregar OS ───────────────────────────────────────────
async function carregarOS(silencioso = false) {
    if (!silencioso) {
        switchView('viewLista');
        document.getElementById('listaOS').innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.5)">Carregando...</div>';
        document.getElementById('subLista').textContent = 'Buscando OS...';
    }

    try {
        const url = `${API_BASE}?action=buscarPedidosFlorista&florista=${encodeURIComponent(floristaNome)}`;
        const res  = await fetch(url);
        const json = await res.json();
        if (json.status !== 'sucesso') throw new Error(json.mensagem);
        renderizarOS(json.dados || []);
    } catch (e) {
        if (!silencioso) {
            document.getElementById('listaOS').innerHTML = '';
            showToast('Erro: ' + e.message, 'error');
        }
    }
}

// ─── Imagens de Exemplo ────────────────────────────────────
function getImagemExemplo(tipo) {
    const mapa = {
        'Conjunto São Paulo': 'ConjuntoSaoPaulo.jpg',
        'Conjunto Lisboa': 'ConjuntoLisboa.jpg',
        'Conjunto Las Vegas': 'ConjuntoLasVegas.jpg',
        'Conjunto Sidney': 'ConjuntoSidney.jpg',
        'Conjunto Vip III': 'ConjuntoVipIII.jpg',
        'Conjunto New York': 'ConjuntoNewYork.jpg',
        'Conjunto Tókio': 'ConjuntoTokio.jpg',
        'Conjunto Ouro Branco': 'ConjuntoOuroBranco.jpg',
        'Conjunto A Luxo': 'ConjuntoAluxo.jpg',
        'Conjunto B Luxo': 'ConjuntoBluxo.jpg',
        'Conjunto B Luxo Colorido': 'Conjunto.jpg', 
        'Conjunto B Semi Luxo Colorido': 'ConjuntoBsemiLuxoColorido.jpg',
        'Coroa A Vip I': 'CoraAvipIeVipII.jpg',
        'Coroa A Vip II': 'CoraAvipIeVipII.jpg',
        'Coroa Sidney': 'CoroaSidneyeHavaiana.jpg',
        'Coroa Havaiana': 'CoroaSidneyeHavaiana.jpg',
        'Coroa Dubai': 'CoroaDubaieTokio.jpg',
        'Coroa Tókio': 'CoroaDubaieTokio.jpg',
        'Coroa A Luxo Branca': 'CoroaAluxoBrancaeAluxoColorida.jpg',
        'Coroa A Luxo Colorida': 'CoroaAluxoBrancaeAluxoColorida.jpg',
        'Coroa B Luxo Branca': 'CoroaBluxoBrancaeGuirlandaLuxoTonsClaros.jpg',
        'Guirlanda Luxo Tons Claros': 'CoroaBluxoBrancaeGuirlandaLuxoTonsClaros.jpg',
        'Coração Cheio': 'CoracaoCheioVazadoVermelhoEvazadoBranco.jpg',
        'Coração Vazado Vermelho': 'CoracaoCheioVazadoVermelhoEvazadoBranco.jpg',
        'Coração Vazado Branco': 'CoracaoCheioVazadoVermelhoEvazadoBranco.jpg',
        'Corbélia': 'CorbeliaEarranjoEstocolmo.jpg',
        'Arranjo Estocolmo': 'CorbeliaEarranjoEstocolmo.jpg',
        'Coroa B Semi Luxo': 'CoroaBsemiLuxo.jpg',
        'Coroa B Simples': 'CoroaBsimples.jpg',
        'Conjunto': 'Conjunto.jpg'
    };
    return mapa[tipo] || null;
}

function renderizarOS(lista) {
    const container = document.getElementById('listaOS');
    container.innerHTML = '';

    if (lista.length === 0) {
        document.getElementById('subLista').textContent = 'Nenhuma OS atribuída a você no momento.';
        container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:rgba(255,255,255,0.4)">Você está em dia! ✨</div>';
        return;
    }

    document.getElementById('subLista').textContent = `${lista.length} OS pendente(s) de você.`;

    lista.forEach(p => {
        const jaIniciou = !!p.hora_inicio_producao;
        const card = document.createElement('div');
        card.className = 'card';

        let itensHtml = '—';
        try { 
            const arr = JSON.parse(p.itensJSON || '[]'); 
            itensHtml = arr.map(i => {
                let html = `<div style="font-weight:700; font-size: 16px; margin-bottom:8px; color: var(--text);">🌸 ${i.quantidade}× ${i.tipo}</div>`;
                let imgFile = getImagemExemplo(i.tipo);
                if (imgFile) {
                    html += `<div style="margin-bottom:16px; text-align:center; background:#111; padding:8px; border-radius:12px;">
                                <img src="exemplosimg/${imgFile}" style="max-width:100%; max-height:220px; object-fit:contain; border-radius:8px; border:1px solid rgba(255,255,255,0.1);" alt="${i.tipo}">
                             </div>`;
                }
                return html;
            }).join('');
        } catch(e) {}

        const osNum = p.pedido ? `OS: ${p.pedido}` : `ID: ${p.id}`;

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="card-chip ${jaIniciou ? 'chip-started' : 'chip-pending'}">
                    ${jaIniciou ? '⚙️ EM PRODUÇÃO' : '⏳ AGUARDANDO INÍCIO'}
                </span>
                <span class="card-id">${osNum}</span>
            </div>
            <div class="card-title">${p.cliente || 'Sem Cliente'}</div>
            
            <div style="margin-bottom: 16px;">
                ${itensHtml}
            </div>

            <div class="card-detail" style="background: var(--surface2); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                ${p.falecido ? `<div style="margin-bottom: 8px; font-weight: 600; color: var(--text);">👤 Falecido: <span style="font-weight: 400; color: var(--text-sec);">${p.falecido}</span></div>` : ''}
                ${p.frase_coroa ? `<div style="margin-bottom: 8px; font-weight: 600; color: var(--text);">💬 Frase: <span style="font-style: italic; font-weight: 400; color: var(--amber);">"${p.frase_coroa}"</span></div>` : ''}
                ${p.local_entrega ? `<div style="margin-bottom: 8px; font-weight: 600; color: var(--text);">📍 Local: <span style="font-weight: 400; color: var(--text-sec);">${p.local_entrega}</span></div>` : ''}
                ${p.data_entrega ? `<div style="margin-bottom: 8px; font-weight: 600; color: var(--text);">📅 Data: <span style="font-weight: 400; color: var(--text-sec);">${p.data_entrega.split('-').reverse().join('/')}</span></div>` : ''}
                ${p.hora_prazo ? `<div style="font-weight: 600; color: var(--text);">⏰ Hora: <span style="font-weight: 400; color: var(--text-sec);">${p.hora_prazo}</span></div>` : ''}
            </div>

            ${jaIniciou ? 
                `<div class="card-meta">⏱ Iniciado às ${p.hora_inicio_producao}</div>
                 <button class="btn btn-success" style="display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="abrirFinalizar('${p.id}')">📸 Fotografar e Finalizar</button>` 
                : 
                `<button class="btn btn-start" style="display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="iniciarProducao('${p.id}', this)">▶ Iniciar Produção</button>`
            }
        `;
        container.appendChild(card);
    });
}
// ─── Iniciar Produção ──────────────────────────────────────
async function iniciarProducao(id, btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Registrando...';
    showLoading();
    try {
        const res  = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'aceitarProducao', dados: { pedido_id: id } })
        });
        const json = await res.json();
        if (json.status === 'sucesso') {
            showToast(json.dados, 'success');
            carregarOS();
        } else {
            showToast('Erro: ' + (json.mensagem || ''), 'error');
            btn.disabled = false;
            btn.textContent = '▶ Iniciar Produção';
        }
    } catch (e) {
        showToast('Falha: ' + e.message, 'error');
        btn.disabled = false;
        btn.textContent = '▶ Iniciar Produção';
    }
    hideLoading();
}

// ─── Finalizar OS ──────────────────────────────────────────
function abrirFinalizar(id) {
    osSelecionada = id;
    document.getElementById('subFinalizarOS').textContent = `OS: ${id}`;
    document.getElementById('inpFotoProducao').value = '';
    document.getElementById('lblFotoProducao').style.display = 'none';
    switchView('viewFinalizar');
}

function voltarParaLista() {
    osSelecionada = '';
    carregarOS();
}

function previewFotoProducao() {
    const f = document.getElementById('inpFotoProducao').files[0];
    document.getElementById('lblFotoProducao').style.display = f ? 'block' : 'none';
}

function resizeToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > h) { if (w > 900) { h *= 900/w; w = 900; } }
                else       { if (h > 900) { w *= 900/h; h = 900; } }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.65));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function enviarFinalizacao() {
    const file = document.getElementById('inpFotoProducao').files[0];
    let fotoBase64 = null;

    showLoading();
    if (file) {
        try { fotoBase64 = await resizeToBase64(file); }
        catch(e) { hideLoading(); return showToast('Erro na foto: ' + e.message, 'error'); }
    }

    try {
        const res  = await fetch(API_PRODUCAO, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ os_id: osSelecionada, foto_base64: fotoBase64 })
        });
        const json = await res.json();
        if (json.status === 'sucesso') {
            showToast(json.dados, 'success');
            osSelecionada = '';
            carregarOS();
        } else {
            showToast('Erro: ' + (json.mensagem || ''), 'error');
        }
    } catch(e) {
        showToast('Falha: ' + e.message, 'error');
    }
    hideLoading();
}
