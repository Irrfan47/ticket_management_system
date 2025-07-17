<?php
require 'db.php';
$method = $_SERVER['REQUEST_METHOD'];
$uploadsDir = __DIR__ . '/uploads/';
if (!is_dir($uploadsDir)) { mkdir($uploadsDir, 0777, true); }

if ($method === 'GET') {
    $ticketId = $_GET['ticketId'] ?? null;
    $commentId = $_GET['commentId'] ?? null;
    if ($ticketId) {
        $stmt = $pdo->prepare('SELECT id, filename, original_name, mimetype, size, upload_date FROM attachments WHERE ticket_id = ?');
        $stmt->execute([$ticketId]);
        echo json_encode($stmt->fetchAll());
        exit;
    } else if ($commentId) {
        $stmt = $pdo->prepare('SELECT id, filename, original_name, mimetype, size, upload_date FROM attachments WHERE comment_id = ?');
        $stmt->execute([$commentId]);
        echo json_encode($stmt->fetchAll());
        exit;
    }
    echo json_encode(['error' => 'Missing ticketId or commentId']);
    exit;
}

if ($method === 'POST') {
    $ticketId = $_POST['ticketId'] ?? null;
    $commentId = $_POST['commentId'] ?? null;
    if (!isset($_FILES['file'])) { echo json_encode(['error' => 'No file uploaded']); exit; }
    $file = $_FILES['file'];
    $filename = time() . '-' . basename($file['name']);
    $fileData = file_get_contents($file['tmp_name']); // Read file as binary
    // Save to DB as BLOB
    $stmt = $pdo->prepare('INSERT INTO attachments (ticket_id, comment_id, filename, original_name, mimetype, size, file_data, upload_date) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())');
    $stmt->execute([
        $ticketId,
        $commentId,
        $filename,
        $file['name'],
        $file['type'],
        $file['size'],
        $fileData
    ]);
    echo json_encode(['id' => $pdo->lastInsertId(), 'filename' => $filename, 'message' => 'File uploaded successfully']);
    exit;
}

echo json_encode(['error' => 'Invalid request']); 