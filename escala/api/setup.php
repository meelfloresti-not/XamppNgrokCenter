<?php
// =============================================
// SETUP - Cria banco e tabelas da Escala
// =============================================
// Execute este arquivo UMA VEZ no navegador:
// http://localhost/escala/api/setup.php

header('Content-Type: application/json; charset=utf-8');

$host = 'localhost';
$user = 'root';
$pass = '';
$dbname = 'escala_db';

try {
    // Conecta sem selecionar banco para poder criá-lo
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    // 1. Cria o banco
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$dbname`");

    // 2. Tabela de funcionários
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS funcionarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            escala ENUM('6x1', '5x2', '12x36') NOT NULL DEFAULT '6x1',
            ativo TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_nome (nome)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // 3. Tabela de dados da escala (X/F por dia)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS escala_dados (
            id INT AUTO_INCREMENT PRIMARY KEY,
            funcionario_id INT NOT NULL,
            data_dia DATE NOT NULL,
            status ENUM('X', 'F') NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_func_dia (funcionario_id, data_dia),
            FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // 4. Tabela de feriados
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS feriados (
            id INT AUTO_INCREMENT PRIMARY KEY,
            data_feriado DATE NOT NULL UNIQUE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // 5. Popular com funcionários padrão (ignora se já existem)
    $defaultEmployees = [
        ['Ana Carolina', '6x1'],
        ['Bruno', '12x36'],
        ['Davi', '6x1'],
        ['Gabriela Cipulo', '6x1'],
        ['Gabriela Humphreys', '6x1'],
        ['Gilberto', '12x36'],
        ['Glauce', '6x1'],
        ['Helena', '6x1'],
        ['José Fernando', '6x1'],
        ['Leonardo', '12x36'],
        ['Luana', '6x1'],
        ['Mariana', '12x36'],
        ['Morsa', '12x36'],
        ['Murillo', '6x1'],
        ['Pedro Henrique', '12x36'],
        ['Robson', '5x2'],
        ['Sabrina', '6x1'],
        ['Silas', '12x36'],
        ['Thayssa', '6x1'],
    ];

    $stmt = $pdo->prepare("INSERT IGNORE INTO funcionarios (nome, escala) VALUES (:nome, :escala)");
    $inserted = 0;
    foreach ($defaultEmployees as $emp) {
        $stmt->execute(['nome' => $emp[0], 'escala' => $emp[1]]);
        if ($stmt->rowCount() > 0) $inserted++;
    }

    echo json_encode([
        'success' => true,
        'message' => "Banco '$dbname' configurado com sucesso!",
        'tables'  => ['funcionarios', 'escala_dados', 'feriados'],
        'employees_inserted' => $inserted
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
    ]);
}
