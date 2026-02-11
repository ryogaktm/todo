<?php
//index.php フロントエンド部分
include_once(__DIR__ . '/asset/function.php');
?>

<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex">
    <title>Quadrant TODO Board</title>
    <link rel="stylesheet" href="asset/add.css">
    <link rel="stylesheet" href="asset/sp.css">
</head>


<!-- ↓ここを置き換え -->

<body
    data-subpage="<?= $PARENT_ID > 0 ? '1' : '0' ?>"
    data-parent-cat="<?= (int)$PARENT_CAT_ID ?>"
    data-sub-id="<?= (int)$PARENT_ID ?>">
    <header>
        <div class="h-left">
            <?php if ($PARENT_ID > 0): ?>
                <!-- サブページの時：戻る + 親タスク名 -->
                <button class="btn" onclick="location.href='./'">← 戻る</button>
                <span style="margin-left:10px; font-weight:700">
                    <?= htmlspecialchars($PARENT_TITLE ?: ('Task #' . $PARENT_ID), ENT_QUOTES, 'UTF-8') ?>
                </span>
            <?php else: ?>
                <!-- 通常ページ -->
                <div class="h-left-main">
                    <div class="h-title">Quadrant TODO</div>
                    <div class="h-est-today">
                        今日の想定稼働：<span id="todayEstTotal">0</span>h
                    </div>
                </div>
            <?php endif; ?>
        </div>

        <div class="h-right">
            <!-- ▼ ここから検索ボックス追加部分 ▼ -->
            <div class="search-wrap">
                <input
                    id="taskSearch"
                    type="search"
                    placeholder="タスク検索"
                    autocomplete="off">
                <button
                    id="taskSearchClear"
                    type="button"
                    class="search-clear"
                    title="検索クリア"
                    aria-label="検索クリア">×</button>
            </div>
            <!-- ▲ ここまで検索ボックス追加部分 ▲ -->

            <button class="btn" id="btnViewToggle" data-view="board">スケジュール表</button>
            <button id="shortcutBtn">ショートカット</button>
            <button class="btn" id="btnCompletedToggle">完了リスト</button>
            <button class="btn btn-icon btn-primary" id="btnAdd" title="追加">+</button>
        </div>
    </header>




    <div id="calendarView" class="calendar-view" hidden>
        <div class="cal-head">
            <button class="btn btn-icon" id="calPrev" title="前の月">‹</button>
            <div class="cal-title" id="calTitle"></div>
            <button class="btn btn-icon" id="calNext" title="次の月">›</button>
            <div class="cal-legend">
                <span class="leg leg-start">着手</span>
                <span class="leg">–</span>
                <span class="leg leg-test">テスト</span>
                <span class="leg leg-proof">校了</span>
                <span class="leg leg-delivery">納品</span>
            </div>
        </div>
        <div class="cal-grid" id="calGrid"></div>
        <div class="cal-overflow" id="calOverflow" hidden></div>
    </div>


    <!-- ▼ 期限フィルタ帯（ボールの締切で絞る） -->
    <div class="due-filter-bar filter-bar" id="dueFilterBar">
        <button class="btn df-btn is-active" data-due="all" data-label="すべて">すべて</button>
        <button class="btn df-btn" data-due="overdue" data-label="期限切れ">期限切れ</button>
        <button class="btn df-btn" data-due="today" data-label="今日まで">今日まで</button>
        <button class="btn df-btn" data-due="tomorrow" data-label="明日まで">明日まで</button>
        <button class="btn df-btn" data-due="dayafter" data-label="明後日まで">明後日まで</button>
        <button class="btn df-btn" data-due="week" data-label="1週間以内">1週間以内</button>
        <button class="btn df-btn" data-due="month" data-label="1ヶ月以内">1ヶ月以内</button>
        <button class="btn df-btn" data-due="later" data-label="それ以降">それ以降（0）</button>
        <button class="btn df-btn" data-due="none" data-label="期限なし">期限なし（0）</button>

    </div>
    <!-- ▲ 期限フィルタ帯 -->

    <!-- ▼ ボールフィルタ帯（カテゴリーバーの上） -->
    <div class="ball-filter-bar filter-bar" id="ballFilterBar">
        <button class="btn bf-btn is-active" data-ball="all" data-label="すべて">すべて</button>
        <button class="btn bf-btn" data-ball="mine" data-label="こっちのボール">こっちのボール</button>
        <button class="btn bf-btn" data-ball="prod" data-label="制作のボール">制作のボール</button>
        <button class="btn bf-btn" data-ball="theirs" data-label="向こうのボール">向こうのボール</button>
    </div>

    <!-- ▲ ボールフィルタ帯 -->

    <div class="category-bar" id="categoryBar" aria-label="カテゴリ一覧" hidden></div>
    <div class="wrap">
        <div class="board" id="board">
            <div class="line-h"></div>
            <div class="line-v"></div>
            <div class="label left">今やる</div>
            <div class="label right">いつかやる</div>
            <div class="label top">軽い</div>
            <div class="label bottom">重い</div>
            <!-- cards injected here -->
        </div>



        <!-- 完了リスト（右パネル） -->
        <aside class="completed-panel" id="completedPanel" aria-hidden="true">
            <div class="completed-header">完了リスト</div>
            <div class="completed-list" id="completedList">
                <div class="completed-empty">まだ完了タスクはありません</div>
            </div>
        </aside>

        <!-- ▼ 右端から出てくるボール一覧：デフォは矢印だけ -->
        <button id="ballListPeek" class="balllist-peek" aria-label="ボール一覧を開く">◀</button>

        <aside id="ballListPanel" class="balllist-panel" aria-hidden="true">
            <div class="bl-head">
                <span class="bl-title">ボール一覧</span>
                <button id="ballListClose" class="bl-close" title="閉じる" aria-label="閉じる">×</button>
            </div>

            <!-- 2カラム（こっち／向こう） -->
            <div class="bl-cols">
                <section class="bl-col bl-col-mine">
                    <h3 class="bl-col-title">こっちのボール</h3>
                    <div id="ballListMine" class="bl-list">
                        <div class="balllist-empty">（なし）</div>
                    </div>
                </section>

                <section class="bl-col bl-col-theirs">
                    <h3 class="bl-col-title">向こうのボール</h3>
                    <div id="ballListTheirs" class="bl-list">
                        <div class="balllist-empty">（なし）</div>
                    </div>
                </section>

                <!-- ★ 追加：制作のボール列 -->
                <section class="bl-col bl-col-prod">
                    <h3 class="bl-col-title">制作のボール</h3>
                    <div id="ballListProd" class="bl-list">
                        <div class="balllist-empty">（なし）</div>
                    </div>
                </section>
            </div>
        </aside>

        <div id="ballListBackdrop" class="balllist-backdrop" aria-hidden="true"></div>
        <!-- ▲ ボール一覧 -->



        <div class="completed-backdrop" id="completedBackdrop" aria-hidden="true"></div>

        <!-- Shortcut modal -->
        <div class="shortcut-backdrop" id="shortcutBackdrop" aria-hidden="true">
            <div class="shortcut-modal" role="dialog" aria-modal="true" aria-labelledby="shortcutTitle">
                <header>

                    <div id="shortcutTitle">ショートカット</div>
                    <button class="shortcut-close" id="shortcutCloseBtn" aria-label="閉じる">×</button>


                    <div class="h-right">
                        <input id="taskSearch" type="search" placeholder="タスク検索" />
                        <button id="taskSearchClear" type="button" title="検索クリア">×</button>
                        <!-- その右に既存ボタン群 -->
                    </div>
                </header>
                <div class="body short_cut">
                    <ul style="margin:0; padding-left:18px; line-height:1.9; font-size:14px">
                        <li><span class="kbd">Shift</span> + <span class="kbd">＋</span> … 新規タスク追加</li>
                        <li><span class="kbd">Shift</span> + <span class="kbd">D</span> … 完了リストの表示/非表示</li>
                        <li><span class="kbd">Shift</span> + <span class="kbd">S</span> … ショートカット画面の表示/非表示</li>
                        <li><span class="kbd">Enter</span>（モーダル内） … 決定／<span class="kbd">Shift</span> + <span class="kbd">Enter</span> で改行</li>
                        <li>カードをドラッグ … 位置移動／ダブルクリック … 編集</li>
                    </ul>
                </div>
            </div>
        </div>


    </div>


    <!-- タスクModal -->
    <div class="modal-backdrop" id="modalBackdrop" aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
            <header class="modal-head">
                <div id="modalTitle">タスク</div>
                <div class="modal-head-right est-hours-wrap">
                    <label for="estHours" class="est-label">実働予測</label>
                    <input type="number" id="estHours" min="0" max="24" step="0.25" inputmode="decimal" placeholder="0" />
                    <span class="est-unit">時間</span>

                    <!-- セット用ボタン（押すとその値に置き換え） -->
                    <div class="est-quick">

                        <button type="button" class="btn eh-btn" data-val="0.25">0.25</button>
                        <button type="button" class="btn eh-btn" data-val="0.5">0.5</button>
                        <button type="button" class="btn eh-btn" data-val="1">1.0</button>
                        <button type="button" class="btn eh-btn" data-val="1.5">1.5</button>
                        <button type="button" class="btn eh-btn" data-val="2">2.0</button>
                        <button type="button" class="btn eh-btn" data-val="0">×</button>
                    </div>


                </div>
            </header>
            <div class="body body_task">
                <div>
                    <label class="input-label" for="taskTitle">タイトル</label>
                    <input type="text" id="taskTitle" maxlength="120" />
                </div>
                <div>
                    <label class="input-label" for="taskBody">本文</label>
                    <textarea id="taskBody"></textarea>
                </div>

                <div style="margin-top:10px;">
                    <label class="input-label" style="display:block; margin-bottom:4px; font-size:12px; color:#666;">タグ設定</label>
                    <div id="tagSelectContainer" style="background:#f9f9f9; padding:10px; border:1px solid #ddd; border-radius:4px; min-height:40px;"></div>
                </div>

                <div class="row row-tags" style="margin-top:10px; display:block;">
                    <label class="input-label" style="display:block; margin-bottom:4px;">タグ設定</label>
                    <div id="tagSelectContainer"></div>
                </div>

                <!-- ▼▼ どっちのボール ▼▼ -->

                <fieldset class="ball">
                    <legend>どっちのボール？</legend>

                    <!-- タブ + 右端に共通期限（日付） -->
                    <div class="ball-head">
                        <div class="ball-tabs" role="tablist" aria-label="どっちのボール？">
                            <button type="button" id="ballTabMine" class="tab is-active" role="tab" aria-selected="true">こっち</button>
                            <button type="button" id="ballTabNone" class="tab" role="tab" aria-selected="false">制作</button>
                            <button type="button" id="ballTabTheirs" class="tab" role="tab" aria-selected="false">向こう</button>
                        </div>
                        <div class="ball-due">
                            <label for="ballDueDate">期限</label>
                            <input type="date" id="ballDueDate" />
                            <input type="time" id="ballDueTime" />

                            <button type="button" class="btn btn-icon date-clear" data-target="#ballDueDate" title="クリア" aria-label="期限をクリア">×</button>

                            <div class="quick-group_total">
                                <div class="quick-date-group">
                                    <button type="button" class="btn qd-btn" data-target="#ballDueDate" data-kind="today">今日</button>
                                    <button type="button" class="btn qd-btn" data-target="#ballDueDate" data-kind="tomorrow">明日</button>
                                    <button type="button" class="btn qd-btn" data-target="#ballDueDate" data-kind="dayafter">明後日</button>
                                    <button type="button" class="btn qd-btn" data-target="#ballDueDate" data-kind="week">1週間後</button>
                                    <button type="button" class="btn qd-btn" data-target="#ballDueDate" data-kind="month">1ヶ月後</button>
                                </div>

                                <div class="quick-time-group">
                                    <button type="button" class="btn qt-btn" data-target="#ballDueTime" data-time="09:00">9:00</button>
                                    <button type="button" class="btn qt-btn" data-target="#ballDueTime" data-time="12:00">12:00</button>
                                    <button type="button" class="btn qt-btn" data-target="#ballDueTime" data-time="15:00">15:00</button>
                                    <button type="button" class="btn qt-btn" data-target="#ballDueTime" data-time="18:00">今日中</button>
                                </div>

                            </div>


                        </div>
                    </div>

                    <input type="hidden" id="ballSide" value="0" />

                    <div class="ball-areas">
                        <textarea id="ballMine" rows="4" placeholder="こっちの作業メモ" style="width:100%;"></textarea>
                        <textarea id="ballProd" rows="4" placeholder="制作の作業メモ" style="width:100%;"></textarea>
                        <textarea id="ballTheirs" rows="4" placeholder="向こうの作業メモ" style="width:100%;" hidden></textarea>
                    </div>
                </fieldset>
                <!-- ▲▲ どっちのボール ▲▲ -->


                <!-- ▼▼ ここをタスク側に置く ▼▼ -->
                <fieldset class="sched">
                    <legend>スケジュール</legend>

                    <!-- 着手：チェックは左、クリアは右 -->
                    <div class="sched-row">
                        <label><input type="checkbox" id="chkStart" class="state-chk" /> 着手</label>
                        <input type="date" id="taskStart" />
                        <input type="time" id="taskStartTime" />
                        <button type="button" class="btn btn-icon date-clear" data-target="#taskStart" title="クリア" aria-label="着手日をクリア">×</button>
                        <small class="hint">（空でもOK／他日付を入れる場合は必須）</small>
                    </div>

                    <!-- テストアップ：右に「FB対応中」チェックを追加 -->
                    <div class="sched-row">
                        <label><input type="checkbox" id="chkTest" class="state-chk" /> テストアップ</label>
                        <input type="date" id="taskTest" />
                        <input type="time" id="taskTestTime" />
                        <button type="button" class="btn btn-icon date-clear" data-target="#taskTest" title="クリア" aria-label="テストアップ日をクリア">×</button>
                        <label class="fb-flag"><input type="checkbox" id="chkFB" /> FB対応中</label>
                    </div>

                    <!-- 校了 -->
                    <div class="sched-row">
                        <label><input type="checkbox" id="chkProof" class="state-chk" /> 校了</label>
                        <input type="date" id="taskProof" />
                        <input type="time" id="taskProofTime" />
                        <button type="button" class="btn btn-icon date-clear" data-target="#taskProof" title="クリア" aria-label="校了日をクリア">×</button>
                    </div>

                    <!-- 納品 -->
                    <div class="sched-row">
                        <label><input type="checkbox" id="chkDelivery" class="state-chk" /> 納品</label>
                        <input type="date" id="taskDelivery" />
                        <input type="time" id="taskDeliveryTime" />
                        <button type="button" class="btn btn-icon date-clear" data-target="#taskDelivery" title="クリア" aria-label="納品日をクリア">×</button>
                    </div>
                </fieldset>
                <!-- ▲▲ ここまでタスク側 ▲▲ -->

            </div>
            <div class="row-actions">
                <button class="btn btn-danger" id="btnDelete" style="display:none;">削除</button>
                <button class="btn btn-complete" id="btnComplete" style="display:none;">完了</button>
                <button class="btn" id="btnCancel">キャンセル</button>
                <button class="btn" id="btnSave">決定</button>
            </div>
        </div>
    </div>


    <div class="modal-backdrop" id="tagTypeModalBackdrop" aria-hidden="true">
        <div class="modal" style="height:80vh; background:#fff; color:#000;">
            <header style="background:#eee; color:#000;">
                <div>タグ管理</div>
                <button class="btn" id="tagTypeModalClose">×</button>
            </header>
            <div class="body" style="background:#fff; color:#000; padding:20px;">
                <div style="margin-bottom:20px; border-bottom:1px solid #ccc; padding-bottom:10px;">
                    <h4>タググループ追加（例: 案件名, 優先度）</h4>
                    <div style="display:flex; gap:8px;">
                        <input type="text" id="newTagTypeName" placeholder="グループ名" style="background:#eee; color:#000; border:1px solid #999; flex:1; padding:8px;">
                        <button class="btn" id="newTagTypeAddBtn">追加</button>
                    </div>
                </div>
                <div id="tagTypesList">
                </div>
            </div>
        </div>
    </div>



    <!--　カテゴリーModal Category Edit Modal -->
    <div class="modal-backdrop" id="catModalBackdrop" aria-hidden="true">
        <div class="modal cat-modal" role="dialog" aria-modal="true" aria-labelledby="catModalTitle">
            <header>
                <div id="catModalTitle">カテゴリー編集</div>
            </header>
            <div class="body">
                <div>
                    <label class="input-label" for="catEditName">名前</label>
                    <input type="text" id="catEditName" maxlength="60" />
                </div>
                <div>
                    <label class="input-label" for="catEditNotes">備考</label>
                    <textarea id="catEditNotes" rows="4" placeholder="特徴やルールなど自由にメモ"></textarea>
                </div>

            </div>
            <div class="row-actions">
                <button class="btn btn-danger" id="catEditDelete" style="margin-right:auto;">削除</button>
                <button class="btn" id="catEditCancel">キャンセル</button>
                <button class="btn" id="catEditSave">保存</button>
            </div>
        </div>
    </div>

    <div class="toast" id="toast"></div>

    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>


    <script src="asset/js/01-core.js"></script>
    <script src="asset/js/02-categories.js"></script>
    <script src="asset/js/03-tasks.js"></script>
    <script src="asset/js/04-shell-and-calendar.js"></script>

    <script src="asset/01-core.js"></script>
    <script src="asset/02-tags.js"></script>
    <script src="asset/03-tasks.js"></script>
    <script src="asset/04-shell-and-calendar.js"></script>

</html>