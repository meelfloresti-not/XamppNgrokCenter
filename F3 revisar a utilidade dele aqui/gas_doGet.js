// =============================================
// doGet — Dashboard de Métricas (F3 + FFQP)
// Cole este código no Google Apps Script do F3
// Usado pelo dashboard.html E pelo GAS da Frota (buscar coroas_retirar)
// =============================================

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var f3Sheet = ss.getSheetByName('F3');
    var ffqpSheet = ss.getSheetByName('FFQP');

    var f3Data = f3Sheet ? lerAbaF3(f3Sheet) : [];
    var ffqpData = ffqpSheet ? lerAbaComHeaders(ffqpSheet) : [];

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', F3: f3Data, FFQP: ffqpData }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Lê todos os dados da aba usando a linha 1 como headers
function lerAbaComHeaders(sheet) {
  var dados = sheet.getDataRange().getValues();
  if (dados.length < 2) return [];

  // Linha 0 = headers
  var headers = dados[0].map(function (h) {
    return normalizarHeader(String(h));
  });

  var resultado = [];
  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      if (headers[j] && headers[j] !== '') {
        // ✅ Serializa Date objects como 'yyyy-MM-dd' para garantir compatibilidade
        obj[headers[j]] = (linha[j] instanceof Date) ? fmtDateGAS(linha[j]) : (linha[j] !== undefined ? linha[j] : '');
      }
    }
    // Só inclui linhas que tenham data preenchida
    if (obj.data) {
      resultado.push(obj);
    }
  }
  return resultado;
}

// Parser especializado para a aba F3, que corrige headers ambíguos por posição de coluna.
// Layout esperado (baseado na planilha exportada):
//   Col 0  = data_sistema,  Col 1 = data,  Col 4 = velorios,  Col 8 = total_compras
//   Col 42 = debito_diversos,  Col 43 = credito_diversos,  Col 44 = pix_diversos
//   Col 45 = dinheiro_diversos
//   Col 46 = debito_coroas,    Col 47 = credito_coroas,    Col 48 = pix_coroas
//   Col 49 = dinheiro_coroas
//   Col 50 = debito_cafe,      Col 51 = credito_cafe,      Col 52 = pix_cafe
//   Col 53 = dinheiro_cafe
//   Col 54 = link_quantidade,  Col 55 = link_valor
function lerAbaF3(sheet) {
  var dados = sheet.getDataRange().getValues();
  if (dados.length < 2) return [];

  // Mapeamento por posição para campos financeiros do F3
  var MAP_POSICAO_F3 = {
    42: 'debito_diversos',
    43: 'credito_diversos',
    44: 'pix_diversos',
    45: 'dinheiro_diversos',
    46: 'debito_coroas',
    47: 'credito_coroas',
    48: 'pix_coroas',
    49: 'dinheiro_coroas',
    50: 'debito_cafe',
    51: 'credito_cafe',
    52: 'pix_cafe',
    53: 'dinheiro_cafe',
    54: 'link_quantidade',
    55: 'link_valor'
  };

  // Normaliza os headers para os demais campos
  var headers = dados[0].map(function (h) {
    return normalizarHeader(String(h));
  });

  var resultado = [];
  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    var obj = {};

    for (var j = 0; j < headers.length; j++) {
      // Campos financeiros: usa mapa de posição para garantir precisão
      if (MAP_POSICAO_F3.hasOwnProperty(j)) {
        obj[MAP_POSICAO_F3[j]] = linha[j] !== undefined ? linha[j] : '';
      } else if (headers[j] && headers[j] !== '') {
        // ✅ Serializa Date objects como 'yyyy-MM-dd' para garantir compatibilidade
        obj[headers[j]] = (linha[j] instanceof Date) ? fmtDateGAS(linha[j]) : (linha[j] !== undefined ? linha[j] : '');
      }
    }

    if (obj.data) {
      resultado.push(obj);
    }
  }
  return resultado;
}

// ✅ Serializa Date object para string 'yyyy-MM-dd' no fuso do script
// Garante que o campo 'data' chegue como string legível ao consumidor (Frota GAS, dashboard)
function fmtDateGAS(val) {
  if (!val || !(val instanceof Date)) return val || '';
  return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// Converte o texto do header da planilha para o nome de campo que o dashboard espera
function normalizarHeader(raw) {
  var h = raw.trim().toLowerCase();
  // Remove dois-pontos e interrogações no final
  h = h.replace(/[:?]+$/g, '').trim();

  // === MAPA DE OVERRIDES ===
  // Se o header da sua planilha não bate com nenhum desses,
  // adicione uma nova linha: 'texto do header': 'nome_do_campo'
  var MAPA = {
    // GERAIS
    'data do sistema': 'data_sistema',
    'total p/compras': 'total_compras',
    'total de pessoas que comprou': 'total_compras',
    'velórios': 'velorios',
    'quantidade de velórios': 'velorios',
    'sepult. direto': 'sepultamento_direto',
    'sepultamento direto': 'sepultamento_direto',

    // FINANCEIRO UNIFICADO (FFQP)
    'total débito': 'total_debito',
    'total em débito': 'total_debito',
    'total crédito': 'total_credito',
    'total em crédito': 'total_credito',
    'total pix em loja': 'total_pix_loja',
    'total pix loja': 'total_pix_loja',
    'pix loja': 'total_pix_loja',
    'total pix em conta': 'total_pix_conta',
    'total pix conta': 'total_pix_conta',
    'pix conta': 'total_pix_conta',
    'total em dinheiro': 'total_dinheiro',
    'total dinheiro': 'total_dinheiro',
    'dinheiro': 'total_dinheiro',

    // F3 - MAQUININHA DIVERSOS
    'total débito diversos': 'debito_diversos',
    'débito diversos': 'debito_diversos',
    'total crédito diversos': 'credito_diversos',
    'crédito diversos': 'credito_diversos',
    'total pix diversos': 'pix_diversos',
    'pix diversos': 'pix_diversos',
    'total dinheiro diversos': 'dinheiro_diversos',
    'dinheiro diversos': 'dinheiro_diversos',
    // variantes com "maquinhina" no nome (como na planilha F3)
    'total débito maquinhina diversos': 'debito_diversos',
    'total debito maquinhina diversos': 'debito_diversos',
    'total crédito maquinhina diversos': 'credito_diversos',
    'total credito maquinhina diversos': 'credito_diversos',
    'total pix maquinhina diversos': 'pix_diversos',
    'dinheiro maquinhina diversos': 'dinheiro_diversos',

    // F3 - MAQUININHA COROAS
    'total débito coroas': 'debito_coroas',
    'débito coroas': 'debito_coroas',
    'total crédito coroas': 'credito_coroas',
    'crédito coroas': 'credito_coroas',
    'total pix coroas': 'pix_coroas',
    'pix coroas': 'pix_coroas',
    'total dinheiro coroas': 'dinheiro_coroas',
    'dinheiro coroas': 'dinheiro_coroas',
    // variantes com "maquinhina" no nome (como na planilha F3)
    'total débito maquinhina coroas': 'debito_coroas',
    'total debito maquinhina coroas': 'debito_coroas',
    'total crédito maquinhina coroas': 'credito_coroas',
    'total credito maquinhina coroas': 'credito_coroas',
    'total pix maquinhina coroas': 'pix_coroas',
    'dinheiro maquinhina coroas': 'dinheiro_coroas',

    // F3 - MAQUININHA CAFÉ
    'total débito café': 'debito_cafe',
    'débito café': 'debito_cafe',
    'debito café': 'debito_cafe',
    'debito cafe': 'debito_cafe',
    'total crédito café': 'credito_cafe',
    'crédito café': 'credito_cafe',
    'credito café': 'credito_cafe',
    'credito cafe': 'credito_cafe',
    'total pix café': 'pix_cafe',
    'pix café': 'pix_cafe',
    'total pix cafe': 'pix_cafe',
    // ATENÇÃO: header "total pix" genérico na seção café deve mapear para pix_cafe
    // Para evitar ambiguidade, o GAS precisa detectar contexto; aqui cobrimos a slug
    'total dinheiro café': 'dinheiro_cafe',
    'dinheiro café': 'dinheiro_cafe',
    'dinheiro cafe': 'dinheiro_cafe',

    // F3 - LINK
    'quantidade de pagamento por link': 'link_quantidade',
    'valor de pagamento por link': 'link_valor',

    // FFQP - COROAS (mesma estrutura do F3)
    'coroas iniciou': 'coroas_iniciou',
    'coroas reposição': 'coroas_reposicao',
    'coroas reposicao': 'coroas_reposicao',
    'coroas vendidas': 'coroas_vendidas',
    'coroas retirar': 'coroas_retirar',
    'coroas descartadas': 'coroas_descartadas',
    'coroas saiu p/ consolare': 'coroas_saiu_consolare',
    'saiu p/ consolare': 'coroas_saiu_consolare',
    'coroas saiu p/ anjo luz': 'coroas_saiu_anjo_luz',
    'saiu p/ anjo luz': 'coroas_saiu_anjo_luz',

    // FFQP - VASOS
    'vasos vendidos na loja': 'vasos_vendidos_loja',
    'vasos brancos iniciou': 'vasos_brancos_iniciou',
    'vasos coloridos iniciou': 'vasos_coloridos_iniciou',
    'vasos brancos finalizou': 'vasos_brancos_finalizou',
    'vasos coloridos finalizou': 'vasos_coloridos_finalizou',
    'vasos finalizou (total)': 'vasos_finalizou_total',
    'descarte vasos (und)': 'descarte_vasos',
    'quais cores (descarte)': 'descarte_vasos_cores',

    // FFQP - ROSAS
    'rosas vendidas na loja': 'rosas_vendidas_loja',
    'pacotes brancas iniciou': 'rosas_brancas_iniciou',
    'pacotes brancas finalizou': 'rosas_brancas_finalizou',
    'pacotes amarelas iniciou': 'rosas_amarelas_iniciou',
    'pacotes amarelas finalizou': 'rosas_amarelas_finalizou',
    'pacotes vermelhas iniciou': 'rosas_vermelhas_iniciou',
    'pacotes vermelhas finalizou': 'rosas_vermelhas_finalizou',
    'pacotes cor-de-rosa iniciou': 'rosas_rosa_iniciou',
    'pacotes cor-de-rosa finalizou': 'rosas_rosa_finalizou',
    'pacotes champanhe iniciou': 'rosas_champanhe_iniciou',
    'pacotes champanhe finalizou': 'rosas_champanhe_finalizou',
    'pacotes mistas iniciou': 'rosas_mistas_iniciou',
    'pacotes mistas finalizou': 'rosas_mistas_finalizou',
    'rosas expositor (iniciou)': 'rosas_expositor_inicio',
    'rosas expositor (finalizou)': 'rosas_expositor_finalizou',
    'abertas p/ plantão noturno': 'rosas_abertas_plantao',
    'pacotes finalizou (total)': 'rosas_pacotes_finalizou_total',
    'descarte de rosas (und)': 'descarte_rosas',

    // FFQP - OUTRAS FLORES
    'crisântemos (vaso) iniciou': 'crisantemos_vaso_iniciou',
    'crisântemos (vaso) finalizou': 'crisantemos_vaso_finalizou',
    'crisântemos (maço) iniciou': 'crisantemos_maco_iniciou',
    'crisântemos (maço) finalizou': 'crisantemos_maco_finalizou',
    'tango iniciou': 'tango_iniciou',
    'tango finalizou': 'tango_finalizou',
    'gipsofila iniciou': 'gipsofila_iniciou',
    'gipsofila finalizou': 'gipsofila_finalizou',
    'lisiantus iniciou (caixa)': 'lisiantus_iniciou',
    'lisiantus finalizou (caixa)': 'lisiantus_finalizou',

    // FFQP - LOGÍSTICA
    'ornamentações / reposições (total)': 'total_reposicao',
    'recebeu material cooperflora': 'mat_cooperflora',
    'recebeu material sr. carlos': 'mat_carlos',
    'recebeu material guadalupe': 'mat_guadalupe',

    // PLAQUINHAS
    'plaquinhas descarte': 'plaquinhas_descarte',
    'plaquinhas vendidas': 'plaquinhas_vendidas',
    'velas vendidas': 'velas_vendidas',
    'velas descartadas': 'velas_descartadas',
    'terços vendidos': 'tercos_vendidos',
    'observações': 'observacoes',
    'foto das maquininhas': 'foto_maquininhas',

    // F3 - PRODUTOS
    'coroas vendidas': 'coroas_vendidas',
    'vasos vendidos': 'vasos_vendidos',
    'rosas vendidas': 'rosas_vendidas',
    'vasos dec. vendidos': 'vasos_dec_vendidos',
    'vasos decorados vendidos': 'vasos_dec_vendidos',
    'terços descartados': 'tercos_descartados',
    'cata-vento vendidos': 'catavento_vendidos',
    'cata-vento descartados': 'catavento_descartados',
    'lenço descartável vendidos': 'lenco_vendidos',
    'lenço descartável descartados': 'lenco_descartados'
  };

  if (MAPA[h]) return MAPA[h];

  // Auto-slugify: remove acentos, converte espaços em underscore
  var slug = h
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '_')  // caracteres especiais → _
    .replace(/^_+|_+$/g, '');     // remove _ no início/fim

  return slug;
}
