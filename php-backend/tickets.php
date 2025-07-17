<?php
// Method override for POST + _method (for free hosting compatibility)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (isset($input['_method'])) {
        $_SERVER['REQUEST_METHOD'] = strtoupper($input['_method']);
    }
    $_POST = array_merge($_POST, $input ?? []);
}
require 'db.php';
require_once __DIR__ . '/vendor/PHPMailer.php';
require_once __DIR__ . '/vendor/SMTP.php';
require_once __DIR__ . '/vendor/Exception.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $userId = $_GET['userId'] ?? null;
    $role = $_GET['role'] ?? 'admin';
    $query = 'SELECT t.*, u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email, g.name as group_name, g.location as group_location FROM tickets t LEFT JOIN users u ON t.user_id = u.id LEFT JOIN user_groups g ON t.group_id = g.id';
    $params = [];
    if ($role === 'ruser') {
        $query .= ' WHERE t.user_id = ?';
        $params[] = $userId;
    } else if ($role === 'leader') {
        $groupId = $_GET['groupId'] ?? null;
        if ($groupId) {
            $query .= ' WHERE u.group_id = ? OR t.user_id = ?';
            $params[] = $groupId;
            $params[] = $userId;
        } else {
            $query .= ' WHERE t.user_id = ?';
            $params[] = $userId;
        }
    }
    $query .= ' ORDER BY t.created_at DESC';
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $tickets = $stmt->fetchAll();
    // Ensure tags is always an array
    foreach ($tickets as &$ticket) {
        // Fix tags as before
        if (isset($ticket['tags']) && is_string($ticket['tags'])) {
            $decoded = json_decode($ticket['tags'], true);
            $ticket['tags'] = is_array($decoded) ? $decoded : [];
        }
        // Add customerName
        $ticket['customerName'] = trim(($ticket['user_first_name'] ?? '') . ' ' . ($ticket['user_last_name'] ?? ''));
        // Add customerEmail
        $ticket['customerEmail'] = $ticket['user_email'] ?? '';
        // Add groupName
        $ticket['groupName'] = $ticket['group_name'] ?? '';
        // Add groupLocation
        $ticket['groupLocation'] = $ticket['group_location'] ?? '';
        // Add createdAt in camelCase for frontend
        if (isset($ticket['created_at'])) {
            $ticket['createdAt'] = $ticket['created_at'];
        }
        if (isset($ticket['updated_at'])) {
            $ticket['updatedAt'] = $ticket['updated_at'];
        }
    }
    unset($ticket); // break reference
    echo json_encode($tickets);
    exit;
}

if ($method === 'POST') {
    // Check if it's a multipart/form-data (file upload)
    if (isset($_POST['title'])) {
        $title = $_POST['title'] ?? '';
        $description = $_POST['description'] ?? '';
        $priority = $_POST['priority'] ?? '';
        $category = $_POST['category'] ?? '';
        $tags = isset($_POST['tags']) ? $_POST['tags'] : '[]';
        $userId = $_POST['userId'] ?? null;
        $groupId = $_POST['groupId'] ?? null;
    } else {
        // Assume JSON
        $data = json_decode(file_get_contents('php://input'), true);
        $title = $data['title'] ?? '';
        $description = $data['description'] ?? '';
        $priority = $data['priority'] ?? '';
        $category = $data['category'] ?? '';
        $tags = isset($data['tags']) ? json_encode($data['tags']) : '[]';
        $userId = $data['userId'] ?? null;
        $groupId = $data['groupId'] ?? null;
    }
    $stmt = $pdo->prepare('INSERT INTO tickets (title, description, priority, category, tags, user_id, group_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())');
    $stmt->execute([$title, $description, $priority, $category, $tags, $userId, $groupId, 'open']);
    $ticketId = $pdo->lastInsertId();
    $ticketNumber = 'TCKT-' . str_pad($ticketId, 5, '0', STR_PAD_LEFT);
    $pdo->prepare('UPDATE tickets SET ticket_number = ? WHERE id = ?')->execute([$ticketNumber, $ticketId]);

    // Handle attachments (if any)
    if (isset($_FILES['attachments'])) {
        $files = $_FILES['attachments'];
        $fileCount = is_array($files['name']) ? count($files['name']) : 1;
        for ($i = 0; $i < $fileCount; $i++) {
            $tmpName = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
            $originalName = is_array($files['name']) ? $files['name'][$i] : $files['name'];
            $mimeType = is_array($files['type']) ? $files['type'][$i] : $files['type'];
            $size = is_array($files['size']) ? $files['size'][$i] : $files['size'];
            if ($tmpName && is_uploaded_file($tmpName)) {
                $fileData = file_get_contents($tmpName);
                $filename = time() . '-' . $originalName;
                $stmt = $pdo->prepare('INSERT INTO attachments (ticket_id, filename, original_name, mimetype, size, file_data, upload_date) VALUES (?, ?, ?, ?, ?, ?, NOW())');
                $stmt->execute([
                    $ticketId,
                    $filename,
                    $originalName,
                    $mimeType,
                    $size,
                    $fileData
                ]);
            }
        }
    }

    // Notify admin and staff about new ticket
    $adminStaffStmt = $pdo->prepare('SELECT id FROM users WHERE role IN (?, ?)');
    $adminStaffStmt->execute(['admin', 'staff']);
    foreach ($adminStaffStmt->fetchAll() as $adminOrStaff) {
        $message = "New ticket ($ticketNumber) created by user $userId";
        $pdo->prepare('INSERT INTO notifications (user_id, ticket_id, type, message, created_at) VALUES (?, ?, ?, ?, NOW())')
            ->execute([$adminOrStaff['id'], $ticketId, 'assignment', $message]);
    }

    // Notify leader if user belongs to a group
    if ($groupId) {
        $leadersStmt = $pdo->prepare('SELECT id FROM users WHERE role = ? AND group_id = ?');
        $leadersStmt->execute(['leader', $groupId]);
        foreach ($leadersStmt->fetchAll() as $leader) {
            $message = "New ticket ($ticketNumber) created in your group";
            $pdo->prepare('INSERT INTO notifications (user_id, ticket_id, type, message, created_at) VALUES (?, ?, ?, ?, NOW())')
                ->execute([$leader['id'], $ticketId, 'assignment', $message]);
        }
    }

    // Fetch user info for email
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    $customerName = isset($user['first_name'], $user['last_name']) ? $user['first_name'] . ' ' . $user['last_name'] : '';
    $customerEmail = $user['email'] ?? '';
    $customerLocation = $user['location'] ?? '-';
    $groupName = '-';
    if ($groupId) {
        $stmtGroup = $pdo->prepare('SELECT name FROM user_groups WHERE id = ?');
        $stmtGroup->execute([$groupId]);
        $group = $stmtGroup->fetch();
        if ($group && isset($group['name'])) {
            $groupName = $group['name'];
        }
    }
    // Prepare tags for display
    $tagsArray = is_string($tags) ? json_decode($tags, true) : (is_array($tags) ? $tags : []);
    if (!is_array($tagsArray)) $tagsArray = [];
    // Convert newlines in description to <br>
    $formattedDescription = nl2br($description);
    // Prepare attachments for email
    $emailAttachments = [];
    if (isset($_FILES['attachments'])) {
        $files = $_FILES['attachments'];
        $fileCount = is_array($files['name']) ? count($files['name']) : 1;
        for ($i = 0; $i < $fileCount; $i++) {
            $tmpName = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
            $originalName = is_array($files['name']) ? $files['name'][$i] : $files['name'];
            $mimeType = is_array($files['type']) ? $files['type'][$i] : $files['type'];
            if ($tmpName && is_uploaded_file($tmpName)) {
                $emailAttachments[] = [
                    'path' => $tmpName,
                    'name' => $originalName,
                    'type' => $mimeType
                ];
            }
        }
    }
    // Send email to self using PHPMailer via Gmail SMTP
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'kaungkhant12359@gmail.com';
        $mail->Password = 'ohctfrldgxdgizsq'; // your Gmail app password
        $mail->SMTPSecure = 'tls';
        $mail->Port = 587;
        $mail->setFrom('kaungkhant12359@gmail.com', 'Helpdesk');
        $mail->addAddress('kaungkhant12359@gmail.com'); // send to yourself
        $mail->Subject = "$title ($ticketNumber)";
        $mail->isHTML(true);
        $mail->Body =
            "<h2>New Ticket Created</h2>"
            . "<p>" . $formattedDescription . "</p>"
            . "<p><strong>Priority:</strong> $priority</p>"
            . "<p><strong>Category:</strong> $category</p>"
            . "<p><strong>Tags:</strong> " . htmlspecialchars(implode(', ', $tagsArray)) . "</p>"
            . "<hr />"
            . "<h3>Customer Information</h3>"
            . "<p><strong>Name:</strong> $customerName</p>"
            . "<p><strong>Email:</strong> $customerEmail</p>"
            . "<p><strong>Location:</strong> $customerLocation</p>"
            . "<p><strong>Group Name:</strong> $groupName</p>";
        // Attach uploaded files
        foreach ($emailAttachments as $att) {
            $mail->addAttachment($att['path'], $att['name'], 'base64', $att['type']);
        }
        $mail->send();
    } catch (Exception $e) {
        // Optionally: log error $mail->ErrorInfo
    }

    echo json_encode(['id' => $ticketId, 'ticketNumber' => $ticketNumber, 'message' => 'Ticket created successfully']);
    exit;
}

if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? null;
    $status = $data['status'] ?? '';
    $priority = $data['priority'] ?? '';
    $userId = $data['userId'] ?? null;
    $stmt = $pdo->prepare('UPDATE tickets SET status = ?, priority = ?, updated_at = NOW() WHERE id = ?');
    $stmt->execute([$status, $priority, $id]);

    // Fetch ticket info
    $stmtTicket = $pdo->prepare('SELECT * FROM tickets WHERE id = ?');
    $stmtTicket->execute([$id]);
    $ticket = $stmtTicket->fetch();
    if ($ticket) {
        // Notify ticket owner if not the updater
        if ($ticket['user_id'] && $ticket['user_id'] != $userId) {
            $message = "Status of ticket ({$ticket['ticket_number']}) changed to $status";
            $pdo->prepare('INSERT INTO notifications (user_id, ticket_id, type, message, created_at) VALUES (?, ?, ?, ?, NOW())')
                ->execute([$ticket['user_id'], $id, 'status_change', $message]);
        }
        // Notify leader if ticket has group
        if ($ticket['group_id']) {
            $leadersStmt = $pdo->prepare('SELECT id FROM users WHERE role = ? AND group_id = ?');
            $leadersStmt->execute(['leader', $ticket['group_id']]);
            foreach ($leadersStmt->fetchAll() as $leader) {
                $message = "Ticket ({$ticket['ticket_number']}) status changed to $status";
                $pdo->prepare('INSERT INTO notifications (user_id, ticket_id, type, message, created_at) VALUES (?, ?, ?, ?, NOW())')
                    ->execute([$leader['id'], $id, 'status_change', $message]);
            }
        }
        // Notify all admins
        $adminStmt = $pdo->prepare('SELECT id FROM users WHERE role = ?');
        $adminStmt->execute(['admin']);
        foreach ($adminStmt->fetchAll() as $admin) {
            $message = "Ticket ({$ticket['ticket_number']}) status changed to $status";
            $pdo->prepare('INSERT INTO notifications (user_id, ticket_id, type, message, created_at) VALUES (?, ?, ?, ?, NOW())')
                ->execute([$admin['id'], $id, 'status_change', $message]);
        }
    }
    echo json_encode(['message' => 'Ticket updated successfully']);
    exit;
}

if ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? null;
    // Delete attachments, comments, and the ticket
    $pdo->prepare('DELETE FROM attachments WHERE ticket_id = ?')->execute([$id]);
    $stmt = $pdo->prepare('DELETE FROM tickets WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode(['message' => 'Ticket deleted successfully']);
    exit;
}

echo json_encode(['error' => 'Invalid request']); 