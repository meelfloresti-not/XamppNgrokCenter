<?php
$host = "localhost";
$user = "root";
$pass = ""; // Por padrão o XAMPP vem sem senha
$dbname = "sistema_entregas";

$conn = mysqli_connect($host, $user, $pass, $dbname);

if (!$conn) {
    die("Falha na conexão: " . mysqli_connect_error());
}
?>