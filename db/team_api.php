<?php
header('Content-Type: application/json');

require __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($method === 'GET' && $action === 'list') {
    // Ambil semua pemain
    try {
        $stmt = $pdo->query('SELECT id, name, primary_role, secondary_role, is_active FROM players ORDER BY id ASC');
        $players = $stmt->fetchAll();

        echo json_encode([
            'ok' => true,
            'players' => $players,
        ]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil data pemain']);
    }
    exit;
}

// Untuk operasi lain, kita pakai JSON body
if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? [];

    $action = $data['action'] ?? $action;

    if ($action === 'add') {
        $name = trim($data['name'] ?? '');
        $primaryRole = trim($data['primary_role'] ?? '');
        $secondaryRole = trim($data['secondary_role'] ?? '');
        $isActive = isset($data['is_active']) ? (int) !!$data['is_active'] : 1;

        if ($name === '' || $primaryRole === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Nama dan role utama wajib diisi']);
            exit;
        }

        try {
            $stmt = $pdo->prepare('
                INSERT INTO players (name, primary_role, secondary_role, is_active)
                VALUES (:name, :primary_role, :secondary_role, :is_active)
            ');
            $stmt->execute([
                ':name'           => $name,
                ':primary_role'   => $primaryRole,
                ':secondary_role' => $secondaryRole !== '' ? $secondaryRole : null,
                ':is_active'      => $isActive,
            ]);
            $id = (int) $pdo->lastInsertId();

            echo json_encode([
                'ok' => true,
                'player' => [
                    'id'             => $id,
                    'name'           => $name,
                    'primary_role'   => $primaryRole,
                    'secondary_role' => $secondaryRole !== '' ? $secondaryRole : null,
                    'is_active'      => $isActive,
                ],
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal menambahkan pemain']);
        }
        exit;
    }

    if ($action === 'toggle') {
        $id = isset($data['id']) ? (int) $data['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'ID pemain tidak valid']);
            exit;
        }

        try {
            // Ambil status sekarang
            $stmt = $pdo->prepare('SELECT is_active FROM players WHERE id = :id');
            $stmt->execute([':id' => $id]);
            $player = $stmt->fetch();

            if (!$player) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'message' => 'Pemain tidak ditemukan']);
                exit;
            }

            $newStatus = $player['is_active'] ? 0 : 1;

            $updateStmt = $pdo->prepare('UPDATE players SET is_active = :is_active WHERE id = :id');
            $updateStmt->execute([
                ':is_active' => $newStatus,
                ':id'        => $id,
            ]);

            echo json_encode(['ok' => true, 'is_active' => $newStatus]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal mengubah status pemain']);
        }
        exit;
    }

    if ($action === 'delete') {
        $id = isset($data['id']) ? (int) $data['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'ID pemain tidak valid']);
            exit;
        }

        try {
            $stmt = $pdo->prepare('DELETE FROM players WHERE id = :id');
            $stmt->execute([':id' => $id]);

            echo json_encode(['ok' => true]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal menghapus pemain']);
        }
        exit;
    }
}

// Jika action tidak dikenal
http_response_code(400);
echo json_encode(['ok' => false, 'message' => 'Action tidak dikenal']);