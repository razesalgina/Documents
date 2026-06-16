<?php
error_reporting(E_ALL);
header('Content-Type: application/json');

require __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

function normalizeType(?string $type): string {
    $t = strtolower(trim($type ?? ''));
    if ($t === 'tournament' || $t === 'league') {
        return $t;
    }
    return '';
}

/**
 * GET /competition_api.php?action=list
 */
if ($method === 'GET' && $action === 'list') {
    try {
        $stmt = $pdo->query('
            SELECT
              id,
              type,
              name,
              registration_fee,
              prizepool,
              final_rank,
              status,
              team_count,
              phase_count,
              phase_format1,
              phase_format2,
              phase_format3,
              phase_format4,
              phase_status1,
              phase_status2,
              phase_status3,
              phase_status4,
              phase_bracket1,
              phase_bracket2,
              phase_bracket3,
              phase_bracket4
            FROM competitions
            ORDER BY created_at DESC, id DESC
        ');
        $competitions = $stmt->fetchAll();

        echo json_encode([
            'ok' => true,
            'competitions' => $competitions,
        ]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil data kompetisi']);
    }
    exit;
}

/**
 * GET /competition_api.php?action=get&id=123
 */
if ($method === 'GET' && $action === 'get') {
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'ID tidak valid']);
        exit;
    }

    try {
        $stmt = $pdo->prepare('SELECT * FROM competitions WHERE id = ?');
        $stmt->execute([$id]);
        $competition = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$competition) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'message' => 'Competition tidak ditemukan']);
            exit;
        }

        echo json_encode(['ok' => true, 'competition' => $competition]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil detail kompetisi']);
    }
    exit;
}

/**
 * POST: ADD & UPDATE
 */
if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? [];

    $action = $data['action'] ?? $action;

    /* ---------- ADD ---------- */
    if ($action === 'add') {
        $type = normalizeType($data['type'] ?? '');
        $name = trim($data['name'] ?? '');
        $registrationFee = isset($data['registration_fee']) ? (int) $data['registration_fee'] : 0;
        $prizepool = isset($data['prizepool']) ? (int) $data['prizepool'] : 0;
        $finalRank = $data['final_rank'] ?? null;
        $status = $data['status'] ?? null;
        $teamCount = isset($data['team_count']) ? (int) $data['team_count'] : 0;
        $phaseCount = isset($data['phase_count']) ? (int) $data['phase_count'] : 1;

        if ($type === '' || $name === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Tipe dan nama kompetisi wajib diisi']);
            exit;
        }

        if ($teamCount <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Jumlah tim tidak valid']);
            exit;
        }

        if ($phaseCount < 1 || $phaseCount > 4) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Jumlah fase harus antara 1 sampai 4']);
            exit;
        }

        $phaseFormat1 = $data['phase_format1'] ?? null;
        $phaseFormat2 = $data['phase_format2'] ?? null;
        $phaseFormat3 = $data['phase_format3'] ?? null;
        $phaseFormat4 = $data['phase_format4'] ?? null;

        $phaseStatus1 = $data['phase_status1'] ?? null;
        $phaseStatus2 = $data['phase_status2'] ?? null;
        $phaseStatus3 = $data['phase_status3'] ?? null;
        $phaseStatus4 = $data['phase_status4'] ?? null;

        $phaseBracket1 = $data['phase_bracket1'] ?? null;
        $phaseBracket2 = $data['phase_bracket2'] ?? null;
        $phaseBracket3 = $data['phase_bracket3'] ?? null;
        $phaseBracket4 = $data['phase_bracket4'] ?? null;

        // field baru per fase
        $phaseStartDate1 = $data['phase_start_date1'] ?? null;
        $phaseStartDate2 = $data['phase_start_date2'] ?? null;
        $phaseStartDate3 = $data['phase_start_date3'] ?? null;
        $phaseStartDate4 = $data['phase_start_date4'] ?? null;

        $phaseTeamCount1 = isset($data['phase_team_count1']) ? (int) $data['phase_team_count1'] : null;
        $phaseTeamCount2 = isset($data['phase_team_count2']) ? (int) $data['phase_team_count2'] : null;
        $phaseTeamCount3 = isset($data['phase_team_count3']) ? (int) $data['phase_team_count3'] : null;
        $phaseTeamCount4 = isset($data['phase_team_count4']) ? (int) $data['phase_team_count4'] : null;

        $phaseGroupCount1 = isset($data['phase_group_count1']) ? (int) $data['phase_group_count1'] : null;
        $phaseGroupCount2 = isset($data['phase_group_count2']) ? (int) $data['phase_group_count2'] : null;
        $phaseGroupCount3 = isset($data['phase_group_count3']) ? (int) $data['phase_group_count3'] : null;
        $phaseGroupCount4 = isset($data['phase_group_count4']) ? (int) $data['phase_group_count4'] : null;

        $phaseGroupTeamCount1 = isset($data['phase_group_team_count1']) ? (int) $data['phase_group_team_count1'] : null;
        $phaseGroupTeamCount2 = isset($data['phase_group_team_count2']) ? (int) $data['phase_group_team_count2'] : null;
        $phaseGroupTeamCount3 = isset($data['phase_group_team_count3']) ? (int) $data['phase_group_team_count3'] : null;
        $phaseGroupTeamCount4 = isset($data['phase_group_team_count4']) ? (int) $data['phase_group_team_count4'] : null;

        // FINAL RANK & RESULT per fase
        $phaseFinalRank1 = $data['phase_final_rank1'] ?? null;
        $phaseFinalRank2 = $data['phase_final_rank2'] ?? null;
        $phaseFinalRank3 = $data['phase_final_rank3'] ?? null;
        $phaseFinalRank4 = $data['phase_final_rank4'] ?? null;

        $phaseResult1 = isset($data['phase_result1']) ? (int) $data['phase_result1'] : null;
        $phaseResult2 = isset($data['phase_result2']) ? (int) $data['phase_result2'] : null;
        $phaseResult3 = isset($data['phase_result3']) ? (int) $data['phase_result3'] : null;
        $phaseResult4 = isset($data['phase_result4']) ? (int) $data['phase_result4'] : null;

        try {
            $stmt = $pdo->prepare('
                INSERT INTO competitions (
                type,
                name,
                registration_fee,
                prizepool,
                final_rank,
                status,
                team_count,
                phase_count,
                phase_format1,
                phase_format2,
                phase_format3,
                phase_format4,
                phase_status1,
                phase_status2,
                phase_status3,
                phase_status4,
                phase_bracket1,
                phase_bracket2,
                phase_bracket3,
                phase_bracket4,
                phase_start_date1,
                phase_start_date2,
                phase_start_date3,
                phase_start_date4,
                phase_team_count1,
                phase_team_count2,
                phase_team_count3,
                phase_team_count4,
                phase_group_count1,
                phase_group_count2,
                phase_group_count3,
                phase_group_count4,
                phase_group_team_count1,
                phase_group_team_count2,
                phase_group_team_count3,
                phase_group_team_count4,
                phase_final_rank1,
                phase_final_rank2,
                phase_final_rank3,
                phase_final_rank4,
                phase_result1,
                phase_result2,
                phase_result3,
                phase_result4
                )
                VALUES (
                :type,
                :name,
                :registration_fee,
                :prizepool,
                :final_rank,
                :status,
                :team_count,
                :phase_count,
                :phase_format1,
                :phase_format2,
                :phase_format3,
                :phase_format4,
                :phase_status1,
                :phase_status2,
                :phase_status3,
                :phase_status4,
                :phase_bracket1,
                :phase_bracket2,
                :phase_bracket3,
                :phase_bracket4,
                :phase_start_date1,
                :phase_start_date2,
                :phase_start_date3,
                :phase_start_date4,
                :phase_team_count1,
                :phase_team_count2,
                :phase_team_count3,
                :phase_team_count4,
                :phase_group_count1,
                :phase_group_count2,
                :phase_group_count3,
                :phase_group_count4,
                :phase_group_team_count1,
                :phase_group_team_count2,
                :phase_group_team_count3,
                :phase_group_team_count4,
                :phase_final_rank1,
                :phase_final_rank2,
                :phase_final_rank3,
                :phase_final_rank4,
                :phase_result1,
                :phase_result2,
                :phase_result3,
                :phase_result4
                )
            ');

            $stmt->execute([
                ':type'                   => $type,
                ':name'                   => $name,
                ':registration_fee'       => $registrationFee,
                ':prizepool'              => $prizepool,
                ':final_rank'             => $finalRank,
                ':status'                 => $status,
                ':team_count'             => $teamCount,
                ':phase_count'            => $phaseCount,
                ':phase_format1'          => $phaseFormat1,
                ':phase_format2'          => $phaseFormat2,
                ':phase_format3'          => $phaseFormat3,
                ':phase_format4'          => $phaseFormat4,
                ':phase_status1'          => $phaseStatus1,
                ':phase_status2'          => $phaseStatus2,
                ':phase_status3'          => $phaseStatus3,
                ':phase_status4'          => $phaseStatus4,
                ':phase_bracket1'         => $phaseBracket1,
                ':phase_bracket2'         => $phaseBracket2,
                ':phase_bracket3'         => $phaseBracket3,
                ':phase_bracket4'         => $phaseBracket4,
                ':phase_start_date1'      => $phaseStartDate1,
                ':phase_start_date2'      => $phaseStartDate2,
                ':phase_start_date3'      => $phaseStartDate3,
                ':phase_start_date4'      => $phaseStartDate4,
                ':phase_team_count1'      => $phaseTeamCount1,
                ':phase_team_count2'      => $phaseTeamCount2,
                ':phase_team_count3'      => $phaseTeamCount3,
                ':phase_team_count4'      => $phaseTeamCount4,
                ':phase_group_count1'     => $phaseGroupCount1,
                ':phase_group_count2'     => $phaseGroupCount2,
                ':phase_group_count3'     => $phaseGroupCount3,
                ':phase_group_count4'     => $phaseGroupCount4,
                ':phase_group_team_count1'=> $phaseGroupTeamCount1,
                ':phase_group_team_count2'=> $phaseGroupTeamCount2,
                ':phase_group_team_count3'=> $phaseGroupTeamCount3,
                ':phase_group_team_count4'=> $phaseGroupTeamCount4,
                ':phase_final_rank1'      => $phaseFinalRank1,
                ':phase_final_rank2'      => $phaseFinalRank2,
                ':phase_final_rank3'      => $phaseFinalRank3,
                ':phase_final_rank4'      => $phaseFinalRank4,
                ':phase_result1'          => $phaseResult1,
                ':phase_result2'          => $phaseResult2,
                ':phase_result3'          => $phaseResult3,
                ':phase_result4'          => $phaseResult4,
            ]);

            $id = (int) $pdo->lastInsertId();

            echo json_encode([
                'ok' => true,
                'competition' => [
                    'id'                => $id,
                    'type'              => $type,
                    'name'              => $name,
                    'registration_fee'  => $registrationFee,
                    'prizepool'         => $prizepool,
                    'final_rank'        => $finalRank,
                    'status'            => $status,
                    'team_count'        => $teamCount,
                    'phase_count'       => $phaseCount,
                    'phase_format1'     => $phaseFormat1,
                    'phase_format2'     => $phaseFormat2,
                    'phase_format3'     => $phaseFormat3,
                    'phase_format4'     => $phaseFormat4,
                    'phase_status1'     => $phaseStatus1,
                    'phase_status2'     => $phaseStatus2,
                    'phase_status3'     => $phaseStatus3,
                    'phase_status4'     => $phaseStatus4,
                    'phase_bracket1'    => $phaseBracket1,
                    'phase_bracket2'    => $phaseBracket2,
                    'phase_bracket3'    => $phaseBracket3,
                    'phase_bracket4'    => $phaseBracket4,
                    'phase_start_date1' => $phaseStartDate1,
                    'phase_start_date2' => $phaseStartDate2,
                    'phase_start_date3' => $phaseStartDate3,
                    'phase_start_date4' => $phaseStartDate4,
                    'phase_team_count1' => $phaseTeamCount1,
                    'phase_team_count2' => $phaseTeamCount2,
                    'phase_team_count3' => $phaseTeamCount3,
                    'phase_team_count4' => $phaseTeamCount4,
                    'phase_group_count1'=> $phaseGroupCount1,
                    'phase_group_count2'=> $phaseGroupCount2,
                    'phase_group_count3'=> $phaseGroupCount3,
                    'phase_group_count4'=> $phaseGroupCount4,
                    'phase_group_team_count1'=> $phaseGroupTeamCount1,
                    'phase_group_team_count2'=> $phaseGroupTeamCount2,
                    'phase_group_team_count3'=> $phaseGroupTeamCount3,
                    'phase_group_team_count4'=> $phaseGroupTeamCount4,
                    'phase_final_rank1' => $phaseFinalRank1,
                    'phase_final_rank2' => $phaseFinalRank2,
                    'phase_final_rank3' => $phaseFinalRank3,
                    'phase_final_rank4' => $phaseFinalRank4,
                    'phase_result1'     => $phaseResult1,
                    'phase_result2'     => $phaseResult2,
                    'phase_result3'     => $phaseResult3,
                    'phase_result4'     => $phaseResult4,
                ],
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'ok' => false,
                'message' => 'Gagal menyimpan kompetisi: ' . $e->getMessage(),
            ]);
        }
        exit;
    }

    /* ---------- UPDATE ---------- */
    if ($action === 'update') {
        $id = isset($data['id']) ? (int) $data['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'ID kompetisi tidak valid']);
            exit;
        }
        error_log('UPDATE competition payload: ' . json_encode($data));

        $type = normalizeType($data['type'] ?? '');
        $name = trim($data['name'] ?? '');
        $registrationFee = isset($data['registration_fee']) ? (int) $data['registration_fee'] : 0;
        $prizepool = isset($data['prizepool']) ? (int) $data['prizepool'] : 0;
        $finalRank = $data['final_rank'] ?? null;
        $status = $data['status'] ?? null;
        $teamCount = isset($data['team_count']) ? (int) $data['team_count'] : 0;
        $phaseCount = isset($data['phase_count']) ? (int) $data['phase_count'] : 1;

        if ($type === '' || $name === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Tipe dan nama kompetisi wajib diisi']);
            exit;
        }

        if ($teamCount <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Jumlah tim tidak valid']);
            exit;
        }

        if ($phaseCount < 1 || $phaseCount > 4) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Jumlah fase harus antara 1 sampai 4']);
            exit;
        }

        $phaseFormat1 = $data['phase_format1'] ?? null;
        $phaseFormat2 = $data['phase_format2'] ?? null;
        $phaseFormat3 = $data['phase_format3'] ?? null;
        $phaseFormat4 = $data['phase_format4'] ?? null;

        $phaseStatus1 = $data['phase_status1'] ?? null;
        $phaseStatus2 = $data['phase_status2'] ?? null;
        $phaseStatus3 = $data['phase_status3'] ?? null;
        $phaseStatus4 = $data['phase_status4'] ?? null;

        $phaseBracket1 = $data['phase_bracket1'] ?? null;
        $phaseBracket2 = $data['phase_bracket2'] ?? null;
        $phaseBracket3 = $data['phase_bracket3'] ?? null;
        $phaseBracket4 = $data['phase_bracket4'] ?? null;

        // field baru per fase
        $phaseStartDate1 = $data['phase_start_date1'] ?? null;
        $phaseStartDate2 = $data['phase_start_date2'] ?? null;
        $phaseStartDate3 = $data['phase_start_date3'] ?? null;
        $phaseStartDate4 = $data['phase_start_date4'] ?? null;

        $phaseTeamCount1 = isset($data['phase_team_count1']) ? (int) $data['phase_team_count1'] : null;
        $phaseTeamCount2 = isset($data['phase_team_count2']) ? (int) $data['phase_team_count2'] : null;
        $phaseTeamCount3 = isset($data['phase_team_count3']) ? (int) $data['phase_team_count3'] : null;
        $phaseTeamCount4 = isset($data['phase_team_count4']) ? (int) $data['phase_team_count4'] : null;

        $phaseGroupCount1 = isset($data['phase_group_count1']) ? (int) $data['phase_group_count1'] : null;
        $phaseGroupCount2 = isset($data['phase_group_count2']) ? (int) $data['phase_group_count2'] : null;
        $phaseGroupCount3 = isset($data['phase_group_count3']) ? (int) $data['phase_group_count3'] : null;
        $phaseGroupCount4 = isset($data['phase_group_count4']) ? (int) $data['phase_group_count4'] : null;

        $phaseGroupTeamCount1 = isset($data['phase_group_team_count1']) ? (int) $data['phase_group_team_count1'] : null;
        $phaseGroupTeamCount2 = isset($data['phase_group_team_count2']) ? (int) $data['phase_group_team_count2'] : null;
        $phaseGroupTeamCount3 = isset($data['phase_group_team_count3']) ? (int) $data['phase_group_team_count3'] : null;
        $phaseGroupTeamCount4 = isset($data['phase_group_team_count4']) ? (int) $data['phase_group_team_count4'] : null;

        // FINAL RANK & RESULT per fase
        $phaseFinalRank1 = $data['phase_final_rank1'] ?? null;
        $phaseFinalRank2 = $data['phase_final_rank2'] ?? null;
        $phaseFinalRank3 = $data['phase_final_rank3'] ?? null;
        $phaseFinalRank4 = $data['phase_final_rank4'] ?? null;

        $phaseResult1 = isset($data['phase_result1']) ? (int) $data['phase_result1'] : null;
        $phaseResult2 = isset($data['phase_result2']) ? (int) $data['phase_result2'] : null;
        $phaseResult3 = isset($data['phase_result3']) ? (int) $data['phase_result3'] : null;
        $phaseResult4 = isset($data['phase_result4']) ? (int) $data['phase_result4'] : null;

        try {
            $stmt = $pdo->prepare('
                UPDATE competitions SET
                type = :type,
                name = :name,
                registration_fee = :registration_fee,
                prizepool = :prizepool,
                final_rank = :final_rank,
                status = :status,
                team_count = :team_count,
                phase_count = :phase_count,
                phase_format1 = :phase_format1,
                phase_format2 = :phase_format2,
                phase_format3 = :phase_format3,
                phase_format4 = :phase_format4,
                phase_status1 = :phase_status1,
                phase_status2 = :phase_status2,
                phase_status3 = :phase_status3,
                phase_status4 = :phase_status4,
                phase_bracket1 = :phase_bracket1,
                phase_bracket2 = :phase_bracket2,
                phase_bracket3 = :phase_bracket3,
                phase_bracket4 = :phase_bracket4,
                phase_start_date1 = :phase_start_date1,
                phase_start_date2 = :phase_start_date2,
                phase_start_date3 = :phase_start_date3,
                phase_start_date4 = :phase_start_date4,
                phase_team_count1 = :phase_team_count1,
                phase_team_count2 = :phase_team_count2,
                phase_team_count3 = :phase_team_count3,
                phase_team_count4 = :phase_team_count4,
                phase_group_count1 = :phase_group_count1,
                phase_group_count2 = :phase_group_count2,
                phase_group_count3 = :phase_group_count3,
                phase_group_count4 = :phase_group_count4,
                phase_group_team_count1 = :phase_group_team_count1,
                phase_group_team_count2 = :phase_group_team_count2,
                phase_group_team_count3 = :phase_group_team_count3,
                phase_group_team_count4 = :phase_group_team_count4,
                phase_final_rank1 = :phase_final_rank1,
                phase_final_rank2 = :phase_final_rank2,
                phase_final_rank3 = :phase_final_rank3,
                phase_final_rank4 = :phase_final_rank4,
                phase_result1 = :phase_result1,
                phase_result2 = :phase_result2,
                phase_result3 = :phase_result3,
                phase_result4 = :phase_result4
                WHERE id = :id
            ');

            $stmt->execute([
                ':id'                  => $id,
                ':type'                => $type,
                ':name'                => $name,
                ':registration_fee'    => $registrationFee,
                ':prizepool'           => $prizepool,
                ':final_rank'          => $finalRank,
                ':status'              => $status,
                ':team_count'          => $teamCount,
                ':phase_count'         => $phaseCount,
                ':phase_format1'       => $phaseFormat1,
                ':phase_format2'       => $phaseFormat2,
                ':phase_format3'       => $phaseFormat3,
                ':phase_format4'       => $phaseFormat4,
                ':phase_status1'       => $phaseStatus1,
                ':phase_status2'       => $phaseStatus2,
                ':phase_status3'       => $phaseStatus3,
                ':phase_status4'       => $phaseStatus4,
                ':phase_bracket1'      => $phaseBracket1,
                ':phase_bracket2'      => $phaseBracket2,
                ':phase_bracket3'      => $phaseBracket3,
                ':phase_bracket4'      => $phaseBracket4,
                ':phase_start_date1'   => $phaseStartDate1,
                ':phase_start_date2'   => $phaseStartDate2,
                ':phase_start_date3'   => $phaseStartDate3,
                ':phase_start_date4'   => $phaseStartDate4,
                ':phase_team_count1'   => $phaseTeamCount1,
                ':phase_team_count2'   => $phaseTeamCount2,
                ':phase_team_count3'   => $phaseTeamCount3,
                ':phase_team_count4'   => $phaseTeamCount4,
                ':phase_group_count1'  => $phaseGroupCount1,
                ':phase_group_count2'  => $phaseGroupCount2,
                ':phase_group_count3'  => $phaseGroupCount3,
                ':phase_group_count4'  => $phaseGroupCount4,
                ':phase_group_team_count1'=> $phaseGroupTeamCount1,
                ':phase_group_team_count2'=> $phaseGroupTeamCount2,
                ':phase_group_team_count3'=> $phaseGroupTeamCount3,
                ':phase_group_team_count4'=> $phaseGroupTeamCount4,
                ':phase_final_rank1'   => $phaseFinalRank1,
                ':phase_final_rank2'   => $phaseFinalRank2,
                ':phase_final_rank3'   => $phaseFinalRank3,
                ':phase_final_rank4'   => $phaseFinalRank4,
                ':phase_result1'       => $phaseResult1,
                ':phase_result2'       => $phaseResult2,
                ':phase_result3'       => $phaseResult3,
                ':phase_result4'       => $phaseResult4,
            ]);

            echo json_encode(['ok' => true]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'ok' => false,
                'message' => 'Gagal memperbarui kompetisi: ' . $e->getMessage(),
            ]);
        }
        exit;
    }

    /* ---------- DELETE ---------- */
    if ($action === 'delete') {
        $id = isset($data['id']) ? (int) $data['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'ID kompetisi tidak valid']);
            exit;
        }

        try {
            $stmt = $pdo->prepare('DELETE FROM competitions WHERE id = :id');
            $stmt->execute([':id' => $id]);

            echo json_encode(['ok' => true]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'ok' => false,
                'message' => 'Gagal menghapus kompetisi: ' . $e->getMessage(),
            ]);
        }
        exit;
    }

    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Action tidak dikenal']);
    exit;
}

// Fallback method lain
http_response_code(405);
echo json_encode(['ok' => false, 'message' => 'Method tidak diizinkan']);