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
    $stmt = $pdo->query('SELECT * FROM user_groups ORDER BY name');
    $groups = $stmt->fetchAll();
    echo json_encode($groups);
    exit;
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $name = $data['name'] ?? '';
    $description = $data['description'] ?? '';
    $location = $data['location'] ?? '';
    $stmt = $pdo->prepare('INSERT INTO user_groups (name, location, description) VALUES (?, ?, ?)');
    $stmt->execute([$name, $location, $description]);
    echo json_encode(['id' => $pdo->lastInsertId(), 'message' => 'Group created successfully']);
    exit;
}

if ($method === 'PUT') {
    parse_str(file_get_contents('php://input'), $data);
    $id = $data['id'] ?? null;
    $name = $data['name'] ?? '';
    $description = $data['description'] ?? '';
    $stmt = $pdo->prepare('UPDATE user_groups SET name = ?, description = ? WHERE id = ?');
    $stmt->execute([$name, $description, $id]);
    echo json_encode(['message' => 'Group updated successfully']);
    exit;
}

if ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? null;
    // Remove group reference from users
    $pdo->prepare('UPDATE users SET group_id = NULL WHERE group_id = ?')->execute([$id]);
    // Delete the group
    $stmt = $pdo->prepare('DELETE FROM user_groups WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode(['message' => 'Group deleted successfully']);
    exit;
}

echo json_encode(['error' => 'Invalid request']); 