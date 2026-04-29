<?php
require_once 'php/db.php';
try {
    $pdo->exec("ALTER TABLE pedidos ADD COLUMN hora_inicio_entrega VARCHAR(10) DEFAULT NULL AFTER hora_saida");
    echo "Column hora_inicio_entrega added successfully!";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column hora_inicio_entrega already exists.";
    } else {
        echo "Error: " . $e->getMessage();
    }
}
?>
