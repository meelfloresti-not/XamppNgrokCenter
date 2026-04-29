<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["status" => "erro", "mensagem" => "Método inválido."]);
    exit;
}

$postData = json_decode(file_get_contents('php://input'), true);

if (!$postData) {
    echo json_encode(["status" => "erro", "mensagem" => "Payload vazio ou não é JSON."]);
    exit;
}

$osId       = $postData['os_id'] ?? null;
$hora       = empty($postData['hora_entrega']) ? date('H:i') : $postData['hora_entrega'];
$recebedor  = $postData['quem_recebeu'] ?? null;
$fotoBase64 = $postData['foto_base64'] ?? null;
$fotoOsBase64 = $postData['foto_os_base64'] ?? null;
$fotoPath   = null;
$fotoOsPath = null;

if (!$osId) {
    echo json_encode(["status" => "erro", "mensagem" => "ID da OS não informado."]);
    exit;
}

$dir = "../../uploads/fotos/";
if (!empty($fotoBase64) || !empty($fotoOsBase64)) {
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
}

$stmtPedido = $pdo->prepare("SELECT pedido FROM pedidos WHERE id = ?");
$stmtPedido->execute([$osId]);
$resPedido = $stmtPedido->fetch();
$numPedido = $resPedido ? preg_replace('/[^A-Za-z0-9]/', '', $resPedido['pedido']) : '';
if (empty($numPedido)) $numPedido = 'SEMPEDIDO';

// Lidar com o arquivo Base64 do Material Entregue
if ($fotoBase64) {
    $parts = explode(',', $fotoBase64);
    $data = isset($parts[1]) ? base64_decode($parts[1]) : base64_decode($parts[0]);
    $nome_arquivo = preg_replace('/[^A-Za-z0-9]/', '', $osId) . "_PED" . $numPedido . "_ENTREGA_" . time() . ".jpg";
    if (file_put_contents($dir . $nome_arquivo, $data)) {
        $fotoPath = "../uploads/fotos/" . $nome_arquivo;
    }
}

// Lidar com o arquivo Base64 da OS
if ($fotoOsBase64) {
    $parts = explode(',', $fotoOsBase64);
    $data = isset($parts[1]) ? base64_decode($parts[1]) : base64_decode($parts[0]);
    $nome_arquivo = preg_replace('/[^A-Za-z0-9]/', '', $osId) . "_PED" . $numPedido . "_OS_" . time() . ".jpg";
    if (file_put_contents($dir . $nome_arquivo, $data)) {
        $fotoOsPath = "../uploads/fotos/" . $nome_arquivo;
    }
}

try {
    // Verificar Ocorrência
    $stmtVerifica = $pdo->prepare("SELECT cliente, data_entrega, hora_prazo FROM pedidos WHERE id = ?");
    $stmtVerifica->execute([$osId]);
    $reg = $stmtVerifica->fetch();

    $isOcorrencia = 0;
    if ($reg && strcasecmp(trim($reg['cliente']), 'Consolare') === 0 && !empty($reg['data_entrega']) && !empty($reg['hora_prazo'])) {
        $prazo = strtotime($reg['data_entrega'] . ' ' . $reg['hora_prazo']);
        $realizado = strtotime(date('Y-m-d') . ' ' . $hora);
        if ($realizado > $prazo) {
            $isOcorrencia = 1;
        }
    }
    $dataEntregaReal = date('Y-m-d');

    // Atualiza o Banco
    $stmt = $pdo->prepare("UPDATE pedidos SET status = 'Retornando', hora_entrega = ?, quem_recebeu = ?, foto_entrega = ?, foto_os = ?, data_entrega_real = ?, is_ocorrencia = ? WHERE id = ?");
    $stmt->execute([$hora, $recebedor, $fotoPath, $fotoOsPath, $dataEntregaReal, $isOcorrencia, $osId]);
    
    echo json_encode(["status" => "sucesso", "dados" => "OS {$osId} entregue com sucesso!"]);
} catch (\PDOException $e) {
    echo json_encode(["status" => "erro", "mensagem" => "Erro DB: " . $e->getMessage()]);
}
?>
