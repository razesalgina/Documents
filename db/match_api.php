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

// ──────────────────────────────────────────
// GET: list
// ──────────────────────────────────────────
if ($method === 'GET' && $action === 'list') {
    try {
        $stmt = $pdo->query(
            'SELECT id, type, competition_id, match_format, opponent_name, our_score, opponent_score, match_date, match_time, status
             FROM matches
             ORDER BY match_date DESC, match_time DESC, id DESC'
        );
        $matches = $stmt->fetchAll();
        echo json_encode(['ok' => true, 'matches' => $matches]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil data match']);
    }
    exit;
}

// ──────────────────────────────────────────
// GET: get single match by id
// ──────────────────────────────────────────
if ($method === 'GET' && $action === 'get') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'ID tidak valid']);
        exit;
    }

    try {
        $stmt = $pdo->prepare(
            'SELECT id, type, competition_id, match_format, opponent_name, our_score, opponent_score, match_date, match_time, status
             FROM matches
             WHERE id = :id'
        );
        $stmt->execute([':id' => $id]);
        $match = $stmt->fetch();

        if (!$match) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'message' => 'Match tidak ditemukan']);
            exit;
        }

        echo json_encode(['ok' => true, 'match' => $match]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil data match']);
    }
    exit;
}

// ──────────────────────────────────────────
// POST: add | update
// ──────────────────────────────────────────
if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data     = json_decode($rawInput, true) ?? [];
    $action   = $data['action'] ?? $action;

    // ── ADD ────────────────────────────────
    if ($action === 'add') {
        $type          = strtolower(trim($data['type'] ?? ''));
        $opponentName  = trim($data['opponent_name'] ?? '');
        $matchDate     = trim($data['match_date'] ?? '');
        $matchTime     = trim($data['match_time'] ?? '');
        $matchFormat   = trim($data['match_format'] ?? '')  ?: null;
        $competitionId = isset($data['competition_id']) && $data['competition_id'] ? (int) $data['competition_id'] : null;
        $ourScore      = isset($data['our_score'])      ? (int) $data['our_score']      : 0;
        $opponentScore = isset($data['opponent_score']) ? (int) $data['opponent_score'] : 0;

        if ($type === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Type match wajib diisi']);
            exit;
        }

        if (!in_array($type, ['tournament', 'league', 'scrim', 'ranked'], true)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Type match tidak valid']);
            exit;
        }

        if ($type === 'ranked') {
            if ($matchDate === '') $matchDate = date('Y-m-d');
            $matchTime = '00:00:00';
        } elseif ($type === 'scrim') {
            if ($opponentName === '' || $matchDate === '') {
                http_response_code(400);
                echo json_encode(['ok' => false, 'message' => 'Lawan dan tanggal wajib diisi untuk Scrim']);
                exit;
            }
            $matchTime = '00:00:00';
        } elseif ($type === 'tournament' || $type === 'league') {
            if ($opponentName === '' || $matchDate === '' || $matchTime === '') {
                http_response_code(400);
                echo json_encode(['ok' => false, 'message' => 'Lawan, tanggal, dan jam wajib diisi untuk Tournament/League']);
                exit;
            }
        }

        $status = determineStatus($matchDate, $matchTime);

        try {
            $stmt = $pdo->prepare('
                INSERT INTO matches (type, competition_id, match_format, opponent_name, our_score, opponent_score, match_date, match_time, status)
                VALUES (:type, :competition_id, :match_format, :opponent_name, :our_score, :opponent_score, :match_date, :match_time, :status)
            ');
            $stmt->execute([
                ':type'           => $type,
                ':competition_id' => $competitionId,
                ':match_format'   => $matchFormat,
                ':opponent_name'  => $opponentName,
                ':our_score'      => $ourScore,
                ':opponent_score' => $opponentScore,
                ':match_date'     => $matchDate,
                ':match_time'     => $matchTime,
                ':status'         => $status,
            ]);

            $id = (int) $pdo->lastInsertId();
            echo json_encode([
                'ok'    => true,
                'match' => [
                    'id'             => $id,
                    'type'           => $type,
                    'competition_id' => $competitionId,
                    'match_format'   => $matchFormat,
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

    // ── UPDATE ─────────────────────────────
    if ($action === 'update') {
        $id = isset($data['id']) ? (int) $data['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'ID match tidak valid']);
            exit;
        }

        $type          = strtolower(trim($data['type'] ?? ''));
        $opponentName  = trim($data['opponent_name'] ?? '');
        $matchDate     = trim($data['match_date'] ?? '');
        $matchTime     = trim($data['match_time'] ?? '');
        $matchFormat   = trim($data['match_format'] ?? '') ?: null;
        $competitionId = isset($data['competition_id']) && $data['competition_id'] ? (int) $data['competition_id'] : null;
        $ourScore      = isset($data['our_score'])      ? (int) $data['our_score']      : 0;
        $opponentScore = isset($data['opponent_score']) ? (int) $data['opponent_score'] : 0;
        $statusManual  = trim($data['status'] ?? '');

        if ($type === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Type match wajib diisi']);
            exit;
        }

        if (!in_array($type, ['tournament', 'league', 'scrim', 'ranked'], true)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Type match tidak valid']);
            exit;
        }

        if ($type === 'ranked') {
            if ($matchDate === '') $matchDate = date('Y-m-d');
            $matchTime = '00:00:00';
        } elseif ($type === 'scrim') {
            if ($opponentName === '' || $matchDate === '') {
                http_response_code(400);
                echo json_encode(['ok' => false, 'message' => 'Lawan dan tanggal wajib diisi untuk Scrim']);
                exit;
            }
            if ($matchTime === '') $matchTime = '00:00:00';
        } elseif ($type === 'tournament' || $type === 'league') {
            if ($opponentName === '' || $matchDate === '' || $matchTime === '') {
                http_response_code(400);
                echo json_encode(['ok' => false, 'message' => 'Lawan, tanggal, dan jam wajib diisi untuk Tournament/League']);
                exit;
            }
        }

        // Status: gunakan override manual jika valid, atau auto-hitung
        $validStatuses = ['upcoming', 'finished', 'cancel'];
        $status = in_array($statusManual, $validStatuses, true)
            ? $statusManual
            : determineStatus($matchDate, $matchTime);

        try {
            $stmt = $pdo->prepare('
                UPDATE matches SET
                    type           = :type,
                    competition_id = :competition_id,
                    match_format   = :match_format,
                    opponent_name  = :opponent_name,
                    our_score      = :our_score,
                    opponent_score = :opponent_score,
                    match_date     = :match_date,
                    match_time     = :match_time,
                    status         = :status
                WHERE id = :id
            ');
            $stmt->execute([
                ':id'             => $id,
                ':type'           => $type,
                ':competition_id' => $competitionId,
                ':match_format'   => $matchFormat,
                ':opponent_name'  => $opponentName,
                ':our_score'      => $ourScore,
                ':opponent_score' => $opponentScore,
                ':match_date'     => $matchDate,
                ':match_time'     => $matchTime,
                ':status'         => $status,
            ]);

            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'message' => 'Match tidak ditemukan']);
                exit;
            }

            echo json_encode([
                'ok'    => true,
                'match' => [
                    'id'             => $id,
                    'type'           => $type,
                    'competition_id' => $competitionId,
                    'match_format'   => $matchFormat,
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
            echo json_encode(['ok' => false, 'message' => 'Gagal memperbarui match']);
        }
        exit;
    }
}

http_response_code(400);
echo json_encode(['ok' => false, 'message' => 'Action tidak dikenal']);