// =============================================
// Dashboard App - Lógica Analítica de Vendas
// =============================================

let allData = [];
let chartReceitaInstance = null;
let chartPagamentosInstance = null;

Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Inter', sans-serif";

// =============================================
// HELPERS
// =============================================
function parseMoeda(val) {
    if (typeof val === 'number') return val;
    if (!val || val === '') return 0;
    // Trata formato brasileiro "1.234,56" -> 1234.56
    let s = String(val).trim();
    // Se tiver vírgula e ponto, assume formato BR (1.234,56)
    if (s.includes(',') && s.includes('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
    }
    // Se tiver apenas vírgula, troca por ponto (1234,56)
    else if (s.includes(',')) {
        s = s.replace(',', '.');
    }
    return parseFloat(s) || 0;
}

function parseIntSafe(val) {
    if (typeof val === 'number') return Math.round(val);
    return parseInt(val) || 0;
}

function formataRS(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatadorDataInput(d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

function pctBar(val, maxVal) {
    if (!maxVal || maxVal === 0) return '0%';
    return Math.min(100, Math.round((val / maxVal) * 100)) + '%';
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    // getScriptUrl is from api.js
    if (typeof getScriptUrl === 'function' && !getScriptUrl()) {
        alert("URL do Google Apps Script não encontrada.");
        toggleLoading(false);
        return;
    }

    const hoje = new Date();
    const inicioSem = new Date();
    inicioSem.setDate(hoje.getDate() - 7);

    document.getElementById('dataFim').value = formatadorDataInput(hoje);
    document.getElementById('dataInicio').value = formatadorDataInput(inicioSem);

    fetchData();
});

// =============================================
// FETCH DATA
// =============================================
async function fetchData() {
    toggleLoading(true, "Buscando dados nas planilhas...");
    try {
        // gasGet comes from api.js
        const result = await gasGet();

        if (result.status === "success") {
            montarBaseDeDados(result.F3, result.FFQP);
            aplicarFiltros();
        } else {
            console.error("Erro:", result.message);
            alert("Erro ao buscar dados: " + result.message);
        }
    } catch (err) {
        console.error("Erro fetch:", err);
        alert("Erro de comunicação com o Google Sheets.");
    } finally {
        toggleLoading(false);
    }
}

// =============================================
// PARSE & STORE DATA
// =============================================
function montarBaseDeDados(dadosF3 = [], dadosFFQP = []) {
    allData = [];

    dadosF3.forEach(row => {
        if (row.data) {
            row.loja = "F3";
            row.parsedDate = new Date(row.data);
            allData.push(parseRowF3(row));
        }
    });

    dadosFFQP.forEach(row => {
        if (row.data) {
            row.loja = "FFQP";
            row.parsedDate = new Date(row.data);
            allData.push(parseRowFFQP(row));
        }
    });

    allData.sort((a, b) => a.parsedDate - b.parsedDate);
}

// Parse F3
function parseRowF3(row) {
    let div_deb = parseMoeda(row.debito_diversos);
    let div_cred = parseMoeda(row.credito_diversos);
    let div_pix = parseMoeda(row.pix_diversos);
    let div_din = parseMoeda(row.dinheiro_diversos);

    let cor_deb = parseMoeda(row.debito_coroas);
    let cor_cred = parseMoeda(row.credito_coroas);
    let cor_pix = parseMoeda(row.pix_coroas);
    let cor_din = parseMoeda(row.dinheiro_coroas);

    let caf_deb = parseMoeda(row.debito_cafe);
    let caf_cred = parseMoeda(row.credito_cafe);
    let caf_pix = parseMoeda(row.pix_cafe);
    let caf_din = parseMoeda(row.dinheiro_cafe);

    const maqSum = div_deb + div_cred + div_pix + div_din +
        cor_deb + cor_cred + cor_pix + cor_din +
        caf_deb + caf_cred + caf_pix + caf_din;

    if (maqSum === 0) {
        div_deb = parseMoeda(row.total_debito);
        div_cred = parseMoeda(row.total_credito);
        div_pix = parseMoeda(row.total_pix_loja) + parseMoeda(row.total_pix_conta);
        div_din = parseMoeda(row.total_dinheiro);
    }

    const div_total = div_deb + div_cred + div_pix + div_din;
    const cor_total = cor_deb + cor_cred + cor_pix + cor_din;
    const caf_total = caf_deb + caf_cred + caf_pix + caf_din;

    const link_qtd = parseIntSafe(row.link_quantidade);
    const link_val = parseMoeda(row.link_valor);

    const fat_total = div_total + cor_total + caf_total + link_val;

    const total_debito = div_deb + cor_deb + caf_deb;
    const total_credito = div_cred + cor_cred + caf_cred;
    const total_pix = div_pix + cor_pix + caf_pix;
    const total_dinheiro = div_din + cor_din + caf_din;

    return {
        ...row,
        div_deb, div_cred, div_pix, div_din, div_total,
        cor_deb, cor_cred, cor_pix, cor_din, cor_total,
        caf_deb, caf_cred, caf_pix, caf_din, caf_total,
        link_qtd, link_val,
        total_debito, total_credito, total_pix, total_dinheiro,
        fat_total,
        velorios: parseIntSafe(row.velorios),
        total_compras: parseIntSafe(row.total_compras),
        coroas_vendidas: parseIntSafe(row.coroas_vendidas),
        vasos_vendidos: parseIntSafe(row.vasos_vendidos),
        vasos_dec_vendidos: parseIntSafe(row.vasos_dec_vendidos),
        rosas_vendidas: parseIntSafe(row.rosas_vendidas),
        velas_vendidas: parseIntSafe(row.velas_vendidas),
        plaquinhas_vendidas: parseIntSafe(row.plaquinhas_vendidas),
        tercos_vendidos: parseIntSafe(row.tercos_vendidos),
        catavento_vendidos: parseIntSafe(row.catavento_vendidos),
        lenco_vendidos: parseIntSafe(row.lenco_vendidos)
    };
}

// Parse FFQP
function parseRowFFQP(row) {
    const total_debito = parseMoeda(row.total_debito);
    const total_credito = parseMoeda(row.total_credito);
    const total_pix_loja = parseMoeda(row.total_pix_loja);
    const total_pix_conta = parseMoeda(row.total_pix_conta);
    const total_dinheiro = parseMoeda(row.total_dinheiro);
    const fat_total = total_debito + total_credito + total_pix_loja + total_pix_conta + total_dinheiro;

    const coroas_vendidas = parseIntSafe(row.coroas_vendidas);
    const vasos_vendidos = parseIntSafe(row.vasos_vendidos_loja) || parseIntSafe(row.vasos_vendidos);
    const rosas_vendidas = parseIntSafe(row.rosas_vendidas_loja) || parseIntSafe(row.rosas_vendidas);

    return {
        ...row,
        total_debito,
        total_credito,
        total_pix_loja,
        total_pix_conta,
        total_dinheiro,
        total_pix: total_pix_loja + total_pix_conta,
        fat_total,
        velorios: parseIntSafe(row.velorios),
        total_compras: parseIntSafe(row.total_compras),
        coroas_vendidas,
        vasos_vendidos,
        rosas_vendidas,
        velas_vendidas: parseIntSafe(row.velas_vendidas),
        plaquinhas_vendidas: parseIntSafe(row.plaquinhas_vendidas)
    };
}

// =============================================
// FILTROS & RENDER
// =============================================
// We attach aplicarFiltros to window since it's called by an onclick
window.aplicarFiltros = function () {
    const loja = document.getElementById('filtroLoja').value;
    const dataInicioStr = document.getElementById('dataInicio').value;
    const dataFimStr = document.getElementById('dataFim').value;

    const startMs = dataInicioStr ? new Date(dataInicioStr + 'T00:00:00').getTime() : 0;
    const endMs = dataFimStr ? new Date(dataFimStr + 'T23:59:59').getTime() : Infinity;

    const dadosPorData = allData.filter(d => {
        const t = d.parsedDate.getTime();
        return t >= startMs && t <= endMs;
    });

    const dadosF3 = dadosPorData.filter(d => d.loja === 'F3');
    const dadosFFQP = dadosPorData.filter(d => d.loja === 'FFQP');

    const diasF3 = new Set(dadosF3.map(d => d.parsedDate.toISOString().split('T')[0])).size || 1;
    const diasFFQP = new Set(dadosFFQP.map(d => d.parsedDate.toISOString().split('T')[0])).size || 1;

    const totF3 = calcularTotais(dadosF3, 'F3');
    const totFFQP = calcularTotais(dadosFFQP, 'FFQP');

    const showF3 = loja === 'ALL' || loja === 'F3';
    const showFFQP = loja === 'ALL' || loja === 'FFQP';
    const showComp = loja === 'ALL';

    document.getElementById('secaoF3').style.display = showF3 ? '' : 'none';
    document.getElementById('divider1').style.display = (showF3 && showFFQP) ? '' : 'none';
    document.getElementById('secaoFFQP').style.display = showFFQP ? '' : 'none';
    document.getElementById('divider2').style.display = showComp ? '' : 'none';
    document.getElementById('secaoComparativo').style.display = showComp ? '' : 'none';

    if (showF3) renderF3(totF3, diasF3);
    if (showFFQP) renderFFQP(totFFQP, diasFFQP);
    if (showComp) renderComparativo(totF3, totFFQP);

    atualizarGraficos(dadosF3, dadosFFQP, loja);
}

function calcularTotais(dados, tipo) {
    const t = {
        fat: 0, velorios: 0, compradores: 0,
        coroas: 0, vasos: 0, rosas: 0, velas: 0, plaquinhas: 0,
        total_debito: 0, total_credito: 0, total_pix: 0, total_dinheiro: 0
    };

    if (tipo === 'F3') {
        t.vasos_dec = 0; t.tercos = 0; t.catavento = 0; t.lencos = 0;
        t.div_deb = 0; t.div_cred = 0; t.div_pix = 0; t.div_din = 0; t.div_total = 0;
        t.cor_deb = 0; t.cor_cred = 0; t.cor_pix = 0; t.cor_din = 0; t.cor_total = 0;
        t.caf_deb = 0; t.caf_cred = 0; t.caf_pix = 0; t.caf_din = 0; t.caf_total = 0;
        t.link_qtd = 0; t.link_val = 0;
    }

    if (tipo === 'FFQP') {
        t.total_pix_loja = 0; t.total_pix_conta = 0;
    }

    dados.forEach(d => {
        t.fat += d.fat_total;
        t.velorios += d.velorios;
        t.compradores += d.total_compras;
        t.coroas += d.coroas_vendidas;
        t.vasos += d.vasos_vendidos;
        t.rosas += (d.rosas_vendidas || 0);
        t.velas += d.velas_vendidas;
        t.plaquinhas += d.plaquinhas_vendidas;

        if (tipo === 'F3') {
            t.vasos_dec += (d.vasos_dec_vendidos || 0);
            t.tercos += (d.tercos_vendidos || 0);
            t.catavento += (d.catavento_vendidos || 0);
            t.lencos += (d.lenco_vendidos || 0);
            t.div_deb += d.div_deb; t.div_cred += d.div_cred;
            t.div_pix += d.div_pix; t.div_din += d.div_din; t.div_total += d.div_total;
            t.cor_deb += d.cor_deb; t.cor_cred += d.cor_cred;
            t.cor_pix += d.cor_pix; t.cor_din += d.cor_din; t.cor_total += d.cor_total;
            t.caf_deb += d.caf_deb; t.caf_cred += d.caf_cred;
            t.caf_pix += d.caf_pix; t.caf_din += d.caf_din; t.caf_total += d.caf_total;
            t.link_qtd += d.link_qtd; t.link_val += d.link_val;
            t.total_debito += d.total_debito;
            t.total_credito += d.total_credito;
            t.total_pix += d.total_pix;
            t.total_dinheiro += d.total_dinheiro;
        }

        if (tipo === 'FFQP') {
            t.total_debito += d.total_debito;
            t.total_credito += d.total_credito;
            t.total_pix_loja += (d.total_pix_loja || 0);
            t.total_pix_conta += (d.total_pix_conta || 0);
            t.total_pix += (d.total_pix || 0);
            t.total_dinheiro += d.total_dinheiro;
        }
    });

    return t;
}

// =============================================
// RENDER FORMOSA (F3)
// =============================================
function renderF3(t, dias) {
    document.getElementById('f3-fat').textContent = formataRS(t.fat);
    document.getElementById('f3-fat-media').textContent = formataRS(t.fat / dias) + '/dia';
    document.getElementById('f3-velorios').textContent = t.velorios;
    document.getElementById('f3-ticket-velorio').textContent = formataRS(t.velorios > 0 ? t.fat / t.velorios : 0);
    document.getElementById('f3-compradores').textContent = t.compradores;
    document.getElementById('f3-ticket-pessoa').textContent = formataRS(t.compradores > 0 ? t.fat / t.compradores : 0);

    document.getElementById('f3-coroas').textContent = t.coroas;
    document.getElementById('f3-vasos').textContent = t.vasos;
    document.getElementById('f3-vasos-dec').textContent = t.vasos_dec;
    document.getElementById('f3-rosas').textContent = t.rosas;
    document.getElementById('f3-velas').textContent = t.velas;
    document.getElementById('f3-plaquinhas').textContent = t.plaquinhas;
    document.getElementById('f3-tercos').textContent = t.tercos;
    document.getElementById('f3-catavento').textContent = t.catavento;
    document.getElementById('f3-lencos').textContent = t.lencos;

    document.getElementById('f3-div-deb').textContent = formataRS(t.div_deb);
    document.getElementById('f3-div-cred').textContent = formataRS(t.div_cred);
    document.getElementById('f3-div-pix').textContent = formataRS(t.div_pix);
    document.getElementById('f3-div-din').textContent = formataRS(t.div_din);
    document.getElementById('f3-div-total').textContent = 'Subtotal: ' + formataRS(t.div_total);

    document.getElementById('f3-cor-deb').textContent = formataRS(t.cor_deb);
    document.getElementById('f3-cor-cred').textContent = formataRS(t.cor_cred);
    document.getElementById('f3-cor-pix').textContent = formataRS(t.cor_pix);
    document.getElementById('f3-cor-din').textContent = formataRS(t.cor_din);
    document.getElementById('f3-cor-total').textContent = 'Subtotal: ' + formataRS(t.cor_total);

    document.getElementById('f3-caf-deb').textContent = formataRS(t.caf_deb);
    document.getElementById('f3-caf-cred').textContent = formataRS(t.caf_cred);
    document.getElementById('f3-caf-pix').textContent = formataRS(t.caf_pix);
    document.getElementById('f3-caf-din').textContent = formataRS(t.caf_din);
    document.getElementById('f3-caf-total').textContent = 'Subtotal: ' + formataRS(t.caf_total);

    document.getElementById('f3-link-qtd').textContent = t.link_qtd;
    document.getElementById('f3-link-val').textContent = formataRS(t.link_val);
}

// =============================================
// RENDER QUARTA PARADA (FFQP)
// =============================================
function renderFFQP(t, dias) {
    document.getElementById('ffqp-fat').textContent = formataRS(t.fat);
    document.getElementById('ffqp-fat-media').textContent = formataRS(t.fat / dias) + '/dia';
    document.getElementById('ffqp-velorios').textContent = t.velorios;
    document.getElementById('ffqp-ticket-velorio').textContent = formataRS(t.velorios > 0 ? t.fat / t.velorios : 0);
    document.getElementById('ffqp-compradores').textContent = t.compradores;
    document.getElementById('ffqp-ticket-pessoa').textContent = formataRS(t.compradores > 0 ? t.fat / t.compradores : 0);

    document.getElementById('ffqp-coroas').textContent = t.coroas;
    document.getElementById('ffqp-vasos').textContent = t.vasos;
    document.getElementById('ffqp-rosas').textContent = t.rosas;
    document.getElementById('ffqp-velas').textContent = t.velas;
    document.getElementById('ffqp-plaquinhas').textContent = t.plaquinhas;

    document.getElementById('ffqp-debito').textContent = formataRS(t.total_debito);
    document.getElementById('ffqp-credito').textContent = formataRS(t.total_credito);
    document.getElementById('ffqp-pix-loja').textContent = formataRS(t.total_pix_loja);
    document.getElementById('ffqp-pix-conta').textContent = formataRS(t.total_pix_conta);
    document.getElementById('ffqp-dinheiro').textContent = formataRS(t.total_dinheiro);
}

// =============================================
// RENDER COMPARATIVO
// =============================================
function renderComparativo(f3, ffqp) {
    function setBar(metric, vF3, vFFQP, formatter) {
        const max = Math.max(vF3, vFFQP) || 1;
        document.getElementById(`comp-${metric}-f3`).textContent = formatter(vF3);
        document.getElementById(`comp-${metric}-ffqp`).textContent = formatter(vFFQP);
        document.getElementById(`comp-${metric}-f3-bar`).style.width = pctBar(vF3, max);
        document.getElementById(`comp-${metric}-ffqp-bar`).style.width = pctBar(vFFQP, max);
    }

    setBar('fat', f3.fat, ffqp.fat, formataRS);
    setBar('vel', f3.velorios, ffqp.velorios, v => String(v));
    setBar('tick',
        f3.velorios > 0 ? f3.fat / f3.velorios : 0,
        ffqp.velorios > 0 ? ffqp.fat / ffqp.velorios : 0,
        formataRS
    );
    setBar('comp', f3.compradores, ffqp.compradores, v => String(v));
    setBar('velas', f3.velas, ffqp.velas, v => String(v));
    setBar('plaq', f3.plaquinhas, ffqp.plaquinhas, v => String(v));
}

// =============================================
// GRÁFICOS
// =============================================
function atualizarGraficos(dadosF3, dadosFFQP, filtroLoja) {
    const fatPorDiaF3 = {};
    const fatPorDiaFFQP = {};

    dadosF3.forEach(d => {
        let k = d.parsedDate.toISOString().split('T')[0];
        fatPorDiaF3[k] = (fatPorDiaF3[k] || 0) + d.fat_total;
    });

    dadosFFQP.forEach(d => {
        let k = d.parsedDate.toISOString().split('T')[0];
        fatPorDiaFFQP[k] = (fatPorDiaFFQP[k] || 0) + d.fat_total;
    });

    const allDates = [...new Set([...Object.keys(fatPorDiaF3), ...Object.keys(fatPorDiaFFQP)])].sort();
    const formataBr = (s) => { let p = s.split('-'); return `${p[2]}/${p[1]}`; };

    if (chartReceitaInstance) chartReceitaInstance.destroy();
    const ctxReceita = document.getElementById('chartReceita').getContext('2d');

    const datasets = [];

    if (filtroLoja === 'ALL' || filtroLoja === 'F3') {
        let gradF3 = ctxReceita.createLinearGradient(0, 0, 0, 300);
        gradF3.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
        gradF3.addColorStop(1, 'rgba(6, 182, 212, 0)');
        datasets.push({
            label: 'Formosa (F3)',
            data: allDates.map(d => fatPorDiaF3[d] || 0),
            borderColor: '#06b6d4',
            backgroundColor: gradF3,
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#06b6d4',
            pointRadius: 4
        });
    }

    if (filtroLoja === 'ALL' || filtroLoja === 'FFQP') {
        let gradFFQP = ctxReceita.createLinearGradient(0, 0, 0, 300);
        gradFFQP.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        gradFFQP.addColorStop(1, 'rgba(168, 85, 247, 0)');
        datasets.push({
            label: 'Quarta Parada (FFQP)',
            data: allDates.map(d => fatPorDiaFFQP[d] || 0),
            borderColor: '#a855f7',
            backgroundColor: gradFFQP,
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#a855f7',
            pointRadius: 4
        });
    }

    chartReceitaInstance = new Chart(ctxReceita, {
        type: 'line',
        data: {
            labels: allDates.map(formataBr),
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: filtroLoja === 'ALL',
                    labels: { padding: 15, font: { family: 'Inter' } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { callback: v => 'R$ ' + v }
                },
                x: { grid: { display: false } }
            }
        }
    });

    let totPag = { deb: 0, cred: 0, pix: 0, din: 0, link: 0 };

    const todosParaPizza = [...(filtroLoja === 'ALL' || filtroLoja === 'F3' ? dadosF3 : []),
    ...(filtroLoja === 'ALL' || filtroLoja === 'FFQP' ? dadosFFQP : [])];

    todosParaPizza.forEach(d => {
        totPag.deb += (d.total_debito || 0);
        totPag.cred += (d.total_credito || 0);
        totPag.pix += (d.total_pix || 0);
        totPag.din += (d.total_dinheiro || 0);
        if (d.loja === 'F3') totPag.link += (d.link_val || 0);
    });

    if (chartPagamentosInstance) chartPagamentosInstance.destroy();
    const ctxPag = document.getElementById('chartPagamentos').getContext('2d');

    const pagLabels = ['Débito', 'Crédito', 'PIX', 'Dinheiro'];
    const pagData = [totPag.deb, totPag.cred, totPag.pix, totPag.din];
    const pagColors = ['#3b82f6', '#8b5cf6', '#10b981', '#eab308'];

    if (totPag.link > 0) {
        pagLabels.push('Pgto Link');
        pagData.push(totPag.link);
        pagColors.push('#f472b6');
    }

    chartPagamentosInstance = new Chart(ctxPag, {
        type: 'doughnut',
        data: {
            labels: pagLabels,
            datasets: [{
                data: pagData,
                backgroundColor: pagColors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { padding: 12, font: { family: 'Inter', size: 12 } }
                }
            }
        }
    });
}
