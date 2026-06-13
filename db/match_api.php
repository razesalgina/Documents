<?php
header('Content-Type: application/json');

require __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

function determineStatus(string $date, string $time): string {
    $matchDateTime = strtotime($date . ' ' . $time);
    if ($matchDateTime === false) {
        return 'upcoming';
    }

    $now = time();
    return $matchDateTime <= $now ? 'finished' : 'upcoming';
}

// LIST MATCHES
if ($method === 'GET' && $action === 'list') {
    try {
        $stmt = $pdo->query('SELECT id, type, opponent_name, our_score, opponent_score, match_date, match_time, status FROM matches ORDER BY match_date DESC, match_time DESC, id DESC');
        $matches = $stmt->fetchAll();

        echo json_encode([
            'ok' => true,
            'matches' => $matches,
        ]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil data match']);
    }
    exit;
}

// ADD / UPDATE / DELETE via POST (JSON)
if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? [];

    $action = $data['action'] ?? $action;

    if ($action === 'add') {
        $type = strtolower(trim($data['type'] ?? ''));
        $opponentName = trim($data['opponent_name'] ?? '');
        $matchDate = trim($data['match_date'] ?? '');
        $matchTime = trim($data['match_time'] ?? '');
        $ourScore = isset($data['our_score']) ? (int) $data['our_score'] : 0;
        $opponentScore = isset($data['opponent_score']) ? (int) $data['opponent_score'] : 0;

        if ($type === '' || $opponentName === '' || $matchDate === '' || $matchTime === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Type, lawan, tanggal, dan jam wajib diisi']);
            exit;
        }

        if (!in_array($type, ['tournament', 'league', 'scrim', 'ranked'], true)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Type match tidak valid']);
            exit;
        }

        $status = determineStatus($matchDate, $matchTime);

        try {
            $stmt = $pdo->prepare('
                INSERT INTO matches (type, opponent_name, our_score, opponent_score, match_date, match_time, status)
                VALUES (:type, :opponent_name, :our_score, :opponent_score, :match_date, :match_time, :status)
            ');

            $stmt->execute([
                ':type'           => $type,
                ':opponent_name'  => $opponentName,
                ':our_score'      => $ourScore,
                ':opponent_score' => $opponentScore,
                ':match_date'     => $matchDate,
                ':match_time'     => $matchTime,
                ':status'         => $status,
            ]);

            $id = (int) $pdo->lastInsertId();

            echo json_encode([
                'ok' => true,
                'match' => [
                    'id'             => $id,
                    'type'           => $type,
                    'opponent_name'  => $opponentName,
                    'our_score'      => $ourScore,
                    'opponent_score' => $opponentScore,
                    'match_date'     => $matchDate,
                    'match_time'     => $matchTime,
                    'status'         => $status,
                ],
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal menyimpan match']);
        }
        exit;
    }

    // Tambahan (opsional): delete, update score, dsb.
}

http_response_code(400);
echo json_encode(['ok' => false, 'message' => 'Action tidak dikenal']);