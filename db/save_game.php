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

    // ── Auto game_number ──
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

    // ── Insert game_players ──
    // FIX BUG C: gunakan player_id (FK ke tabel players) bukan player_name
    // FIX BUG B: kda dibaca dari payload, tidak dihitung otomatis
    $playerStmt = $pdo->prepare('
        INSERT INTO game_players (game_id, player_id, role_name, hero_name, kills, deaths, assists, kda, total_gold)
        VALUES (:game_id, :player_id, :role_name, :hero_name, :kills, :deaths, :assists, :kda, :total_gold)
    ');

    foreach ($playerStats as $player) {
        $playerId  = (int)($player['playerId']  ?? 0);
        $heroName  = trim($player['heroName']   ?? '');
        $roleName  = trim($player['roleName']   ?? '');
        $kills     = (int)($player['kills']     ?? 0);
        $deaths    = (int)($player['deaths']    ?? 0);
        $assists   = (int)($player['assists']   ?? 0);
        $kda       = round((float)($player['kda'] ?? 0.0), 2);
        $totalGold = (int)($player['totalGold'] ?? 0);

        if ($playerId <= 0) {
            $pdo->rollBack();
            http_response_code(422);
            echo json_encode(['ok' => false, 'message' => "player_id tidak valid untuk role {$roleName}"]);
            exit;
        }

        $playerStmt->execute([
            ':game_id'    => $gameId,
            ':player_id'  => $playerId,
            ':role_name'  => $roleName,
            ':hero_name'  => $heroName,
            ':kills'      => $kills,
            ':deaths'     => $deaths,
            ':assists'    => $assists,
            ':kda'        => $kda,
            ':total_gold' => $totalGold,
        ]);
    }

    $pdo->commit();
    echo json_encode(['ok' => true, 'gameId' => $gameId, 'gameNumber' => $gameNumber]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Gagal menyimpan game: ' . $e->getMessage()]);
}
