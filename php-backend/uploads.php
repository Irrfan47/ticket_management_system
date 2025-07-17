<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
require 'db.php';
$id = $_GET['id'] ?? null;
if (!$id) { http_response_code(400); echo 'Missing id'; exit; }
$stmt = $pdo->prepare('SELECT original_name, mimetype, file_data FROM attachments WHERE id = ?');
$stmt->execute([$id]);
$file = $stmt->fetch();
if (!$file) { http_response_code(404); echo 'File not found'; exit; }

if (ob_get_level()) {
    ob_end_clean();
}
header('Content-Type: ' . $file['mimetype']);
header('Content-Length: ' . strlen($file['file_data']));
header('Content-Disposition: attachment; filename="' . $file['original_name'] . '"');
header('Pragma: public');
header('Expires: 0');
header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
header('Cache-Control: private', false);

echo $file['file_data'];
exit; 