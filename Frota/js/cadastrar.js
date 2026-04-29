import { gasPOST } from './api.js';
import { showToast } from './ui.js';
import { carregarStats } from './app.js';

// ─── Tabela de preços (oculta) ───────────────────────────────────────────────
// Valores armazenados no banco junto com a OS para fechamento financeiro futuro.
const PRECOS = {
  'Conjunto B Luxo Colorido':    1500.00,
  'Conjunto A Luxo':             2970.00,
  'Conjunto B Luxo':             1700.00,
  'Conjunto B Semi Luxo Colorido': 1500.00,
  'Conjunto Las Vegas':          3850.00,
  'Conjunto Lisboa':             7950.00,
  'Conjunto New York':           2800.00,
  'Conjunto Ouro Branco':        1850.00,
  'Conjunto São Paulo':          7300.00,
  'Conjunto Sidney':            10550.00,
  'Conjunto Tókio':              2420.00,
  'Conjunto Vip III':            9500.00,
  'Coroa A Vip I':               4850.00,
  'Coroa A Vip II':              4850.00,
  'Coração Cheio':               1100.00,
  'Coração Vazado Vermelho':     1320.00,
  'Coração Vazado Branco':       1320.00,
  'Corbélia':                     900.00,
  'Arranjo Estocolmo':            800.00,
  'Coroa A Luxo Branca':         1150.00,
  'Coroa A Luxo Colorida':       1300.00,
  'Coroa B Luxo Branca':          660.00,
  'Guirlanda Luxo Tons Claros':  1100.00,
  'Coroa B Semi Luxo':            495.00,
  'Coroa B Simples':              385.00,
  'Coroa Dubai':                 1430.00,
  'Coroa Tókio':                 1450.00,
  'Coroa Sidney':                4950.00,
  'Coroa Havaiana':              3850.00,
};

export function initCadastrar() {
  const hoje = new Date().toISOString().split('T')[0];
  const dataInput = document.getElementById('cad_data_manual');
  if (dataInput) dataInput.value = hoje;

  const btnSalvar = document.getElementById('btnSalvarPedido');
  if (btnSalvar) {
    btnSalvar.addEventListener('click', salvarPedido);
  }

  const numItens = document.getElementById('cad_numItens');
  if (numItens) {
    numItens.addEventListener('change', gerarCamposItens);
  }

  const selFuneraria = document.getElementById('cad_cliente_select');
  const inpFuneraria = document.getElementById('cad_cliente');
  if (selFuneraria && inpFuneraria) {
    selFuneraria.addEventListener('change', (e) => {
      if (e.target.value === 'Outra') {
        inpFuneraria.style.display = 'block';
        inpFuneraria.value = '';
      } else {
        inpFuneraria.style.display = 'none';
        inpFuneraria.value = e.target.value;
      }
    });
  }
}

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
        <select id="tipo_${i}" class="tipo-select" data-index="${i}">
          <option value="">Selecione...</option>
          <option value="Conjunto São Paulo">Conjunto São Paulo</option>
          <option value="Conjunto Lisboa">Conjunto Lisboa</option>
          <option value="Conjunto Las Vegas">Conjunto Las Vegas</option>
          <option value="Conjunto Sidney">Conjunto Sidney</option>
          <option value="Conjunto Vip III">Conjunto Vip III</option>
          <option value="Conjunto New York">Conjunto New York</option>
          <option value="Conjunto Tókio">Conjunto Tókio</option>
          <option value="Conjunto Ouro Branco">Conjunto Ouro Branco</option>
          <option value="Conjunto A Luxo">Conjunto A Luxo</option>
          <option value="Conjunto B Luxo">Conjunto B Luxo</option>
          <option value="Conjunto B Luxo Colorido">Conjunto B Luxo Colorido</option>
          <option value="Conjunto B Semi Luxo Colorido">Conjunto B Semi Luxo Colorido</option>
          <option value="Coroa A Vip I">Coroa A Vip I</option>
          <option value="Coroa A Vip II">Coroa A Vip II</option>
          <option value="Coroa Sidney">Coroa Sidney</option>
          <option value="Coroa Havaiana">Coroa Havaiana</option>
          <option value="Coroa Dubai">Coroa Dubai</option>
          <option value="Coroa Tókio">Coroa Tókio</option>
          <option value="Coroa A Luxo Branca">Coroa A Luxo Branca</option>
          <option value="Coroa A Luxo Colorida">Coroa A Luxo Colorida</option>
          <option value="Coroa B Luxo Branca">Coroa B Luxo Branca</option>
          <option value="Guirlanda Luxo Tons Claros">Guirlanda Luxo Tons Claros</option>
          <option value="Coração Cheio">Coração Cheio</option>
          <option value="Coração Vazado Vermelho">Coração Vazado Vermelho</option>
          <option value="Coração Vazado Branco">Coração Vazado Branco</option>
          <option value="Corbélia">Corbélia</option>
          <option value="Arranjo Estocolmo">Arranjo Estocolmo</option>
          <option value="Coroa B Semi Luxo">Coroa B Semi Luxo</option>
          <option value="Coroa B Simples">Coroa B Simples</option>
          <option value="Tufo">Tufo</option>
          <option value="Cruz">Cruz</option>
          <option value="Ornamentação">Ornamentação</option>
          <option value="Outros">Outros</option>
        </select>
      </div>
      <div class="form-group">
        <label>Quantidade</label>
        <input type="number" id="qtd_${i}" placeholder="Ex: 2" min="1">
      </div>
      <!-- preço oculto: preenchido automaticamente ao selecionar o tipo -->
      <input type="hidden" id="preco_${i}" value="0">
    `;
    c.appendChild(div);
  }

  // Bind events for dynamically added selects
  document.querySelectorAll('.tipo-select').forEach(sel => {
    sel.addEventListener('change', (e) => onTipoChange(e.target.dataset.index));
  });
  atualizarVisibilidadeFrases();
}

function onTipoChange(i) {
  const sel   = document.getElementById('tipo_'  + i);
  const qtd   = document.getElementById('qtd_'   + i);
  const preco = document.getElementById('preco_' + i);

  qtd.placeholder = sel.value === 'Outros' ? 'Detalhar na obs.' : 'Ex: 2';

  // Atribui o preço unitário oculto correspondente ao tipo selecionado
  if (preco) preco.value = PRECOS[sel.value] ?? 0;

  atualizarVisibilidadeFrases();
}

// ─── Mostrar/ocultar Frases das Coroas ─────────────────────────────────────────
// Se TODOS os itens forem "Ornamentação", oculta o campo (não é coroa, não tem frase).
function atualizarVisibilidadeFrases() {
  const n = parseInt(document.getElementById('cad_numItens')?.value || '0');
  const grupo = document.getElementById('grupoFrasesCoroas');
  if (!grupo) return;

  if (n === 0) {
    grupo.style.display = 'block';
    return;
  }

  let todosOrnamentacao = true;
  for (let i = 1; i <= n; i++) {
    const sel = document.getElementById('tipo_' + i);
    if (sel && sel.value && sel.value !== 'Ornamentação') {
      todosOrnamentacao = false;
      break;
    }
  }

  grupo.style.display = todosOrnamentacao ? 'none' : 'block';
  // Limpa o campo se oculto
  if (todosOrnamentacao) {
    const textarea = document.getElementById('cad_frases_coroas');
    if (textarea) textarea.value = '';
  }
}

async function salvarPedido() {
  // ─── Validação de campos obrigatórios ────────────────────────────────────────
  const data_manual   = (document.getElementById('cad_data_manual')?.value || '').trim();
  const pedido        = (document.getElementById('cad_pedido')?.value || '').trim();
  const clienteSelect = document.getElementById('cad_cliente_select')?.value || '';
  const cliente       = (document.getElementById('cad_cliente')?.value || '').trim();
  const falecido      = (document.getElementById('cad_falecido')?.value || '').trim();
  const data_entrega  = (document.getElementById('cad_data_entrega')?.value || '').trim();
  const hora_entrega  = (document.getElementById('cad_hora_entrega')?.value || '').trim();
  const local_entrega = (document.getElementById('cad_local_entrega')?.value || '').trim();
  const frase_coroa   = (document.getElementById('cad_frases_coroas')?.value || '').trim();
  const observacao    = (document.getElementById('cad_observacao')?.value || '').trim();

  if (!data_manual)   return showToast('Informe a data do pedido.', 'error');
  if (!pedido)        return showToast('Informe o nº do pedido.', 'error');
  if (!clienteSelect) return showToast('Selecione a funerária.', 'error');
  if (clienteSelect === 'Outra' && !cliente) return showToast('Informe o nome da funerária.', 'error');
  if (!falecido)      return showToast('Informe o nome do falecido.', 'error');
  if (!data_entrega)  return showToast('Informe a data de entrega.', 'error');
  if (!hora_entrega)  return showToast('Informe a hora de entrega.', 'error');
  if (!local_entrega) return showToast('Informe o local de entrega.', 'error');

  const n = parseInt(document.getElementById('cad_numItens').value || '0');
  if (n === 0) return showToast('Selecione a quantidade de itens.', 'error');

  const itens = [];
  for (let i = 1; i <= n; i++) {
    const t = document.getElementById('tipo_'  + i);
    const q = document.getElementById('qtd_'   + i);
    const p = document.getElementById('preco_' + i);
    if (!t || !t.value) return showToast(`Selecione o tipo do item ${i}.`, 'error');
    if (!q || !q.value || parseFloat(q.value) <= 0) return showToast(`Informe a quantidade do item ${i}.`, 'error');
    const qtdNum   = parseFloat(q.value) || 0;
    const precoUni = parseFloat(p ? p.value : 0) || 0;
    itens.push({
      tipo:        t.value,
      quantidade:  q.value || '0',
      preco_unit:  precoUni,
      preco_total: precoUni * qtdNum
    });
  }

  // Frases das coroas: obrigatório se pelo menos 1 item NÃO for Ornamentação
  const grupoFrases = document.getElementById('grupoFrasesCoroas');
  const frasesVisivel = grupoFrases && grupoFrases.style.display !== 'none';
  if (frasesVisivel && !frase_coroa) {
    return showToast('Informe as frases das coroas.', 'error');
  }

  const clienteFinal = clienteSelect === 'Outra' ? cliente : clienteSelect;

  const dados = {
    data_manual,
    pedido,
    cliente: clienteFinal,
    falecido,
    data_entrega,
    hora_entrega,
    local_entrega,
    frase_coroa: frasesVisivel ? frase_coroa : '',
    observacao,
    itens: itens
  };

  const btn = document.getElementById('btnSalvarPedido');
  btn.disabled = true; btn.innerText = '⏳ Salvando...';

  try {
    const json = await gasPOST({ action: 'salvarPedido', dados: dados });
    if (json.status === 'sucesso') {
      showToast(json.dados, 'success');
      limparFormCadastro();
      carregarStats(); // Refresh headers
    } else {
      showToast('Erro: ' + (json.mensagem || ''), 'error');
    }
  } catch (err) {
    showToast('Falha ao salvar: ' + err.message, 'error');
  }
  btn.disabled = false; btn.innerText = '📌 Salvar como Rascunho';
}

function limparFormCadastro() {
  ['cad_pedido', 'cad_cliente', 'cad_falecido', 'cad_data_entrega', 'cad_hora_entrega', 'cad_local_entrega', 'cad_frases_coroas', 'cad_observacao'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const selFuneraria = document.getElementById('cad_cliente_select');
  if (selFuneraria) selFuneraria.value = '';
  const inpFuneraria = document.getElementById('cad_cliente');
  if (inpFuneraria) inpFuneraria.style.display = 'none';

  const btnItens = document.getElementById('cad_numItens')
  if (btnItens) btnItens.value = '0';
  const cItens = document.getElementById('containerItens');
  if (cItens) cItens.innerHTML = '';
}
