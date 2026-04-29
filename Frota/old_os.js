// =====================================================
// CONFIGURAÇÃO
// =====================================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbzFRRVz3oqk66XchriIScSRQw9OZ-8ElJY74_Uo7X6eHYaK2oJE8CoWiZgicmGipqEh/exec";
const apiKeyORS = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjJjNjRkOTdmMzRjOTRlYzQ5ZWUwZTQxYTMzZGU2Y2E0IiwiaCI6Im11cm11cjY0In0=";

let rascunhosDespacho = [];
let finalizadosDespacho = [];
let calculoAtual = null;

// =====================================================
// HELPERS — Toast, Loading, Status
// =====================================================
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = (type === 'success' ? '✓ ' : type === 'error' ? '✕ ' : '● ') + msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showLoading(msg) {
  document.getElementById('loadingText').textContent = msg || 'Carregando...';
  document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('active');
}

function mostrarStatus(msg, tipo) {
  const bar = document.getElementById('statusBar');
  bar.style.display = 'block';
  bar.textContent = msg;
  if (tipo === 'ok') { bar.style.borderColor = 'var(--green-dim)'; bar.style.color = 'var(--green)'; bar.style.background = 'var(--green-glow)'; }
  else if (tipo === 'erro') { bar.style.borderColor = 'var(--red-dim)'; bar.style.color = 'var(--red)'; bar.style.background = 'var(--red-glow)'; }
  else { bar.style.borderColor = 'var(--amber-dim)'; bar.style.color = 'var(--amber)'; bar.style.background = 'var(--amber-glow)'; }
  setTimeout(() => bar.style.display = 'none', 6000);
}

function updateOnlineStatus() {
  const badge = document.getElementById('statusBadge');
  const text = document.getElementById('statusText');
  if (navigator.onLine) {
    badge.className = 'status-badge online';
    text.textContent = 'Online';
  } else {
    badge.className = 'status-badge offline';
    text.textContent = 'Offline';
  }
}

window.addEventListener('online', () => { updateOnlineStatus(); showToast('Conexão restaurada', 'success'); });
window.addEventListener('offline', () => { updateOnlineStatus(); showToast('Sem conexão', 'error'); });

// =====================================================
// FETCH HELPERS
// =====================================================
async function gasGET(params) {
  const url = new URL(GAS_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.append(k, v);
  const res = await fetch(url.toString(), { redirect: 'follow' });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) { throw new Error('Resposta não é JSON. HTTP ' + res.status); }
}

async function gasPOST(payload) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) { throw new Error('Resposta não é JSON. HTTP ' + res.status); }
}

async function testarConexao() {
  showToast('Testando conexão...', 'info');
  try {
    const json = await gasGET({ action: 'buscarRascunhos' });
    if (json.status === 'sucesso') {
      showToast('Conexão OK! ' + (json.dados ? json.dados.length : 0) + ' rascunhos.', 'success');
      mostrarStatus('✅ Conectado ao Google Sheets', 'ok');
    } else {
      showToast('Erro: ' + (json.mensagem || ''), 'error');
    }
  } catch (err) {
    showToast('Falha: ' + err.message, 'error');
    mostrarStatus('❌ Sem conexão', 'erro');
  }
}

// =====================================================
// TABS
// =====================================================
function showTab(tabId, el) {
  document.querySelectorAll('.panel').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  el.classList.add('active');
  if (tabId === 'tabDespachar') carregarDadosDespacho();
}

// =====================================================
// INICIALIZAÇÃO
// =====================================================
window.onload = function () {
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('cad_data_manual').value = hoje;
  let d30 = new Date(); d30.setDate(d30.getDate() - 30);
  document.getElementById('rel_data_inicio').value = d30.toISOString().split('T')[0];
  document.getElementById('rel_data_fim').value = hoje;
  updateOnlineStatus();
  carregarStats();
};

// =====================================================
// STATS — KPIs
// =====================================================
async function carregarStats() {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const mesInicio = hoje.substring(0, 8) + '01';

    const [rascRes, relRes] = await Promise.all([
      gasGET({ action: 'buscarRascunhos' }),
      gasGET({ action: 'buscarRelatorios', dataInicio: mesInicio, dataFim: hoje })
    ]);

    if (rascRes.status === 'sucesso') {
      const rascunhos = rascRes.dados || [];
      const pedidosHoje = rascunhos.filter(r => r.data_manual === hoje).length;
      document.getElementById('statPendentes').textContent = rascunhos.length;
      document.getElementById('statPedidosHoje').textContent = pedidosHoje;
    }

    if (relRes.status === 'sucesso') {
      const finalizados = relRes.dados || [];
      const finHoje = finalizados.filter(r => r.data_manual === hoje).length;
      document.getElementById('statFinalizados').textContent = finHoje;

      let kmTotal = 0;
      finalizados.forEach(r => {
        const km = parseFloat(String(r.distancia).replace(/[^\d.,]/g, '').replace(',', '.'));
        if (!isNaN(km)) kmTotal += km;
      });
      document.getElementById('statKmMes').textContent = kmTotal > 0 ? kmTotal.toFixed(1) : '0';
    }
  } catch (e) {
    // Silently fail — stats are optional
  }
}

// =====================================================
// ABA 1 — CADASTRAR PEDIDO
// =====================================================
function gerarCamposItens() {
  const n = parseInt(document.getElementById('cad_numItens').value || 0);
  const c = document.getElementById('containerItens');
  c.innerHTML = '';
  for (let i = 1; i <= n; i++) {
    const div = document.createElement('div');
    div.className = 'form-grid';
    div.style.marginBottom = '12px';
    div.style.padding = '14px';
    div.style.background = 'var(--surface2)';
    div.style.border = '1px solid var(--border)';
    div.style.borderRadius = '6px';
    div.innerHTML = `
          <div class="form-group">
            <label>Item ${i} — Tipo</label>
            <select id="tipo_${i}" onchange="onTipoChange(${i})">
              <option value="">Selecione...</option>
              <option value="Coroa">Coroa</option>
              <option value="Ornamentação">Ornamentação</option>
              <option value="Conj. Coroa">Conj. Coroa</option>
              <option value="Tufo">Tufo</option>
              <option value="Cruz">Cruz</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
          <div class="form-group">
            <label>Quantidade</label>
            <input type="number" id="qtd_${i}" placeholder="Ex: 2" min="1">
          </div>
        `;
    c.appendChild(div);
  }
}

function onTipoChange(i) {
  const sel = document.getElementById('tipo_' + i);
  const qtd = document.getElementById('qtd_' + i);
  qtd.placeholder = sel.value === 'Outros' ? 'Detalhar na obs.' : 'Ex: 2';
}

async function salvarPedido() {
  const n = parseInt(document.getElementById('cad_numItens').value || '0');
  const itens = [];
  for (let i = 1; i <= n; i++) {
    const t = document.getElementById('tipo_' + i);
    const q = document.getElementById('qtd_' + i);
    if (t && q && t.value) itens.push({ tipo: t.value, quantidade: q.value || '0' });
  }

  if (itens.length === 0) return showToast('Adicione pelo menos um item.', 'error');

  const dados = {
    data_manual: document.getElementById('cad_data_manual').value,
    pedido: document.getElementById('cad_pedido').value,
    cliente: document.getElementById('cad_cliente').value,
    falecido: document.getElementById('cad_falecido').value,
    data_entrega: document.getElementById('cad_data_entrega').value,
    hora_entrega: document.getElementById('cad_hora_entrega').value,
    local_entrega: document.getElementById('cad_local_entrega').value,
    observacao: document.getElementById('cad_observacao').value,
    itens: itens
  };

  const btn = document.getElementById('btnSalvarPedido');
  btn.disabled = true; btn.innerText = '⏳ Salvando...';

  try {
    const json = await gasPOST({ action: 'salvarPedido', dados: dados });
    if (json.status === 'sucesso') {
      showToast(json.dados, 'success');
      limparFormCadastro();
      carregarStats();
    } else {
      showToast('Erro: ' + (json.mensagem || ''), 'error');
    }
  } catch (err) {
    showToast('Falha ao salvar: ' + err.message, 'error');
  }
  btn.disabled = false; btn.innerText = '📌 Salvar como Rascunho';
}

function limparFormCadastro() {
  ['cad_pedido', 'cad_cliente', 'cad_falecido', 'cad_data_entrega', 'cad_hora_entrega', 'cad_local_entrega', 'cad_observacao'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('cad_numItens').value = '0';
  document.getElementById('containerItens').innerHTML = '';
}

// =====================================================
// ABA 2 — DESPACHAR (Kanban)
// =====================================================
async function carregarDadosDespacho() {
  const btn = document.getElementById('btnRefreshDespacho');
  btn.innerText = '⏳ Carregando...'; btn.disabled = true;
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const d7 = new Date(); d7.setDate(d7.getDate() - 7);
    const seteDias = d7.toISOString().split('T')[0];

    const [rascRes, relRes] = await Promise.all([
      gasGET({ action: 'buscarRascunhos' }),
      gasGET({ action: 'buscarRelatorios', dataInicio: seteDias, dataFim: hoje })
    ]);

    if (rascRes.status === 'sucesso') {
      rascunhosDespacho = rascRes.dados || [];
      renderKanbanPendentes(rascunhosDespacho);
    }

    if (relRes.status === 'sucesso') {
      finalizadosDespacho = (relRes.dados || []).slice(0, 10);
      renderKanbanFinalizados(finalizadosDespacho);
    }

    // Update stats
    document.getElementById('statPendentes').textContent = rascunhosDespacho.length;

  } catch (e) {
    showToast('Erro ao carregar: ' + e.message, 'error');
  }
  btn.innerText = '⟳ Atualizar'; btn.disabled = false;
}

function resumirItens(itensJSON) {
  try {
    const arr = JSON.parse(itensJSON);
    if (!arr || arr.length === 0) return 'Sem itens';
    return arr.map(it => (it.quantidade || '?') + '× ' + (it.tipo || '?')).join(', ');
  } catch (e) { return 'Sem itens'; }
}

function renderKanbanPendentes(lista) {
  const el = document.getElementById('listaRascunhosDespacho');
  document.getElementById('countPendente').textContent = lista.length;

  if (lista.length === 0) {
    el.innerHTML = '<div class="kanban-empty">Nenhum pedido pendente</div>';
    document.getElementById('painelDespacho').classList.add('hidden');
    return;
  }

  el.innerHTML = '';
  lista.forEach(r => {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.id = 'card_' + r.id;
    const entregaStr = r.data_entrega ? '📅 ' + r.data_entrega : '';
    const localStr = r.local_entrega ? '📍 ' + r.local_entrega : '';
    const detail = [resumirItens(r.itensJSON), entregaStr, localStr].filter(Boolean).join(' · ');
    card.innerHTML = `
          <input type="checkbox" id="chk_${r.id}" value="${r.id}" onchange="atualizarSelecao()">
          <div class="kanban-card-body">
            <div class="kanban-card-top">
              <span class="kanban-card-id">${r.pedido || r.id}</span>
              <span class="kanban-card-name">${r.cliente || r.falecido || 'S/ nome'}</span>
            </div>
            <div class="kanban-card-detail">${detail}</div>
          </div>
        `;
    card.onclick = (e) => {
      if (e.target.tagName === 'INPUT') return;
      const chk = card.querySelector('input[type="checkbox"]');
      chk.checked = !chk.checked;
      atualizarSelecao();
    };
    el.appendChild(card);
  });
  atualizarSelecao();
}

function renderKanbanFinalizados(lista) {
  const el = document.getElementById('listaFinalizados');
  document.getElementById('countFinalizado').textContent = lista.length;

  if (lista.length === 0) {
    el.innerHTML = '<div class="kanban-empty">Nenhum despacho recente</div>';
    return;
  }

  el.innerHTML = '';
  lista.forEach(r => {
    const card = document.createElement('div');
    card.className = 'kanban-card finalizado';
    card.innerHTML = `
          <div class="kanban-card-body">
            <div class="kanban-card-top">
              <span class="kanban-card-id">${r.pedido || r.id}</span>
              <span class="kanban-card-name">${r.cliente || '—'}</span>
            </div>
            <div class="kanban-card-detail">${r.veiculo || ''} · ${r.distancia || ''} · ${r.custo_combustivel || ''}</div>
          </div>
        `;
    el.appendChild(card);
  });
}

function atualizarSelecao() {
  const checks = document.querySelectorAll('#listaRascunhosDespacho input[type="checkbox"]');
  const painel = document.getElementById('painelDespacho');
  const containerRec = document.getElementById('containerRecebeu');

  // Visual feedback on cards
  checks.forEach(chk => {
    const card = document.getElementById('card_' + chk.value);
    if (card) card.classList.toggle('selected', chk.checked);
  });

  const selected = Array.from(checks).filter(c => c.checked);
  if (selected.length === 0) {
    painel.classList.add('hidden');
    return;
  }
  painel.classList.remove('hidden');

  containerRec.innerHTML = '';
  selected.forEach(chk => {
    const r = rascunhosDespacho.find(x => x.id === chk.value);
    if (!r) return;
    const card = document.createElement('div');
    card.className = 'recebeu-card';
    card.innerHTML = `
          <span class="badge">${r.id}</span>
          <span class="recebeu-name">${r.cliente || r.falecido || '—'} →</span>
          <input type="text" class="recebeu-input" data-id="${r.id}" placeholder="Quem recebeu no local?">
        `;
    containerRec.appendChild(card);
  });
}

// =====================================================
// PARADAS (Aba 2)
// =====================================================
function atualizarLabelsParadas() {
  const groups = document.querySelectorAll('#desp_stopsContainer .stop-group');
  const removeBtns = document.querySelectorAll('#desp_stopsContainer .remove-btn');
  groups.forEach((g, idx) => {
    const letra = String.fromCharCode(66 + idx);
    g.querySelector('.stop-label').textContent = `Ponto ${letra} (Entrega)`;
    g.querySelector('.stop-hora-label').textContent = `🕐 Chegada ${letra}`;
  });
  removeBtns.forEach(btn => btn.classList.toggle('hidden', groups.length <= 1));
}

function adicionarParada() {
  const container = document.getElementById('desp_stopsContainer');
  const div = document.createElement('div');
  div.className = 'stop-row stop-group';
  div.innerHTML = `
        <div class="addr">
          <label class="stop-label">Ponto (Entrega)</label>
          <input type="text" class="stop-input" placeholder="Endereço da parada">
        </div>
        <div class="hora">
          <label class="stop-hora-label">🕐 Chegada</label>
          <input type="time" class="stop-hora">
        </div>
        <button type="button" class="btn btn-danger remove-btn" onclick="removerParada(this)">✕</button>
      `;
  container.appendChild(div);
  atualizarLabelsParadas();
}

function removerParada(btn) {
  btn.closest('.stop-group').remove();
  atualizarLabelsParadas();
}

// =====================================================
// CÁLCULO DE DISTÂNCIA (ORS)
// =====================================================
async function geocodeAddress(address) {
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKeyORS}&text=${encodeURIComponent(address)}&size=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocode falhou: "' + address + '"');
  const data = await res.json();
  if (!data.features || data.features.length === 0) throw new Error('Local não encontrado: "' + address + '"');
  return data.features[0].geometry.coordinates;
}

async function calcularDistancia() {
  const pontoA = document.getElementById('desp_pontoA').value.trim();
  const stops = Array.from(document.querySelectorAll('#desp_stopsContainer .stop-input')).map(i => i.value.trim()).filter(v => v);
  const isFiorino = document.querySelector('input[value="Fiorino"]').checked;
  const gasPrice = parseFloat(document.getElementById('desp_gasPrice').value) || 0;
  const btn = document.getElementById('btnCalcularDist');
  const btnText = document.getElementById('btnCalcularText');

  if (!pontoA) return showToast('Preencha o Ponto A.', 'error');
  if (stops.length === 0) return showToast('Preencha ao menos um ponto de entrega.', 'error');
  if (gasPrice <= 0) return showToast('Informe o preço do combustível.', 'error');

  btn.disabled = true; btnText.innerText = '⏳ Calculando...';
  document.getElementById('distanceResult').classList.remove('active');

  try {
    const coords = await Promise.all([pontoA, ...stops].map(e => geocodeAddress(e)));
    coords.push(coords[0]);

    const dirRes = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': apiKeyORS },
      body: JSON.stringify({ coordinates: coords })
    });
    if (!dirRes.ok) throw new Error('Erro na API de rotas.');

    const dirData = await dirRes.json();
    const distKm = parseFloat((dirData.routes[0].summary.distance / 1000).toFixed(2));
    const consumo = isFiorino ? 6 : 7;
    const gastoTotal = (distKm / consumo) * gasPrice;
    const gastoPorKm = gastoTotal / distKm;

    calculoAtual = { distKm, gastoTotal, gasPrice };

    document.getElementById('distanceValue').textContent = distKm.toLocaleString('pt-BR') + ' km';
    document.getElementById('totalCost').textContent = 'R$ ' + gastoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('costPerKm').textContent = 'R$ ' + gastoPorKm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' / km';
    document.getElementById('distanceResult').classList.add('active');
    showToast('Rota calculada: ' + distKm + ' km', 'success');
  } catch (e) {
    showToast('Erro: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btnText.innerText = '📍 Recalcular Rota';
  }
}

// =====================================================
// FINALIZAR DESPACHO
// =====================================================
async function finalizarDespacho() {
  if (!calculoAtual) return showToast('Calcule a rota antes de finalizar.', 'error');

  const pedidos = [];
  document.querySelectorAll('.recebeu-input').forEach(inp => {
    pedidos.push({ id: inp.dataset.id, quem_recebeu: inp.value });
  });
  if (pedidos.length === 0) return showToast('Selecione ao menos um pedido.', 'error');

  const isFiorino = document.querySelector('input[value="Fiorino"]').checked;
  const pontoA = document.getElementById('desp_pontoA').value.trim();
  const stops = Array.from(document.querySelectorAll('#desp_stopsContainer .stop-input')).map(i => i.value.trim()).filter(v => v);

  const horarios = {
    saida_fabrica: document.getElementById('desp_hora_saida').value,
    chegadas: [],
    retorno_fabrica: document.getElementById('desp_hora_retorno').value
  };
  document.querySelectorAll('#desp_stopsContainer .stop-group').forEach((g, idx) => {
    const letra = String.fromCharCode(66 + idx);
    const horaInput = g.querySelector('.stop-hora');
    horarios.chegadas.push({ ponto: 'Ponto ' + letra, hora: horaInput ? horaInput.value : '' });
  });

  const dados = {
    pedidos: pedidos,
    veiculo: isFiorino ? 'Fiorino' : 'Kangoo',
    motorista: document.getElementById('desp_motorista').value,
    agente: document.getElementById('desp_agente').value,
    mesa: document.getElementById('desp_mesa').value,
    combustivel_preco: calculoAtual.gasPrice,
    distancia_total: calculoAtual.distKm,
    custo_combustivel: parseFloat(calculoAtual.gastoTotal.toFixed(2)),
    horarios: horarios
  };

  const btn = document.getElementById('btnFinalizar');
  btn.disabled = true; btn.innerText = '⏳ Finalizando...';
  showLoading('Despachando pedidos...');

  try {
    const json = await gasPOST({ action: 'despachar', dados: dados });
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

// =====================================================
// ABA 3 — RELATÓRIOS
// =====================================================
async function gerarRelatorio() {
  const ini = document.getElementById('rel_data_inicio').value;
  const fim = document.getElementById('rel_data_fim').value;
  if (!ini || !fim) return showToast('Informe as datas.', 'error');

  const btn = document.getElementById('btnRelatorio');
  btn.innerText = '⏳ Buscando...'; btn.disabled = true;
  document.getElementById('boxTabelaRelatorio').style.display = 'none';
  document.getElementById('relMsgEmpty').classList.add('hidden');

  try {
    const json = await gasGET({ action: 'buscarRelatorios', dataInicio: ini, dataFim: fim });
    if (json.status !== 'sucesso') throw new Error(json.mensagem || JSON.stringify(json));

    const dados = json.dados;
    const tbody = document.getElementById('corpoTabelaRelatorio');
    tbody.innerHTML = '';

    document.getElementById('boxTabelaRelatorio').style.display = 'block';
    if (dados.length === 0) {
      document.querySelector('#boxTabelaRelatorio table').style.display = 'none';
      document.getElementById('relMsgEmpty').classList.remove('hidden');
    } else {
      document.querySelector('#boxTabelaRelatorio table').style.display = 'table';
      dados.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
              <td><strong>${r.id}</strong></td>
              <td>${fmtData(r.data_manual)}</td>
              <td>${r.pedido}</td>
              <td style="color:var(--text)">${r.cliente}</td>
              <td>${r.veiculo}</td>
              <td>${r.viagem_id}</td>
              <td style="font-family:var(--font-mono)">${r.distancia}</td>
              <td class="cost">${r.custo_combustivel}</td>
            `;
        tbody.appendChild(tr);
      });
      showToast(dados.length + ' registro(s) encontrado(s)', 'success');
    }
  } catch (e) {
    showToast('Erro: ' + e.message, 'error');
  }
  btn.innerText = '🔍 Buscar'; btn.disabled = false;
}

function fmtData(d) {
  if (!d) return '-';
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
}

async function diagnosticarRelatorio() {
  const dbg = document.getElementById('debugInfo');
  dbg.style.display = 'block';
  dbg.textContent = '⏳ Consultando dados da planilha...';
  try {
    const json = await gasGET({ action: 'debugRelatorio' });
    if (json.status !== 'sucesso') throw new Error(json.mensagem || JSON.stringify(json));
    const d = json.dados;
    let txt = `📊 DIAGNÓSTICO DA PLANILHA\n`;
    txt += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    txt += `Total de linhas: ${d.totalLinhas}\n\n`;
    txt += `Status encontrados:\n`;
    for (const [k, v] of Object.entries(d.statusCount)) {
      txt += `  • "${k}": ${v} registro(s)\n`;
    }
    txt += `\nAmostras:\n`;
    d.amostras.forEach(a => {
      txt += `  L${a.linha}: ID=${a.id}, Data="${a.data_manual_raw}" (${a.data_manual_type}), Status="${a.status}"\n`;
    });
    if (!d.statusCount['Finalizado']) {
      txt += `\n⚠ Nenhum registro "Finalizado" encontrado.\n`;
      txt += `Finalize pedidos via aba Despachar.`;
    }
    dbg.textContent = txt;
  } catch (e) {
    dbg.textContent = '✕ Erro: ' + e.message;
  }
}
