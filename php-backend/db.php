<?php
header('Content-Type: application/json');
$host = 'sql112.byethost10.com';
$db   = 'b10_39472802_ticket_management_system';
$user = 'b10_39472802'; // CHANGE THIS
$pass = 'kaungkhant123'; // CHANGE THIS
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];
try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
     http_response_code(500);
     echo json_encode(['error' => 'Database connection failed']);
     exit;
}
?> 