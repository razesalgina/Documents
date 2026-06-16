<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

require __DIR__ . '/db.php';

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid JSON']);
    exit;
}

$gameInfo    = $data['game']    ?? null;
$playerStats = $data['players'] ?? null;

if (!$gameInfo || !$playerStats || !is_array($playerStats)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Data tidak lengkap']);
    exit;
}

$matchId = (int)($gameInfo['matchId'] ?? 0);
if ($matchId <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'match_id tidak valid']);
    exit;
}

try {
    $pdo->beginTransaction();

    // ── Auto game_number: hitung games yang sudah ada untuk match ini ──
    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM games WHERE match_id = :match_id');
    $countStmt->execute([':match_id' => $matchId]);
    $gameNumber = (int)$countStmt->fetchColumn() + 1;

    // ── Validasi batas BO dari matches.format ──
    $fmtStmt = $pdo->prepare('SELECT format FROM matches WHERE id = :id');
    $fmtStmt->execute([':id' => $matchId]);
    $fmt = $fmtStmt->fetchColumn();
    if ($fmt) {
        $maxGames = (int)filter_var($fmt, FILTER_SANITIZE_NUMBER_INT);
        if ($maxGames > 0 && $gameNumber > $maxGames) {
            http_response_code(422);
            echo json_encode([
                'ok'      => false,
                'message' => "Batas maksimal game untuk format {$fmt} sudah tercapai ({$maxGames} game)"
            ]);
            $pdo->rollBack();
            exit;
        }
    }

    // ── Insert game ──
    $stmt = $pdo->prepare('
        INSERT INTO games (match_id, game_number, result, team_kills, team_deaths, duration_minutes, duration_seconds)
        VALUES (:match_id, :game_number, :result, :team_kills, :team_deaths, :duration_minutes, :duration_seconds)
    ');
    $stmt->execute([
        ':match_id'         => $matchId,
        ':game_number'      => $gameNumber,
        ':result'           => $gameInfo['result'],
        ':team_kills'       => $gameInfo['teamKills'],
        ':team_deaths'      => $gameInfo['teamDeaths'],
        ':duration_minutes' => $gameInfo['durationMinutes'],
        ':duration_seconds' => $gameInfo['durationSeconds'],
    ]);

    $gameId = (int)$pdo->lastInsertId();

    // ── Insert players (dengan KDA computed) ──
    $playerStmt = $pdo->prepare('
        INSERT INTO game_players (game_id, role_name, player_name, hero_name, kills, deaths, assists, total_gold, kda)
        VALUES (:game_id, :role_name, :player_name, :hero_name, :kills, :deaths, :assists, :total_gold, :kda)
    ');

    foreach ($playerStats as $player) {
        $kills   = (int)($player['kills']   ?? 0);
        $deaths  = (int)($player['deaths']  ?? 0);
        $assists = (int)($player['assists'] ?? 0);
        $kda     = round(($kills + $assists) / max($deaths, 1), 2);

        $playerStmt->execute([
            ':game_id'     => $gameId,
            ':role_name'   => $player['roleName'],
            ':player_name' => $player['playerName'],
            ':hero_name'   => $player['heroName'],
            ':kills'       => $kills,
            ':deaths'      => $deaths,
            ':assists'     => $assists,
            ':total_gold'  => (int)($player['totalGold'] ?? 0),
            ':kda'         => $kda,
        ]);
    }

    $pdo->commit();
    echo json_encode(['ok' => true, 'gameId' => $gameId, 'gameNumber' => $gameNumber]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Gagal menyimpan game']);
}