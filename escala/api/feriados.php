<?php
// =============================================
// API - Feriados
// =============================================
// POST → Toggle feriado (adiciona ou remove)

require_once __DIR__ . '/conexao.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getConnection();

switch ($method) {

    // ---- TOGGLE FERIADO ----
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $data = $input['data'] ?? '';

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data)) {
            jsonResponse(false, ['error' => 'Data inválida. Use YYYY-MM-DD.'], 400);
        }

        // Verifica se já existe
        $check = $pdo->prepare("SELECT id FROM feriados WHERE data_feriado = :data");
        $check->execute(['data' => $data]);

        if ($check->fetch()) {
            // Remove feriado
            $del = $pdo->prepare("DELETE FROM feriados WHERE data_feriado = :data");
            $del->execute(['data' => $data]);
            jsonResponse(true, ['message' => 'Feriado removido.', 'action' => 'removed']);
        } else {
            // Adiciona feriado
            $ins = $pdo->prepare("INSERT INTO feriados (data_feriado) VALUES (:data)");
            $ins->execute(['data' => $data]);
            jsonResponse(true, ['message' => 'Feriado adicionado.', 'action' => 'added']);
        }
        break;

    default:
        jsonResponse(false, ['error' => 'Método não suportado.'], 405);
}
