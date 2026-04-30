// =============================================
// MAIN APP - CSE2
// =============================================

let registros = [];
let pendingQueue = [];
let sortField = 'data';
let sortAsc = false;
let pendingDelete = null;
let isSaving = false;

// ── Novos estados ─────────────────────────────
let alertas = {};          // { 'mat|||local': { medio, minimo } }
let operadorAtual = '';    // nome salvo, preenchido 1x
let _cardMap = [];         // mapa índice → produto (para onclick)
let _acaoAtual = null;     // { tipo:'baixa'|'mover'|'config', material, local, saldo }

// ========== INIT ==========
async function init() {
    if (!window.APP_CONFIG) {
        console.error("APP_CONFIG não foi definido no HTML.");
        return;
    }
    // Carregar cache local como fallback imediato
    registros = loadCache() || [];
    pendingQueue = loadPendingQueue() || [];
    alertas = loadAlertas() || {};
    operadorAtual = loadOperador() || '';

    setDefaultDate();
    renderAll();
    updateOnlineStatus();
    updatePendingBadge();

    // Sincronizar com o servidor PHP local em background
    try {
        const [serverData, serverAlertas] = await Promise.all([
            sincronizarAPI(),
            carregarAlertasAPI()
        ]);
        if (serverData) {
            registros = serverData;
            saveCache(registros);
        }
        if (serverAlertas && Object.keys(serverAlertas).length > 0) {
            alertas = serverAlertas;
            saveAlertas(alertas);
        }
        renderAll();
    } catch(e) {
        console.warn('Usando cache local (servidor indisponível):', e);
    }

    // Enviar pendentes
    processPendingQueue();
}

function setDefaultDate() {
    const el = document.getElementById('f-data');
    if (!el) return;
    const now = new Date();
    const local = new Date(now - now.getTimezoneOffset() * 60000);
    el.value = local.toISOString().slice(0, 16);
}

// PENDING QUEUE METHODS
window.pushToPending = function(registro, acao) {
    pendingQueue.push({ registro, acao, addedAt: new Date().toISOString() });
    savePendingQueue(pendingQueue);
    updatePendingBadge();
};

function updatePendingBadge() {
    const badge = document.getElementById('pendingBadge');
    const count = document.getElementById('pendingCount');
    if (!badge || !count) return;
    if (pendingQueue.length > 0) {
        badge.classList.add('visible');
        count.textContent = pendingQueue.length;
    } else {
        badge.classList.remove('visible');
    }
}

window.processPendingQueue = async function() {
    if (!navigator.onLine || pendingQueue.length === 0) return;

    showToast(`Enviando ${pendingQueue.length} registro(s) pendente(s)...`, 'info');
    const queue = [...pendingQueue];
    pendingQueue = [];
    savePendingQueue(pendingQueue);
    updatePendingBadge();

    for (const item of queue) {
        // Enviar usa as variaveis internas do api.js (tentativa = 1)
        const success = await enviarParaGAS(item.registro, item.acao);
        if (!success) {
            break;
        }
    }

    if (pendingQueue.length === 0) {
        showToast('Todos os pendentes foram enviados!', 'success');
    }
    updatePendingBadge();
};

window.triggerSincronizar = async function() {
    const [d, al] = await Promise.all([
        sincronizarAPI(),
        carregarAlertasAPI()
    ]);
    if (d) {
        registros = d;
        saveCache(registros);
    }
    if (al && Object.keys(al).length > 0) {
        alertas = al;
        saveAlertas(alertas);
    }
    renderAll();
    showToast('Sincronização completa!', 'success');
}


// ========== TABS ==========
function switchTab(tab) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

    const pnl = document.getElementById('panel-' + tab);
    if(pnl) pnl.classList.add('active');

    const tabs = document.querySelectorAll('.tab');
    const tabList = ['dashboard', 'lancamento', 'historico', 'produtos', 'ocorrencias'];
    const idx = tabList.indexOf(tab);
    if(tabs[idx]) tabs[idx].classList.add('active');

    if (tab === 'historico') { updateFilters(); renderHistorico(); }
    if (tab === 'produtos') { updateFilters(); renderProdutos(); }
    if (tab === 'dashboard') renderDashboard();
    if (tab === 'ocorrencias') renderOcorrenciasEstoque();
}

// Tornar global para os onclick do HTML
window.switchTab = switchTab;

// ========== FORM ==========
window.updateRadio = function() {
    const rbs = document.querySelector('input[name=tipo]:checked');
    if(!rbs) return;
    const val = rbs.value;
    document.getElementById('rb-entrada')?.classList.toggle('checked', val === 'Entrada');
    document.getElementById('rb-saida')?.classList.toggle('checked', val === 'Saída');
}

window.calcUnitario = function() {
    const q = parseFloat(document.getElementById('f-qtd')?.value) || 0;
    const t = parseFloat(document.getElementById('f-vtotal')?.value) || 0;
    const fVunit = document.getElementById('f-vunit');
    if(fVunit) fVunit.value = q > 0 ? (t / q).toFixed(2) : '0.00';
}

window.toggleModoQtd = function() {
    const modo = document.getElementById('f-modo-qtd')?.value;
    if (modo === 'pacote') {
        document.getElementById('group-pacotes').style.display = 'flex';
        document.getElementById('group-unid-pacote').style.display = 'flex';
        const fQtd = document.getElementById('f-qtd');
        if(fQtd){
            fQtd.readOnly = true;
            fQtd.style.opacity = '0.7';
        }
    } else {
        document.getElementById('group-pacotes').style.display = 'none';
        document.getElementById('group-unid-pacote').style.display = 'none';
        const fQtd = document.getElementById('f-qtd');
        if(fQtd){
            fQtd.readOnly = false;
            fQtd.style.opacity = '1';
        }
    }
    calcTotalQtd();
}

window.calcTotalQtd = function() {
    const modo = document.getElementById('f-modo-qtd')?.value;
    if (modo === 'pacote') {
        const p = parseFloat(document.getElementById('f-pacotes')?.value) || 0;
        const up = parseFloat(document.getElementById('f-unid-pacote')?.value) || 0;
        if(document.getElementById('f-qtd')) document.getElementById('f-qtd').value = p * up;
    }
    calcUnitario();
}

window.autoFillType = function() {
    const mat = document.getElementById('f-material')?.value.trim().toLowerCase();
    if(!mat) return;
    const found = registros.find(r => r.material.toLowerCase() === mat);
    const fTipo = document.getElementById('f-tipo');
    if (found && fTipo && !fTipo.value) {
        fTipo.value = found.tipoMaterial;
    }
}

window.limparForm = function() {
    ['f-quem', 'f-fornecedor', 'f-recebeu', 'f-cadastrou', 'f-local', 'f-material', 'f-tipo', 'f-qtd', 'f-pacotes', 'f-unid-pacote', 'f-vunit', 'f-vtotal', 'f-obs'].forEach(id => {
        if (document.getElementById(id)) document.getElementById(id).value = '';
    });
    const ent = document.querySelector('input[name=tipo][value=Entrada]');
    if(ent) ent.checked = true;
    
    if(document.getElementById('f-modo-qtd')) document.getElementById('f-modo-qtd').value = 'unidade';
    updateRadio();
    toggleModoQtd();
    setDefaultDate();
}

window.salvarLancamento = async function() {
    if (isSaving) return;

    const tipo = document.querySelector('input[name=tipo]:checked')?.value;
    const data = document.getElementById('f-data')?.value;
    const quem = document.getElementById('f-quem')?.value.trim();
    const fornecedor = document.getElementById('f-fornecedor')?.value.trim() || '';
    const quemRecebeu = document.getElementById('f-recebeu')?.value.trim() || '';
    const quemCadastrou = document.getElementById('f-cadastrou')?.value.trim() || '';
    const local = document.getElementById('f-local')?.value.trim();
    const material = document.getElementById('f-material')?.value.trim();
    const tipoMaterial = document.getElementById('f-tipo')?.value.trim();
    const modoQtd = document.getElementById('f-modo-qtd')?.value || 'unidade';
    
    const fPacotes = document.getElementById('f-pacotes');
    const fUnidPacote = document.getElementById('f-unid-pacote');
    const qtd_pacotes = modoQtd === 'pacote' ? (parseFloat(fPacotes?.value) || 0) : 0;
    const unid_pacote = modoQtd === 'pacote' ? (parseFloat(fUnidPacote?.value) || 0) : 0;
    
    const qtd = parseFloat(document.getElementById('f-qtd')?.value) || 0;
    const vunit = parseFloat(document.getElementById('f-vunit')?.value) || 0;
    const vtotal = parseFloat(document.getElementById('f-vtotal')?.value) || 0;
    const obs = document.getElementById('f-obs')?.value.trim() || '';

    if (!data || !quem || !local || !material || !tipoMaterial || qtd <= 0) {
        showToast('Preencha os campos obrigatórios e verifique a quantidade!', 'error');
        return;
    }
    
    if (modoQtd === 'pacote' && (!qtd_pacotes || !unid_pacote)) {
        showToast('Para pacotes, preencha a qtd de pacotes e unidades por pacote!', 'error');
        return;
    }

    if (tipo === 'Saída') {
        const saldo = calcSaldo(material, local);
        if (qtd > saldo) {
            showToast(`Saldo insuficiente! Disponível em ${local}: ${saldo} un.`, 'error');
            return;
        }
        if (modoQtd === 'pacote') {
            const saldoPacotes = calcSaldoPacotes(material, local);
            if (qtd_pacotes > saldoPacotes) {
                showToast(`Atenção: Você tem apenas ${saldoPacotes} pacotes fechados nesse local.`, 'error');
                return;
            }
        }
    }

    const novoRegistro = {
        id: Date.now() + Math.random(),
        tipo, data, quem, fornecedor, quemRecebeu, quemCadastrou,
        local, material, tipoMaterial,
        qtd, qtd_pacotes, unid_pacote, vunit, vtotal, obs,
        criadoEm: new Date().toISOString()
    };

    registros.push(novoRegistro);
    saveCache(registros);
    updateDataLists();
    renderAll();
    limparForm();

    const btn = document.getElementById('btnSalvar');
    if(btn) btn.classList.add('saving');
    isSaving = true;

    const success = await enviarParaGAS(novoRegistro, 'salvar');

    if(btn) {
        btn.classList.remove('saving');
        if (success) {
            btn.classList.add('btn-success');
            btn.querySelector('.btn-text').textContent = '✓ Salvo!';
        } else {
            btn.classList.add('btn-error');
            btn.querySelector('.btn-text').textContent = '✕ Erro ao enviar';
        }

        setTimeout(() => {
            btn.classList.remove('btn-success', 'btn-error');
            btn.querySelector('.btn-text').textContent = '✓ Salvar Lançamento';
            isSaving = false;
        }, 2000);
    } else {
        isSaving = false;
    }
}

function calcSaldo(material, local) {
    return registros.reduce((acc, r) => {
        if (r.deletado) return acc;
        if (r.material.toLowerCase() === material.toLowerCase() &&
            r.local.toLowerCase() === local.toLowerCase()) {
            return acc + (r.tipo === 'Entrada' ? r.qtd : -r.qtd);
        }
        return acc;
    }, 0);
}

function calcSaldoPacotes(material, local) {
    let saldoUnid = 0;
    let unidPacote = 0;
    let saldoPacSimples = 0;
    registros.forEach(r => {
        if (r.deletado) return;
        if (r.material.toLowerCase() === material.toLowerCase() &&
            r.local.toLowerCase() === local.toLowerCase()) {
            if (r.tipo === 'Entrada') {
                saldoUnid += r.qtd;
                saldoPacSimples += (r.qtd_pacotes || 0);
                if (r.unid_pacote > 0) unidPacote = r.unid_pacote;
            } else {
                saldoUnid -= r.qtd;
                saldoPacSimples -= (r.qtd_pacotes || 0);
            }
        }
    });
    return unidPacote > 0 ? Math.floor(Math.max(0, saldoUnid) / unidPacote) : Math.max(0, saldoPacSimples);
}

// ========== DATALISTS ==========
function updateDataLists() {
    const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();
    const materiais = uniq(registros.map(r => r.material));
    const locais = uniq(registros.map(r => r.local));
    const pessoas = uniq(registros.map(r => r.quem));
    const tipos = uniq(registros.map(r => r.tipoMaterial));
    const fornecedores = uniq(registros.map(r => r.fornecedor));
    const recebedores = uniq(registros.map(r => r.quemRecebeu));
    const cadastradores = uniq(registros.map(r => r.quemCadastrou));

    fillDataList('listMaterial', materiais);
    fillDataList('listLocal', locais);
    fillDataList('listQuem', pessoas);
    fillDataList('listTipo', tipos);
    fillDataList('listFornecedor', fornecedores);
    fillDataList('listRecebeu', recebedores);
    fillDataList('listCadastrou', cadastradores);
}

function fillDataList(id, arr) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = arr.map(v => `<option value="${escHtml(v)}">`).join('');
}

// ========== FILTERS UPDATE ==========
function updateFilters() {
    const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();
    const locais = uniq(registros.map(r => r.local));
    const pessoas = uniq(registros.map(r => r.quem));
    const materiais = uniq(registros.map(r => r.material));
    const tipos = uniq(registros.map(r => r.tipoMaterial));

    fillSelect('flt-local', locais);
    fillSelect('flt-quem', pessoas);
    fillSelect('flt-material', materiais);
    fillSelect('flt-tipo-prod', tipos);
    fillSelect('flt-local-prod', locais);
}

function fillSelect(id, arr) {
    const el = document.getElementById(id);
    if (!el) return;
    const cur = el.value;
    el.innerHTML = `<option value="">Todos</option>` + arr.map(v => `<option value="${escHtml(v)}">${escHtml(v)}</option>`).join('');
    if (arr.includes(cur)) el.value = cur;
}

// ========== RENDER ALL ==========
function renderAll() {
    updateDataLists();
    updateFilters();
    renderDashboard();
    atualizarBadgeOcorrencias();

    const activePanel = document.querySelector('.panel.active');
    if (activePanel) {
        if(activePanel.id === 'panel-historico') renderHistorico();
        if(activePanel.id === 'panel-produtos') renderProdutos();
        if(activePanel.id === 'panel-ocorrencias') renderOcorrenciasEstoque();
    }
}

function atualizarBadgeOcorrencias() {
    const count = contarAlertasAtivos();
    const badge = document.getElementById('badgeOcorrencias');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

function contarAlertasAtivos() {
    const grupos = calcularGrupos();
    let count = 0;
    Object.entries(grupos).forEach(([key, g]) => {
        const al = alertas[key];
        if (!al) return;
        const saldo = g.entrada - g.saida;
        if ((al.minimo > 0 && saldo <= al.minimo) || (al.medio > 0 && saldo <= al.medio)) count++;
    });
    return count;
}

function calcularGrupos() {
    const grupos = {};
    registros.filter(r => !r.deletado).forEach(r => {
        const key = r.material + '|||' + r.local;
        if (!grupos[key]) grupos[key] = { material: r.material, local: r.local, tipoMaterial: r.tipoMaterial, entrada: 0, saida: 0 };
        if (r.tipo === 'Entrada') grupos[key].entrada += r.qtd;
        else grupos[key].saida += r.qtd;
    });
    return grupos;
}

// ========== DASHBOARD ==========
function renderDashboard() {
    const ativos = registros.filter(r => !r.deletado);
    const totalEntradas = ativos.filter(r => r.tipo === 'Entrada').reduce((a, r) => a + r.qtd, 0);
    const totalSaidas = ativos.filter(r => r.tipo === 'Saída').reduce((a, r) => a + r.qtd, 0);
    const valorTotal = ativos.reduce((a, r) => a + (r.vtotal || 0), 0);
    const materiais = new Set(ativos.map(r => r.material)).size;

    const sGrid = document.getElementById('statsGrid');
    if(sGrid){
        sGrid.innerHTML = `
        <div class="stat-card amber">
        <div class="stat-label">Total de Registros</div>
        <div class="stat-value">${ativos.length}</div>
        <div class="stat-sub">movimentações</div>
        </div>
        <div class="stat-card green">
        <div class="stat-label">Total Entradas</div>
        <div class="stat-value">${totalEntradas.toLocaleString('pt-BR')}</div>
        <div class="stat-sub">unidades</div>
        </div>
        <div class="stat-card red">
        <div class="stat-label">Total Saídas</div>
        <div class="stat-value">${totalSaidas.toLocaleString('pt-BR')}</div>
        <div class="stat-sub">unidades</div>
        </div>
        <div class="stat-card blue">
        <div class="stat-label">Valor Movimentado</div>
        <div class="stat-value" style="font-size:20px">${valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        <div class="stat-sub">total geral</div>
        </div>
        <div class="stat-card amber">
        <div class="stat-label">Materiais Distintos</div>
        <div class="stat-value">${materiais}</div>
        <div class="stat-sub">tipos de produtos</div>
        </div>
    `;
    }

    const entradas = ativos.filter(r => r.tipo === 'Entrada').sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 5);
    const saidas = ativos.filter(r => r.tipo === 'Saída').sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 5);

    const miniRow = (r) => `<tr style="border-bottom:1px solid var(--border)">
    <td style="padding:8px 16px;font-size:12px;color:var(--text-dim)">${fmtDate(r.data)}</td>
    <td style="padding:8px 16px;font-size:13px">${escHtml(r.material)}</td>
    <td style="padding:8px 16px;font-size:13px;font-family:var(--font-mono);color:var(--amber)">${r.qtd}</td>
    </tr>`;

    const tblEntradas = document.querySelector('#tblEntradas tbody');
    if(tblEntradas){
        tblEntradas.innerHTML = entradas.length
            ? entradas.map(miniRow).join('')
            : `<tr><td colspan="3" style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px">Sem entradas</td></tr>`;
    }

    const tblSaidas = document.querySelector('#tblSaidas tbody');
    if(tblSaidas) {
        tblSaidas.innerHTML = saidas.length
            ? saidas.map(miniRow).join('')
            : `<tr><td colspan="3" style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px">Sem saídas</td></tr>`;
    }
}

// ========== HISTORICO ==========
window.sortTable = function(field) {
    if (sortField === field) sortAsc = !sortAsc;
    else { sortField = field; sortAsc = true; }
    document.querySelectorAll('thead th').forEach(th => th.classList.remove('sorted'));
    renderHistorico();
}

window.clearFilters = function() {
    ['flt-search', 'flt-dtinicio', 'flt-dtfim', 'flt-tipo', 'flt-local', 'flt-quem', 'flt-material'].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).value = '';
    });
    renderHistorico();
}

function getFilteredRegistros() {
    const search = document.getElementById('flt-search')?.value.toLowerCase() || '';
    const tipo = document.getElementById('flt-tipo')?.value || '';
    const local = document.getElementById('flt-local')?.value || '';
    const quem = document.getElementById('flt-quem')?.value || '';
    const material = document.getElementById('flt-material')?.value || '';
    const dtini = document.getElementById('flt-dtinicio')?.value || '';
    const dtfim = document.getElementById('flt-dtfim')?.value || '';

    return registros.filter(r => {
        if (r.deletado) return false;
        if (tipo && r.tipo !== tipo) return false;
        if (local && r.local !== local) return false;
        if (quem && r.quem !== quem) return false;
        if (material && r.material !== material) return false;
        if (dtini && r.data.slice(0, 10) < dtini) return false;
        if (dtfim && r.data.slice(0, 10) > dtfim) return false;
        if (search && !`${r.material} ${r.quem} ${r.local} ${r.tipoMaterial} ${r.obs}`.toLowerCase().includes(search)) return false;
        return true;
    });
}

window.renderHistorico = function() {
    let data = getFilteredRegistros();

    data.sort((a, b) => {
        let va = a[sortField], vb = b[sortField];
        if (sortField === 'qtd' || sortField === 'vunit' || sortField === 'vtotal') { va = +va; vb = +vb; }
        if (va < vb) return sortAsc ? -1 : 1;
        if (va > vb) return sortAsc ? 1 : -1;
        return 0;
    });

    const c = document.getElementById('recordCount');
    if(c) c.textContent = `${data.length} registro${data.length !== 1 ? 's' : ''}`;

    const body = document.getElementById('tblHistoricoBody');
    const empty = document.getElementById('emptyHistorico');
    if(!body || !empty) return;

    if (!data.length) {
        body.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    body.innerHTML = data.map(r => `
    <tr>
      <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-dim)">${fmtDate(r.data)}</td>
      <td><span class="badge badge-${r.tipo.toLowerCase()}">${r.tipo === 'Entrada' ? '▲' : '▼'} ${r.tipo}</span></td>
      <td>${escHtml(r.quem)}</td>
      <td style="color:var(--text-dim)">${escHtml(r.fornecedor || '')}</td>
      <td style="color:var(--text-dim)">${escHtml(r.quemRecebeu || '')}</td>
      <td style="color:var(--text-dim)">${escHtml(r.quemCadastrou || '')}</td>
      <td style="color:var(--text-dim)">${escHtml(r.local)}</td>
      <td style="font-weight:600">${escHtml(r.material)}</td>
      <td style="color:var(--text-dim)">${escHtml(r.tipoMaterial)}</td>
      <td style="font-family:var(--font-mono);font-weight:700;color:${r.tipo === 'Entrada' ? 'var(--amber)' : 'var(--amber-dim)'}">${r.qtd_pacotes ? (r.tipo === 'Entrada' ? '+' : '-') + r.qtd_pacotes : '-'}</td>
      <td style="font-family:var(--font-mono);font-weight:700;color:${r.tipo === 'Entrada' ? 'var(--green)' : 'var(--red)'}">${r.qtd.toLocaleString('pt-BR')}</td>
      <td style="font-family:var(--font-mono);font-size:12px">${r.vunit ? r.vunit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
      <td style="font-family:var(--font-mono);font-size:12px;color:var(--amber)">${r.vtotal ? r.vtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
      <td style="font-size:12px;color:var(--text-muted);max-width:120px;overflow:hidden;text-overflow:ellipsis">${escHtml(r.obs || '')}</td>
      <td><button class="delete-btn" onclick="confirmDelete('${r.id}')" title="Excluir">✕</button></td>
    </tr>
  `).join('');
}

// ========== PRODUTOS ==========
window.renderProdutos = function() {
    const search = (document.getElementById('flt-produto')?.value || '').toLowerCase();
    const tipoFlt = document.getElementById('flt-tipo-prod')?.value || '';
    const localFlt = document.getElementById('flt-local-prod')?.value || '';

    const grupos = {};
    registros.filter(r => !r.deletado).forEach(r => {
        const key = r.material + '|||' + r.local;
        if (!grupos[key]) grupos[key] = { material: r.material, local: r.local, tipoMaterial: r.tipoMaterial, entrada: 0, saida: 0, entradaPac: 0, saidaPac: 0, valorTotal: 0, unidPacote: 0 };
        if (r.tipo === 'Entrada') {
            grupos[key].entrada += r.qtd;
            grupos[key].entradaPac += (r.qtd_pacotes || 0);
            grupos[key].valorTotal += r.vtotal || 0;
            if (r.unid_pacote > 0) grupos[key].unidPacote = r.unid_pacote;
        } else {
            grupos[key].saida += r.qtd;
            grupos[key].saidaPac += (r.qtd_pacotes || 0);
        }
    });

    let cards = Object.values(grupos).filter(g => {
        if (search && !g.material.toLowerCase().includes(search) && !g.local.toLowerCase().includes(search)) return false;
        if (tipoFlt && g.tipoMaterial !== tipoFlt) return false;
        if (localFlt && g.local !== localFlt) return false;
        return true;
    }).sort((a, b) => a.material.localeCompare(b.material));

    const grid = document.getElementById('productGrid');
    const empty = document.getElementById('emptyProdutos');
    if(!grid || !empty) return;

    if (!cards.length) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    _cardMap = [];

    grid.innerHTML = cards.map(g => {
        const saldo = g.entrada - g.saida;
        const saldoPac = g.unidPacote > 0 ? Math.floor(Math.max(0, saldo) / g.unidPacote) : (g.entradaPac - g.saidaPac);
        const pct = g.entrada > 0 ? Math.max(0, Math.min(100, (saldo / g.entrada) * 100)) : 0;
        const isNeg = saldo < 0;

        const aKey = g.material + '|||' + g.local;
        const al = alertas[aKey] || { medio: 0, minimo: 0 };
        const nivel = al.minimo > 0 && saldo <= al.minimo ? 'vermelho'
                    : al.medio > 0 && saldo <= al.medio ? 'amarelo' : 'normal';

        const ci = _cardMap.length;
        _cardMap.push({ material: g.material, local: g.local, tipoMaterial: g.tipoMaterial, saldo });

        const alertaBadge = nivel !== 'normal' ? `
          <div class="alerta-badge ${nivel}">${nivel === 'vermelho' ? '🔴 CRÍTICO' : '🟡 ATENÇÃO'} — saldo ${saldo} / limite ${nivel === 'vermelho' ? al.minimo : al.medio}</div>` : '';

        const progressColor = nivel === 'vermelho' ? 'background:var(--red)' : nivel === 'amarelo' ? 'background:var(--amber)' : '';
        const saldoColor = isNeg || nivel === 'vermelho' ? 'red' : nivel === 'amarelo' ? 'amber' : 'amber';
        const alertaConf = (al.medio || al.minimo) ? `<div class="alerta-conf-info">⚙ Médio: ${al.medio||'—'} | Mín: ${al.minimo||'—'}</div>` : '';

        return `
      <div class="product-card${nivel !== 'normal' ? ' alerta-'+nivel : ''}">
        ${alertaBadge}
        <div class="product-name">${escHtml(g.material)}</div>
        <div class="product-type">${escHtml(g.tipoMaterial)} • ${escHtml(g.local)}</div>
        <div class="product-stats">
          <div class="product-stat"><div class="product-stat-val green">${g.entrada.toLocaleString('pt-BR')}</div><div class="product-stat-lbl">Entrada</div></div>
          <div class="product-stat"><div class="product-stat-val red">${g.saida.toLocaleString('pt-BR')}</div><div class="product-stat-lbl">Saída</div></div>
          <div class="product-stat"><div class="product-stat-val ${saldoColor}">${saldo.toLocaleString('pt-BR')}</div><div class="product-stat-lbl">Saldo Unid.</div></div>
        </div>
        <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:11px;color:var(--amber);font-family:var(--font-mono);font-weight:600">📦 Pacotes: <span style="font-size:13px">${saldoPac > 0 ? saldoPac : 0}</span></div>
        </div>
        <div class="progress-bar"><div class="progress-fill ${isNeg ? 'negative' : ''}" style="width:${pct}%;${progressColor}"></div></div>
        ${alertaConf}
        <div style="margin-top:6px;font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">Valor total: ${g.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        <div class="product-actions">
          <button class="btn btn-baixa-rapida" onclick="abrirModalBaixa(${ci})" ${saldo <= 0 ? 'disabled title="Sem saldo"' : ''}>▼ Baixa</button>
          <button class="btn btn-mover-produto" onclick="abrirModalMover(${ci})" ${saldo <= 0 ? 'disabled title="Sem saldo"' : ''}>↔ Mover</button>
          <button class="btn btn-config-alerta" onclick="abrirModalConfigAlerta(${ci})" title="Configurar alerta de estoque">⚙</button>
        </div>
      </div>`;
    }).join('');
}

// ========== DELETE E MODAL ==========
window.confirmDelete = function(id) {
    pendingDelete = id;
    const title = document.getElementById('modalTitle');
    const text = document.getElementById('modalText');
    const group = document.getElementById('deleteReasonGroup');
    const reason = document.getElementById('deleteReason');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    
    if(title) title.textContent = 'Excluir Registro';
    if(text) text.textContent = 'Tem certeza que deseja excluir este lançamento? O registro será ocultado mas mantido no histórico de exportação.';
    if(group) group.style.display = 'block';
    if(reason) reason.value = '';
    
    if(confirmBtn){
        confirmBtn.onclick = () => {
            const motivo = reason.value.trim();
            if (!motivo) {
                showToast('Informe o motivo da exclusão!', 'error');
                return;
            }
            deleteRegistro(pendingDelete, motivo);
            closeModal();
        };
    }
    document.getElementById('modalOverlay')?.classList.add('open');
}

function deleteRegistro(id, motivo) {
    const reg = registros.find(r => String(r.id) === String(id));
    if (reg) {
        reg.deletado = true;
        reg.motivoExclusao = motivo;
        reg.dataExclusao = new Date().toISOString();
        enviarParaGAS(reg, 'excluir');
    }
    saveCache(registros);
    renderAll();
    renderHistorico();
    showToast('Registro excluído. Sincronizando...', 'info');
}

window.confirmClear = function() {
    const title = document.getElementById('modalTitle');
    const text = document.getElementById('modalText');
    const group = document.getElementById('deleteReasonGroup');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    
    if(title) title.textContent = '⚠ Limpar Cache';
    if(text) text.textContent = 'Isso irá apagar TODOS os dados do cache local. Esta ação é irreversível.';
    if(group) group.style.display = 'none';
    if(confirmBtn){
        confirmBtn.onclick = () => {
            registros = [];
            saveCache(registros);
            renderAll();
            renderHistorico();
            renderProdutos();
            closeModal();
            showToast('Cache limpo.', 'info');
        };
    }
    document.getElementById('modalOverlay')?.classList.add('open');
}

// ========== BAIXA RÁPIDA ==========
window.toggleMotivoPerdaDescarte = function() {
    const motivo = document.getElementById('selBaixaMotivo').value;
    const grupo = document.getElementById('grupoPerdaMotivo');
    if (grupo) grupo.style.display = (motivo === 'Perda' || motivo === 'Descarte') ? 'block' : 'none';
};

window.abrirModalBaixa = function(ci) {
    const p = _cardMap[ci]; if (!p) return;
    _acaoAtual = { tipo: 'baixa', ...p };
    document.getElementById('lblBaixaProduto').textContent = p.material + ' — ' + p.local;
    document.getElementById('lblBaixaSaldo').textContent = p.saldo + ' unid. disponíveis';
    const inpQtd = document.getElementById('inpBaixaQtd');
    inpQtd.value = ''; inpQtd.max = p.saldo;
    document.getElementById('selBaixaMotivo').value = 'Venda';
    const inpMotivo = document.getElementById('inpMotivoPerda');
    if (inpMotivo) inpMotivo.value = '';
    const grupoMotivo = document.getElementById('grupoPerdaMotivo');
    if (grupoMotivo) grupoMotivo.style.display = 'none';
    const inpQuem = document.getElementById('inpBaixaQuem');
    inpQuem.value = operadorAtual;
    document.getElementById('modalBaixaRapida').classList.add('open');
};

window.fecharModalBaixa = function() {
    document.getElementById('modalBaixaRapida').classList.remove('open');
    _acaoAtual = null;
};

window.confirmarBaixaRapida = async function() {
    if (!_acaoAtual || _acaoAtual.tipo !== 'baixa') return;
    const qtd = parseFloat(document.getElementById('inpBaixaQtd').value);
    const motivo = document.getElementById('selBaixaMotivo').value;
    const quem = document.getElementById('inpBaixaQuem').value.trim();
    const motivoDescricao = (document.getElementById('inpMotivoPerda')?.value || '').trim();
    if (!qtd || qtd <= 0) { showToast('Informe a quantidade!', 'error'); return; }
    if (qtd > _acaoAtual.saldo) { showToast('Saldo insuficiente! Disponível: ' + _acaoAtual.saldo, 'error'); return; }
    if (!quem) { showToast('Informe quem realizou!', 'error'); return; }
    if ((motivo === 'Perda' || motivo === 'Descarte') && !motivoDescricao) {
        showToast('Descreva o motivo da ' + motivo.toLowerCase() + '!', 'error'); return;
    }

    if (quem !== operadorAtual) { operadorAtual = quem; saveOperador(quem); }

    let obsTexto = 'Baixa rápida: ' + motivo;
    if ((motivo === 'Perda' || motivo === 'Descarte') && motivoDescricao) {
        obsTexto += ' — ' + motivoDescricao;
    }

    const reg = {
        id: Date.now() + Math.random(),
        tipo: 'Saída',
        data: new Date().toISOString(),
        quem, fornecedor: '', quemRecebeu: '', quemCadastrou: quem,
        local: _acaoAtual.local,
        material: _acaoAtual.material,
        tipoMaterial: _acaoAtual.tipoMaterial,
        qtd, qtd_pacotes: 0, unid_pacote: 0, vunit: 0, vtotal: 0,
        obs: obsTexto,
        criadoEm: new Date().toISOString()
    };
    registros.push(reg); saveCache(registros);
    fecharModalBaixa();
    renderAll();
    showToast('Baixa registrada!', 'success');
    enviarParaGAS(reg, 'salvar');
};

// ========== MOVER PRODUTO ==========
window.abrirModalMover = function(ci) {
    const p = _cardMap[ci]; if (!p) return;
    _acaoAtual = { tipo: 'mover', ...p };
    document.getElementById('lblMoverProduto').textContent = p.material + ' — ' + p.local;
    document.getElementById('lblMoverSaldo').textContent = p.saldo + ' unid. disponíveis';
    const inpQtd = document.getElementById('inpMoverQtd');
    inpQtd.value = ''; inpQtd.max = p.saldo;
    document.getElementById('inpMoverDestino').value = '';
    document.getElementById('inpMoverQuem').value = operadorAtual;
    // Preenche datalist de destinos (todos os locais exceto o atual)
    const locais = [...new Set(registros.filter(r => !r.deletado).map(r => r.local))]
        .filter(l => l !== p.local).sort();
    const dl = document.getElementById('listMoverDestino');
    if (dl) dl.innerHTML = locais.map(l => `<option value="${escHtml(l)}">`).join('');
    document.getElementById('modalMoverProduto').classList.add('open');
};

window.fecharModalMover = function() {
    document.getElementById('modalMoverProduto').classList.remove('open');
    _acaoAtual = null;
};

window.confirmarMoverProduto = async function() {
    if (!_acaoAtual || _acaoAtual.tipo !== 'mover') return;
    const qtd = parseFloat(document.getElementById('inpMoverQtd').value);
    const destino = document.getElementById('inpMoverDestino').value.trim();
    const quem = document.getElementById('inpMoverQuem').value.trim();
    if (!qtd || qtd <= 0) { showToast('Informe a quantidade!', 'error'); return; }
    if (qtd > _acaoAtual.saldo) { showToast('Saldo insuficiente! Disponível: ' + _acaoAtual.saldo, 'error'); return; }
    if (!destino) { showToast('Informe o local de destino!', 'error'); return; }
    if (destino === _acaoAtual.local) { showToast('Destino igual à origem!', 'error'); return; }
    if (!quem) { showToast('Informe quem realizou!', 'error'); return; }

    if (quem !== operadorAtual) { operadorAtual = quem; saveOperador(quem); }
    const now = new Date().toISOString();
    const base = { quem, fornecedor: '', quemRecebeu: '', quemCadastrou: quem, material: _acaoAtual.material, tipoMaterial: _acaoAtual.tipoMaterial, qtd, qtd_pacotes: 0, unid_pacote: 0, vunit: 0, vtotal: 0, criadoEm: now, data: now };

    const saida = { ...base, id: Date.now() + Math.random(), tipo: 'Saída', local: _acaoAtual.local, obs: 'Movimentação → ' + destino };
    const entrada = { ...base, id: Date.now() + Math.random() + 0.1, tipo: 'Entrada', local: destino, obs: 'Movimentação ← ' + _acaoAtual.local };

    registros.push(saida, entrada); saveCache(registros);
    fecharModalMover();
    renderAll();
    showToast('Movimentação registrada!', 'success');
    enviarParaGAS(saida, 'salvar');
    enviarParaGAS(entrada, 'salvar');
};

// ========== CONFIG ALERTA ==========
window.abrirModalConfigAlerta = function(ci) {
    const p = _cardMap[ci]; if (!p) return;
    _acaoAtual = { tipo: 'config', ...p };
    const aKey = p.material + '|||' + p.local;
    const al = alertas[aKey] || { medio: 0, minimo: 0 };
    document.getElementById('lblConfigProduto').textContent = p.material + ' — ' + p.local;
    document.getElementById('inpEstoqueMedio').value = al.medio || '';
    document.getElementById('inpEstoqueMinimo').value = al.minimo || '';
    document.getElementById('modalConfigAlerta').classList.add('open');
};

window.fecharModalConfigAlerta = function() {
    document.getElementById('modalConfigAlerta').classList.remove('open');
    _acaoAtual = null;
};

window.salvarConfigAlerta = async function() {
    if (!_acaoAtual || _acaoAtual.tipo !== 'config') return;
    const medio = parseFloat(document.getElementById('inpEstoqueMedio').value) || 0;
    const minimo = parseFloat(document.getElementById('inpEstoqueMinimo').value) || 0;
    if (medio > 0 && minimo > 0 && minimo >= medio) { showToast('Mínimo deve ser menor que médio!', 'error'); return; }
    const aKey = _acaoAtual.material + '|||' + _acaoAtual.local;
    alertas[aKey] = { medio, minimo };
    saveAlertas(alertas);
    // Salvar no backend também
    await salvarAlertaAPI(_acaoAtual.material, _acaoAtual.local, medio, minimo);
    fecharModalConfigAlerta();
    renderAll();
    showToast('Alerta configurado!', 'success');
};

// Iniciar apenas tudo carregou
window.addEventListener('DOMContentLoaded', init);
