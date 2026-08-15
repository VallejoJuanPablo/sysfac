<?php
/**
 * API interna para operaciones de base de datos del equipo Archie.
 * Usado por n8n workflows (Telegram bot, webhooks).
 * URL: http://localhost/Equipo/scripts/archie-db.php
 */

header('Content-Type: application/json; charset=utf-8');

$API_KEY = 'archie_local_2026';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$headers = getallheaders();
$key = $headers['X-Api-Key'] ?? $headers['x-api-key'] ?? '';
if ($key !== $API_KEY) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || !isset($body['action'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing action']);
    exit;
}

$conn = new mysqli('localhost', 'root', '', 'archie_team');
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connection failed: ' . $conn->connect_error]);
    exit;
}
$conn->set_charset('utf8mb4');

$action = $body['action'];

switch ($action) {
    case 'read_state':
        $chatId = intval($body['chat_id'] ?? 0);

        $stmt = $conn->prepare("SELECT step, proyecto_id, titulo FROM chat_states WHERE chat_id = ?");
        $stmt->bind_param('i', $chatId);
        $stmt->execute();
        $result = $stmt->get_result();
        $state = $result->fetch_assoc();
        $stmt->close();

        $result2 = $conn->query("SELECT id, codigo, nombre FROM proyectos ORDER BY nombre");
        $projects = [];
        while ($row = $result2->fetch_assoc()) {
            $projects[] = $row;
        }

        echo json_encode(['state' => $state, 'projects' => $projects]);
        break;

    case 'save_state':
        $chatId = intval($body['chat_id'] ?? 0);
        $proyectoId = intval($body['proyecto_id'] ?? 0);
        $step = $body['step'] ?? '';

        $stmt = $conn->prepare("REPLACE INTO chat_states (chat_id, proyecto_id, step) VALUES (?, ?, ?)");
        $stmt->bind_param('iis', $chatId, $proyectoId, $step);
        $stmt->execute();
        $stmt->close();

        echo json_encode(['ok' => true]);
        break;

    case 'update_state':
        $chatId = intval($body['chat_id'] ?? 0);
        $titulo = $body['titulo'] ?? null;
        $step = $body['step'] ?? null;

        if ($titulo !== null && $step !== null) {
            $stmt = $conn->prepare("UPDATE chat_states SET titulo = ?, step = ? WHERE chat_id = ?");
            $stmt->bind_param('ssi', $titulo, $step, $chatId);
        } elseif ($titulo !== null) {
            $stmt = $conn->prepare("UPDATE chat_states SET titulo = ? WHERE chat_id = ?");
            $stmt->bind_param('si', $titulo, $chatId);
        } elseif ($step !== null) {
            $stmt = $conn->prepare("UPDATE chat_states SET step = ? WHERE chat_id = ?");
            $stmt->bind_param('si', $step, $chatId);
        } else {
            echo json_encode(['ok' => true]);
            break;
        }
        $stmt->execute();
        $stmt->close();

        echo json_encode(['ok' => true]);
        break;

    case 'insert_pendiente':
        $proyectoId = intval($body['proyecto_id'] ?? 0);
        $titulo = $body['titulo'] ?? '';
        $tipo = $body['tipo'] ?? 'spec';
        $prioridad = $body['prioridad'] ?? 'media';
        $fuente = $body['fuente'] ?? 'telegram';
        $chatId = intval($body['chat_id'] ?? 0);

        $stmt = $conn->prepare("INSERT INTO pendientes (proyecto_id, titulo, tipo, prioridad, fuente) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param('issss', $proyectoId, $titulo, $tipo, $prioridad, $fuente);
        $stmt->execute();
        $insertId = $conn->insert_id;
        $stmt->close();

        if ($chatId) {
            $stmt2 = $conn->prepare("DELETE FROM chat_states WHERE chat_id = ?");
            $stmt2->bind_param('i', $chatId);
            $stmt2->execute();
            $stmt2->close();
        }

        echo json_encode(['ok' => true, 'id' => $insertId]);
        break;

    case 'delete_state':
        $chatId = intval($body['chat_id'] ?? 0);
        $stmt = $conn->prepare("DELETE FROM chat_states WHERE chat_id = ?");
        $stmt->bind_param('i', $chatId);
        $stmt->execute();
        $stmt->close();

        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Unknown action: ' . $action]);
}

$conn->close();
