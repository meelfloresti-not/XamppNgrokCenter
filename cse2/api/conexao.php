<?php
// =============================================
// CONEXÃO PDO - CSE2 Estoque
// =============================================
// Conexão segura e otimizada com MySQL via XAMPP

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Responde imediatamente a preflight CORS
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

define('DB_HOST', 'localhost');
define('DB_NAME', 'estoque_db');
define('DB_USER', 'root');
define('DB_PASS', '');

function getConnection(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'Erro de conexão com o banco: ' . $e->getMessage()
            ]);
            exit;
        }
    }
    return $pdo;
}

/**
 * Garante que um produto existe na tabela `produtos`.
 * Se não existir, cria automaticamente.
 * Retorna o id do produto.
 */
function garantirProduto(PDO $pdo, string $nome, string $tipoMaterial, string $local): int {
    $stmt = $pdo->prepare('SELECT id FROM produtos WHERE nome = :nome AND local_estoque = :local');
    $stmt->execute(['nome' => $nome, 'local' => $local]);
    $row = $stmt->fetch();

    if ($row) {
        return (int) $row['id'];
    }

    $ins = $pdo->prepare('INSERT INTO produtos (nome, tipo_material, local_estoque) VALUES (:nome, :tipo, :local)');
    $ins->execute(['nome' => $nome, 'tipo' => $tipoMaterial, 'local' => $local]);
    return (int) $pdo->lastInsertId();
}

/**
 * Resposta JSON padronizada
 */
function jsonResponse(bool $success, $data = [], int $status = 200): void {
    http_response_code($status);
    echo json_encode(array_merge(['success' => $success], $data), JSON_UNESCAPED_UNICODE);
    exit;
}
