import { gasGET, gasPOST, apiKeyORS } from './api.js';
import { showToast, showLoading, hideLoading } from './ui.js';
import { carregarStats } from './app.js';

let rascunhosDespacho   = [];
let aguardandoSaidaList = [];
export let finalizadosDespacho = [];
let calculoAtual = null;

// ─── Tabela pré-pronta de distâncias (cemitérios conhecidos) ──────────────────
// Dados do distancias.txt — distância total (ida e volta) em km a partir da base
// Coordenadas aproximadas para marcadores no mapa
const DISTANCIAS_PRESETS = {
  'consolação':        { distTotal: 35.8,  coords: [-46.6573, -23.5529] },
  'quarta parada':     { distTotal: 12.2,  coords: [-46.5808, -23.5467] },
  'santana':           { distTotal: 34.2,  coords: [-46.6326, -23.4860] },
  'chora menino':      { distTotal: 34.2,  coords: [-46.6326, -23.4860] },
  'tremembé':          { distTotal: 39.0,  coords: [-46.6280, -23.4620] },
  'vila mariana':      { distTotal: 26.6,  coords: [-46.6340, -23.5920] },
  'araçá':             { distTotal: 40.0,  coords: [-46.6703, -23.5553] },
  'dom bosco':         { distTotal: 83.0,  coords: [-46.7520, -23.4050] },
  'perus':             { distTotal: 83.0,  coords: [-46.7520, -23.4050] },
  'lapa':              { distTotal: 57.0,  coords: [-46.7060, -23.5220] },
  'santo amaro':       { distTotal: 61.8,  coords: [-46.6945, -23.6520] },
  'são paulo':         { distTotal: 42.8,  coords: [-46.6770, -23.5470] },
  'vila nova cachoeirinha': { distTotal: 47.6, coords: [-46.6350, -23.4680] },
  'campo grande':      { distTotal: 52.4,  coords: [-46.7190, -23.6770] },
  'lajeado':           { distTotal: 36.2,  coords: [-46.5100, -23.5270] },
  'penha':             { distTotal: 15.0,  coords: [-46.5430, -23.5280] },
  'são luiz':          { distTotal: 56.6,  coords: [-46.7470, -23.6040] },
  'vila formosa':      { distTotal: 2.0,   coords: [-46.5530, -23.5620] },
  'vila alpina':       { distTotal: 9.8,   coords: [-46.5560, -23.5770] },
  'são pedro':         { distTotal: 9.8,   coords: [-46.5560, -23.5770] },
  'itaquera':          { distTotal: 27.2,  coords: [-46.4690, -23.5360] },
  'parelheiros':       { distTotal: 84.2,  coords: [-46.7280, -23.8170] },
  'saudade':           { distTotal: 28.4,  coords: [-46.5210, -23.5490] },
  'morumbi':           { distTotal: 49.0,  coords: [-46.7290, -23.6040] },
  'redentor':          { distTotal: 42.4,  coords: [-46.6730, -23.5550] },
  'gethsêmani':        { distTotal: 49.6,  coords: [-46.6750, -23.5730] },
  'parque dos ipês':   { distTotal: 58.2,  coords: [-46.7310, -23.6610] },
  'carmo':             { distTotal: 29.0,  coords: [-46.5210, -23.5570] },
  'israelita do butantã': { distTotal: 57.4, coords: [-46.7460, -23.5730] },
};

// Busca se o texto digitado bate com um cemitério da tabela
function buscarPreset(textoParada) {
  const lower = textoParada.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [nome, dados] of Object.entries(DISTANCIAS_PRESETS)) {
    const nomeNorm = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (lower.includes(nomeNorm)) return { nome, ...dados };
  }
  return null;
}

// Exportar globalmente para o timer de atualização automática
window.carregarDadosDespacho = carregarDadosDespacho;

export function initDespachar() {
  document.getElementById('btnRefreshDespacho')?.addEventListener('click', () => carregarDadosDespacho(false));
  document.getElementById('btnAdicionarParada')?.addEventListener('click', adicionarParada);
  document.getElementById('btnCalcularDist')?.addEventListener('click', calcularDistancia);
  document.getElementById('btnFinalizar')?.addEventListener('click', finalizarDespacho);

  // Modal: Finalizar Entrega (pelo Kanban Em Rota)
  document.getElementById('btnCancelarFinalizar')?.addEventListener('click', () => {
    document.getElementById('modalFinalizar')?.classList.add('hidden');
  });
  document.getElementById('btnConfirmarFinalizar')?.addEventListener('click', confirmarFinalizarEntrega);

  // Modal: Retorno à Base
  document.getElementById('btnCancelarRetorno')?.addEventListener('click', () => {
    document.getElementById('modalRetorno')?.classList.add('hidden');
  });
  document.getElementById('btnConfirmarRetorno')?.addEventListener('click', confirmarRetornoViagem);

  // Modal: Atribuir Florista
  document.getElementById('btnAbrirAtribuirFlorista')?.addEventListener('click', () => {
    document.getElementById('selFlorista').value = '';
    document.getElementById('modalAtribuirFlorista')?.classList.remove('hidden');
  });
  document.getElementById('btnCancelarAtribuir')?.addEventListener('click', () => {
    document.getElementById('modalAtribuirFlorista')?.classList.add('hidden');
  });
  document.getElementById('btnConfirmarAtribuir')?.addEventListener('click', confirmarAtribuirFlorista);

  // Remove paradas
  document.getElementById('desp_stopsContainer')?.addEventListener('click', e => {
    if (e.target.classList.contains('remove-btn')) removerParada(e.target);
  });

  carregarDadosDespacho();

  // Iniciar Polling Automático de 10 segundos
  if (!window.pollingDespacho) {
    window.pollingDespacho = setInterval(() => {
      carregarDadosDespacho(true);
      carregarStats();
    }, 10000);
  }
}

// ─── Carregar Dados ────────────────────────────────────────────────────────────
export async function carregarDadosDespacho(silencioso = false) {
  if (!document.getElementById('listaRascunhosDespacho')) return; // Abortar se a aba despachar não estiver ativa

  const btn = document.getElementById('btnRefreshDespacho');
  if (btn && !silencioso) { btn.innerText = '⏳ Carregando...'; btn.disabled = true; }

  // Preservar seleções atuais das checkboxes para não perder o foco/trabalho
  const selPendentes = Array.from(document.querySelectorAll('#listaRascunhosDespacho input[type="checkbox"]:checked')).map(c => c.value);
  const selSaida = Array.from(document.querySelectorAll('#listaAguardandoSaida input[type="checkbox"]:checked')).map(c => c.value);

  try {
    const now  = new Date();
    const hoje = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

    const [rascRes, relRes] = await Promise.all([
      gasGET({ action: 'buscarRascunhos' }),
      gasGET({ action: 'buscarRelatorios', dataInicio: hoje, dataFim: hoje })
    ]);

    if (rascRes.status === 'sucesso') {
      const todos = rascRes.dados || [];
      rascunhosDespacho   = todos.filter(r => r.status === 'Rascunho');
      const emProducaoList = todos.filter(r => r.status === 'Em Producao');
      aguardandoSaidaList  = todos.filter(r => r.status === 'Aguardando Saida');
      const emRotaList     = todos.filter(r => r.status === 'Em Rota');
      const retornandoList = todos.filter(r => r.status === 'Retornando');

      renderKanbanPendentes(rascunhosDespacho, selPendentes);
      renderKanbanEmProducao(emProducaoList);
      renderKanbanAguardandoSaida(aguardandoSaidaList, selSaida);
      renderKanbanEmRota(emRotaList);
      renderKanbanRetornando(retornandoList);
    }

    if (relRes.status === 'sucesso') {
      finalizadosDespacho = relRes.dados || [];
      renderKanbanFinalizados(finalizadosDespacho);
    }

    const countP = document.getElementById('statPendentes');
    if (countP) countP.textContent = rascunhosDespacho.length;

  } catch (e) {
    showToast('Erro ao carregar: ' + e.message, 'error');
  }

  if (btn && !silencioso) { btn.innerText = '⟳ Atualizar'; btn.disabled = false; }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function resumirItens(itensJSON) {
  try {
    const arr = JSON.parse(itensJSON);
    if (!arr || arr.length === 0) return 'Sem itens';
    return arr.map(it => (it.quantidade || '?') + '× ' + (it.tipo || '?')).join(', ');
  } catch (e) { return 'Sem itens'; }
}

// ─── Col 1: Pendente ──────────────────────────────────────────────────────────
function renderKanbanPendentes(lista, selecionados = []) {
  const el = document.getElementById('listaRascunhosDespacho');
  document.getElementById('countPendente').textContent = lista.length;

  if (lista.length === 0) {
    el.innerHTML = '<div class="kanban-empty">Nenhum pedido pendente</div>';
    document.getElementById('areaAtribuirFlorista').style.display = 'none';
    return;
  }

  el.innerHTML = '';
  lista.forEach(r => {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.id = 'card_' + r.id;
    const entregaStr = r.data_entrega ? '📅 ' + r.data_entrega : '';
    const localStr   = r.local_entrega ? '📍 ' + r.local_entrega : '';
    const detail = [resumirItens(r.itensJSON), entregaStr, localStr].filter(Boolean).join(' · ');
    card.innerHTML = `
      <input type="checkbox" id="chk_${r.id}" value="${r.id}" class="chk-kanban">
      <div class="kanban-card-body">
        <div class="kanban-card-top">
          <span class="kanban-card-id">${r.pedido || r.id}</span>
          <span class="kanban-card-name">${r.cliente || r.falecido || 'S/ nome'}</span>
        </div>
        <div class="kanban-card-detail">${detail}</div>
        ${r.frase_coroa ? `<div style="font-size:11px; color:var(--amber); margin-top:4px;">💬 "${r.frase_coroa}"</div>` : ''}
      </div>
    `;
    card.onclick = (e) => {
      if (e.target.tagName === 'INPUT') return;
      const chk = card.querySelector('input[type="checkbox"]');
      chk.checked = !chk.checked;
      atualizarSelecaoPendentes();
    };
    el.appendChild(card);
    card.querySelector('input[type="checkbox"]').addEventListener('change', atualizarSelecaoPendentes);
  });
  
  // Retaura seleções antigas
  selecionados.forEach(id => {
    const chk = document.getElementById('chk_' + id);
    if (chk) chk.checked = true;
  });
  atualizarSelecaoPendentes();
}

function atualizarSelecaoPendentes() {
  const checks  = document.querySelectorAll('#listaRascunhosDespacho input[type="checkbox"]');
  const areaBtn = document.getElementById('areaAtribuirFlorista');

  checks.forEach(chk => {
    const card = document.getElementById('card_' + chk.value);
    if (card) card.classList.toggle('selected', chk.checked);
  });

  const selected = Array.from(checks).filter(c => c.checked);
  if (areaBtn) areaBtn.style.display = selected.length > 0 ? 'block' : 'none';
}

// ─── Modal: Atribuir Florista ──────────────────────────────────────────────────
async function confirmarAtribuirFlorista() {
  const florista = document.getElementById('selFlorista').value;
  if (!florista) return showToast('Selecione um florista.', 'error');

  const checks = Array.from(document.querySelectorAll('#listaRascunhosDespacho input[type="checkbox"]:checked'));
  const ids    = checks.map(c => c.value);
  if (ids.length === 0) return showToast('Nenhuma OS selecionada.', 'error');

  const btn = document.getElementById('btnConfirmarAtribuir');
  btn.disabled = true; btn.innerText = '⏳';

  try {
    const json = await gasPOST({
      action: 'atribuirFlorista',
      dados: { florista, pedidoIds: ids }
    });
    if (json.status === 'sucesso') {
      showToast(json.dados, 'success');
      document.getElementById('modalAtribuirFlorista')?.classList.add('hidden');
      carregarDadosDespacho();
      carregarStats();
    } else {
      showToast('Erro: ' + (json.mensagem || ''), 'error');
    }
  } catch (e) {
    showToast('Falha: ' + e.message, 'error');
  }
  btn.disabled = false; btn.innerText = '🌸 Confirmar Atribuição';
}

// ─── Col 2: Em Produção ────────────────────────────────────────────────────────
function renderKanbanEmProducao(lista) {
  const el      = document.getElementById('listaEmProducao');
  const countEl = document.getElementById('countEmProducao');
  if (countEl) countEl.textContent = lista.length;
  if (!el) return;

  if (lista.length === 0) {
    el.innerHTML = '<div class="kanban-empty">Nenhuma OS em produção</div>';
    return;
  }

  el.innerHTML = '';
  lista.forEach(r => {
    const card = document.createElement('div');
    card.className = 'kanban-card producao';
    const jaIniciou = !!r.hora_inicio_producao;
    card.innerHTML = `
      <div class="kanban-card-body">
        <div class="kanban-card-top">
          <span class="kanban-card-id" style="background:rgba(191,90,242,0.12); color:#bf5af2; border-color:rgba(191,90,242,0.3);">${r.pedido || r.id}</span>
          <span class="kanban-card-name">${r.cliente || r.falecido || '—'}</span>
        </div>
        <div class="kanban-card-detail">${resumirItens(r.itensJSON)}</div>
        <div style="margin-top:6px; font-size:11px; color:#bf5af2; font-weight:600;">
          🌸 ${r.florista || '?'} 
          ${jaIniciou ? '· ⏱ Iniciado ' + r.hora_inicio_producao : '· ⏳ Aguardando aceite'}
        </div>
        ${r.frase_coroa ? `<div style="font-size:11px; color:var(--amber); margin-top:4px;">💬 "${r.frase_coroa}"</div>` : ''}
      </div>
    `;
    el.appendChild(card);
  });
}

// ─── Col 3: Aguardando Saída ───────────────────────────────────────────────────
function renderKanbanAguardandoSaida(lista, selecionados = []) {
  const el      = document.getElementById('listaAguardandoSaida');
  const countEl = document.getElementById('countAguardandoSaida');
  if (countEl) countEl.textContent = lista.length;
  if (!el) return;

  if (lista.length === 0) {
    el.innerHTML = '<div class="kanban-empty">Nenhuma OS pronta</div>';
    document.getElementById('painelDespacho')?.classList.add('hidden');
    return;
  }

  el.innerHTML = '';
  lista.forEach(r => {
    const card = document.createElement('div');
    card.className = 'kanban-card aguardando';
    card.id = 'cardSaida_' + r.id;
    const detail = [resumirItens(r.itensJSON), r.local_entrega ? '📍 ' + r.local_entrega : ''].filter(Boolean).join(' · ');
    card.innerHTML = `
      <input type="checkbox" id="chkSaida_${r.id}" value="${r.id}" class="chk-saida">
      <div class="kanban-card-body">
        <div class="kanban-card-top">
          <span class="kanban-card-id" style="background:rgba(6,182,212,0.12); color:#06b6d4; border-color:rgba(6,182,212,0.3);">${r.pedido || r.id}</span>
          <span class="kanban-card-name">${r.cliente || r.falecido || 'S/ nome'}</span>
        </div>
        <div class="kanban-card-detail">${detail}</div>
        <div style="margin-top:6px; font-size:11px; color:#06b6d4; font-weight:600;">
          ✅ Pronta por ${r.florista || '?'} às ${r.hora_fim_producao || '?'}
        </div>
      </div>
    `;
    card.onclick = (e) => {
      if (e.target.tagName === 'INPUT') return;
      const chk = card.querySelector('input[type="checkbox"]');
      chk.checked = !chk.checked;
      atualizarSelecaoDespacho();
    };
    el.appendChild(card);
    card.querySelector('input[type="checkbox"]').addEventListener('change', atualizarSelecaoDespacho);
  });
  
  // Retaura seleções antigas
  selecionados.forEach(id => {
    const chk = document.getElementById('chkSaida_' + id);
    if (chk) chk.checked = true;
  });
  atualizarSelecaoDespacho();
}

function atualizarSelecaoDespacho() {
  const checks         = document.querySelectorAll('#listaAguardandoSaida input[type="checkbox"]');
  const painel         = document.getElementById('painelDespacho');
  const containerSel   = document.getElementById('containerPedidosSelecionados');

  checks.forEach(chk => {
    const card = document.getElementById('cardSaida_' + chk.value);
    if (card) card.classList.toggle('selected', chk.checked);
  });

  const selected = Array.from(checks).filter(c => c.checked);
  if (selected.length === 0) {
    if (painel) painel.classList.add('hidden');
    return;
  }
  if (painel) painel.classList.remove('hidden');

  if (containerSel) {
    containerSel.innerHTML = '';
    selected.forEach(chk => {
      const r = aguardandoSaidaList.find(x => x.id === chk.value);
      if (!r) return;
      const span = document.createElement('span');
      span.className = 'badge';
      span.style.marginRight = '8px';
      span.textContent = r.id + (r.pedido ? ' (' + r.pedido + ')' : '');
      containerSel.appendChild(span);
    });
  }
}

// ─── Col 4: Em Rota ───────────────────────────────────────────────────────────
window.abrirModalFinalizar = function(id) {
  const lbl = document.getElementById('lblFinalizarPedido');
  if (lbl) lbl.textContent = id;
  document.getElementById('inpQuemRecebeu').value = '';
  document.getElementById('modalFinalizar')?.classList.remove('hidden');
};

async function confirmarFinalizarEntrega() {
  const id          = document.getElementById('lblFinalizarPedido').textContent;
  const quemRecebeu = document.getElementById('inpQuemRecebeu').value.trim();
  const inpHora     = document.getElementById('inpHoraEntrega');
  if (!quemRecebeu) return showToast('Informe quem recebeu.', 'error');

  const btn = document.getElementById('btnConfirmarFinalizar');
  btn.disabled = true; btn.innerText = '⏳';
  try {
    const json = await gasPOST({
      action: 'finalizarEntrega',
      dados: { id, quem_recebeu: quemRecebeu, hora_entrega: inpHora ? inpHora.value : '' }
    });
    if (json.status === 'sucesso') {
      showToast(json.dados, 'success');
      document.getElementById('modalFinalizar')?.classList.add('hidden');
      carregarDadosDespacho(); carregarStats();
    } else { showToast('Erro: ' + (json.mensagem || ''), 'error'); }
  } catch (e) { showToast('Falha: ' + e.message, 'error'); }
  btn.disabled = false; btn.innerText = '✔ Confirmar Entrega';
}

function renderKanbanEmRota(lista) {
  const el      = document.getElementById('listaEmRota');
  const countEl = document.getElementById('countEmRota');
  if (countEl) countEl.textContent = lista.length;
  if (!el) return;

  if (lista.length === 0) { el.innerHTML = '<div class="kanban-empty">Nenhum pedido em rota</div>'; return; }

  el.innerHTML = '';
  lista.forEach(r => {
    const card = document.createElement('div');
    card.className = 'kanban-card in-route';
    const detail = [resumirItens(r.itensJSON), r.local_entrega ? '📍 ' + r.local_entrega : ''].filter(Boolean).join(' · ');
    card.innerHTML = `
      <div class="kanban-card-body" style="cursor:pointer;" onclick="abrirModalFinalizar('${r.id}')">
        <div class="kanban-card-top">
          <span class="kanban-card-id">${r.pedido || r.id}</span>
          <span class="kanban-card-name">${r.cliente || r.falecido || 'S/ nome'} · 👤 ${r.motorista || '?'}</span>
        </div>
        <div class="kanban-card-detail">${detail}</div>
        <div style="margin-top:8px; font-size:11px; color:var(--blue); font-weight:600;">🚚 Clique para finalizar entrega</div>
      </div>
    `;
    el.appendChild(card);
  });
}

// ─── Col 5: Retornando ────────────────────────────────────────────────────────
function renderKanbanRetornando(lista) {
  const el      = document.getElementById('listaRetornando');
  const countEl = document.getElementById('countRetornando');
  if (countEl) countEl.textContent = lista.length;
  if (!el) return;

  if (lista.length === 0) { el.innerHTML = '<div class="kanban-empty">Nenhum veículo retornando</div>'; return; }

  const byViagemMap = {};
  lista.forEach(r => {
    const vid = r.viagem_id || 'sem-viagem';
    if (!byViagemMap[vid]) byViagemMap[vid] = [];
    byViagemMap[vid].push(r);
  });

  el.innerHTML = '';
  Object.entries(byViagemMap).forEach(([vid, pedidos]) => {
    const card = document.createElement('div');
    card.className = 'kanban-card returning';
    const motorista = pedidos[0].motorista || '';
    const ids = pedidos.map(p => p.pedido || p.id).join(', ');
    card.innerHTML = `
      <div class="kanban-card-body" style="cursor:pointer;" onclick="abrirModalRetorno('${vid}', ${pedidos.length})">
        <div class="kanban-card-top">
          <span class="kanban-card-id" style="background:rgba(245,158,11,0.1); color:var(--amber); border-color:var(--amber-dim);">${vid}</span>
          <span class="kanban-card-name">${motorista ? '👤 ' + motorista : 'Motorista'}</span>
        </div>
        <div class="kanban-card-detail">${pedidos.length} pedido(s): ${ids}</div>
        <div style="margin-top:8px; font-size:11px; color:var(--amber); font-weight:600;">🏠 Clique para registrar chegada na base</div>
      </div>
    `;
    el.appendChild(card);
  });
}

window.abrirModalRetorno = function(viagemId, count) {
  const lbl      = document.getElementById('lblRetornoViagem');
  const lblCount = document.getElementById('lblRetornoPedidos');
  const inp      = document.getElementById('inpHoraRetorno');
  if (lbl) lbl.textContent   = viagemId;
  if (lblCount) lblCount.textContent = count;
  const now = new Date();
  if (inp) inp.value = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  document.getElementById('modalRetorno')?.classList.remove('hidden');
};

async function confirmarRetornoViagem() {
  const viagemId    = document.getElementById('lblRetornoViagem').textContent;
  const horaRetorno = document.getElementById('inpHoraRetorno').value;

  const btn = document.getElementById('btnConfirmarRetorno');
  btn.disabled = true; btn.innerText = '⏳';
  try {
    const json = await gasPOST({
      action: 'registrarRetornoViagem',
      dados: { viagem_id: viagemId, hora_retorno: horaRetorno }
    });
    if (json.status === 'sucesso') {
      showToast(json.dados, 'success');
      document.getElementById('modalRetorno')?.classList.add('hidden');
      carregarDadosDespacho(); carregarStats();
    } else { showToast('Erro: ' + (json.mensagem || ''), 'error'); }
  } catch (e) { showToast('Falha: ' + e.message, 'error'); }
  btn.disabled = false; btn.innerText = '✔ Confirmar Chegada';
}

// ─── Col 6: Finalizado ────────────────────────────────────────────────────────
function renderKanbanFinalizados(lista) {
  const el   = document.getElementById('listaFinalizados');
  const now  = new Date();
  const hoje = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  const listaHoje = lista.filter(r => r.data_finalizacao === hoje);
  document.getElementById('countFinalizado').textContent = listaHoje.length;

  if (listaHoje.length === 0) { el.innerHTML = '<div class="kanban-empty">Nenhum despacho hoje</div>'; return; }

  el.innerHTML = '';
  listaHoje.forEach(r => {
    const card = document.createElement('div');
    card.className = 'kanban-card finalizado';
    card.innerHTML = `
      <div class="kanban-card-body">
        <div class="kanban-card-top">
          <span class="kanban-card-id">${r.pedido || r.id}</span>
          <span class="kanban-card-name">${r.cliente || r.falecido || '—'}</span>
        </div>
        <div class="kanban-card-detail">${r.veiculo || ''} · ${r.distancia || ''} km</div>
        ${r.quem_recebeu ? `<div style="font-size:11px; color:var(--green); margin-top:4px;">🟢 Recebeu: ${r.quem_recebeu}</div>` : ''}
        ${r.florista ? `<div style="font-size:11px; color:#bf5af2; margin-top:2px;">🌸 Florista: ${r.florista}</div>` : ''}
      </div>
    `;
    el.appendChild(card);
  });
}

// ─── Paradas ──────────────────────────────────────────────────────────────────
function atualizarLabelsParadas() {
  const groups     = document.querySelectorAll('#desp_stopsContainer .stop-group');
  const removeBtns = document.querySelectorAll('#desp_stopsContainer .remove-btn');
  groups.forEach((g, idx) => {
    const letra = String.fromCharCode(66 + idx);
    const label = g.querySelector('.stop-label');
    if (label) label.textContent = `Ponto ${letra} (Entrega)`;
  });
  removeBtns.forEach(btn => btn.classList.toggle('hidden', groups.length <= 1));
}

function adicionarParada() {
  const container = document.getElementById('desp_stopsContainer');
  const div = document.createElement('div');
  div.className = 'stop-row stop-group';
  div.innerHTML = `
    <div class="addr" style="position:relative;">
      <label class="stop-label">Ponto (Entrega)</label>
      <input type="text" class="stop-input" placeholder="Endereço da parada" autocomplete="off">
      <div class="autocomplete-dropdown"></div>
    </div>
    <button type="button" class="btn btn-danger remove-btn">✕</button>
  `;
  container.appendChild(div);
  // Ativar autocomplete no novo campo
  const inp = div.querySelector('.stop-input');
  const drop = div.querySelector('.autocomplete-dropdown');
  attachAutocomplete(inp, drop);
  atualizarLabelsParadas();
}

function removerParada(btn) {
  btn.closest('.stop-group').remove();
  atualizarLabelsParadas();
}

// ─── Geocode / Rota ──────────────────────────────────────────────────────────

// Força contexto de São Paulo para endereços sem cidade/estado/país
function normalizarEndereco(addr) {
  const lower = addr.toLowerCase();
  const temCidade = /são paulo|sp|brasil|brazil|campinas|guarulhos|osasco/i.test(lower);
  return temCidade ? addr : addr + ', São Paulo, SP, Brasil';
}

async function geocodeAddress(address) {
  const query = normalizarEndereco(address);
  // boundary.country=BRA foca o resultado no Brasil
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKeyORS}&text=${encodeURIComponent(query)}&size=1&boundary.country=BRA&focus.point.lon=-46.6333&focus.point.lat=-23.5505`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error('Geocode falhou: "' + address + '"');
  const data = await res.json();
  if (!data.features || data.features.length === 0) throw new Error('Local não encontrado: "' + address + '"');
  const feat = data.features[0];
  return { coords: feat.geometry.coordinates, label: feat.properties.label };
}

// ─── Autocomplete ─────────────────────────────────────────────────────────────
let _acTimers = new WeakMap();

export function attachAutocomplete(input, dropdown) {
  if (!input || !dropdown) return;
  dropdown.className = 'autocomplete-dropdown';

  input.addEventListener('input', () => {
    clearTimeout(_acTimers.get(input));
    const val = input.value.trim();
    if (val.length < 3) { dropdown.innerHTML = ''; dropdown.classList.remove('open'); return; }
    const timer = setTimeout(() => fetchSuggestions(val, input, dropdown), 300);
    _acTimers.set(input, timer);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.classList.remove('open'); dropdown.innerHTML = ''; }, 200);
  });
}

async function fetchSuggestions(text, input, dropdown) {
  const query = normalizarEndereco(text);
  const url = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${apiKeyORS}&text=${encodeURIComponent(query)}&boundary.country=BRA&focus.point.lon=-46.6333&focus.point.lat=-23.5505&size=5`;
  try {
    const res  = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    const feats = (data.features || []).slice(0, 5);
    dropdown.innerHTML = '';
    if (feats.length === 0) { dropdown.classList.remove('open'); return; }
    feats.forEach(f => {
      const item = document.createElement('div');
      item.className = 'ac-item';
      item.textContent = f.properties.label;
      item.addEventListener('mousedown', () => {
        input.value = f.properties.label;
        dropdown.innerHTML = ''; dropdown.classList.remove('open');
      });
      dropdown.appendChild(item);
    });
    dropdown.classList.add('open');
  } catch(e) { /* silencioso */ }
}

// Inicializar autocomplete nos campos existentes ao carregar a aba
export function initAutocomplete() {
  const pontoAInp  = document.getElementById('desp_pontoA');
  const pontoADrop = document.getElementById('desp_pontoA_drop');
  attachAutocomplete(pontoAInp, pontoADrop);

  const firstStop     = document.querySelector('#desp_stopsContainer .stop-input');
  const firstStopDrop = document.querySelector('#desp_stopsContainer .autocomplete-dropdown');
  attachAutocomplete(firstStop, firstStopDrop);
}

// ─── Mini Mapa ────────────────────────────────────────────────────────────────
let _leafletMap = null;
let _mapLayers  = [];

function ensureLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve();
    // CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id   = 'leaflet-css';
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    // JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

async function renderMiniMap(coordsList, labels, geoJsonGeometry) {
  const container = document.getElementById('miniMapContainer');
  if (!container) return;
  container.style.display = 'block';

  await ensureLeaflet();
  const L = window.L;

  // Destruir mapa anterior se existir
  if (_leafletMap) { _leafletMap.remove(); _leafletMap = null; }
  _mapLayers = [];

  _leafletMap = L.map('miniMap', { zoomControl: true, scrollWheelZoom: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OSM</a>',
    maxZoom: 18
  }).addTo(_leafletMap);

  // Cores para marcadores
  const cores = ['#f59e0b', '#06b6d4', '#22c55e', '#a855f7', '#ef4444', '#3b82f6'];

  coordsList.forEach(([lng, lat], i) => {
    const label = labels[i] || ('P' + (i + 1));
    const cor   = cores[i % cores.length];
    const icon  = L.divIcon({
      className: '',
      html: `<div style="background:${cor};color:#000;font-weight:700;font-size:11px;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${label}</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
    L.marker([lat, lng], { icon }).addTo(_leafletMap);
  });

  // Desenhar rota: GeoJSON LineString [[lng,lat], ...] -> Leaflet [[lat,lng], ...]
  if (geoJsonGeometry && geoJsonGeometry.coordinates && geoJsonGeometry.coordinates.length > 0) {
    try {
      const latlngs = geoJsonGeometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const line = L.polyline(latlngs, { color: '#f59e0b', weight: 4, opacity: 0.85 }).addTo(_leafletMap);
      _leafletMap.fitBounds(line.getBounds(), { padding: [30, 30] });
    } catch(e) {
      const bounds = L.latLngBounds(coordsList.map(([lng, lat]) => [lat, lng]));
      _leafletMap.fitBounds(bounds, { padding: [40, 40] });
    }
  } else {
    const bounds = L.latLngBounds(coordsList.map(([lng, lat]) => [lat, lng]));
    _leafletMap.fitBounds(bounds, { padding: [40, 40] });
  }

  // Forçar redraw
  setTimeout(() => _leafletMap && _leafletMap.invalidateSize(), 200);
}


// decodePolyline mantido como fallback (não utilizado atualmente)
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}


async function calcularDistancia() {
  const pontoA   = document.getElementById('desp_pontoA').value.trim();
  const stops    = Array.from(document.querySelectorAll('#desp_stopsContainer .stop-input')).map(i => i.value.trim()).filter(v => v);
  const isFiorino = document.querySelector('input[value="Fiorino"]').checked;
  const gasPrice = parseFloat(document.getElementById('desp_gasPrice').value) || 0;
  const btn      = document.getElementById('btnCalcularDist');
  const btnText  = document.getElementById('btnCalcularText');

  if (!pontoA) return showToast('Preencha o Ponto A.', 'error');
  if (stops.length === 0) return showToast('Preencha ao menos um ponto de entrega.', 'error');
  if (gasPrice <= 0) return showToast('Informe o preço do combustível.', 'error');

  btn.disabled = true; btnText.innerText = '⏳ Calculando...';
  document.getElementById('distanceResult').classList.remove('active');

  // Tentar usar tabela pré-pronta para todos os pontos de entrega
  const presets = stops.map(s => buscarPreset(s));
  const todosPresets = presets.every(p => p !== null);

  try {
    if (todosPresets) {
      // ── CÁLCULO LOCAL (tabela pré-pronta) ──
      // Soma das distâncias totais (ida e volta) de cada parada
      let distKm = 0;
      presets.forEach(p => { distKm += p.distTotal; });
      distKm = parseFloat(distKm.toFixed(2));

      const consumo = isFiorino ? 6 : 7;
      const gastoTotal  = (distKm / consumo) * gasPrice;
      const gastoPorKm  = distKm > 0 ? gastoTotal / distKm : 0;

      calculoAtual = { distKm, gastoTotal, gasPrice };

      document.getElementById('distanceValue').textContent = distKm.toLocaleString('pt-BR') + ' km';
      document.getElementById('totalCost').textContent = 'R$ ' + gastoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      document.getElementById('costPerKm').textContent = 'R$ ' + gastoPorKm.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' / km';
      document.getElementById('distanceResult').classList.add('active');
      showToast('✅ Calculado via tabela local: ' + distKm + ' km', 'success');

      // Mapa: só marcadores (sem rota), base + paradas
      const baseCoords = [-46.5530, -23.5620]; // Vila Formosa base
      const allCoords = [baseCoords, ...presets.map(p => p.coords)];
      const labels = allCoords.map((_, i) => i === 0 ? 'A' : String.fromCharCode(65 + i));
      await renderMiniMap(allCoords, labels, null); // null = sem rota desenhada

    } else {
      // ── CÁLCULO VIA API ORS (fallback) ──
      const allAddresses = [pontoA, ...stops];
      const geocoded     = await Promise.all(allAddresses.map(e => geocodeAddress(e)));
      const coords       = geocoded.map(g => g.coords);
      const routeCoords  = [...coords, coords[0]]; // volta à base

      const dirRes = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': apiKeyORS },
        body: JSON.stringify({ coordinates: routeCoords })
      });
      if (!dirRes.ok) {
        const errText = await dirRes.text().catch(() => '');
        let errMsg = 'Erro na API de rotas (HTTP ' + dirRes.status + ')';
        try { const j = JSON.parse(errText); errMsg = j.error?.message || j.message || errMsg; } catch(_){}
        throw new Error(errMsg);
      }

      const dirData = await dirRes.json();
      const feat    = dirData.features[0];
      const summary = feat.properties.summary;
      const distKm  = parseFloat((summary.distance / 1000).toFixed(2));
      const consumo = isFiorino ? 6 : 7;
      const gastoTotal  = (distKm / consumo) * gasPrice;
      const gastoPorKm  = gastoTotal / distKm;

      calculoAtual = { distKm, gastoTotal, gasPrice };

      document.getElementById('distanceValue').textContent = distKm.toLocaleString('pt-BR') + ' km';
      document.getElementById('totalCost').textContent = 'R$ ' + gastoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      document.getElementById('costPerKm').textContent = 'R$ ' + gastoPorKm.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' / km';
      document.getElementById('distanceResult').classList.add('active');
      showToast('🌐 Rota via API: ' + distKm + ' km', 'success');

      const labels = coords.map((_, i) => i === 0 ? 'A' : String.fromCharCode(65 + i));
      await renderMiniMap(routeCoords.slice(0, -1), labels, feat.geometry);
    }

  } catch (e) {
    showToast('Erro: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btnText.innerText = '📍 Recalcular Rota';
  }
}

// ─── Finalizar Despacho ──────────────────────────────────────────────────────
function resizeImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX; } }
        else       { if (h > MAX) { w *= MAX/h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function finalizarDespacho() {
  if (!calculoAtual) return showToast('Calcule a rota antes de finalizar.', 'error');

  // Pega OS selecionadas em Aguardando Saída
  const pedidos = [];
  const checks  = document.querySelectorAll('#listaAguardandoSaida input[type="checkbox"]:checked');
  checks.forEach(chk => pedidos.push({ id: chk.value }));
  if (pedidos.length === 0) return showToast('Selecione ao menos uma OS.', 'error');

  const fileInput = document.getElementById('desp_fotoCoroa');
  let fotoBase64  = null;
  if (fileInput && fileInput.files.length > 0) {
    showLoading('Processando foto...');
    try { fotoBase64 = await resizeImageToBase64(fileInput.files[0]); }
    catch(e) { hideLoading(); return showToast('Erro na foto: ' + e.message, 'error'); }
  }

  const isFiorino  = document.querySelector('input[value="Fiorino"]').checked;
  const horarios   = { saida_fabrica: document.getElementById('desp_hora_saida')?.value || '' };

  const dados = {
    pedidos, fotoBase64,
    veiculo:           isFiorino ? 'Fiorino' : 'Kangoo',
    motorista:         document.getElementById('desp_motorista').value,
    agente:            document.getElementById('desp_agente').value,
    mesa:              document.getElementById('desp_mesa').value,
    combustivel_preco: calculoAtual.gasPrice,
    distancia_total:   calculoAtual.distKm,
    custo_combustivel: parseFloat(calculoAtual.gastoTotal.toFixed(2)),
    horarios
  };

  const btn = document.getElementById('btnFinalizar');
  btn.disabled = true; btn.innerText = '⏳ Finalizando...';
  showLoading('Despachando pedidos...');

  try {
    const json = await gasPOST({ action: 'despachar', dados });
    if (json.status === 'sucesso') {
      showToast(json.dados, 'success');
      calculoAtual = null;
      document.getElementById('distanceResult').classList.remove('active');
      carregarDadosDespacho();
      carregarStats();
    } else {
      showToast('Erro: ' + (json.mensagem || ''), 'error');
    }
  } catch (err) {
    showToast('Falha ao despachar: ' + err.message, 'error');
  }
  hideLoading();
  btn.disabled = false; btn.innerText = '✔ Finalizar Despacho';
}
