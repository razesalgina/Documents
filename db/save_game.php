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

$gameInfo = $data['game'] ?? null;
$playerStats = $data['players'] ?? null;

if (!$gameInfo || !$playerStats || !is_array($playerStats)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Data tidak lengkap']);
    exit;
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('
        INSERT INTO games (match_id, game_number, result, team_kills, team_deaths, duration_minutes, duration_seconds)
        VALUES (:match_id, :game_number, :result, :team_kills, :team_deaths, :duration_minutes, :duration_seconds)
    ');

    $stmt->execute([
        ':match_id'         => $gameInfo['matchId'] ?? null,
        ':game_number'      => $gameInfo['gameNumber'],
        ':result'           => $gameInfo['result'],
        ':team_kills'       => $gameInfo['teamKills'],
        ':team_deaths'      => $gameInfo['teamDeaths'],
        ':duration_minutes' => $gameInfo['durationMinutes'],
        ':duration_seconds' => $gameInfo['durationSeconds'],
    ]);

    $gameId = (int) $pdo->lastInsertId();

    $playerStmt = $pdo->prepare('
        INSERT INTO game_players (game_id, role_name, player_name, hero_name, kills, deaths, assists, total_gold)
        VALUES (:game_id, :role_name, :player_name, :hero_name, :kills, :deaths, :assists, :total_gold)
    ');

    foreach ($playerStats as $player) {
        $playerStmt->execute([
            ':game_id'    => $gameId,
            ':role_name'  => $player['roleName'],
            ':player_name'=> $player['playerName'],
            ':hero_name'  => $player['heroName'],
            ':kills'      => $player['kills'],
            ':deaths'     => $player['deaths'],
            ':assists'    => $player['assists'],
            ':total_gold' => $player['totalGold'],
        ]);
    }

    $pdo->commit();

    echo json_encode(['ok' => true, 'gameId' => $gameId]);
} catch (Throwable $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Gagal menyimpan game']);
}