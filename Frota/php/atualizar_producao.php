<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["status" => "erro", "mensagem" => "Método inválido."]);
    exit;
}

$postData = json_decode(file_get_contents('php://input'), true);
if (!$postData) {
    echo json_encode(["status" => "erro", "mensagem" => "Payload vazio."]);
    exit;
}

$osId      = $postData['os_id'] ?? null;
$hora      = date('H:i');
$fotoB64   = $postData['foto_base64'] ?? null;
$fotoPath  = null;

if (!$osId) {
    echo json_encode(["status" => "erro", "mensagem" => "ID da OS não informado."]);
    exit;
}

if ($fotoB64) {
    $stmtPedido = $pdo->prepare("SELECT pedido FROM pedidos WHERE id = ?");
    $stmtPedido->execute([$osId]);
    $resPedido = $stmtPedido->fetch();
    $numPedido = $resPedido ? preg_replace('/[^A-Za-z0-9]/', '', $resPedido['pedido']) : '';
    if (empty($numPedido)) $numPedido = 'SEMPEDIDO';

    $dir = "../../uploads/fotos/";
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    $parts = explode(',', $fotoB64);
    $data  = isset($parts[1]) ? base64_decode($parts[1]) : base64_decode($parts[0]);
    $nome  = preg_replace('/[^A-Za-z0-9]/', '', $osId) . "_PED" . $numPedido . "_PRODUCAO_" . time() . ".jpg";
    if (file_put_contents($dir . $nome, $data)) {
        $fotoPath = "../uploads/fotos/" . $nome;
    } else {
        echo json_encode(["status" => "erro", "mensagem" => "Falha ao gravar imagem."]);
        exit;
    }
}

try {
    $stmt = $pdo->prepare("UPDATE pedidos SET status = 'Aguardando Saida', hora_fim_producao = ?, foto_producao = ? WHERE id = ?");
    $stmt->execute([$hora, $fotoPath, $osId]);
    echo json_encode(["status" => "sucesso", "dados" => "OS {$osId} finalizada! Aguardando despacho."]);
} catch (\PDOException $e) {
    echo json_encode(["status" => "erro", "mensagem" => "DB: " . $e->getMessage()]);
}
?>
