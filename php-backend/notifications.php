<?php
require 'db.php';
// Method override for POST + _method (for free hosting compatibility)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (isset($input['_method'])) {
        $_SERVER['REQUEST_METHOD'] = strtoupper($input['_method']);
    }
    $_POST = array_merge($_POST, $input ?? []);
}
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $userId = $_GET['userId'] ?? null;
    if (!$userId) { echo json_encode(['error' => 'Missing userId']); exit; }
    $stmt = $pdo->prepare('SELECT n.*, t.ticket_number FROM notifications n LEFT JOIN tickets t ON n.ticket_id = t.id WHERE n.user_id = ? ORDER BY n.created_at DESC');
    $stmt->execute([$userId]);
    $notifications = $stmt->fetchAll();
    echo json_encode($notifications);
    exit;
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['userId'] ?? null;
    if (!$userId) { echo json_encode(['error' => 'Missing userId']); exit; }
    $pdo->prepare('UPDATE notifications SET is_read = TRUE WHERE user_id = ?')->execute([$userId]);
    echo json_encode(['message' => 'Notifications marked as read']);
    exit;
}

if ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['userId'] ?? null;
    $id = $data['id'] ?? null;
    if ($id) {
        $stmt = $pdo->prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        echo json_encode(['message' => 'Notification deleted successfully']);
    } else if ($userId) {
        $stmt = $pdo->prepare('DELETE FROM notifications WHERE user_id = ?');
        $stmt->execute([$userId]);
        echo json_encode(['message' => 'All notifications deleted']);
    } else {
        echo json_encode(['error' => 'Missing userId']);
    }
    exit;
}

echo json_encode(['error' => 'Invalid request']); 