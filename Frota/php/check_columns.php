<?php
require 'c:/xampp/htdocs/logistica/Frota/php/db.php';
$stmt = $pdo->query('SHOW COLUMNS FROM pedidos');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
