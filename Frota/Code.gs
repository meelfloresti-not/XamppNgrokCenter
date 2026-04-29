// =====================================================
// ENDPOINTS PARA CLOUDFLARE (doGet / doPost)
// =====================================================

// URL pública do GAS do F3 (planilha de produção Formosa/Quarta Parada)
var F3_GAS_URL = 'https://script.google.com/macros/s/AKfycbwP9CkJY4V4f7wRZqJxz35AsEuxMk-nFnr1SmhvG89VV0x--DPmuwQgAJJPQKAery6d/exec';

function doGet(e) {
  try {
    var action = e.parameter.action;
    if (action === 'buscarRascunhos') {
      return resp({ status: 'sucesso', dados: buscarRascunhos() });
    }
    if (action === 'buscarRelatorios') {
      return resp({ status: 'sucesso', dados: buscarOSFinalizadas(e.parameter.dataInicio, e.parameter.dataFim) });
    }
    if (action === 'debugRelatorio') {
      return resp({ status: 'sucesso', dados: debugRelatorio() });
    }
    // ✅ NOVO: endpoint único de contadores para o header
    if (action === 'obterContadores') {
      return resp({ status: 'sucesso', dados: obterContadores() });
    }
    if (action === 'buscarOcorrencias') {
      return resp({ status: 'sucesso', dados: buscarOcorrencias() });
    }
    return resp({ status: 'erro', mensagem: 'Ação GET desconhecida: ' + action });
  } catch (err) {
    return resp({ status: 'erro', mensagem: err.message });
  }
}

function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    if (p.action === 'salvarPedido') {
      return resp({ status: 'sucesso', dados: salvarPedido(p.dados) });
    }
    if (p.action === 'despachar') {
      return resp({ status: 'sucesso', dados: despachar(p.dados) });
    }
    if (p.action === 'finalizarEntrega') {
      return resp({ status: 'sucesso', dados: finalizarEntrega(p.dados) });
    }
    if (p.action === 'registrarRetornoViagem') {
      return resp({ status: 'sucesso', dados: registrarRetornoViagem(p.dados) });
    }
    if (p.action === 'resolverOcorrenciaCoroas') {
      return resp({ status: 'sucesso', dados: resolverOcorrenciaCoroas(p.dados) });
    }
    throw new Error('Ação POST desconhecida.');
  } catch (err) {
    return resp({ status: 'erro', mensagem: err.message });
  }
}

function resp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

// ✅ Aumentado para 24 — coluna W (índice 23) = Data_Finalizacao
var NUM_COLS = 24;

function getSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dados_OS');
  if (!sheet) throw new Error("Aba 'Dados_OS' não encontrada. Execute prepararAbaDadosOS().");
  return sheet;
}

function gerarProximoID(sheet) {
  var ano = new Date().getFullYear();
  var prefix = ano + '-';
  var ultLinha = sheet.getLastRow();
  if (ultLinha <= 1) return prefix + '001';

  var ids = sheet.getRange(2, 1, ultLinha - 1, 1).getValues();
  var max = 0;
  for (var i = 0; i < ids.length; i++) {
    var id = String(ids[i][0]);
    if (id.indexOf(prefix) === 0) {
      var n = parseInt(id.substring(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return prefix + (max + 1).toString().padStart(3, '0');
}

function gerarViagemID(sheet) {
  var ano = new Date().getFullYear();
  var prefix = 'V-' + ano + '-';
  var ultLinha = sheet.getLastRow();
  if (ultLinha <= 1) return prefix + '001';

  var col21 = sheet.getRange(2, 21, ultLinha - 1, 1).getValues();
  var max = 0;
  for (var i = 0; i < col21.length; i++) {
    var v = String(col21[i][0]);
    if (v.indexOf(prefix) === 0) {
      var n = parseInt(v.substring(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return prefix + (max + 1).toString().padStart(3, '0');
}

function fmtDate(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return val || '';
}

// Retorna hoje como string yyyy-MM-dd no fuso do script
function hojeStr() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function parseFlexDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  var s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    var d = new Date(s.substring(0, 10) + 'T12:00:00');
    return isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    var parts = s.split('/');
    var d2 = new Date(parts[2] + '-' + parts[1] + '-' + parts[0] + 'T12:00:00');
    return isNaN(d2.getTime()) ? null : d2;
  }
  var d3 = new Date(s);
  return isNaN(d3.getTime()) ? null : d3;
}

// =====================================================
// ✅ NOVO: OBTER CONTADORES (para o header do app)
// Toda a lógica fica no servidor — sem dependência de
// múltiplas chamadas ou campos ausentes no frontend.
// =====================================================

function obterContadores() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var hoje = hojeStr();

  var stats = {
    pedidosHoje:        0,
    aguardandoDespacho: 0,
    finalizadosHoje:    0,
    emRota:             0,
    ocorrencias:        0
  };

  for (var i = 1; i < data.length; i++) {
    var dataManual      = fmtDate(data[i][1]);
    var status          = String(data[i][3]).trim();
    var dataFinalizacao = fmtDate(data[i][23]);

    if (dataManual === hoje) stats.pedidosHoje++;
    if (status === 'Rascunho') stats.aguardandoDespacho++;
    if (status === 'Finalizado' && dataFinalizacao === hoje) stats.finalizadosHoje++;
    if (status === 'Em Rota' || status === 'Retornando') stats.emRota++;
  }

  // ✅ Conta ocorrências: atrasos (Consolare) + coroas a retirar hoje
  try {
    var oc = buscarOcorrencias();
    stats.ocorrencias = oc.length;
  } catch(e) {
    stats.ocorrencias = 0;
  }

  return stats;
}

// =====================================================
// BUSCAR OCORRÊNCIAS (atrasos Consolare + coroas a retirar)
// =====================================================

function buscarOcorrencias() {
  var lista = [];
  var hoje = hojeStr();

  // ── Parte 1: Ocorrências de atraso (Consolare) ────────────────────────────
  try {
    var sheet = getSheet();
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var r = data[i];
      var status = String(r[3]).trim();
      var cliente = String(r[5] || '').trim();
      var dataEntregaRaw = r[8] ? String(r[8]).trim() : '';
      var horaEntrega = '';
      var dataEntregarStr = '';

      // data_entrega pode ser "yyyy-MM-dd HH:mm" ou só "yyyy-MM-dd"
      if (dataEntregaRaw) {
        var parts = dataEntregaRaw.split(' ');
        dataEntregarStr = parts[0];
        horaEntrega = parts[1] || '';
      }

      // Ocorrência = pedido Em Rota/Retornando do cliente Consolare cuja
      // data_entrega já passou (antes de hoje) e ainda não está finalizado
      if ((status === 'Em Rota' || status === 'Retornando') &&
           cliente === 'Consolare' &&
           dataEntregarStr && dataEntregarStr < hoje) {
        lista.push({
          tipo:              'atraso',
          id:                String(r[0]),
          pedido:            r[4] || '',
          cliente:           r[5] || '',
          falecido:          r[6] || '',
          data_entrega:      dataEntregarStr,
          hora_prazo:        horaEntrega,
          data_entrega_real: fmtDate(r[23]) || '',
          hora_entrega:      '',
          motorista:         r[11] || ''
        });
      }
    }
  } catch(e) {
    // falha silenciosa para não quebrar a lista de coroas
  }

  // ── Parte 2: Coroas a retirar hoje (F3 + FFQP) ───────────────────────────
  try {
    var response = UrlFetchApp.fetch(F3_GAS_URL, { muteHttpExceptions: true });
    var json = JSON.parse(response.getContentText());

    if (json.status === 'success') {
      var lojas = [
        { nome: 'Formosa',       chave: 'F3',   dados: json.F3   || [] },
        { nome: 'Quarta Parada', chave: 'FFQP', dados: json.FFQP || [] }
      ];

      lojas.forEach(function(loja) {
        // Procura a linha cujo campo 'data' bate com hoje
        for (var j = 0; j < loja.dados.length; j++) {
          var row = loja.dados[j];
          var rowDate = '';

          // O GAS do F3 retorna 'data' como Date object serializado ou string
          if (row.data instanceof Date) {
            rowDate = Utilities.formatDate(row.data, Session.getScriptTimeZone(), 'yyyy-MM-dd');
          } else if (row.data) {
            var raw = String(row.data).trim();
            // Tenta formato dd/MM/yyyy
            var m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
            if (m) rowDate = m[3] + '-' + m[2] + '-' + m[1];
            // Tenta yyyy-MM-dd
            else if (/^\d{4}-\d{2}-\d{2}/.test(raw)) rowDate = raw.substring(0, 10);
          }

          if (rowDate !== hoje) continue;

          var qtd = parseFloat(String(row.coroas_retirar || '0').replace(',', '.'));
          if (isNaN(qtd) || qtd <= 0) continue;

          // Verifica se já foi dado baixa hoje para esta loja
          if (coreasHojeJaResolvida(hoje, loja.chave)) continue;

          lista.push({
            tipo:       'coroas',
            id:         'COROA-' + loja.chave + '-' + hoje,
            loja:       loja.nome,
            loja_chave: loja.chave,
            quantidade: qtd,
            data:       hoje
          });

          break; // só uma linha por aba por dia
        }
      });
    }
  } catch(e) {
    // GAS do F3 inacessível — ignora silenciosamente
  }

  return lista;
}

// =====================================================
// ABA Ocorrencias_Coroas — controle de baixas
// =====================================================

function getAbaOcorrenciasCoroas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName('Ocorrencias_Coroas');
  if (!aba) {
    aba = ss.insertSheet('Ocorrencias_Coroas');
    aba.appendRow(['data', 'loja_chave', 'loja_nome', 'quantidade', 'observacao', 'resolvida_em']);
  }
  return aba;
}

function coreasHojeJaResolvida(hoje, lojaChave) {
  var aba = getAbaOcorrenciasCoroas();
  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    var d = String(dados[i][0]).trim();
    var l = String(dados[i][1]).trim();
    if (d === hoje && l === lojaChave) return true;
  }
  return false;
}

function resolverOcorrenciaCoroas(d) {
  if (!d.loja_chave || !d.data) throw new Error('loja_chave e data são obrigatórios.');
  if (coreasHojeJaResolvida(d.data, d.loja_chave)) {
    return 'Ocorrência de coroas da loja ' + d.loja_chave + ' em ' + d.data + ' já foi resolvida.';
  }
  var aba = getAbaOcorrenciasCoroas();
  aba.appendRow([
    d.data,
    d.loja_chave,
    d.loja_nome || d.loja_chave,
    d.quantidade || 0,
    d.observacao || '',
    hojeStr()
  ]);
  return 'Retirada de coroas confirmada — ' + (d.loja_nome || d.loja_chave) + ' (' + d.quantidade + ' coroa(s)).';
}

// =====================================================
// BUSCAR RASCUNHOS (retorna Rascunho, Em Rota, Retornando)
// =====================================================

function buscarRascunhos() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var st = String(r[3]).trim();
    if (st === 'Rascunho' || st === 'Em Rota' || st === 'Retornando') {
      result.push({
        id:            String(r[0]),
        status:        st,
        data_manual:   fmtDate(r[1]),
        pedido:        r[4],
        cliente:       r[5],
        falecido:      r[6],
        itensJSON:     r[7],
        data_entrega:  r[8] || '',
        local_entrega: r[9] || '',
        observacao:    r[19] || '',
        viagem_id:     r[20] || '',
        motorista:     r[11] || ''
      });
    }
  }
  return result;
}

// =====================================================
// BUSCAR OS FINALIZADAS (RELATÓRIO)
// =====================================================

function buscarOSFinalizadas(ini, fim) {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  if (!ini || !fim) return [];
  var d0 = new Date(ini + 'T00:00:00');
  var d1 = new Date(fim + 'T23:59:59');
  var res = [];

  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (String(r[3]).trim() !== 'Finalizado') continue;
    var dm = r[1];
    var dt = parseFlexDate(dm);
    if (dt && dt >= d0 && dt <= d1) {
      res.push({
        id:                r[0],
        data_manual:       fmtDate(dm),
        // ✅ Retorna data_finalizacao para o frontend poder filtrar corretamente
        // ✅ fmtDate trata Date objects — o Sheets pode auto-converter strings de data
        data_finalizacao:  fmtDate(r[23]) || fmtDate(dm),
        pedido:            r[4] || '-',
        cliente:           r[5] || r[6] || '-',
        veiculo:           r[12] || '-',
        viagem_id:         r[20] || '-',
        distancia:         r[17] ? r[17] + ' km' : '-',
        custo_combustivel: r[18] ? 'R$ ' + r[18] : '-',
        quem_recebeu:      r[10] || ''
      });
    }
  }
  return res;
}

function debugRelatorio() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var totalLinhas = data.length - 1;
  var statusCount = {};
  var amostras = [];

  for (var i = 1; i < data.length; i++) {
    var status = String(data[i][3]).trim() || '(vazio)';
    statusCount[status] = (statusCount[status] || 0) + 1;
    if (amostras.length < 5) {
      amostras.push({
        linha: i + 1,
        id: data[i][0],
        data_manual_raw: String(data[i][1]),
        data_manual_type: typeof data[i][1] === 'object' && data[i][1] instanceof Date ? 'Date' : typeof data[i][1],
        data_finalizacao: String(data[i][23]),
        status: data[i][3],
        pedido: data[i][4]
      });
    }
  }

  return { totalLinhas: totalLinhas, statusCount: statusCount, amostras: amostras };
}

// =====================================================
// SALVAR PEDIDO (RASCUNHO)
// =====================================================

function salvarPedido(d) {
  var sheet = getSheet();
  var itensJSON = JSON.stringify(d.itens || []);
  var idFinal = d.id || gerarProximoID(sheet);

  var dataEntrega = d.data_entrega || '';
  if (dataEntrega && d.hora_entrega) dataEntrega += ' ' + d.hora_entrega;

  var linhaExist = -1;
  if (d.id) {
    var all = sheet.getDataRange().getValues();
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === String(d.id)) { linhaExist = i + 1; break; }
    }
  }

  if (linhaExist > 0) {
    var range = sheet.getRange(linhaExist, 1, 1, NUM_COLS);
    var ant = range.getValues()[0];
    while(ant.length < NUM_COLS) ant.push('');
    ant[0]  = idFinal;
    ant[1]  = d.data_manual || ant[1];
    ant[3]  = 'Rascunho';
    ant[4]  = d.pedido !== undefined ? d.pedido : ant[4];
    ant[5]  = d.cliente !== undefined ? d.cliente : ant[5];
    ant[6]  = d.falecido !== undefined ? d.falecido : ant[6];
    ant[7]  = itensJSON !== '[]' ? itensJSON : ant[7];
    ant[8]  = dataEntrega || ant[8];
    ant[9]  = d.local_entrega !== undefined ? d.local_entrega : ant[9];
    ant[19] = d.observacao !== undefined ? d.observacao : (ant[19] || '');
    range.setValues([ant]);
    return 'Pedido ' + idFinal + ' atualizado.';
  } else {
    var nova = [];
    for (var c = 0; c < NUM_COLS; c++) nova.push('');
    nova[0]  = idFinal;
    nova[1]  = d.data_manual || '';
    nova[2]  = new Date();
    nova[3]  = 'Rascunho';
    nova[4]  = d.pedido || '';
    nova[5]  = d.cliente || '';
    nova[6]  = d.falecido || '';
    nova[7]  = itensJSON;
    nova[8]  = dataEntrega;
    nova[9]  = d.local_entrega || '';
    nova[19] = d.observacao || '';
    sheet.appendRow(nova);
    return 'Pedido ' + idFinal + ' criado com sucesso.';
  }
}

// =====================================================
// DESPACHAR (Rascunho -> Em Rota)
// =====================================================

function despachar(d) {
  var sheet = getSheet();
  var all = sheet.getDataRange().getValues();
  var vID = gerarViagemID(sheet);
  var horariosStr = JSON.stringify(d.horarios || {});

  var ids = [];
  for (var p = 0; p < d.pedidos.length; p++) {
    ids.push(String(d.pedidos[p].id));
  }

  var fotoUrl = '';
  if (d.fotoBase64) {
    var folderId = '1su52PywS5HEOwN4JP53NBbSqN2yhqNGV';
    try {
      var folder = DriveApp.getFolderById(folderId);
      var base64Data = d.fotoBase64;
      if (base64Data.indexOf(',') !== -1) base64Data = base64Data.split(',')[1];
      var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/jpeg', 'Coroa_' + vID + '.jpg');
      var file = folder.createFile(blob);
      fotoUrl = file.getUrl();
    } catch(e) {
      fotoUrl = 'Erro ao salvar foto: ' + e.message;
    }
  }

  var count = 0;
  for (var i = 1; i < all.length; i++) {
    var rid = String(all[i][0]);
    if (ids.indexOf(rid) !== -1) {
      var rn = i + 1;
      var range = sheet.getRange(rn, 1, 1, NUM_COLS);
      var row = range.getValues()[0];
      while(row.length < NUM_COLS) row.push('');

      row[3]  = 'Em Rota';
      row[9]  = d.local_entrega || row[9];
      row[11] = d.motorista || '';
      row[12] = d.veiculo || '';
      row[13] = d.horarios && d.horarios.saida_fabrica ? d.horarios.saida_fabrica : '';
      row[14] = d.agente || '';
      row[15] = d.mesa || '';
      row[16] = d.combustivel_preco || '';
      row[17] = d.distancia_total || '';
      row[18] = d.custo_combustivel || '';
      row[20] = vID;
      row[21] = horariosStr;
      if (fotoUrl) row[22] = fotoUrl;
      // col 23 (Data_Finalizacao) fica vazia aqui — só preenche ao finalizar

      range.setValues([row]);
      count++;
    }
  }

  return count + ' pedido(s) despachado(s) — Viagem ' + vID;
}

// =====================================================
// FINALIZAR ENTREGA (Em Rota -> Retornando)
// =====================================================

function finalizarEntrega(d) {
  var sheet = getSheet();
  var all = sheet.getDataRange().getValues();
  var idRecebido = String(d.id).trim();

  for (var i = 1; i < all.length; i++) {
    var idPlanilha = String(all[i][0]).trim();
    if (idPlanilha === idRecebido) {
      var statusAtual = String(all[i][3]).trim();
      if (statusAtual === 'Despachado' || statusAtual === 'Em Rota') {
        var rn = i + 1;
        var range = sheet.getRange(rn, 1, 1, NUM_COLS);
        var row = range.getValues()[0];
        while(row.length < NUM_COLS) row.push('');

        row[3]  = 'Retornando';
        // ✅ FIX: campo correto — o JS envia quem_recebeu, não recebedor
        row[10] = d.quem_recebeu || '';

        try {
          var horarios = row[21] ? JSON.parse(row[21]) : {};
          horarios.entrega_cliente = d.hora_entrega || '';
          row[21] = JSON.stringify(horarios);
        } catch(e) {
          row[21] = JSON.stringify({ entrega_cliente: d.hora_entrega || '' });
        }

        range.setValues([row]);
        return 'Entrega ' + d.id + ' confirmada! Aguardando retorno do motorista.';
      } else {
        throw new Error('O pedido ' + d.id + ' está com status "' + statusAtual + '". Só é possível finalizar pedidos "Em Rota".');
      }
    }
  }
  throw new Error('ID ' + idRecebido + ' não encontrado na planilha.');
}

// =====================================================
// REGISTRAR RETORNO À BASE (Retornando -> Finalizado)
// =====================================================

function registrarRetornoViagem(d) {
  if (!d.viagem_id) throw new Error('viagem_id não informado.');
  var sheet = getSheet();
  var all = sheet.getDataRange().getValues();
  // ✅ Grava a data de hoje no momento em que o retorno é confirmado
  var dataFinalizacao = hojeStr();
  var count = 0;

  for (var i = 1; i < all.length; i++) {
    var st  = String(all[i][3]).trim();
    var vid = String(all[i][20]).trim();
    if (vid === String(d.viagem_id) && st === 'Retornando') {
      var rn = i + 1;
      var range = sheet.getRange(rn, 1, 1, NUM_COLS);
      var row = range.getValues()[0];
      while(row.length < NUM_COLS) row.push('');

      row[3]  = 'Finalizado';
      // ✅ Grava a data real de finalização na coluna W (índice 23)
      row[23] = dataFinalizacao;

      try {
        var horarios = row[21] ? JSON.parse(row[21]) : {};
        horarios.retorno_fabrica = d.hora_retorno || '';
        row[21] = JSON.stringify(horarios);
      } catch(e) {}

      range.setValues([row]);
      count++;
    }
  }

  if (count === 0) throw new Error('Nenhum pedido "Retornando" encontrado para a viagem ' + d.viagem_id + '.');
  return count + ' pedido(s) da viagem ' + d.viagem_id + ' finalizados. Retorno registrado às ' + (d.hora_retorno || '?') + '.';
}