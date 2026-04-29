<?php
require 'c:/xampp/htdocs/logistica/Frota/php/db.php';
try {
    $pdo->exec('ALTER TABLE pedidos ADD COLUMN hora_prazo TIME NULL AFTER data_entrega');
} catch (Exception $e) {}
try {
    $pdo->exec('ALTER TABLE pedidos ADD COLUMN data_entrega_real DATE NULL AFTER hora_retorno');
} catch (Exception $e) {}
try {
    $pdo->exec('ALTER TABLE pedidos ADD COLUMN is_ocorrencia TINYINT(1) DEFAULT 0');
} catch (Exception $e) {}
try {
    $pdo->exec('ALTER TABLE pedidos ADD COLUMN motivo_ocorrencia TEXT NULL');
} catch (Exception $e) {}
echo "Feito.";
?>
