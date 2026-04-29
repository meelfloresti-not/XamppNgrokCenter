import { gasGET, gasPOST } from './api.js';
import { showToast } from './ui.js';
import { carregarStats } from './app.js';

// URL pública do GAS do F3 (lê coroas_retirar das abas F3 e FFQP)
const F3_GAS_URL = 'https://script.google.com/macros/s/AKfycbwP9CkJY4V4f7wRZqJxz35AsEuxMk-nFnr1SmhvG89VV0x--DPmuwQgAJJPQKAery6d/exec';

let ocorrenciaAtual = null; // { tipo, id, loja_chave, loja_nome, quantidade, data }

export function initOcorrencias() {
  document.getElementById('btnCancelarOcorrencia')?.addEventListener('click', fecharModalAtraso);
  document.getElementById('btnConfirmarOcorrencia')?.addEventListener('click', confirmarResolucaoAtraso);
  document.getElementById('btnCancelarCoroas')?.addEventListener('click', fecharModalCoroas);
  document.getElementById('btnConfirmarCoroas')?.addEventListener('click', confirmarRetiradaCoroas);

  carregarOcorrencias();
}

export async function carregarOcorrencias() {
  const container = document.getElementById('listaOcorrenciasContainer');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-dim);">Carregando ocorrências...</div>';

  // Busca em paralelo: atrasos (PHP/MySQL) + coroas (F3 GAS direto)
  const [resAtrasos, resCoroas] = await Promise.allSettled([
    buscarAtrasos(),
    buscarCoroasHoje()
  ]);

  const lista = [];

  if (resAtrasos.status === 'fulfilled') {
    lista.push(...resAtrasos.value);
  }
  if (resCoroas.status === 'fulfilled') {
    lista.push(...resCoroas.value);
  }

  renderizarOcorrencias(lista);
}

// ─── Fonte 1: Atrasos Consolare (PHP/MySQL) ───────────────────────────────────

async function buscarAtrasos() {
  const res = await gasGET({ action: 'buscarOcorrencias' });
  if (res.status !== 'sucesso') return [];
  return (res.dados || []).map(o => ({ ...o, tipo: 'atraso' }));
}

// ─── Fonte 2: Coroas a retirar hoje (F3 GAS direto do browser) ───────────────

async function buscarCoroasHoje() {
  const hoje = diaHoje(); // 'yyyy-MM-dd'

  // Verifica quais lojas já foram baixadas hoje (PHP/MySQL)
  const resResolvidas = await gasGET({ action: 'buscarOcorrenciasCoroas' });
  const jaResolvidas  = (resResolvidas.status === 'sucesso') ? (resResolvidas.dados || []) : [];

  // Chama o GAS do F3 para ler coroas_retirar de hoje
  const response = await fetch(F3_GAS_URL);
  if (!response.ok) return [];
  const json = await response.json();
  if (json.status !== 'success') return [];

  const lojas = [
    { nome: 'Formosa',       chave: 'F3',   dados: json.F3   || [] },
    { nome: 'Quarta Parada', chave: 'FFQP', dados: json.FFQP || [] }
  ];

  const ocorrencias = [];

  for (const loja of lojas) {
    // Já foi dado baixa hoje? Pula.
    if (jaResolvidas.includes(loja.chave)) continue;

    // Procura linha do dia atual
    for (const row of loja.dados) {
      const rowDate = normalizarData(row.data);
      if (rowDate !== hoje) continue;

      const qtd = parseFloat(String(row.coroas_retirar || '0').replace(',', '.'));
      if (isNaN(qtd) || qtd <= 0) break; // linha de hoje mas sem coroas

      ocorrencias.push({
        tipo:       'coroas',
        id:         `COROA-${loja.chave}-${hoje}`,
        loja:       loja.nome,
        loja_chave: loja.chave,
        quantidade: qtd,
        data:       hoje
      });
      break; // só uma ocorrência por loja por dia
    }
  }

  return ocorrencias;
}

// ─── Helpers de data ─────────────────────────────────────────────────────────

function diaHoje() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function normalizarData(val) {
  if (!val) return '';
  const s = String(val).trim();
  // yyyy-MM-dd ou ISO (2026-04-20T...) — ambos começam com yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  // dd/MM/yyyy
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return '';
}

function formatarData(dStr) {
  if (!dStr) return '';
  const p = dStr.split('-');
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
  return dStr;
}

// ─── Renderização ────────────────────────────────────────────────────────────

function renderizarOcorrencias(lista) {
  const container = document.getElementById('listaOcorrenciasContainer');
  if (!container) return;

  container.innerHTML = '';

  if (lista.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px; border:2px dashed var(--border); border-radius:8px;">
        <span style="font-size:32px;">✨</span>
        <div style="color:var(--text-sec); margin-top:8px;">Nenhuma ocorrência pendente no momento.</div>
      </div>
    `;
    return;
  }

  lista.forEach(o => {
    container.appendChild(o.tipo === 'coroas' ? criarCardCoroas(o) : criarCardAtraso(o));
  });
}

function criarCardAtraso(o) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.borderLeft = '4px solid var(--danger)';

  const praStr = o.data_entrega
    ? `${formatarData(o.data_entrega)} às ${o.hora_prazo || '??:??'}`
    : 'Não informado';
  const realStr = o.data_entrega_real
    ? `${formatarData(o.data_entrega_real)} às ${o.hora_entrega || '??:??'}`
    : 'Não informado';

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div class="card-id">${o.id} <span style="font-size:12px; font-weight:normal; color:var(--text-dim);">Pedido: ${o.pedido || '-'}</span></div>
      <span style="background:rgba(255,59,48,0.1); color:var(--danger); padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold;">Atrasado</span>
    </div>
    <div class="card-title">${o.cliente} — ${o.falecido || 'S/ Nome'}</div>
    <div class="card-detail" style="margin-top:8px; line-height:1.5;">
      <strong>Prazo Estipulado:</strong> <span style="color:var(--text-sec);">${praStr}</span><br>
      <strong>Entregue Em:</strong> <span style="color:var(--danger); font-weight:bold;">${realStr}</span><br>
      <strong>Motorista:</strong> ${o.motorista || '—'}
    </div>
    <button class="btn btn-outline" style="margin-top:12px; border-color:var(--danger); color:var(--danger);"
      onclick="window.abrirModalAtraso('${o.id}')">Resolver Ocorrência</button>
  `;
  return card;
}

function criarCardCoroas(o) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.borderLeft = '4px solid var(--amber)';

  const lojaIcon = o.loja_chave === 'FFQP' ? '🌿' : '🌸';

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div class="card-id">${lojaIcon} Loja ${o.loja}</div>
      <span style="background:rgba(255,170,0,0.15); color:var(--amber); padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold;">Retirar Coroas</span>
    </div>
    <div class="card-title" style="margin-top:6px;">🌺 Coroas a Retirar</div>
    <div class="card-detail" style="margin-top:8px; line-height:1.5;">
      <strong>Data:</strong> <span style="color:var(--text-sec);">${formatarData(o.data)}</span><br>
      <strong>Quantidade:</strong> <span style="color:var(--amber); font-weight:bold; font-size:22px;">${o.quantidade}</span> coroa(s)<br>
      <strong>Loja:</strong> ${o.loja}
    </div>
    <button class="btn" style="margin-top:12px; background:var(--amber); color:#000; font-weight:bold;"
      onclick="window.abrirModalCoroas('${o.id}', '${o.loja_chave}', '${o.loja}', ${o.quantidade}, '${o.data}')">
      ✅ Confirmar Retirada
    </button>
  `;
  return card;
}

// ─── Modal: Atraso (Consolare) ───────────────────────────────────────────────

window.abrirModalAtraso = function(id) {
  ocorrenciaAtual = { tipo: 'atraso', id };
  document.getElementById('lblOcorrenciaId').textContent = id;
  document.getElementById('inpMotivoOcorrencia').value = '';
  document.getElementById('modalResolverOcorrencia').classList.remove('hidden');
};

function fecharModalAtraso() {
  document.getElementById('modalResolverOcorrencia').classList.add('hidden');
  ocorrenciaAtual = null;
}

async function confirmarResolucaoAtraso() {
  if (!ocorrenciaAtual || ocorrenciaAtual.tipo !== 'atraso') return;
  const motivo = document.getElementById('inpMotivoOcorrencia').value.trim();
  if (!motivo) { showToast('Informe a justificativa.', 'warning'); return; }

  const btn = document.getElementById('btnConfirmarOcorrencia');
  btn.disabled = true; btn.textContent = 'Aguarde...';

  try {
    const json = await gasPOST({ action: 'resolverOcorrencia', dados: { id: ocorrenciaAtual.id, motivo } });
    if (json.status === 'sucesso') {
      showToast(json.dados, 'success');
      fecharModalAtraso();
      carregarOcorrencias();
      carregarStats();
    } else {
      showToast('Erro: ' + (json.mensagem || ''), 'error');
    }
  } catch (err) {
    showToast('Falha: ' + err.message, 'error');
  }

  btn.disabled = false; btn.textContent = '✔ Dar Baixa';
}

// ─── Modal: Coroas ───────────────────────────────────────────────────────────

window.abrirModalCoroas = function(id, lojaChave, lojaNome, qtd, data) {
  ocorrenciaAtual = { tipo: 'coroas', id, loja_chave: lojaChave, loja_nome: lojaNome, quantidade: qtd, data };
  document.getElementById('lblCoroasLoja').textContent = lojaNome;
  document.getElementById('lblCoroasQtd').textContent  = qtd;
  document.getElementById('inpObsCoroas').value = '';
  document.getElementById('modalCoroas').classList.remove('hidden');
};

function fecharModalCoroas() {
  document.getElementById('modalCoroas').classList.add('hidden');
  ocorrenciaAtual = null;
}

async function confirmarRetiradaCoroas() {
  if (!ocorrenciaAtual || ocorrenciaAtual.tipo !== 'coroas') return;
  const obs = document.getElementById('inpObsCoroas').value.trim();

  const btn = document.getElementById('btnConfirmarCoroas');
  btn.disabled = true; btn.textContent = 'Aguarde...';

  try {
    const json = await gasPOST({
      action: 'resolverOcorrenciaCoroas',
      dados: {
        loja_chave: ocorrenciaAtual.loja_chave,
        loja_nome:  ocorrenciaAtual.loja_nome,
        quantidade: ocorrenciaAtual.quantidade,
        data:       ocorrenciaAtual.data,
        observacao: obs
      }
    });

    if (json.status === 'sucesso') {
      showToast(json.dados, 'success');
      fecharModalCoroas();
      carregarOcorrencias();
      carregarStats();
    } else {
      showToast('Erro: ' + (json.mensagem || ''), 'error');
    }
  } catch (err) {
    showToast('Falha: ' + err.message, 'error');
  }

  btn.disabled = false; btn.textContent = '✅ Confirmar Retirada';
}
