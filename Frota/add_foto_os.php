<?php
require_once 'php/db.php';
try {
    $pdo->exec("ALTER TABLE pedidos ADD COLUMN foto_os VARCHAR(255) DEFAULT NULL AFTER foto_entrega");
    echo "Column foto_os added successfully!";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column foto_os already exists.";
    } else {
        echo "Error: " . $e->getMessage();
    }
}
?>
