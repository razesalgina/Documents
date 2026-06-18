<?php
/**
 * competition_delete.php
 * POST body (JSON):
 *   { "id": 5, "mode": "cascade" }   → hapus competition + semua match + semua game
 *   { "id": 5, "mode": "detach"  }   → hapus competition saja, match.competition_id = NULL
 */
header('Content-Type: application/json');
require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$id   = (int)($data['id']   ?? 0);
$mode = $data['mode'] ?? 'cascade'; // 'cascade' | 'detach'

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'ID kompetisi tidak valid']);
    exit;
}

try {
    $pdo->beginTransaction();

    if ($mode === 'cascade') {
        // 1. Ambil semua match yang terkait
        $matchStmt = $pdo->prepare('SELECT id FROM matches WHERE competition_id = :cid');
        $matchStmt->execute([':cid' => $id]);
        $matchIds = $matchStmt->fetchAll(PDO::FETCH_COLUMN);

        // 2. Hapus semua games dari match-match tersebut
        if ($matchIds) {
            $placeholders = implode(',', array_fill(0, count($matchIds), '?'));
            $pdo->prepare("DELETE FROM games WHERE match_id IN ($placeholders)")
                ->execute($matchIds);
        }

        // 3. Hapus semua matches
        $pdo->prepare('DELETE FROM matches WHERE competition_id = :cid')
            ->execute([':cid' => $id]);

    } else {
        // Detach: lepas relasi match → competition, data match & game tetap
        $pdo->prepare('UPDATE matches SET competition_id = NULL WHERE competition_id = :cid')
            ->execute([':cid' => $id]);
    }

    // 4. Hapus competition
    $stmt = $pdo->prepare('DELETE FROM competitions WHERE id = :id');
    $stmt->execute([':id' => $id]);

    if ($stmt->rowCount() === 0) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['ok' => false, 'message' => 'Kompetisi tidak ditemukan']);
        exit;
    }

    $pdo->commit();
    echo json_encode(['ok' => true]);

} catch (Throwable $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Gagal menghapus: ' . $e->getMessage()]);
}