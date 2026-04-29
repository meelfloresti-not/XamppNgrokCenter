// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
        console.error('SW registration falhou: ', err);
    });
}

const API_BASE = 'php/api.php';
const API_STATUS = 'php/atualizar_status.php';
let motoristaNome = '';
let viagemIdAtual = '';
let osSelecionada = '';
let viagemJaAceita = false; 

// UI Helpers
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.borderLeft = type === 'error' ? '4px solid var(--danger)' : '4px solid var(--success)';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function showLoading() { document.getElementById('loading').classList.add('active'); }
function hideLoading() { document.getElementById('loading').classList.remove('active'); }

function switchView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    motoristaNome = localStorage.getItem('frota_motorista');
    if (motoristaNome) {
        document.getElementById('inputMotorista').value = motoristaNome;
        document.getElementById('headerName').textContent = 'Motorista: ' + motoristaNome;
        carregarEntregas();
    }

    setInterval(() => {
        if (motoristaNome && document.getElementById('viewLista').classList.contains('active')) {
            carregarEntregas(true);
        }
    }, 10000);
});

function acessarSistema() {
    const nome = document.getElementById('inputMotorista').value.trim();
    if (!nome) return showToast('Selecione seu nome na lista.', 'error');

    motoristaNome = nome;
    localStorage.setItem('frota_motorista', nome);
    document.getElementById('headerName').textContent = 'Motorista: ' + nome;
    carregarEntregas();
}

function sair() {
    localStorage.removeItem('frota_motorista');
    motoristaNome = '';
    document.getElementById('headerName').textContent = 'Motorista';
    switchView('viewLogin');
}

async function carregarEntregas(silencioso = false) {
    if (!silencioso) {
        switchView('viewLista');
        document.getElementById('listaEntregas').innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-sec)">Carregando...</div>';
        document.getElementById('btnChegueiBase').style.display = 'none';
    }

    try {
        const url = `${API_BASE}?action=buscarPedidosMotorista&motorista=${encodeURIComponent(motoristaNome)}`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.status !== 'sucesso') throw new Error(json.mensagem);

        const pedidos = json.dados || [];
        renderizarEntregas(pedidos);
    } catch (e) {
        if (!silencioso) {
            document.getElementById('listaEntregas').innerHTML = '';
            showToast('Erro ao buscar viagens: ' + e.message, 'error');
        }
    }
}

function renderizarEntregas(pedidos) {
    const container = document.getElementById('listaEntregas');
    container.innerHTML = '';

    if (pedidos.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 40px 20px; color: var(--text-sec)">Nenhum pedido "Em Rota" atribuído a você no momento.</div>';
        return;
    }

    viagemIdAtual = pedidos[0].viagem_id || '';
    
    // Verifica se a viagem já possui hora de saída
    viagemJaAceita = !!pedidos[0].hora_saida;

    // Cabeçalho da viagem
    if (!viagemJaAceita) {
        const aceitarDiv = document.createElement('div');
        aceitarDiv.style.marginBottom = '24px';
        aceitarDiv.innerHTML = `
            <button class="btn btn-primary" style="background-color: var(--warning); color: #000;" onclick="aceitarViagem()">Aceitar Rota / Iniciar Viagem</button>
            <p style="text-align:center; margin-top:8px; font-size:12px; color:var(--text-sec);">Você deve aceitar a rota antes de poder marcá-las como entregues.</p>
        `;
        container.appendChild(aceitarDiv);
    }

    pedidos.forEach(p => {
        let det = '';
        if (p.local_entrega) {
            const endSafe = p.local_entrega.replace(/'/g, "\\'");
            det = `<div style="margin-bottom: 12px;"><a href="#" onclick="event.preventDefault(); event.stopPropagation(); abrirNavegacao('${endSafe}')" style="color:var(--apple-blue); text-decoration:none; font-weight:600; font-size: 15px; padding: 6px 12px; border-radius: 8px; background: rgba(0, 113, 227, 0.1); display: inline-block;">📍 Navegar: ${p.local_entrega}</a></div>`;
        }
        
        const osAceita = !!p.hora_inicio_entrega;
        const osNum = p.pedido ? `OS: ${p.pedido}` : `ID: ${p.id}`;
        
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <span class="card-id">${osNum}</span>
                <span style="font-size: 12px; color: ${osAceita ? 'var(--success)' : 'var(--warning)'}; font-weight: 600;">${osAceita ? '✔️ Entregando' : '⏳ Aguardando'}</span>
            </div>
            <div class="card-title">${p.cliente || 'S/ Cliente'}</div>
            
            <div style="background: var(--surface-2); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; line-height: 1.5;">
                ${det}
                ${p.falecido ? `<div style="margin-bottom: 4px; color: var(--text-main);">👤 Falecido: <span style="color: var(--text-sec);">${p.falecido}</span></div>` : ''}
                ${p.data_entrega ? `<div style="margin-bottom: 4px; color: var(--text-main);">📅 Data: <span style="color: var(--text-sec);">${p.data_entrega.split('-').reverse().join('/')}</span></div>` : ''}
                ${p.hora_prazo ? `<div style="margin-bottom: 4px; color: var(--text-main);">⏰ Hora limite: <span style="color: var(--text-sec);">${p.hora_prazo}</span></div>` : ''}
                ${osAceita ? `<div style="margin-top: 8px; color: var(--success); font-weight: 600;">⏱ Iniciado às: ${p.hora_inicio_entrega}</div>` : ''}
            </div>

            ${!viagemJaAceita 
                ? `<button class="btn" style="padding: 16px; font-size: 16px; background:var(--surface-2); color:var(--text-sec);" disabled>Aguardando Aceite da Rota</button>` 
                : (!osAceita 
                    ? `<button class="btn btn-primary" style="padding: 16px; font-size: 16px; background:var(--apple-blue); color:#fff;" onclick="aceitarOS('${p.id}', this)">▶ Iniciar Entrega (Cheguei)</button>`
                    : `<button class="btn btn-success" style="padding: 16px; font-size: 16px;" onclick="abrirFinalizar('${p.id}')">📸 Tirar Fotos e Finalizar OS</button>`)
            }
        `;
        container.appendChild(card);
    });

    document.getElementById('subLista').textContent = `${pedidos.length} pedido(s) pendente(s).`;
}

async function aceitarViagem() {
    if (!viagemIdAtual) return;
    showLoading();
    try {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'aceitarViagem',
                dados: { viagem_id: viagemIdAtual }
            })
        });
        const json = await res.json();
        if (json.status === 'sucesso') {
            showToast('Rota aceita com sucesso!', 'success');
            carregarEntregas();
        } else {
            showToast('Erro: ' + (json.mensagem || ''), 'error');
        }
    } catch (e) {
        showToast('Erro: ' + e.message, 'error');
    }
    hideLoading();
}

async function aceitarOS(id, btn) {
    btn.disabled = true;
    showLoading();
    try {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'aceitarEntrega',
                dados: { pedido_id: id }
            })
        });
        const json = await res.json();
        if (json.status === 'sucesso') {
            showToast('Entrega iniciada!', 'success');
            carregarEntregas();
        } else {
            showToast('Erro: ' + (json.mensagem || ''), 'error');
            btn.disabled = false;
        }
    } catch (e) {
        showToast('Erro: ' + e.message, 'error');
        btn.disabled = false;
    }
    hideLoading();
}

function abrirFinalizar(id) {
    osSelecionada = id;
    document.getElementById('subFinalizarOS').textContent = `ID: ${id}`;
    document.getElementById('inpQuemRecebeu').value = '';
    document.getElementById('inpFotoMaterial').value = '';
    document.getElementById('inpFotoOS').value = '';
    document.getElementById('lblFotoMaterial').style.display = 'none';
    document.getElementById('lblFotoOS').style.display = 'none';
    switchView('viewFinalizarOS');
}

function voltarParaLista() {
    osSelecionada = '';
    switchView('viewLista');
}

function previewFotoMaterial() {
    const f = document.getElementById('inpFotoMaterial').files[0];
    document.getElementById('lblFotoMaterial').style.display = f ? 'block' : 'none';
}

function previewFotoOS() {
    const f = document.getElementById('inpFotoOS').files[0];
    document.getElementById('lblFotoOS').style.display = f ? 'block' : 'none';
}

// Compressão local no celular antes de enviar
function resizeImageToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > 800) { height *= 800 / width; width = 800; }
          } else {
            if (height > 800) { width *= 800 / height; height = 800; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
}

async function enviarEntrega() {
    const quem = document.getElementById('inpQuemRecebeu').value.trim();
    if (!quem) return showToast('Passe o nome de quem recebeu.', 'error');

    const fileMaterial = document.getElementById('inpFotoMaterial').files[0];
    const fileOS = document.getElementById('inpFotoOS').files[0];
    
    if (!fileMaterial && !fileOS) {
        return showToast('Anexe ao menos a foto do material ou da OS.', 'warning');
    }

    let fotoBase64 = null;
    let fotoOsBase64 = null;
    
    showLoading(); 
    try {
        if (fileMaterial) {
            fotoBase64 = await resizeImageToBase64(fileMaterial);
        }
        if (fileOS) {
            fotoOsBase64 = await resizeImageToBase64(fileOS);
        }
    } catch(e) {
        hideLoading();
        return showToast('Ocorreu um erro ao processar as fotos.', 'error');
    }

    try {
        const res = await fetch(API_STATUS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                os_id: osSelecionada,
                quem_recebeu: quem,
                foto_base64: fotoBase64,
                foto_os_base64: fotoOsBase64
            })
        });
        const json = await res.json();

        if (json.status !== 'sucesso') throw new Error(json.mensagem);

        showToast('Entrega confirmada!', 'success');
        carregarEntregas();
        // Ele recarrega a lista; o pedido entregue mudou o status pra "Retornando", 
        // então sairá da lista (que só pega "Em Rota").
    } catch (e) {
        showToast('Falha: ' + e.message, 'error');
    }
    hideLoading();
}

async function encerrarViagem() {
    if (!viagemIdAtual) return;
    showLoading();
    try {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'registrarRetornoViagem',
                dados: { viagem_id: viagemIdAtual, hora_retorno: '' }
            })
        });
        const json = await res.json();

        if (json.status === 'sucesso') {
            showToast('Viagem encerrada! Bom descanso.', 'success');
            viagemIdAtual = '';
            carregarEntregas();
        } else {
            showToast('Erro: ' + (json.mensagem || ''), 'error');
        }
    } catch (e) {
        showToast('Erro: ' + e.message, 'error');
    }
    hideLoading();
}

// ─── Navegação Maps/Waze ─────────────────────────────────────────────────────
let _navEndereco = '';

function abrirNavegacao(endereco) {
    _navEndereco = endereco;
    document.getElementById('lblNavEndereco').textContent = endereco;
    const modal = document.getElementById('modalNavegacao');
    modal.style.display = 'flex';
}

function navegarCom(app) {
    const encoded = encodeURIComponent(_navEndereco);
    let url = '';
    if (app === 'maps') {
        url = 'https://www.google.com/maps/search/?api=1&query=' + encoded;
    } else {
        url = 'https://waze.com/ul?q=' + encoded + '&navigate=yes';
    }
    window.open(url, '_blank');
    fecharModalNav();
}

function fecharModalNav() {
    document.getElementById('modalNavegacao').style.display = 'none';
}
