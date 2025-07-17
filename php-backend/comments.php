<?php
require 'db.php';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $ticketId = $_GET['ticketId'] ?? null;
    if (!$ticketId) { echo json_encode(['error' => 'Missing ticketId']); exit; }
    $stmt = $pdo->prepare('SELECT c.*, u.first_name, u.last_name FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.ticket_id = ? ORDER BY c.createdAt ASC');
    $stmt->execute([$ticketId]);
    $comments = $stmt->fetchAll();
    $formattedComments = array_map(function($comment) {
        return [
            'id' => $comment['id'],
            'ticketId' => $comment['ticket_id'],
            'userId' => $comment['user_id'],
            'userName' => $comment['first_name'] . ' ' . $comment['last_name'],
            'content' => $comment['content'],
            'createdAt' => $comment['createdAt']
        ];
    }, $comments);
    echo json_encode($formattedComments);
    exit;
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $ticketId = $data['ticketId'] ?? null;
    $userId = $data['userId'] ?? null;
    $content = $data['content'] ?? '';
    if (!$ticketId || !$userId || !$content) { echo json_encode(['error' => 'Missing data']); exit; }
    $stmt = $pdo->prepare('INSERT INTO comments (ticket_id, user_id, content, createdAt) VALUES (?, ?, ?, NOW())');
    $stmt->execute([$ticketId, $userId, $content]);
    $commentId = $pdo->lastInsertId();
    // Notification logic
    $stmtTicket = $pdo->prepare('SELECT * FROM tickets WHERE id = ?');
    $stmtTicket->execute([$ticketId]);
    $ticket = $stmtTicket->fetch();
    if ($ticket) {
        // Notify ticket owner if not commenter
        if ($ticket['user_id'] && $ticket['user_id'] != $userId) {
            $message = "A comment was added on ticket ({$ticket['ticket_number']})";
            $pdo->prepare('INSERT INTO notifications (user_id, ticket_id, type, message, created_at) VALUES (?, ?, ?, ?, NOW())')
                ->execute([$ticket['user_id'], $ticketId, 'comment', $message]);
        }
        // Notify leader if ticket has group
        if ($ticket['group_id']) {
            $leadersStmt = $pdo->prepare('SELECT id FROM users WHERE role = ? AND group_id = ?');
            $leadersStmt->execute(['leader', $ticket['group_id']]);
            foreach ($leadersStmt->fetchAll() as $leader) {
                $message = "A comment was added on ticket ({$ticket['ticket_number']}) in your group";
                $pdo->prepare('INSERT INTO notifications (user_id, ticket_id, type, message, created_at) VALUES (?, ?, ?, ?, NOW())')
                    ->execute([$leader['id'], $ticketId, 'comment', $message]);
            }
        }
        // Notify all admins and staff
        $adminStaffStmt = $pdo->prepare('SELECT id FROM users WHERE role IN (?, ?)');
        $adminStaffStmt->execute(['admin', 'staff']);
        foreach ($adminStaffStmt->fetchAll() as $adminOrStaff) {
            $message = "A comment was added on ticket ({$ticket['ticket_number']})";
            $pdo->prepare('INSERT INTO notifications (user_id, ticket_id, type, message, created_at) VALUES (?, ?, ?, ?, NOW())')
                ->execute([$adminOrStaff['id'], $ticketId, 'comment', $message]);
        }
    }
    echo json_encode(['id' => $commentId, 'message' => 'Comment added successfully']);
    exit;
}

echo json_encode(['error' => 'Invalid request']); 