<?php
// =============================================
// MIGRAÇÃO: CSV → MySQL (Estoque CSE2)
// =============================================
// Lê o CSV exportado do Google Sheets e importa para o banco relacional.
// Roda UMA VEZ. Acesse via browser: http://localhost/cse2/api/migrar_csv.php
//
// Ele faz:
// 1. Lê cada linha do CSV
// 2. Auto-cadastra o produto se não existir
// 3. Insere a movimentação com o ID legado preservado

set_time_limit(300);
ini_set('memory_limit', '256M');

require_once __DIR__ . '/conexao.php';

$pdo = getConnection();

// Caminho do CSV (na mesma pasta do cse2)
$csvFile = __DIR__ . '/../EstoqueQP - CEQP.csv';
$origem  = 'CEQP';

if (!file_exists($csvFile)) {
    jsonResponse(false, ['error' => 'Arquivo CSV não encontrado: ' . $csvFile]);
}

// Detectar separador
$firstLine = fgets(fopen($csvFile, 'r'));
$separator = (substr_count($firstLine, ';') > substr_count($firstLine, ',')) ? ';' : ',';

$handle = fopen($csvFile, 'r');
if (!$handle) {
    jsonResponse(false, ['error' => 'Não foi possível abrir o CSV']);
}

// Ler cabeçalho
$header = fgetcsv($handle, 0, $separator);
if (!$header) {
    jsonResponse(false, ['error' => 'CSV vazio ou sem cabeçalho']);
}

// Mapear colunas (case-insensitive, trimmed)
$header = array_map(function($h) { return strtolower(trim($h)); }, $header);
$colMap = array_flip($header);

function col($row, $colMap, $name, $default = '') {
    $name = strtolower($name);
    return isset($colMap[$name]) ? trim($row[$colMap[$name]] ?? $default) : $default;
}

$importados = 0;
$erros = [];
$skipped = 0;

// Iniciar transação para performance
$pdo->beginTransaction();

try {
    while (($row = fgetcsv($handle, 0, $separator)) !== false) {
        // Pular linhas vazias
        if (!$row || count($row) < 5) { $skipped++; continue; }

        $idLegado     = col($row, $colMap, 'id');
        $tipo         = col($row, $colMap, 'tipo');
        $data         = col($row, $colMap, 'data');
        $responsavel  = col($row, $colMap, 'responsável') ?: col($row, $colMap, 'responsavel');
        $fornecedor   = col($row, $colMap, 'fornecedor');
        $quemRecebeu  = col($row, $colMap, 'quem recebeu');
        $quemCadastrou= col($row, $colMap, 'quem cadastrou');
        $local        = col($row, $colMap, 'local');
        $material     = col($row, $colMap, 'material');
        $tipoMaterial = col($row, $colMap, 'tipo material');
        $qtdPacotes   = (int) col($row, $colMap, 'qtd pacotes', '0');
        $unidPacote   = (int) col($row, $colMap, 'unids. por pacote', '0');
        $qtdTotal     = (int) col($row, $colMap, 'qtd total', '0');
        $valorUnit    = str_replace(',', '.', col($row, $colMap, 'valor unit.', '0'));
        $valorTotal   = str_replace(',', '.', col($row, $colMap, 'valor total', '0'));
        $obs          = col($row, $colMap, 'obs');
        $status       = col($row, $colMap, 'status', 'ATIVO');
        $motivoExc    = col($row, $colMap, 'motivo exclusão') ?: col($row, $colMap, 'motivo exclusao');
        $dataExc      = col($row, $colMap, 'data exclusão') ?: col($row, $colMap, 'data exclusao');

        // Validações mínimas
        if (!$material || !$local || !$tipo) {
            $erros[] = "Linha pulada (dados insuficientes): ID={$idLegado}";
            $skipped++;
            continue;
        }

        // Normalizar tipo
        if (stripos($tipo, 'entrada') !== false) $tipo = 'Entrada';
        elseif (stripos($tipo, 'saída') !== false || stripos($tipo, 'saida') !== false) $tipo = 'Saída';
        else { $erros[] = "Tipo inválido na linha ID={$idLegado}: {$tipo}"; $skipped++; continue; }

        // Normalizar data
        $dataHora = $data;
        if (strpos($dataHora, 'T') !== false) {
            $dataHora = date('Y-m-d H:i:s', strtotime($dataHora));
        } elseif (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $dataHora)) {
            $dataHora .= ':00';
        }

        // Garantir produto
        $idProduto = garantirProduto($pdo, $material, $tipoMaterial, $local);

        // Status
        $statusNorm = (stripos($status, 'exclu') !== false) ? 'EXCLUÍDO' : 'ATIVO';
        $dataExcNorm = $statusNorm === 'EXCLUÍDO' && $dataExc ? date('Y-m-d H:i:s', strtotime($dataExc)) : null;

        // Inserir movimentação
        $stmt = $pdo->prepare("
            INSERT INTO movimentacoes 
                (id_legado, id_produto, tipo, data_hora, responsavel, fornecedor,
                 quem_recebeu, quem_cadastrou, qtd_pacotes, unid_pacote,
                 quantidade, valor_unitario, valor_total, observacao,
                 status, motivo_exclusao, data_exclusao, origem)
            VALUES 
                (:legado, :prod, :tipo, :data, :resp, :forn,
                 :receb, :cad, :pac, :unidpac,
                 :qtd, :vunit, :vtotal, :obs,
                 :status, :motExc, :dataExc, :origem)
        ");

        $stmt->execute([
            'legado'  => $idLegado,
            'prod'    => $idProduto,
            'tipo'    => $tipo,
            'data'    => $dataHora,
            'resp'    => $responsavel,
            'forn'    => $fornecedor,
            'receb'   => $quemRecebeu,
            'cad'     => $quemCadastrou,
            'pac'     => $qtdPacotes,
            'unidpac' => $unidPacote,
            'qtd'     => $qtdTotal,
            'vunit'   => (float) $valorUnit,
            'vtotal'  => (float) $valorTotal,
            'obs'     => $obs,
            'status'  => $statusNorm,
            'motExc'  => $motivoExc ?: null,
            'dataExc' => $dataExcNorm,
            'origem'  => $origem,
        ]);

        $importados++;
    }

    $pdo->commit();

    // Contar produtos criados
    $stmtCount = $pdo->query("SELECT COUNT(*) AS total FROM produtos");
    $totalProdutos = $stmtCount->fetch()['total'];

    jsonResponse(true, [
        'message'    => "Migração concluída com sucesso!",
        'importados' => $importados,
        'produtos_criados' => (int) $totalProdutos,
        'pulados'    => $skipped,
        'erros'      => $erros,
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    jsonResponse(false, [
        'error'      => $e->getMessage(),
        'importados' => $importados,
    ]);
} finally {
    fclose($handle);
}
