<?php
// =============================================
// API - Funcionários
// =============================================
// GET    → Lista funcionários ativos
// POST   → Adiciona novo funcionário
// DELETE → Desativa funcionário (soft delete)

require_once __DIR__ . '/conexao.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getConnection();

switch ($method) {

    // ---- LISTAR FUNCIONÁRIOS ATIVOS ----
    case 'GET':
        $stmt = $pdo->query("SELECT id, nome, escala FROM funcionarios WHERE ativo = 1 ORDER BY nome ASC");
        $rows = $stmt->fetchAll();
        jsonResponse(true, ['data' => $rows]);
        break;

    // ---- ADICIONAR FUNCIONÁRIO ----
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $nome   = trim($input['nome'] ?? '');
        $escala = $input['escala'] ?? '6x1';

        if (empty($nome)) {
            jsonResponse(false, ['error' => 'Nome é obrigatório.'], 400);
        }

        // Validar escala
        $escalasValidas = ['6x1', '5x2', '12x36'];
        if (!in_array($escala, $escalasValidas)) {
            jsonResponse(false, ['error' => 'Escala inválida.'], 400);
        }

        // Verificar se já existe (incluindo inativos — reativar)
        $check = $pdo->prepare("SELECT id, ativo FROM funcionarios WHERE nome = :nome");
        $check->execute(['nome' => $nome]);
        $existing = $check->fetch();

        if ($existing) {
            if ($existing['ativo'] == 0) {
                // Reativar funcionário
                $update = $pdo->prepare("UPDATE funcionarios SET ativo = 1, escala = :escala WHERE id = :id");
                $update->execute(['escala' => $escala, 'id' => $existing['id']]);
                jsonResponse(true, ['message' => 'Funcionário reativado.', 'id' => $existing['id']]);
            } else {
                jsonResponse(false, ['error' => 'Já existe um funcionário com este nome.'], 409);
            }
        }

        $stmt = $pdo->prepare("INSERT INTO funcionarios (nome, escala) VALUES (:nome, :escala)");
        $stmt->execute(['nome' => $nome, 'escala' => $escala]);
        jsonResponse(true, ['message' => 'Funcionário adicionado.', 'id' => (int)$pdo->lastInsertId()]);
        break;

    // ---- DESATIVAR FUNCIONÁRIO (soft delete) ----
    case 'DELETE':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);

        if ($id <= 0) {
            jsonResponse(false, ['error' => 'ID inválido.'], 400);
        }

        $stmt = $pdo->prepare("UPDATE funcionarios SET ativo = 0 WHERE id = :id");
        $stmt->execute(['id' => $id]);

        if ($stmt->rowCount() > 0) {
            jsonResponse(true, ['message' => 'Funcionário desativado.']);
        } else {
            jsonResponse(false, ['error' => 'Funcionário não encontrado.'], 404);
        }
        break;

    default:
        jsonResponse(false, ['error' => 'Método não suportado.'], 405);
}
