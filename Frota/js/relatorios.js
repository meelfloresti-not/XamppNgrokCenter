import { gasGET } from './api.js';
import { showToast } from './ui.js';

export function initRelatorios() {
  const relInicio = document.getElementById('rel_data_inicio');
  const relFim = document.getElementById('rel_data_fim');
  
  if (relInicio && relFim) {
    const hoje = new Date().toISOString().split('T')[0];
    let d30 = new Date(); d30.setDate(d30.getDate() - 30);
    relInicio.value = d30.toISOString().split('T')[0];
    relFim.value = hoje;
  }

  document.getElementById('btnRelatorio')?.addEventListener('click', gerarRelatorio);
  document.getElementById('btnDebugRelatorio')?.addEventListener('click', diagnosticarRelatorio);
}

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
