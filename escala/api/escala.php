<?php
// =============================================
// API - Dados da Escala
// =============================================
// GET    ?mes=YYYY-MM → Retorna dados do mês
// POST   → Salva/atualiza status de uma célula
// DELETE → Limpa dados do mês inteiro

require_once __DIR__ . '/conexao.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getConnection();

switch ($method) {

    // ---- CARREGAR DADOS DO MÊS ----
    case 'GET':
        $mes = $_GET['mes'] ?? '';
        if (!preg_match('/^\d{4}-\d{2}$/', $mes)) {
            jsonResponse(false, ['error' => 'Parâmetro "mes" inválido. Use YYYY-MM.'], 400);
        }

        // Calcula primeiro e último dia do mês
        $inicioMes = $mes . '-01';
        $fimMes = date('Y-m-t', strtotime($inicioMes));

        // Busca dados da escala
        $stmt = $pdo->prepare("
            SELECT f.nome AS funcionario, ed.data_dia, ed.status
            FROM escala_dados ed
            JOIN funcionarios f ON f.id = ed.funcionario_id
            WHERE ed.data_dia BETWEEN :inicio AND :fim
              AND f.ativo = 1
            ORDER BY f.nome, ed.data_dia
        ");
        $stmt->execute(['inicio' => $inicioMes, 'fim' => $fimMes]);
        $rows = $stmt->fetchAll();

        // Organiza como objeto: { "nome_YYYY-MM-DD": "X" }
        $dados = [];
        foreach ($rows as $row) {
            $key = $row['funcionario'] . '_' . $row['data_dia'];
            $dados[$key] = $row['status'];
        }

        // Busca feriados do mês
        $stmtF = $pdo->prepare("
            SELECT data_feriado FROM feriados
            WHERE data_feriado BETWEEN :inicio AND :fim
        ");
        $stmtF->execute(['inicio' => $inicioMes, 'fim' => $fimMes]);
        $feriados = $stmtF->fetchAll(PDO::FETCH_COLUMN);

        jsonResponse(true, [
            'dados'    => $dados,
            'feriados' => $feriados
        ]);
        break;

    // ---- SALVAR/ATUALIZAR CÉLULA ----
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $funcionarioId = (int)($input['funcionario_id'] ?? 0);
        $dataDia       = $input['data_dia'] ?? '';
        $status        = $input['status'] ?? '';

        if ($funcionarioId <= 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataDia)) {
            jsonResponse(false, ['error' => 'Dados inválidos.'], 400);
        }

        // Se status vazio, remove o registro
        if (empty($status)) {
            $stmt = $pdo->prepare("DELETE FROM escala_dados WHERE funcionario_id = :fid AND data_dia = :dia");
            $stmt->execute(['fid' => $funcionarioId, 'dia' => $dataDia]);
            jsonResponse(true, ['message' => 'Status removido.']);
        }

        // Validar status
        if (!in_array($status, ['X', 'F'])) {
            jsonResponse(false, ['error' => 'Status inválido. Use X ou F.'], 400);
        }

        // Upsert: INSERT ... ON DUPLICATE KEY UPDATE
        $stmt = $pdo->prepare("
            INSERT INTO escala_dados (funcionario_id, data_dia, status)
            VALUES (:fid, :dia, :status)
            ON DUPLICATE KEY UPDATE status = VALUES(status)
        ");
        $stmt->execute([
            'fid'    => $funcionarioId,
            'dia'    => $dataDia,
            'status' => $status
        ]);
        jsonResponse(true, ['message' => 'Salvo.']);
        break;

    // ---- LIMPAR DADOS DO MÊS ----
    case 'DELETE':
        $input = json_decode(file_get_contents('php://input'), true);
        $mes = $input['mes'] ?? '';
        if (!preg_match('/^\d{4}-\d{2}$/', $mes)) {
            jsonResponse(false, ['error' => 'Parâmetro "mes" inválido.'], 400);
        }

        $inicioMes = $mes . '-01';
        $fimMes = date('Y-m-t', strtotime($inicioMes));

        $stmt = $pdo->prepare("DELETE FROM escala_dados WHERE data_dia BETWEEN :inicio AND :fim");
        $stmt->execute(['inicio' => $inicioMes, 'fim' => $fimMes]);

        // Também remove feriados do mês
        $stmtF = $pdo->prepare("DELETE FROM feriados WHERE data_feriado BETWEEN :inicio AND :fim");
        $stmtF->execute(['inicio' => $inicioMes, 'fim' => $fimMes]);

        jsonResponse(true, ['message' => 'Dados do mês limpos.', 'deleted' => $stmt->rowCount()]);
        break;

    default:
        jsonResponse(false, ['error' => 'Método não suportado.'], 405);
}
