<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
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
    $stmt = $pdo->query('SELECT u.*, g.name as group_name FROM users u LEFT JOIN user_groups g ON u.group_id = g.id ORDER BY u.created_at DESC');
    $users = $stmt->fetchAll();
    $formattedUsers = array_map(function($user) {
        return [
            'id' => $user['id'],
            'firstName' => $user['first_name'],
            'lastName' => $user['last_name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'status' => $user['status'],
            'groupId' => $user['group_id'],
            'groupName' => $user['group_name'],
            'location' => $user['location'],
            'createdAt' => $user['created_at'],
            'updatedAt' => $user['updated_at']
        ];
    }, $users);
    echo json_encode($formattedUsers);
    exit;
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $firstName = $data['firstName'] ?? '';
    $lastName = $data['lastName'] ?? '';
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $role = $data['role'] ?? '';
    $groupId = isset($data['groupId']) && $data['groupId'] !== '' ? $data['groupId'] : null;
    $location = $data['location'] ?? null;
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO users (first_name, last_name, email, password, role, group_id, location) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$firstName, $lastName, $email, $hashedPassword, $role, $groupId, $location]);
    echo json_encode(['id' => $pdo->lastInsertId(), 'message' => 'User created successfully']);
    exit;
}

if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? null;
    $firstName = $data['firstName'] ?? '';
    $lastName = $data['lastName'] ?? '';
    $email = $data['email'] ?? '';
    $role = $data['role'] ?? '';
    $groupId = $data['groupId'] ?? null;
    $status = $data['status'] ?? '';
    $stmt = $pdo->prepare('UPDATE users SET first_name = ?, last_name = ?, email = ?, role = ?, group_id = ?, status = ? WHERE id = ?');
    $stmt->execute([$firstName, $lastName, $email, $role, $groupId, $status, $id]);
    echo json_encode(['message' => 'User updated successfully']);
    exit;
}

if ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? null;
    $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode(['message' => 'User deleted successfully']);
    exit;
}

echo json_encode(['error' => 'Invalid request']); 