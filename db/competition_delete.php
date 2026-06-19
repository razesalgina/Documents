<?php
/**
 * db/competition_delete.php
 *
 * POST body (JSON):
 *   { "id": 5, "mode": "cascade" }
 *       → Hapus competition + semua match miliknya + semua game dalam match-match tersebut
 *
 *   { "id": 5, "mode": "detach" }
 *       → Lepas relasi (matches.competition_id = NULL), lalu hapus competition.
 *         Data match & game tetap tersimpan.
 *
 * Response JSON:
 *   { "ok": true, "deleted_matches": 3, "deleted_games": 9 }  ← cascade
 *   { "ok": true, "detached_matches": 3 }                     ← detach
 *   { "ok": false, "message": "..." }
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// ── OPTIONS preflight ────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require __DIR__ . '/db.php';

// ── Guard method ────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

// ── Parse body ──────────────────────────────────────────────────────
$data = json_decode(file_get_contents('php://input'), true) ?? [];
$id   = (int)($data['id']   ?? 0);
$mode = trim($data['mode']  ?? 'cascade');

// ── Validasi input ──────────────────────────────────────────────────
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'ID kompetisi tidak valid']);
    exit;
}

if (!in_array($mode, ['cascade', 'detach'], true)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Mode hapus tidak valid. Gunakan cascade atau detach.']);
    exit;
}

// ── Early exit: pastikan competition exist sebelum transaksi ─────────
try {
    $checkStmt = $pdo->prepare('SELECT id FROM competitions WHERE id = :id');
    $checkStmt->execute([':id' => $id]);
    if (!$checkStmt->fetch()) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'message' => 'Kompetisi tidak ditemukan']);
        exit;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Gagal memverifikasi kompetisi: ' . $e->getMessage()]);
    exit;
}

// ── Eksekusi dalam transaksi ─────────────────────────────────────────
try {
    $pdo->beginTransaction();

    $deletedGames   = 0;
    $deletedMatches = 0;
    $detachedMatches = 0;

    if ($mode === 'cascade') {
        // 1. Ambil semua match_id yang terkait kompetisi ini
        $matchStmt = $pdo->prepare('SELECT id FROM matches WHERE competition_id = :cid');
        $matchStmt->execute([':cid' => $id]);
        $matchIds = $matchStmt->fetchAll(PDO::FETCH_COLUMN);

        // 2. Hapus semua games dari match-match tersebut
        if (!empty($matchIds)) {
            $placeholders = implode(',', array_fill(0, count($matchIds), '?'));
            $gameStmt = $pdo->prepare("DELETE FROM games WHERE match_id IN ($placeholders)");
            $gameStmt->execute($matchIds);
            $deletedGames = $gameStmt->rowCount();
        }

        // 3. Hapus semua matches milik kompetisi
        $matchDelStmt = $pdo->prepare('DELETE FROM matches WHERE competition_id = :cid');
        $matchDelStmt->execute([':cid' => $id]);
        $deletedMatches = $matchDelStmt->rowCount();

    } else {
        // detach: lepas relasi match ↔ competition; data match & game tetap
        $detachStmt = $pdo->prepare('UPDATE matches SET competition_id = NULL WHERE competition_id = :cid');
        $detachStmt->execute([':cid' => $id]);
        $detachedMatches = $detachStmt->rowCount();
    }

    // 4. Hapus record competition
    $pdo->prepare('DELETE FROM competitions WHERE id = :id')
        ->execute([':id' => $id]);

    $pdo->commit();

    $response = ['ok' => true];
    if ($mode === 'cascade') {
        $response['deleted_matches'] = $deletedMatches;
        $response['deleted_games']   = $deletedGames;
    } else {
        $response['detached_matches'] = $detachedMatches;
    }

    echo json_encode($response);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Gagal menghapus kompetisi: ' . $e->getMessage()]);
}
