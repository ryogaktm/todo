<?php
// function.php - 修正版

// ★修正: asset/function.php なので、1つ上がプロジェクトルート
$PROJECT_ROOT = dirname(__DIR__);
$DATA_DIR = $PROJECT_ROOT . '/data';

// 親タスクID（サブページ判定）
$PARENT_ID = isset($_GET['sub']) ? (int)$_GET['sub'] : 0;

// CSVパス
$CSV_PATH_MAIN = $DATA_DIR . '/tasks.csv';
$CSV_PATH = ($PARENT_ID > 0)
    ? ($DATA_DIR . '/subtasks_' . $PARENT_ID . '.csv')
    : $CSV_PATH_MAIN;

// ★新システム用CSV
$TAG_TYPES_CSV = $DATA_DIR . '/tag_types.csv'; // ID, Name (例: "案件", "優先度")
$TAGS_CSV      = $DATA_DIR . '/tags.csv';      // ID, TypeID, Name, Color
$TASK_TAGS_CSV = $DATA_DIR . '/task_tags.csv'; // TaskID, TagID

// ディレクトリ作成
if (!is_dir($DATA_DIR)) {
    @mkdir($DATA_DIR, 0777, true);
}

// 初期ファイル作成
if (!file_exists($TAG_TYPES_CSV)) {
    $fp = fopen($TAG_TYPES_CSV, 'c+');
    fputcsv($fp, ['id', 'name', 'color', 'order', 'created_at', 'updated_at']);
    fclose($fp);
}
if (!file_exists($TAGS_CSV)) {
    $fp = fopen($TAGS_CSV, 'c+');
    fputcsv($fp, ['id', 'type_id', 'name', 'color', 'created_at', 'updated_at']);
    fclose($fp);
}
if (!file_exists($TASK_TAGS_CSV)) {
    $fp = fopen($TASK_TAGS_CSV, 'c+');
    fputcsv($fp, ['task_id', 'tag_id']);
    fclose($fp);
}

// CSV読み書きヘルパー
function csv_read_all($path)
{
    $rows = [];
    if (!file_exists($path)) return $rows;
    if (($fp = fopen($path, 'r')) !== false) {
        fgetcsv($fp); // ヘッダスキップ
        while (($data = fgetcsv($fp)) !== false) {
            // カラム不足を補完
            $data = array_pad($data, 22, ''); // 余裕を見て多めに
            $rows[] = [
                'id' => (int)$data[0],
                'title' => (string)$data[1],
                'body' => (string)$data[2],
                'left_pct' => (float)$data[3],
                'top_pct' => (float)$data[4],
                // category_id は廃止だが列ズレ防止のため残す
                'category_id' => (int)$data[5],
                'start_date' => $data[6],
                'testup_date' => $data[7],
                'proof_date' => $data[8],
                'delivery_date' => $data[9],
                'flag_start' => (int)$data[10],
                'flag_test' => (int)$data[11],
                'flag_proof' => (int)$data[12],
                'flag_delivery' => (int)$data[13],
                'flag_fb' => (int)$data[14],
                'ball_side' => (int)$data[15],
                'ball_mine' => (string)$data[16],
                'ball_theirs' => (string)$data[17],
                'ball_prod' => (string)$data[18],
                'ball_due' => (string)$data[19],
                'est_hours' => (string)$data[20], // 追加
                'created_at' => $data[21] ?: date('c'),
            ];
        }
        fclose($fp);
    }
    return $rows;
}

function csv_write_all($path, $rows)
{
    $tmp = $path . '.tmp';
    $fp = fopen($tmp, 'w');
    if (!$fp) return false;
    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        return false;
    }

    // ヘッダ
    fputcsv($fp, [
        'id',
        'title',
        'body',
        'left_pct',
        'top_pct',
        'category_id',
        'start_date',
        'testup_date',
        'proof_date',
        'delivery_date',
        'flag_start',
        'flag_test',
        'flag_proof',
        'flag_delivery',
        'flag_fb',
        'ball_side',
        'ball_mine',
        'ball_theirs',
        'ball_prod',
        'ball_due',
        'est_hours',
        'created_at',
        'updated_at'
    ]);

    foreach ($rows as $r) {
        fputcsv($fp, [
            (int)($r['id'] ?? 0),
            (string)($r['title'] ?? ''),
            (string)($r['body'] ?? ''),
            (float)($r['left_pct'] ?? 50),
            (float)($r['top_pct'] ?? 50),
            0, // category_id (廃止により0固定)
            (string)($r['start_date'] ?? ''),
            (string)($r['testup_date'] ?? ''),
            (string)($r['proof_date'] ?? ''),
            (string)($r['delivery_date'] ?? ''),
            (int)($r['flag_start'] ?? 0),
            (int)($r['flag_test'] ?? 0),
            (int)($r['flag_proof'] ?? 0),
            (int)($r['flag_delivery'] ?? 0),
            (int)($r['flag_fb'] ?? 0),
            (int)($r['ball_side'] ?? 0),
            (string)($r['ball_mine'] ?? ''),
            (string)($r['ball_theirs'] ?? ''),
            (string)($r['ball_prod'] ?? ''),
            (string)($r['ball_due'] ?? ''),
            (string)($r['est_hours'] ?? ''),
            (string)($r['created_at'] ?? date('c')),
            date('c'),
        ]);
    }

    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return rename($tmp, $path);
}

function json_out($arr)
{
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// API処理
$action = $_GET['action'] ?? null;

if ($action) {
    // タスク一覧
    if ($action === 'list') {
        $rows = csv_read_all($CSV_PATH);
        json_out(['ok' => true, 'items' => $rows]);
    }

    // タスク作成
    if ($action === 'create') {
        $title = trim($_POST['title'] ?? '');
        if ($title === '') json_out(['ok' => false, 'error' => 'タイトル必須'], 400);

        $rows = csv_read_all($CSV_PATH);
        $maxId = 0;
        foreach ($rows as $r) $maxId = max($maxId, $r['id']);
        $id = $maxId + 1;

        $new = $_POST; // そのまま受け取る（バリデーションは簡易的に）
        $new['id'] = $id;
        $new['left_pct'] = 50;
        $new['top_pct'] = 50;

        $rows[] = $new;
        csv_write_all($CSV_PATH, $rows);

        // ★タグ保存
        $tag_ids = $_POST['tag_ids'] ?? [];
        if (is_array($tag_ids)) {
            $fp = fopen($TASK_TAGS_CSV, 'a');
            foreach ($tag_ids as $tid) fputcsv($fp, [$id, (int)$tid]);
            fclose($fp);
        }

        json_out(['ok' => true, 'item' => $new]);
    }

    // タスク更新
    if ($action === 'update') {
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) json_out(['ok' => false], 400);

        $rows = csv_read_all($CSV_PATH);
        $found = false;
        foreach ($rows as &$r) {
            if ($r['id'] === $id) {
                // 送られてきたキーだけ更新
                foreach ($_POST as $k => $v) {
                    if ($k !== 'id' && $k !== 'tag_ids') $r[$k] = $v;
                }
                $found = true;
                break;
            }
        }
        if ($found) csv_write_all($CSV_PATH, $rows);

        // ★タグ更新（全削除して書き直し）
        if (isset($_POST['tag_ids'])) {
            $all = [];
            if (($fp = fopen($TASK_TAGS_CSV, 'r')) !== false) {
                fgetcsv($fp);
                while (($line = fgetcsv($fp)) !== false) {
                    if ((int)$line[0] !== $id) $all[] = $line;
                }
                fclose($fp);
            }
            $newTags = is_array($_POST['tag_ids']) ? $_POST['tag_ids'] : [];
            foreach ($newTags as $tid) $all[] = [$id, (int)$tid];

            $fp = fopen($TASK_TAGS_CSV, 'w');
            fputcsv($fp, ['task_id', 'tag_id']);
            foreach ($all as $line) fputcsv($fp, $line);
            fclose($fp);
        }

        json_out(['ok' => true]);
    }

    // タスク削除
    if ($action === 'delete') {
        $id = (int)$_POST['id'];
        $rows = csv_read_all($CSV_PATH);
        $rows = array_filter($rows, fn($r) => $r['id'] !== $id);
        csv_write_all($CSV_PATH, $rows);

        // 関連タグも削除
        // (省略: 実運用ではtask_tags.csvからも削除推奨)
        json_out(['ok' => true]);
    }

    // --- タグ関連API ---

    // タグタイプ一覧
    if ($action === 'tagtype_list') {
        $rows = [];
        if (($fp = fopen($TAG_TYPES_CSV, 'r')) !== false) {
            fgetcsv($fp);
            while ($r = fgetcsv($fp)) $rows[] = ['id' => $r[0], 'name' => $r[1], 'color' => $r[2], 'order' => $r[3]];
            fclose($fp);
        }
        usort($rows, fn($a, $b) => $a['order'] <=> $b['order']);
        json_out(['ok' => true, 'items' => $rows]);
    }

    // タグ一覧
    if ($action === 'tag_list') {
        $rows = [];
        if (($fp = fopen($TAGS_CSV, 'r')) !== false) {
            fgetcsv($fp);
            while ($r = fgetcsv($fp)) $rows[] = ['id' => $r[0], 'type_id' => $r[1], 'name' => $r[2], 'color' => $r[3]];
            fclose($fp);
        }
        json_out(['ok' => true, 'items' => $rows]);
    }

    // タスク-タグ紐付け一覧
    if ($action === 'task_tags_list') {
        $map = [];
        if (($fp = fopen($TASK_TAGS_CSV, 'r')) !== false) {
            fgetcsv($fp);
            while ($r = fgetcsv($fp)) {
                $map[(int)$r[0]][] = (int)$r[1];
            }
            fclose($fp);
        }
        json_out(['ok' => true, 'map' => $map]);
    }

    // タグタイプ作成
    if ($action === 'tagtype_create') {
        $name = trim($_POST['name'] ?? '');
        if (!$name) json_out(['ok' => false]);

        // 簡易ID採番
        $max = 0;
        if (($fp = fopen($TAG_TYPES_CSV, 'r'))) {
            fgetcsv($fp);
            while ($r = fgetcsv($fp)) $max = max($max, (int)$r[0]);
            fclose($fp);
        }
        $id = $max + 1;
        $fp = fopen($TAG_TYPES_CSV, 'a');
        fputcsv($fp, [$id, $name, '', 0, date('c'), date('c')]);
        fclose($fp);
        json_out(['ok' => true]);
    }

    // タグ作成
    if ($action === 'tag_create') {
        $typeId = (int)$_POST['type_id'];
        $name = trim($_POST['name'] ?? '');
        $color = $_POST['color'] ?? '';
        if (!$name) json_out(['ok' => false]);

        $max = 0;
        if (($fp = fopen($TAGS_CSV, 'r'))) {
            fgetcsv($fp);
            while ($r = fgetcsv($fp)) $max = max($max, (int)$r[0]);
            fclose($fp);
        }
        $id = $max + 1;
        $fp = fopen($TAGS_CSV, 'a');
        fputcsv($fp, [$id, $typeId, $name, $color, date('c'), date('c')]);
        fclose($fp);
        json_out(['ok' => true]);
    }

    // サブタスクカウント
    if ($action === 'subcounts') {
        $idsRaw = $_POST['ids'] ?? '';
        $ids = array_filter(explode(',', $idsRaw), 'strlen');
        $out = [];
        foreach ($ids as $pid) {
            $f = $DATA_DIR . '/subtasks_' . intval($pid) . '.csv';
            $c = 0;
            if (file_exists($f)) {
                $lines = file($f);
                $c = count($lines) - 1; // header
                if ($c < 0) $c = 0;
            }
            $out[$pid] = $c;
        }
        json_out(['ok' => true, 'counts' => $out]);
    }
}
