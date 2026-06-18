<?php
header('Content-Type: application/json');

require __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── GET list ───────────────────────────────────
if ($method === 'GET' && $action === 'list') {
    try {
        $stmt = $pdo->query(
            'SELECT id, name, primary_role, secondary_role, is_active, created_at
             FROM players ORDER BY is_active DESC, name ASC'
        );
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['id']        = (int)$r['id'];
            $r['is_active'] = (int)$r['is_active'];
        }
        echo json_encode(['ok' => true, 'players' => $rows]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil data pemain']);
    }
    exit;
}

// ── GET stats ─────────────────────────────────
if ($method === 'GET' && $action === 'stats') {
    try {
        $row = $pdo->query(
            'SELECT COUNT(*) as total,
                    SUM(is_active = 1) as active_count
             FROM players'
        )->fetch();

        $roleRows = $pdo->query(
            "SELECT primary_role, COUNT(*) as cnt
             FROM players WHERE is_active = 1
             GROUP BY primary_role"
        )->fetchAll();
        $roleMap = [];
        foreach ($roleRows as $rr) $roleMap[$rr['primary_role']] = (int)$rr['cnt'];

        // FIX: player_name → JOIN players ON p.id = gp.player_id → p.name
        $topKda = $pdo->query(
            'SELECT p.name AS player_name,
                    ROUND(AVG(gp.kda), 2) AS avg_kda,
                    COUNT(*) AS games
             FROM game_players gp
             JOIN players p ON p.id = gp.player_id
             GROUP BY gp.player_id, p.name
             ORDER BY avg_kda DESC
             LIMIT 5'
        )->fetchAll();

        echo json_encode([
            'ok'           => true,
            'total'        => (int)$row['total'],
            'active_count' => (int)$row['active_count'],
            'role_dist'    => $roleMap,
            'top_kda'      => $topKda,
        ]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil stats tim']);
    }
    exit;
}

// ── POST ──────────────────────────────────────
if ($method === 'POST') {
    $data   = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $data['action'] ?? '';

    // ADD
    if ($action === 'add') {
        $name    = trim($data['name']           ?? '');
        $primary = trim($data['primary_role']   ?? '');
        $second  = trim($data['secondary_role'] ?? '') ?: null;
        $active  = isset($data['is_active']) ? (int)(bool)$data['is_active'] : 1;

        $validRoles = ['jungler','roamer','midlaner','goldlaner','explaner'];
        if ($name === '' || !in_array($primary, $validRoles, true)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Nama dan role utama wajib diisi']);
            exit;
        }
        if ($second !== null && !in_array($second, $validRoles, true)) $second = null;
        if ($second !== null && $second === $primary) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Role utama dan kedua tidak boleh sama']);
            exit;
        }

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO players (name, primary_role, secondary_role, is_active)
                 VALUES (:n, :p, :s, :a)'
            );
            $stmt->execute([':n' => $name, ':p' => $primary, ':s' => $second, ':a' => $active]);
            $id = (int)$pdo->lastInsertId();

            $row = $pdo->prepare(
                'SELECT id, name, primary_role, secondary_role, is_active, created_at
                 FROM players WHERE id=:id'
            );
            $row->execute([':id' => $id]);
            $player = $row->fetch();
            $player['id']        = (int)$player['id'];
            $player['is_active'] = (int)$player['is_active'];

            echo json_encode(['ok' => true, 'player' => $player]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal menambahkan pemain']);
        }
        exit;
    }

    // UPDATE
    if ($action === 'update') {
        $id      = (int)($data['id'] ?? 0);
        $name    = trim($data['name']           ?? '');
        $primary = trim($data['primary_role']   ?? '');
        $second  = trim($data['secondary_role'] ?? '') ?: null;

        $validRoles = ['jungler','roamer','midlaner','goldlaner','explaner'];
        if ($id <= 0 || $name === '' || !in_array($primary, $validRoles, true)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Data tidak valid']);
            exit;
        }
        if ($second !== null && !in_array($second, $validRoles, true)) $second = null;
        if ($second !== null && $second === $primary) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Role utama dan kedua tidak boleh sama']);
            exit;
        }

        try {
            $pdo->prepare(
                'UPDATE players SET name=:n, primary_role=:p, secondary_role=:s WHERE id=:id'
            )->execute([':n' => $name, ':p' => $primary, ':s' => $second, ':id' => $id]);
            echo json_encode(['ok' => true]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal memperbarui pemain']);
        }
        exit;
    }

    // TOGGLE
    if ($action === 'toggle') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'ID tidak valid']);
            exit;
        }
        try {
            $row = $pdo->prepare('SELECT is_active FROM players WHERE id=:id');
            $row->execute([':id' => $id]);
            $p = $row->fetch();
            if (!$p) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'message' => 'Pemain tidak ditemukan']);
                exit;
            }
            $new = $p['is_active'] ? 0 : 1;
            $pdo->prepare('UPDATE players SET is_active=:a WHERE id=:id')
                ->execute([':a' => $new, ':id' => $id]);
            echo json_encode(['ok' => true, 'is_active' => $new]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal mengubah status']);
        }
        exit;
    }

    // DELETE
    if ($action === 'delete') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'ID tidak valid']);
            exit;
        }
        try {
            $pdo->prepare('DELETE FROM players WHERE id=:id')->execute([':id' => $id]);
            echo json_encode(['ok' => true]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal menghapus pemain']);
        }
        exit;
    }
}

http_response_code(400);
echo json_encode(['ok' => false, 'message' => 'Action tidak dikenal']);
