
<?php
// function.php 

// プロジェクトルート（asset/php の2つ上）
$PROJECT_ROOT = dirname(__DIR__, 2);

// 直下の /data を使う
$DATA_DIR      = $PROJECT_ROOT . '/data';
$CSV_PATH_MAIN = $DATA_DIR . '/tasks.csv';


// 親タスクID（サブページ判定）
$PARENT_ID = isset($_GET['sub']) ? (int)$_GET['sub'] : 0;

// アクティブなCSV（サブがあればそのCSV、なければメイン）
$CSV_PATH = ($PARENT_ID > 0)
    ? ($DATA_DIR . '/subtasks_' . $PARENT_ID . '.csv')
    : $CSV_PATH_MAIN;

// ストレージ確保
if (!is_dir($DATA_DIR)) {
    @mkdir($DATA_DIR, 0777, true);
}

$HEADER = [
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
    'ball_theirs',   // ← 追加
    'ball_due',
    'created_at',
    'updated_at'
];

if (!file_exists($CSV_PATH_MAIN)) {
    if (($fp = fopen($CSV_PATH_MAIN, 'c+')) !== false) {
        fputcsv($fp, $HEADER);
        fclose($fp);
    }
}
if (!file_exists($CSV_PATH)) {
    if (($fp = fopen($CSV_PATH, 'c+')) !== false) {
        fputcsv($fp, $HEADER);
        fclose($fp);
    }
}

// 親タスク名を取得（サブページ表示用）
function get_task_title_by_id($path, $id)
{
    if ($id <= 0 || !file_exists($path)) return '';
    if (($fp = fopen($path, 'r')) !== false) {
        $header = fgetcsv($fp);
        while (($row = fgetcsv($fp)) !== false) {
            if ((int)$row[0] === (int)$id) {
                fclose($fp);
                return (string)$row[1];
            }
        }
        fclose($fp);
    }
    return '';
}

$PARENT_TITLE = $PARENT_ID > 0 ? get_task_title_by_id($CSV_PATH_MAIN, $PARENT_ID) : '';

// 親タスクの category_id を取得
function get_task_category_by_id($path, $id)
{
    if ($id <= 0 || !file_exists($path)) return 0;
    if (($fp = fopen($path, 'r')) !== false) {
        fgetcsv($fp); // header skip
        while (($row = fgetcsv($fp)) !== false) {
            // 後方互換：少ない列でもOK（最低6列まで埋める）
            $row = array_pad($row, 6, '');
            if ((int)$row[0] === (int)$id) {
                fclose($fp);
                return (int)$row[5]; // 6列目が category_id
            }
        }
        fclose($fp);
    }
    return 0;
}

// サブページ用：親のカテゴリIDを保持（index.php でも使える）
$PARENT_CAT_ID = ($PARENT_ID > 0) ? get_task_category_by_id($CSV_PATH_MAIN, $PARENT_ID) : 0;

// カテゴリCSV（id,name,color,notes,created_at,updated_at）
$CATS_CSV = $DATA_DIR . '/categories.csv';
if (!file_exists($CATS_CSV)) {
    if (($fp = fopen($CATS_CSV, 'c+')) !== false) {
        fputcsv($fp, ['id', 'name', 'color', 'notes', 'created_at', 'updated_at']);
        fclose($fp);
    }
}

//csv_write_all1
function csv_write_all($path, $rows)
{
    $tmp = $path . '.tmp';
    $fp = fopen($tmp, 'w');
    if (!$fp) return false;
    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        return false;
    }

    // 20列ヘッダ（$HEADER と同じ順序に揃える）
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
        'ball_due',
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
            (int)  ($r['category_id'] ?? 0),
            (string)($r['start_date'] ?? ''),
            (string)($r['testup_date'] ?? ''),
            (string)($r['proof_date'] ?? ''),
            (string)($r['delivery_date'] ?? ''),
            (int)  ($r['flag_start'] ?? 0),
            (int)  ($r['flag_test'] ?? 0),
            (int)  ($r['flag_proof'] ?? 0),
            (int)  ($r['flag_delivery'] ?? 0),
            (int)  ($r['flag_fb'] ?? 0),
            (int)  ($r['ball_side'] ?? 0),        // ← 追加
            (string)($r['ball_mine'] ?? ''),      // ← 追加
            (string)($r['ball_theirs'] ?? ''),    // ← 追加
            (string)($r['ball_due'] ?? ''),
            (string)($r['created_at'] ?? date('c')),
            (string)($r['updated_at'] ?? date('c')),
        ]);
    }

    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return rename($tmp, $path);
}

function json_out($arr, $code = 200)
{
    http_response_code($code);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

//COLOR
function norm_color($c)
{
    $c = trim((string)$c);
    if ($c === '') return '';
    if ($c[0] !== '#') $c = '#' . $c;
    if (!preg_match('/^#([0-9a-f]{6}|[0-9a-f]{3})$/i', $c)) return '';
    return strtoupper($c);
}

// ---- Helpers ----1
function csv_read_all($path)
{
    $rows = [];
    if (!file_exists($path)) return $rows;
    if (($fp = fopen($path, 'r')) !== false) {
        $header = fgetcsv($fp);
        while (($data = fgetcsv($fp)) !== false) {
            // 20 列にパディング（旧12/17列CSVでもOK）
            $data = array_pad($data, 21, '');
            [
                $id,
                $title,
                $body,
                $left,
                $top,
                $cat,
                $start,
                $test,
                $proof,
                $delivery,
                $fstart,
                $ftest,
                $fproof,
                $fdelivery,
                $ffb,
                $ball_side,
                $ball_mine,
                $ball_theirs,
                $ball_due,
                $created,
                $updated
            ] = $data;

            $rows[] = [
                'id' => (int)$id,
                'title' => (string)$title,
                'body' => (string)$body,
                'left_pct' => (float)$left,
                'top_pct' => (float)$top,
                'category_id' => (int)$cat,
                'start_date' => $start,
                'testup_date' => $test,
                'proof_date' => $proof,
                'delivery_date' => $delivery,
                'flag_start' => (int)($fstart ?: 0),
                'flag_test' => (int)($ftest ?: 0),
                'flag_proof' => (int)($fproof ?: 0),
                'flag_delivery' => (int)($fdelivery ?: 0),
                'flag_fb' => (int)($ffb ?: 0),
                'ball_side' => (int)($ball_side ?: 0),
                'ball_mine' => (string)$ball_mine,
                'ball_theirs' => (string)$ball_theirs,
                'ball_due'    => (string)$ball_due,
                'created_at' => $created ?: date('c'),
                'updated_at' => $updated ?: date('c'),
            ];
        }
        fclose($fp);
    }
    return $rows;
}



// ---- API ----
$action = $_GET['action'] ?? null;
if ($action) {
    // CORS for same-origin XHR; adjust if needed
    header('Cache-Control: no-store');

    if ($action === 'list') {
        $rows = csv_read_all($CSV_PATH);
        json_out(['ok' => true, 'items' => $rows]);
    }
    if ($action === 'create') {
        $title = trim($_POST['title'] ?? '');
        $body  = trim($_POST['body'] ?? '');
        $cat   = isset($_POST['category_id']) ? (int)$_POST['category_id'] : 0;

        $start = trim($_POST['start_date'] ?? '');
        $test  = trim($_POST['testup_date'] ?? '');
        $proof = trim($_POST['proof_date'] ?? '');
        $deliv = trim($_POST['delivery_date'] ?? '');

        // 0=こっち, 1=向こう, 2=なし を許可
        $ball_side   = isset($_POST['ball_side']) ? (int)$_POST['ball_side'] : 0;
        $ball_side   = in_array($ball_side, [0, 1, 2], true) ? $ball_side : 0;
        $ball_mine   = trim($_POST['ball_mine']   ?? '');
        $ball_theirs = trim($_POST['ball_theirs'] ?? '');
        $ball_due    = trim($_POST['ball_due']    ?? '');

        if ($title === '') json_out(['ok' => false, 'error' => 'タイトルは必須です。'], 400);
        if ($start === '' && ($test !== '' || $proof !== '' || $deliv !== '')) {
            json_out(['ok' => false, 'error' => '着手日が未設定のまま他の日付は設定できません。'], 400);
        }

        // サブページでは親カテゴリを強制
        if ($PARENT_ID > 0) {
            $cat = (int)$PARENT_CAT_ID;
        }

        // flags
        $flag_start    = isset($_POST['flag_start'])    ? (int)$_POST['flag_start']    : null;
        $flag_test     = isset($_POST['flag_test'])     ? (int)$_POST['flag_test']     : 0;
        $flag_proof    = isset($_POST['flag_proof'])    ? (int)$_POST['flag_proof']    : 0;
        $flag_delivery = isset($_POST['flag_delivery']) ? (int)$_POST['flag_delivery'] : 0;
        $flag_fb       = isset($_POST['flag_fb'])       ? (int)$_POST['flag_fb']       : 0;

        // 着手フラグが未指定なら日付から自動判定（後方互換）
        if ($flag_start === null) {
            $sd = $start !== '' ? strtotime($start) : 0;
            $flag_start = ($sd && $sd <= strtotime('today')) ? 1 : 0;
        }

        // 採番
        $rows = csv_read_all($CSV_PATH);
        $maxId = 0;
        foreach ($rows as $r) $maxId = max($maxId, (int)$r['id']);
        $id  = $maxId + 1;
        $now = date('c');

        $new = [
            'id'            => $id,
            'title'         => $title,
            'body'          => $body,
            'left_pct'      => 50.0,
            'top_pct'       => 50.0,
            'category_id'   => $cat,
            'start_date'    => $start,
            'testup_date'   => $test,
            'proof_date'    => $proof,
            'delivery_date' => $deliv,
            'flag_start'    => $flag_start,
            'flag_test'     => $flag_test,
            'flag_proof'    => $flag_proof,
            'flag_delivery' => $flag_delivery,
            'flag_fb'       => $flag_fb,
            'created_at'    => $now,
            'updated_at'    => $now,
            'ball_side'   => $ball_side,
            'ball_mine'   => $ball_mine,
            'ball_theirs' => $ball_theirs,
            'ball_due'    => $ball_due
        ];

        $rows[] = $new;
        csv_write_all($CSV_PATH, $rows);
        json_out(['ok' => true, 'item' => $new]);
    }



    if ($action === 'update') {
        $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
        if ($id <= 0) json_out(['ok' => false, 'error' => 'id が不正です。'], 400);

        // 文字列は array_key_exists で null と空文字を区別
        $title = array_key_exists('title', $_POST) ? trim($_POST['title']) : null;
        $body  = array_key_exists('body',  $_POST) ? trim($_POST['body'])  : null;

        $left  = array_key_exists('left_pct', $_POST) ? (float)$_POST['left_pct'] : null;
        $top   = array_key_exists('top_pct',  $_POST) ? (float)$_POST['top_pct']  : null;

        $ball_side   = array_key_exists('ball_side',   $_POST) ? (int)$_POST['ball_side']   : null;
        $ball_mine   = array_key_exists('ball_mine',   $_POST) ? (string)$_POST['ball_mine']   : null;
        $ball_theirs = array_key_exists('ball_theirs', $_POST) ? (string)$_POST['ball_theirs'] : null;
        $ball_due    = array_key_exists('ball_due',    $_POST) ? trim($_POST['ball_due'])      : null;

        // サブページでは親カテゴリ固定
        $cat   = ($PARENT_ID > 0)
            ? $PARENT_CAT_ID
            : (array_key_exists('category_id', $_POST) ? (int)$_POST['category_id'] : null);

        $start = array_key_exists('start_date',    $_POST) ? trim($_POST['start_date'])    : null;
        $test  = array_key_exists('testup_date',   $_POST) ? trim($_POST['testup_date'])   : null;
        $proof = array_key_exists('proof_date',    $_POST) ? trim($_POST['proof_date'])    : null;
        $deliv = array_key_exists('delivery_date', $_POST) ? trim($_POST['delivery_date']) : null;

        // flags（0を許容するため array_key_exists）
        $flag_start    = array_key_exists('flag_start',    $_POST) ? (int)$_POST['flag_start']    : null;
        $flag_test     = array_key_exists('flag_test',     $_POST) ? (int)$_POST['flag_test']     : null;
        $flag_proof    = array_key_exists('flag_proof',    $_POST) ? (int)$_POST['flag_proof']    : null;
        $flag_delivery = array_key_exists('flag_delivery', $_POST) ? (int)$_POST['flag_delivery'] : null;
        $flag_fb       = array_key_exists('flag_fb',       $_POST) ? (int)$_POST['flag_fb']       : null;

        // バリデーション：着手が空になるのに他が入っているのはNG
        if (
            $start !== null && $start === '' &&
            (($test !== null && $test !== '') ||
                ($proof !== null && $proof !== '') ||
                ($deliv !== null && $deliv !== ''))
        ) {
            json_out(['ok' => false, 'error' => '着手日が未設定のまま他の日付は設定できません。'], 400);
        }

        $rows = csv_read_all($CSV_PATH);
        $found = false;
        foreach ($rows as &$r) {
            if ((int)$r['id'] === $id) {
                if ($title !== null) $r['title'] = $title;
                if ($body  !== null) $r['body']  = $body;

                if ($left  !== null) $r['left_pct'] = max(0, min(100, $left));
                if ($top   !== null) $r['top_pct']  = max(0, min(100, $top));

                if ($PARENT_ID > 0) {
                    $r['category_id'] = (int)$PARENT_CAT_ID;
                } else if ($cat !== null) {
                    $r['category_id'] = (int)$cat;
                }

                if ($start !== null) $r['start_date']    = $start;
                if ($test  !== null) $r['testup_date']   = $test;
                if ($proof !== null) $r['proof_date']    = $proof;
                if ($deliv !== null) $r['delivery_date'] = $deliv;

                if ($flag_start    !== null) $r['flag_start']    = $flag_start;
                if ($flag_test     !== null) $r['flag_test']     = $flag_test;
                if ($flag_proof    !== null) $r['flag_proof']    = $flag_proof;
                if ($flag_delivery !== null) $r['flag_delivery'] = $flag_delivery;
                if ($flag_fb       !== null) $r['flag_fb']       = $flag_fb;

                if ($ball_side   !== null) $r['ball_side']   = in_array($ball_side, [0, 1, 2], true) ? $ball_side : 0;
                if ($ball_mine   !== null) $r['ball_mine']   = $ball_mine;
                if ($ball_theirs !== null) $r['ball_theirs'] = $ball_theirs;
                if ($ball_due    !== null) $r['ball_due']    = $ball_due;

                $r['updated_at'] = date('c');
                $found = true;
                break;
            }
        }
        if (!$found) json_out(['ok' => false, 'error' => '該当データがありません。'], 404);

        csv_write_all($CSV_PATH, $rows);
        json_out(['ok' => true]);
    }

    if ($action === 'delete') {
        $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
        if ($id <= 0) json_out(['ok' => false, 'error' => 'id が不正です。'], 400);

        $rows = csv_read_all($CSV_PATH);
        $before = count($rows);
        $rows = array_values(array_filter($rows, fn($r) => (int)$r['id'] !== $id));
        if (count($rows) === $before) json_out(['ok' => false, 'error' => '該当データがありません。'], 404);

        csv_write_all($CSV_PATH, $rows);

        // 親タスクの削除ならサブCSVも消す
        if ($PARENT_ID === 0) {
            foreach (glob($DATA_DIR . '/subtasks_' . $id . '.csv*') ?: [] as $p) {
                @unlink($p);
            }
        }

        json_out(['ok' => true]);
    }
    // カテゴリ一覧
    if ($action === 'cat_list') {
        $out = [];
        if (file_exists($CATS_CSV) && ($fp = fopen($CATS_CSV, 'r')) !== false) {
            fgetcsv($fp);
            while (($row = fgetcsv($fp)) !== false) {
                if (count($row) < 5) continue;
                $out[] = ['id' => (int)$row[0], 'name' => $row[1], 'color' => $row[2]];
            }
            fclose($fp);
        }
        json_out(['ok' => true, 'items' => $out]);
    }

    // カテゴリ作成 name,color
    if ($action === 'cat_create') {
        $name  = trim($_POST['name']  ?? '');
        $color = norm_color($_POST['color'] ?? ''); // ★JSから送られてくる色を採用
        if ($name === '') json_out(['ok' => false, 'error' => 'カテゴリ名は必須です。'], 400);

        // 既存読み込み＆採番
        $rows = [];
        $maxId = 0;
        if (file_exists($CATS_CSV) && ($fp = fopen($CATS_CSV, 'r')) !== false) {
            fgetcsv($fp);
            while (($r = fgetcsv($fp)) !== false) {
                $rows[] = $r;
                $maxId = max($maxId, (int)$r[0]);
            }
            fclose($fp);
        }
        $id  = $maxId + 1;
        $now = date('c');

        // 色未指定ならダークなデフォルト（JS側が送ってくるので通常は通らない）
        if ($color === '') $color = '#666666';

        if (($fp = fopen($CATS_CSV, 'a')) !== false) {
            // [id, name, color, notes, created_at, updated_at]
            fputcsv($fp, [$id, $name, strtoupper($color), '', $now, $now]);
            fclose($fp);
        }
        json_out([
            'ok'   => true,
            'item' => ['id' => $id, 'name' => $name, 'color' => strtoupper($color), 'notes' => '']
        ]);
    }

    // カテゴリ別件数（親タスクのみ）
    if ($action === 'cat_counts') {
        // メインボード（$CSV_PATH_MAIN）から集計
        $rows = csv_read_all($CSV_PATH_MAIN);
        $cnts = ['all' => 0];
        foreach ($rows as $r) {
            $cnts['all']++;
            $cid = (int)($r['category_id'] ?? 0);
            if ($cid > 0) $cnts[$cid] = ($cnts[$cid] ?? 0) + 1;
        }
        json_out(['ok' => true, 'counts' => $cnts]);
    }

    // 簡易 HSL→HEX 変換（彩度・輝度固定の自動色用）
    function hsl_to_hex($h, $s, $l)
    {
        $s /= 100;
        $l /= 100;
        $C = (1 - abs(2 * $l - 1)) * $s;
        $X = $C * (1 - abs(fmod($h / 60, 2) - 1));
        $m = $l - $C / 2;
        [$r, $g, $b] = [0, 0, 0];
        if ($h < 60)  [$r, $g, $b] = [$C, $X, 0];
        elseif ($h < 120) [$r, $g, $b] = [$X, $C, 0];
        elseif ($h < 180) [$r, $g, $b] = [0, $C, $X];
        elseif ($h < 240) [$r, $g, $b] = [0, $X, $C];
        elseif ($h < 300) [$r, $g, $b] = [$X, 0, $C];
        else            [$r, $g, $b] = [$C, 0, $X];
        $to = fn($v) => str_pad(dechex((int)round(($v + $m) * 255)), 2, '0', STR_PAD_LEFT);
        return '#' . strtoupper($to($r) . $to($g) . $to($b));
    }



    // まとめ件数: POST ids="1,2,3"
    if ($action === 'subcounts') {
        $idsRaw = $_POST['ids'] ?? '';
        if (is_array($idsRaw)) $idsRaw = implode(',', $idsRaw);
        $ids = array_values(array_unique(array_filter(array_map('intval', preg_split('/[,\s]+/', (string)$idsRaw)))));
        $out = [];
        foreach ($ids as $pid) {
            $subpath = $DATA_DIR . '/subtasks_' . $pid . '.csv';
            if (!file_exists($subpath)) {
                $out[$pid] = 0;
                continue;
            }
            $cnt = 0;
            if (($fp = fopen($subpath, 'r')) !== false) {
                fgetcsv($fp); // header skip
                while (fgetcsv($fp) !== false) $cnt++;
                fclose($fp);
            }
            $out[$pid] = $cnt;
        }
        json_out(['ok' => true, 'counts' => $out]);
    }

    // カテゴリ1件取得（編集モーダル用）
    if ($action === 'cat_get') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) json_out(['ok' => false, 'error' => 'id が不正です。'], 400);
        if (!file_exists($CATS_CSV)) json_out(['ok' => false, 'error' => 'カテゴリがありません'], 404);

        if (($fp = fopen($CATS_CSV, 'r')) !== false) {
            fgetcsv($fp);
            while (($r = fgetcsv($fp)) !== false) {
                if ((int)$r[0] === $id) {
                    // 旧5列でもOKにする（notes無しなら空）
                    $name = $r[1] ?? '';
                    $color = $r[2] ?? '#999999';
                    $notes = $r[3] ?? '';
                    fclose($fp);
                    json_out(['ok' => true, 'item' => ['id' => $id, 'name' => $name, 'color' => $color, 'notes' => $notes]]);
                }
            }
            fclose($fp);
        }
        json_out(['ok' => false, 'error' => '見つかりません'], 404);
    }


    // カテゴリ更新（名前・備考・色）
    if ($action === 'cat_update') {
        $id    = isset($_POST['id']) ? (int)$_POST['id'] : 0;
        if ($id <= 0) json_out(['ok' => false, 'error' => 'id が不正です'], 400);

        // ★部分更新できるように array_key_exists で拾う
        $name  = array_key_exists('name',  $_POST) ? trim($_POST['name'])  : null;
        $notes = array_key_exists('notes', $_POST) ? trim($_POST['notes']) : null;
        $color = array_key_exists('color', $_POST) ? norm_color($_POST['color']) : null;

        // 1) 既存読み込み
        $rows = [];
        $idx  = null;
        if (file_exists($CATS_CSV) && ($fp = fopen($CATS_CSV, 'r')) !== false) {
            fgetcsv($fp);
            while (($r = fgetcsv($fp)) !== false) {
                $rows[] = $r;
            }
            fclose($fp);
        }

        // 2) id で行を特定して更新
        foreach ($rows as $i => &$r) {
            if ((int)$r[0] === $id) {
                $r = array_pad($r, 6, ''); // [id,name,color,notes,created_at,updated_at]
                if ($name  !== null) $r[1] = $name;
                if ($color !== null && $color !== '') $r[2] = strtoupper($color);
                if ($notes !== null) $r[3] = $notes;
                if ($r[4] === '') $r[4] = date('c'); // created_at フォールバック
                $r[5] = date('c');                   // updated_at
                $idx = $i;
                break;
            }
        }
        unset($r);
        if ($idx === null) json_out(['ok' => false, 'error' => '見つかりません'], 404);

        // 3) 書き戻し
        if (($fp = fopen($CATS_CSV . '.tmp', 'w')) === false) {
            json_out(['ok' => false, 'error' => 'write open fail'], 500);
        }
        @flock($fp, LOCK_EX);
        fputcsv($fp, ['id', 'name', 'color', 'notes', 'created_at', 'updated_at']);
        foreach ($rows as $row) {
            $row = array_pad($row, 6, '');
            fputcsv($fp, [$row[0], $row[1], $row[2], $row[3], $row[4], $row[5]]);
        }
        fflush($fp);
        @flock($fp, LOCK_UN);
        fclose($fp);
        @rename($CATS_CSV . '.tmp', $CATS_CSV);

        // 4) 更新後の1件を返す
        $updated = $rows[$idx];
        json_out([
            'ok'   => true,
            'item' => [
                'id'    => (int)$updated[0],
                'name'  => (string)$updated[1],
                'color' => (string)($updated[2] ?? '#999999'),
                'notes' => (string)($updated[3] ?? ''),
            ]
        ]);
    }


    // カテゴリ削除（所属タスクは「未設定(0)」へ）
    if ($action === 'cat_delete') {
        $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
        if ($id <= 0) json_out(['ok' => false, 'error' => 'id が不正です'], 400);

        // 1) カテゴリCSVから削除
        $rows = [];
        $removed = false;
        if (file_exists($CATS_CSV) && ($fp = fopen($CATS_CSV, 'r')) !== false) {
            fgetcsv($fp);
            while (($r = fgetcsv($fp)) !== false) {
                if ((int)$r[0] === $id) {
                    $removed = true;
                    continue;
                }
                $rows[] = $r;
            }
            fclose($fp);
        }
        if (!$removed) json_out(['ok' => false, 'error' => '見つかりません'], 404);
        if (($fp = fopen($CATS_CSV . '.tmp', 'w')) !== false) {
            fputcsv($fp, ['id', 'name', 'color', 'notes', 'created_at', 'updated_at']);
            foreach ($rows as $r) {
                $r = array_pad($r, 6, '');
                fputcsv($fp, [$r[0], $r[1], $r[2], $r[3], $r[4], $r[5]]);
            }
            fclose($fp);
            @rename($CATS_CSV . '.tmp', $CATS_CSV);
        }

        // 2) 親タスク（メインCSV）の category_id を 0 へ
        $tasks = csv_read_all($CSV_PATH_MAIN);
        foreach ($tasks as &$t) {
            if ((int)($t['category_id'] ?? 0) === $id) $t['category_id'] = 0;
        }
        csv_write_all($CSV_PATH_MAIN, $tasks);

        json_out(['ok' => true]);
    }

    json_out(['ok' => false, 'error' => 'unknown action'], 400);
}

// ---- UI (HTML) ----
?>