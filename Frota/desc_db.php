<?php
require_once 'php/db.php';
$stmt = $pdo->query("SELECT * FROM pedidos LIMIT 1");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
echo json_encode(array_keys($row));
?>
