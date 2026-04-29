/*
  CÓDIGO PARA O GOOGLE APPS SCRIPT (backend)
  ===========================================

  📝 Instruções de Implantação:
  1. Abra a sua Planilha do Google que receberá os dados de estoque.
  2. Garanta que existem as três páginas criadas com o nome EXATO de: "CEF", "CEQP" e "CELF".
  3. Vá no menu: Extensões > Apps Script.
  4. Apague tudo que estiver na tela e cole o código abaixo.
  5. Clique no botão azul "Implantar" (Deploy) no canto superior direito > "Nova Implantação".
  6. Na engrenagem, escolha o tipo: "App da Web" (Web App).
  7. Configure: 
     - Executar como: "Eu"
     - Quem pode acessar: "Qualquer pessoa" (Anyone)
  8. Clique em "Implantar" e na próxima tela autorize os acessos na sua conta Google.
  9. Ao final, será gerada uma "URL do App da Web". Copie essa URL.
  10. Volte no seu código HTML (ambos CEF.html e CEQP.html) e cole a URL lá em cima no lugar de 'COLOQUE_SUA_URL_AQUI'.
*/

// ========== doPost — Salvar e Excluir ==========
function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const origem = data.origem; // 'CEF' ou 'CEQP'
        const acao = data.acao;     // 'salvar' ou 'excluir'
        const r = data.registro;

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName(origem);

        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: "Aba não encontrada na planilha: " + origem
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // Montar o cabeçalho automaticamente se a aba estiver totalmente vazia
        if (sheet.getLastRow() === 0) {
            sheet.appendRow([
                'ID', 'Tipo', 'Data', 'Responsável', 'Fornecedor', 'Quem Recebeu', 'Quem Cadastrou',
                'Local', 'Material', 'Tipo Material', 'Qtd Pacotes', 'Unids. por Pacote', 'Qtd Total',
                'Valor Unit.', 'Valor Total', 'Obs', 'Status', 'Motivo Exclusão', 'Data Exclusão'
            ]);
            sheet.getRange(1, 1, 1, 19).setFontWeight("bold").setBackground("#f3f3f3");
        }

        if (acao === 'salvar') {
            sheet.appendRow([
                r.id,
                r.tipo,
                r.data,
                r.quem,
                r.fornecedor || '',
                r.quemRecebeu || '',
                r.quemCadastrou || '',
                r.local,
                r.material,
                r.tipoMaterial,
                r.qtd_pacotes || 0,
                r.unid_pacote || 0,
                r.qtd || 0,
                parseFloat(r.vunit) || 0,
                parseFloat(r.vtotal) || 0,
                r.obs || '',
                'ATIVO',
                '',
                ''
            ]);

        } else if (acao === 'excluir') {
            const dataRange = sheet.getDataRange();
            const values = dataRange.getValues();

            let rowPosition = -1;
            for (let i = 1; i < values.length; i++) {
                if (String(values[i][0]) === String(r.id)) {
                    rowPosition = i + 1;
                    break;
                }
            }

            if (rowPosition !== -1) {
                sheet.getRange(rowPosition, 17).setValue('EXCLUÍDO');
                sheet.getRange(rowPosition, 18).setValue(r.motivoExclusao || '');
                sheet.getRange(rowPosition, 19).setValue(r.dataExclusao || '');
            }
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: "Operação realizada na planilha com sucesso!"
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.message
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

// ========== doGet — Listar registros para sincronização ==========
function doGet(e) {
    try {
        const params = e.parameter;
        const acao = params.acao || 'listar';
        const origem = params.origem || 'CEF';

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName(origem);

        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: "Aba não encontrada: " + origem
            })).setMimeType(ContentService.MimeType.JSON);
        }

        if (acao === 'listar') {
            const lastRow = sheet.getLastRow();

            // Caso a planilha esteja vazia ou tenha apenas o cabeçalho
            if (lastRow <= 1) {
                return ContentService.createTextOutput(JSON.stringify({
                    success: true,
                    registros: []
                })).setMimeType(ContentService.MimeType.JSON);
            }

            const dataRange = sheet.getRange(2, 1, lastRow - 1, 19);
            const values = dataRange.getValues();

            const registros = values.map(function (row) {
                const status = String(row[16] || 'ATIVO');
                return {
                    id: row[0],
                    tipo: row[1],
                    data: row[2],
                    quem: row[3],
                    fornecedor: row[4] || '',
                    quemRecebeu: row[5] || '',
                    quemCadastrou: row[6] || '',
                    local: row[7],
                    material: row[8],
                    tipoMaterial: row[9],
                    qtd_pacotes: parseFloat(row[10]) || 0,
                    unid_pacote: parseFloat(row[11]) || 0,
                    qtd: parseFloat(row[12]) || 0,
                    vunit: parseFloat(row[13]) || 0,
                    vtotal: parseFloat(row[14]) || 0,
                    obs: row[15] || '',
                    deletado: status === 'EXCLUÍDO',
                    motivoExclusao: row[17] || '',
                    dataExclusao: row[18] || '',
                    criadoEm: row[2] // usa a data do registro
                };
            });

            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                registros: registros
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // Ação de ping para verificar se o script está ativo
        if (acao === 'ping') {
            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                message: "pong",
                timestamp: new Date().toISOString()
            })).setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: "Ação desconhecida: " + acao
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.message
        })).setMimeType(ContentService.MimeType.JSON);
    }
}
