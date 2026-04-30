<?php
// =============================================
// API: ALERTAS DE ESTOQUE - CSE2
// =============================================
// GET  → retorna alertas configurados por origem
// POST → salva/atualiza alerta de um produto

require_once __DIR__ . '/conexao.php';

$pdo = getConnection();

// ─── GET ────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $origem = $_GET['origem'] ?? '';

    $sql = "SELECT id, nome, tipo_material, local_estoque, estoque_medio, estoque_minimo FROM produtos";
    $params = [];

    if ($origem) {
        // Filtrar produtos que tenham movimentações dessa origem
        $sql = "
            SELECT DISTINCT p.id, p.nome, p.tipo_material, p.local_estoque, p.estoque_medio, p.estoque_minimo
            FROM produtos p
            JOIN movimentacoes m ON m.id_produto = p.id AND m.origem = :origem
            WHERE p.estoque_medio > 0 OR p.estoque_minimo > 0
        ";
        $params['origem'] = $origem;
    } else {
        $sql .= " WHERE estoque_medio > 0 OR estoque_minimo > 0";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $alertas = $stmt->fetchAll();

    // Montar no formato que o frontend espera: { 'material|||local': { medio, minimo } }
    $result = [];
    foreach ($alertas as $a) {
        $key = $a['nome'] . '|||' . $a['local_estoque'];
        $result[$key] = [
            'medio'  => (int) $a['estoque_medio'],
            'minimo' => (int) $a['estoque_minimo'],
        ];
    }

    jsonResponse(true, ['alertas' => $result]);
}

// ─── POST ───────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!$data) {
        jsonResponse(false, ['error' => 'JSON inválido'], 400);
    }

    $material = trim($data['material'] ?? '');
    $local    = trim($data['local'] ?? '');
    $medio    = (int)($data['medio'] ?? 0);
    $minimo   = (int)($data['minimo'] ?? 0);

    if (!$material || !$local) {
        jsonResponse(false, ['error' => 'Material e Local são obrigatórios'], 400);
    }

    $stmt = $pdo->prepare("
        UPDATE produtos 
        SET estoque_medio = :medio, estoque_minimo = :minimo
        WHERE nome = :nome AND local_estoque = :local
    ");
    $stmt->execute([
        'medio'  => $medio,
        'minimo' => $minimo,
        'nome'   => $material,
        'local'  => $local,
    ]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(false, ['error' => 'Produto não encontrado'], 404);
    }

    jsonResponse(true, ['message' => 'Alerta configurado com sucesso!']);
}

jsonResponse(false, ['error' => 'Método não permitido'], 405);
