<?php
header('Content-Type: application/json');

require __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// ── GET: games by match_id ──────────────────────
if ($method === 'GET' && $action === 'list') {
    $matchId = isset($_GET['match_id']) ? (int)$_GET['match_id'] : 0;
    if ($matchId <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'match_id tidak valid']);
        exit;
    }
    try {
        // Games
        $stmt = $pdo->prepare(
            'SELECT id, match_id, game_number, result, team_kills, team_deaths,
                    duration_minutes, duration_seconds, created_at
             FROM games
             WHERE match_id = :match_id
             ORDER BY game_number ASC'
        );
        $stmt->execute([':match_id' => $matchId]);
        $games = $stmt->fetchAll();

        // MVP per game: player dengan KDA tertinggi
        // KDA = (kills + assists) / MAX(deaths, 1)
        if (!empty($games)) {
            $gameIds = array_column($games, 'id');
            $inClause = implode(',', array_fill(0, count($gameIds), '?'));

            $mvpStmt = $pdo->prepare(
                "SELECT gp.game_id,
                        gp.player_name,
                        ROUND((gp.kills + gp.assists) / GREATEST(gp.deaths, 1), 2) AS kda
                 FROM game_players gp
                 INNER JOIN (
                     SELECT game_id,
                            MAX((kills + assists) / GREATEST(deaths, 1)) AS max_kda
                     FROM game_players
                     WHERE game_id IN ($inClause)
                     GROUP BY game_id
                 ) best ON gp.game_id = best.game_id
                       AND (gp.kills + gp.assists) / GREATEST(gp.deaths, 1) = best.max_kda
                 WHERE gp.game_id IN ($inClause)
                 GROUP BY gp.game_id"
            );
            $mvpStmt->execute(array_merge($gameIds, $gameIds));
            $mvpRows = $mvpStmt->fetchAll();

            $mvpMap = [];
            foreach ($mvpRows as $row) {
                $mvpMap[(int)$row['game_id']] = $row['player_name'];
            }

            foreach ($games as &$game) {
                $game['mvp'] = $mvpMap[(int)$game['id']] ?? null;
            }
            unset($game);
        }

        echo json_encode(['ok' => true, 'games' => $games]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil data game']);
    }
    exit;
}

// ── POST: delete ───────────────────────────────
if ($method === 'POST') {
    $data   = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $data['action'] ?? $action;

    if ($action === 'delete') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'ID tidak valid']);
            exit;
        }
        try {
            // Ambil game_number & match_id sebelum dihapus
            $sel = $pdo->prepare('SELECT match_id, game_number FROM games WHERE id = :id');
            $sel->execute([':id' => $id]);
            $game = $sel->fetch();
            if (!$game) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'message' => 'Game tidak ditemukan']);
                exit;
            }

            $pdo->beginTransaction();

            // Hapus game_players dulu (FK)
            $pdo->prepare('DELETE FROM game_players WHERE game_id = :id')
                ->execute([':id' => $id]);

            // Hapus game
            $pdo->prepare('DELETE FROM games WHERE id = :id')
                ->execute([':id' => $id]);

            // Re-number: geser game_number games yang lebih besar dari yang dihapus
            $pdo->prepare(
                'UPDATE games
                 SET game_number = game_number - 1
                 WHERE match_id = :match_id AND game_number > :game_number'
            )->execute([
                ':match_id'    => $game['match_id'],
                ':game_number' => $game['game_number'],
            ]);

            $pdo->commit();
            echo json_encode(['ok' => true]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal menghapus game']);
        }
        exit;
    }
}

http_response_code(400);
echo json_encode(['ok' => false, 'message' => 'Action tidak dikenal']);