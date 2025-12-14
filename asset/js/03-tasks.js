// 03-tasks.js
(function(App){
  if (!App) { console.error('App core missing'); return; }

  // === Phase1: 共通レジストリ（将来分割の受け皿） ===
  App.tasks = App.tasks || { state:{}, el:{}, fn:{}, api:{} };
  const T = App.tasks;

  App.state = App.state || {};

App.state.searchText = '';
App.state.searchOverride = false;       
App.state._savedFilters = null;         

    const $board = $('#board');
    const $modal = $('#modalBackdrop');
    const $title = $('#taskTitle');
    const $body  = $('#taskBody');
  
    const $btnAdd = $('#btnAdd');
    const $btnSave = $('#btnSave');
    const $btnCancel = $('#btnCancel');
    const $btnDelete = $('#btnDelete');
    const $btnComplete = $('#btnComplete');
  
    const $taskStart    = $('#taskStart');
    const $taskTest     = $('#taskTest');
    const $taskProof    = $('#taskProof');
    const $taskDelivery = $('#taskDelivery');
    const $taskStartTime    = $('#taskStartTime');
    const $taskTestTime     = $('#taskTestTime');
    const $taskProofTime    = $('#taskProofTime');
    const $taskDeliveryTime = $('#taskDeliveryTime');
    const $taskCategory = $('#taskCategory');
  
  
    const $subtasksPane       = $('#subtasksPane');
    const $subtasksList       = $('#subtasksList');
    const $subtaskAddBtn      = $('#subtaskAddBtn');
    const $subtaskTitleInput  = $('#subtaskTitleInput');
    const $openSubPageBtn     = $('#openSubPageBtn');
  
    const isModalOpen = () => window.getComputedStyle($modal[0]).display !== 'none';

    const $chkStart    = $('#chkStart');
const $chkTest     = $('#chkTest');
const $chkProof    = $('#chkProof');
const $chkDelivery = $('#chkDelivery');
const $chkFB       = $('#chkFB');

const $ballTabMine   = $('#ballTabMine');
const $ballTabTheirs = $('#ballTabTheirs');
const $ballTabNone   = $('#ballTabNone');
const $ballMine      = $('#ballMine');
const $ballTheirs    = $('#ballTheirs');
const $ballSide      = $('#ballSide');
const $ballDue       = $('#ballDueDate');
const $ballDueTime   = $('#ballDueTime');
const $estHours      = $('#estHours');
const $ballProd      = $('#ballProd');

// 右端ボール2列パネル関係
const $ballPanel     = $('#ballListPanel');
const $ballBackdrop  = $('#ballListBackdrop');
const $ballPeek      = $('#ballListPeek');
const $ballListMine  = $('#ballListMine');
const $ballListTheirs= $('#ballListTheirs');
const $ballListProd  = $('#ballListProd'); 
const $ballCloseBtn  = $('#ballListClose');


// --- 検索用ヘルパー ---
// 文字列をトリムして小文字化
function normalizeQuery(s){
  return String(s || '').trim().toLowerCase();
}

// カードが現在の検索語にマッチするか？
// ・タイトル（生の title）
// ・本文
// ・こっち/向こうのボールメモ
function matchTextFilter($card){
  const q = normalizeQuery(App.state.searchText);
  if (!q) return true; // 検索文字列が空なら常にtrue（＝何も絞らない）

  // ★ 追加したヘルパーで「カテゴリ名 + タイトル」を取得
  const haystack = getCardSearchText($card);  // これ自体が toLowerCase 済み

  const body = String(
    $card.data('body') || ''
  ).toLowerCase();

  const mine   = String($card.data('ball_mine')   || '').toLowerCase();
  const theirs = String($card.data('ball_theirs') || '').toLowerCase();

  return (
    haystack.includes(q) ||   // ★ ここが titleRaw から haystack に変わる
    body.includes(q)     ||
    mine.includes(q)     ||
    theirs.includes(q)
  );
}



// === Phase1: DOM参照をレジストリにミラー（今は使わなくてもOK・互換維持） ===
Object.assign(T.el, {
  $board, $modal, $title, $body,
  $btnAdd, $btnSave, $btnCancel, $btnDelete, $btnComplete,
  $taskStart, $taskTest, $taskProof, $taskDelivery, $taskCategory,
  $subtasksPane, $subtasksList, $subtaskAddBtn, $subtaskTitleInput, $openSubPageBtn,
  $chkStart, $chkTest, $chkProof, $chkDelivery, $chkFB,
  $ballTabMine, $ballTabTheirs, $ballListProd, $ballTabNone, $ballMine, $ballTheirs, $ballSide, $ballDue,
  $taskStartTime, $taskTestTime, $taskProofTime, $taskDeliveryTime, $ballDueTime, $estHours,$ballProd
});







function setBallSide(side){
  side = Number(side);
if (![0,1,2].includes(side)) side = 0; // 0=こっち,1=向こう,2=制作
  $ballSide.val(String(side));
  $ballTabMine
     .toggleClass('is-active', side===0)
     .attr('aria-selected', side===0 ? 'true':'false');
   $ballTabTheirs
     .toggleClass('is-active', side===1)
     .attr('aria-selected', side===1 ? 'true':'false');
   $ballTabNone
     .toggleClass('is-active', side===2)
     .attr('aria-selected', side===2 ? 'true':'false');
     // // 見た目は「制作のボール」タブ
   $ballMine.prop('hidden',   !(side===0));
   $ballTheirs.prop('hidden', !(side===1));
   $ballProd.prop('hidden',   !(side===2));
   }
    // ---- 小タスク ----
    function renderSubtasksList(list){
      if (!$subtasksList.length) return;
      $subtasksList.empty();
      if (!list || !list.length){
        $subtasksList.append('<div class="st-empty">小タスクはまだありません</div>');
        return;
      }
      list.forEach(it=>{
        $subtasksList.append(
          $(`<div class="st-item">
               <div class="st-text">${App.utils.escapeHtml(it.title)}</div>
               <button class="st-del" data-id="${it.id}" title="削除">✕</button>
             </div>`)
        );
      });
    }
    function loadSubtasks(parentId){
      if (!$subtasksList.length) return;
      App.api.get(App.api.urlSub('?action=list', parentId)).done(json=>{
        if (json.ok) renderSubtasksList(json.items||[]);
      });
    }
  

// addCard の外側（関数定義群のどこでもOK）に追加
function setCardFlags($card, {start=false, test=false, proof=false, delivery=false, fb=false}){
  $card.attr('data-f-start',    start ? '1':'0');
  $card.attr('data-f-test',     test ? '1':'0');
  $card.attr('data-f-proof',    proof ? '1':'0');
  $card.attr('data-f-delivery', delivery ? '1':'0');
  $card.attr('data-f-fb',       fb ? '1':'0');
}

function updateCardBadges($card){
  // 納品まであと◯日
  const etaEl = $card.find('.eta');
  const deli = App.utils.parseDate($card.attr('data-delivery')||'');
  if (deli){
    const today = App.utils.today();
    const days = Math.ceil((deli - today) / (1000*60*60*24));
    if (days > 0)      etaEl.text(`納品まであと${days}日`);
    else if (days === 0) etaEl.text('本日納品');
    else               etaEl.text(`納品から${Math.abs(days)}日経過`);
  } else {
    etaEl.text('');
  }

  // 状態（優先度：納品済 > 校了済 > FB対応中 > 確認待ち > 着手中）
  const fd  = $card.attr('data-f-delivery') === '1';
  const fp  = $card.attr('data-f-proof')    === '1';
  const ffb = $card.attr('data-f-fb')       === '1';
  const ft  = $card.attr('data-f-test')     === '1';
  const fs  = $card.attr('data-f-start')    === '1';

  let state = '';
  if (fd) state = '納品済';
  else if (fp) state = '校了済';
  else if (ffb) state = 'FB対応中';
  else if (ft) state = '確認待ち';
  else if (fs) state = '着手中';
  else state = '着手前';

  $card.find('.state-pill').text(state);

 // ボール表示（期限つき表記）
const side = Number($card.attr('data-ball-side') || 0);  // 0=こっち,1=向こう,2=制作
const $bp  = $card.find('.ball-pill');

// 想定外の値なら何も出さないで終了（保険）
if (![0,1,2].includes(side)){
  $bp.text('').removeClass('overdue').hide();
  return;
}

// ★ side ごとにラベルを決める
let label = '';
if (side === 0)      label = 'こっちのボール';
else if (side === 1) label = '向こうのボール';
else if (side === 2) label = '制作のボール';

const dueStr = $card.attr('data-ball-due') || '';
let suffix = '';
let isOver = false;

if (dueStr){
  const due = App.utils.parseDate(dueStr);
  if (due){
    const today = App.utils.today();
    const diffDays = Math.ceil((due - today) / (1000*60*60*24));

    if (diffDays > 0){
      suffix = `（あと${diffDays}日）`;
      isOver = false;
    } else if (diffDays === 0){
      suffix = '（本日）';
      isOver = false;
    } else {
      // マイナス表示は全角のマイナスに近い記号“−”を使用
      suffix = `（−${Math.abs(diffDays)}日）`;
      isOver = true;
    }
  }
}

$bp.text(label + suffix).show();
$bp.toggleClass('overdue', isOver);



 }

// ===== ステージ別クラス付与（今日=◯, 過去=◯_over） =====
const STAGE = {
  start:    { today: 'get_work',       over: 'get_work_over' },
  test:     { today: 'test_up',        over: 'test_up_over' },
  proof:    { today: 'ok_work',        over: 'ok_work_over' },
  delivery: { today: 'finish_work',    over: 'finish_work_over' },
  ball:     {
    over:     'ball_over',      // 期限切れ（赤）
    today:    'ball_today',     // 今日（オレンジ）
    tomorrow: 'ball_tomorrow',  // 明日（黄土色）
    dayafter: 'ball_dayafter',  // 明後日（黄色）
    week:     'ball_week',      // 1週間以内（緑）
    month:    'ball_month',     // 1ヶ月以内（青）
    later:    'ball_later'      // 1ヶ月より先（水色）
  }
};

const STAGE_ALL_CLASSES = [
  STAGE.start.today, STAGE.start.over,
  STAGE.test.today, STAGE.test.over,
  STAGE.proof.today, STAGE.proof.over,
  STAGE.delivery.today, STAGE.delivery.over,
  STAGE.ball.over,
  STAGE.ball.today,
  STAGE.ball.tomorrow,
  STAGE.ball.dayafter,
  STAGE.ball.week,
  STAGE.ball.month,
  STAGE.ball.later
].join(' ');


function daysDiffFromToday(dateStr){
  if (!dateStr) return null;
  const d = App.utils.parseDate(dateStr);
  if (!d) return null;
  const today = App.utils.today();
  const DAY = 1000*60*60*24;
  // >0 未来 / 0 今日 / <0 過去
  return Math.ceil((d - today) / DAY);
}

// === ボールフィルタ状態 ===
App.state = App.state || {};
App.state.ballFilter = 'all';  // 'all' | 'mine' | 'theirs' | 'prod'
App.state.ballListManuallyHidden = false;

// ボールの期限フィルタ
// 'all' | 'overdue' | 'today' | 'week' | 'month'
App.state.ballDueFilter = 'all';


// 締切フィルタにマッチするか？（カードの data-ball-due を見る）
function matchDueFilter(cardDueStr){
  const mode = App.state.ballDueFilter; 
  // 'all' | 'overdue' | 'today' |'tomorrow' | 'dayafter' | 'week' | 'month' | 'later' | 'none'

  if (mode === 'all') return true;

  // 日付が無いなら diffDays は null
  if (!cardDueStr){
    return (mode === 'none'); // 期限なしモードだけマッチ
  }

  const dueDate = App.utils.parseDate(cardDueStr);
  if (!dueDate){
    return (mode === 'none'); // パースできない=期限なし扱い
  }

  const today = App.utils.today();
  const DAY = 1000*60*60*24;
  const diffDays = Math.ceil((dueDate - today) / DAY);

  if (mode === 'overdue'){
    return diffDays < 0;
  }
  if (mode === 'today'){
    return diffDays <= 0;
  }

 if (mode === 'tomorrow'){
   return diffDays <= 1; 
  }
 if (mode === 'dayafter'){ 
  return diffDays <= 2; 
}

  if (mode === 'week'){
    return diffDays <= 7;
  }
  if (mode === 'month'){
    return diffDays <= 30;
  }
  if (mode === 'later'){
    return diffDays > 30;
  }
  if (mode === 'none'){
    return false; // ここまで来る=期限あるのでマッチしない
  }

  return true;
}


// 今選ばれてるカテゴリチップ（.category-chip.active）の data-id を見る
function getActiveCategoryId(){
  const $activeChip = $('.category-chip.active').first();
  const cid = Number($activeChip.data('id'));
  return Number.isFinite(cid) ? cid : 0; // なければ0=全カテゴリ扱い
}


function computeFilterCounts(){
  const $cards = $('#board .card');

  // 集計用バケツ
  const counts = {
    ball: {
      all:    0,  // こっち or 向こうのボールを持ってるタスク全部
      mine:   0,  // こっちのボール
      theirs: 0   // 向こうのボール
    },
    due: {
      all:     0, // ボール持ってるタスク全体
      overdue: 0, // 期限切れ（diffDays < 0）
      today:   0, // 今日まで（diffDays <= 0）
      week:    0, // 7日以内（diffDays <= 7）
      month:   0  // 30日以内（diffDays <= 30）
    }
  };

  const today = App.utils.today();
  const DAY = 1000*60*60*24;

  $cards.each(function(){
    const $c = $(this);
    const side   = Number($c.attr('data-ball-side') || 2); // 0=こっち,1=向こう,2=なし
    const dueStr = $c.attr('data-ball-due') || '';

    const hasBall = (side === 0 || side === 1);
    if (!hasBall){
      return; // ボールなしタスクはどのカウントにも入れない想定
    }

    // --- ボール側の集計 ---
    counts.ball.all++;
    if (side === 0) counts.ball.mine++;
    if (side === 1) counts.ball.theirs++;

    // --- 期限側の集計 ---
    counts.due.all++;

    // due が正しく入ってない場合は "all" だけカウントして終了
    if (!dueStr) return;
    const dueDate = App.utils.parseDate(dueStr);
    if (!dueDate) return;

    const diffDays = Math.ceil((dueDate - today) / DAY);
    // diffDays < 0   → 期限切れ
    // diffDays = 0   → 今日
    // diffDays > 0   → 未来

    if (diffDays < 0){
      counts.due.overdue++;
    }
    if (diffDays <= 0){
      counts.due.today++;
    }
    if (diffDays <= 7){
      counts.due.week++;
    }
    if (diffDays <= 30){
      counts.due.month++;
    }
  });

  return counts;
}

function updateFilterCountBadges(counts){
  // --------------------------
  // 1) ボールフィルタのボタン群
  //    id="ballFilterBar" 内の .bf-btn
  //    data-ball="all"|"mine"|"theirs"
  //    それぞれに data-label="こっちのボール" みたいなのが入ってる想定
  // --------------------------
  $('#ballFilterBar .bf-btn').each(function(){
    const $btn = $(this);
    const key = String($btn.data('ball')); // "all"|"mine"|"theirs"
    const baseLabel = $btn.data('label') || '';
    let num = 0;
    if (key === 'all')    num = counts.ball.all;
    if (key === 'mine')   num = counts.ball.mine;
    if (key === 'theirs') num = counts.ball.theirs;
    $btn.text(`${baseLabel}（${num}）`);
  });

  // --------------------------
  // 2) 期限フィルタのボタン群
  //    id="dueFilterBar" 内の .df-btn
  //    data-due="all"|"overdue"|"today"|"week"|"month"
  //    data-label="期限切れ" とか
  // --------------------------
  $('#dueFilterBar .df-btn').each(function(){
    const $btn = $(this);
    const key = String($btn.data('due')); // "all"|"overdue"|...
    const baseLabel = $btn.data('label') || '';
    let num = 0;
    if      (key === 'all')      num = dueCounts.all;
    else if (key === 'overdue')  num = dueCounts.overdue;
    else if (key === 'today')    num = dueCounts.today;
    else if (key === 'tomorrow') num = dueCounts.tomorrow;  
    else if (key === 'dayafter') num = dueCounts.dayafter;  
    else if (key === 'week')     num = dueCounts.week;
    else if (key === 'month')    num = dueCounts.month;
    else if (key === 'later')    num = dueCounts.later ?? 0;
    else if (key === 'none')     num = dueCounts.none ?? 0;
    $btn.text(`${baseLabel}（${num}）`);
  });

  // --------------------------
  // 3) カテゴリチップたち
  //    .category-chip の中の .count を差し替える
  //    data-id="0" は「すべて」
  //    → 全カテゴリ合計にしたいので足し算する
  // --------------------------
  let totalForAllCats = 0;
  Object.values(counts.cat).forEach(n => { totalForAllCats += n; });

  $('.category-chip').each(function(){
    const $chip = $(this);
    const cid = Number($chip.data('id') || 0);
    const n = (cid === 0)
      ? totalForAllCats
      : (counts.cat[cid] || 0);

    // chipの表示テキストは
    // <span class="txt">デザイン <span class="count">（3）</span></span>
    // みたいな構造を想定
    $chip.find('.count').text(`（${n}）`);
  });
}


// === カード枚数に応じて .card を縮小 ===
// 一画面で表示する.cardの数が 30 だったら 0.9
// その後、数が 5 増えるごとに 0.05 ずつ scale が減る
// 例: 30枚 → 0.9, 35枚 → 0.85, 40枚 → 0.80 ...
// 最低でも 0.5 までに制限
function updateCardScale(){
  // 「画面に出しているカード」の数
  // display:none されているものは除外したいので :visible を使用
  const count = $('#board .card:visible').length;

  let scale = 1;

  if (count > 0){
    if (count <= 100){
      scale = 0.9;
    } else {
      const extra = count - 100;
      const steps = Math.ceil(extra / 5); // 5枚ごとに1ステップ
      scale = 0.9 - steps * 0.05;
    }
  }

  // あまり小さくなり過ぎないように下限を設定（お好みで変えてOK）
  if (scale < 0.5) scale = 0.5;

  // CSS 変数に反映
  $('#board').css('--card-scale', scale);
}



function applyBallFilterAndRenderList(){
  const $cards = $('#board .card');

  const isSearching = !!normalizeQuery(App.state.searchText);

  // 現在のフィルタ状態
  let modeSide = App.state.ballFilter || 'all';         // 'all'|'mine'|'theirs'|'prod'
  let modeDue  = App.state.ballDueFilter || 'all';     // 'all'|'overdue'|'today'|'week'|'month'|'later'|'none'

  // カテゴリ（App.categories優先。無ければDOMから拾う）
  let activeCat = 0;
  if (App.categories?.getActiveCategoryId) {
    activeCat = App.categories.getActiveCategoryId();
  } else {
    const $active = $('#categoryBar .category-chip.active').first();
    const cid = Number($active.data('id'));
    activeCat = Number.isFinite(cid) ? cid : 0;
  }

  // ★ 検索オーバーライド中は、他のフィルタを中立化（all/カテゴリ0）して
  //    「検索結果だけ」にする
  if (App.state.searchOverride) {
    modeSide  = 'all';
    modeDue   = 'all';
    activeCat = 0;
  }

  // 右パネル用
  const mineItems   = [];
  const theirsItems = [];
  const prodItems   = []; 

  // ボール側カウント（期限＋カテゴリで絞った結果を side別に）
  const sideCounts = { all:0, mine:0, theirs:0, prod:0 };

  // 期限側カウント
  const dueCounts  = { 
    all:0,
    overdue:0,
    today:0,
    tomorrow:0,
    dayafter:0,
    week:0,
    month:0,
    later:0,
    none:0
  };

  // カテゴリ側カウント
  const catCounts = {};

  // 日付差分ヘルパ
  const today   = App.utils.today();
  const DAY_MS  = 1000*60*60*24;
  function getDiffDays(dueStr){
    if (!dueStr) return null;
    const d = App.utils.parseDate(dueStr);
    if (!d) return null;
    return Math.ceil((d - today) / DAY_MS);
  }

  // ==== 1枚ずつ判定・集計 ====
  $cards.each(function(){
    const $c = $(this);

    const side   = Number($c.attr('data-ball-side') || 2); // 0=こっち,1=向こう,2=なし
    const dueStr = $c.attr('data-ball-due') || '';
    const catId  = Number($c.attr('data-cat') || 0);

    // A. サイドフィルタ一致？
    let fitsSide = true;
    if (modeSide === 'mine')   fitsSide = (side === 0); // こっち
    if (modeSide === 'theirs') fitsSide = (side === 1); // 向こう
    if (modeSide === 'prod')   fitsSide = (side === 2); // 制作

    // B. 期限フィルタ一致？
    const diffDays = getDiffDays(dueStr); // null or 数値
    let fitsDue = true;
    if (modeDue === 'overdue'){
      fitsDue = (diffDays !== null && diffDays < 0);
    } else if (modeDue === 'tomorrow'){
      fitsDue = (diffDays !== null && diffDays <= 1);
    } else if (modeDue === 'dayafter'){
      fitsDue = (diffDays !== null && diffDays <= 2);
    } else if (modeDue === 'today'){
      fitsDue = (diffDays !== null && diffDays <= 0);
    } else if (modeDue === 'week'){
      fitsDue = (diffDays !== null && diffDays <= 7);
    } else if (modeDue === 'month'){
      fitsDue = (diffDays !== null && diffDays <= 30);
    } else if (modeDue === 'later'){
      fitsDue = (diffDays !== null && diffDays > 30);
    } else if (modeDue === 'none'){
      fitsDue = (diffDays === null);
    } else {
      fitsDue = true; // 'all'
    }

    // C. カテゴリフィルタ一致？
    const fitsCat = (activeCat === 0 || catId === activeCat);

    // D. テキスト検索一致？
    const fitsText = matchTextFilter($c);

    // E. このカードをハイライト対象にする？
    const highlight = (fitsSide && fitsDue && fitsCat && fitsText);

    // 表示は常に DOM に残す。対象外は半透明
    $c.removeClass('ball-hide');
    $c.toggleClass('ball-dim', !highlight);

    // 右パネルに載せるのは highlight だけ
    if (highlight){
      const id    = $c.attr('data-id');
      const title = $c.data('raw_title') || $c.find('.title .t').text() || '';
      const mineTxt   = String($c.data('ball_mine')   || '').trim();
      const theirsTxt = String($c.data('ball_theirs') || '').trim();
      const prodTxt   = String($c.data('ball_prod')   || '').trim(); // ★ 追加

      if (side === 0){
        mineItems.push({ id, title, text: mineTxt, catId });
      } else if (side === 1){
        theirsItems.push({ id, title, text: theirsTxt, catId });
      } else if (side === 2){
        prodItems.push({ id, title, text: prodTxt, catId }); // ★ 追加
      }
    }


    // ==== 数字集計 ====

    // 1) ボール側カウント
    if (fitsDue && fitsCat && fitsText && (side === 0 || side === 1 || side === 2)){
      sideCounts.all++;
      if (side === 0)      sideCounts.mine++;
      else if (side === 1) sideCounts.theirs++;
      else if (side === 2) sideCounts.prod++;
    }

    // 2) 期限側カウント
    if (fitsSide && fitsCat && fitsText && (side === 0 || side === 1)){
      dueCounts.all++;

      if (diffDays === null){
        dueCounts.none++;
      } else {
        if (diffDays < 0){   dueCounts.overdue++; }
        if (diffDays <= 0){  dueCounts.today++;   }
        if (diffDays <= 1){  dueCounts.tomorrow++; }
        if (diffDays <= 2){  dueCounts.dayafter++; }
        if (diffDays <= 7){  dueCounts.week++;    }
        if (diffDays <= 30){ dueCounts.month++;   }
        if (diffDays > 30){  dueCounts.later++;   }
      }
    }

    // 3) カテゴリ側カウント
    if (fitsSide && fitsDue && fitsText && (side === 0 || side === 1)){
      const key = String(catId);
      if (!catCounts[key]) catCounts[key] = 0;
      catCounts[key]++;
    }
  }); // each card

  // ==== 右パネル再描画 ====
  renderBallTwoCols(mineItems, theirsItems, prodItems);

  // ==== ボール帯の数字更新 ====
  $('#ballFilterBar .bf-btn').each(function(){
    const $btn = $(this);
    const key = String($btn.data('ball')); // all|mine|theirs
    const baseLabel = $btn.data('label') || '';
    let num = 0;
    if (key === 'all')    num = sideCounts.all;
    if (key === 'mine')   num = sideCounts.mine;
    if (key === 'theirs') num = sideCounts.theirs;
    if (key === 'prod')   num = sideCounts.prod;
    $btn.text(`${baseLabel}（${num}）`);
  });

  // ==== 期限帯の数字更新 ====
  $('#dueFilterBar .df-btn').each(function(){
    const $btn = $(this);
    const key = String($btn.data('due')); // all|overdue|today|week|month|later|none
    const baseLabel = $btn.data('label') || '';
    let num = 0;
    if      (key === 'all')      num = dueCounts.all;
    else if (key === 'overdue')  num = dueCounts.overdue;
    else if (key === 'today')    num = dueCounts.today;
    else if (key === 'tomorrow') num = dueCounts.tomorrow;
    else if (key === 'dayafter') num = dueCounts.dayafter;
    else if (key === 'week')     num = dueCounts.week;
    else if (key === 'month')    num = dueCounts.month;
    else if (key === 'later')    num = dueCounts.later ?? 0;
    else if (key === 'none')     num = dueCounts.none ?? 0;
    $btn.text(`${baseLabel}（${num}）`);
  });

  // ==== カテゴリ帯の数字更新 ====
  let totalForAllCats = 0;
  Object.values(catCounts).forEach(n => { totalForAllCats += n; });

  $('#categoryBar .category-chip').each(function(){
    const $chip = $(this);
    const cid = String($chip.data('id') || '0');
    const n = (cid === '0')
      ? totalForAllCats
      : (catCounts[cid] || 0);
    $chip.find('.count').text(`（${n}）`);
  });
}


// categories.js からも呼べるように公開する
App.tasks.applyBallFilterAndRenderList = applyBallFilterAndRenderList;

function renderBallTwoCols(mineItems, theirsItems, prodItems){
  prodItems = prodItems || [];  // ★ 互換用（引数2つで呼ばれても大丈夫に）

  const safe = (s)=> App.utils.escapeHtml(String(s||''));
  const getDisplayTitle = (it)=>{
    let cid = Number(it.catId ?? 0);
    if (!Number.isFinite(cid) || cid < 0){
      const $card = $(`#board .card[data-id="${it.id}"]`);
      cid = Number($card.attr('data-cat') || 0);
    }
    return composeDisplayTitle(it.title || '', cid);
  };

  // こっち
  if (!mineItems.length){
    $ballListMine.html('<div class="balllist-empty">（なし）</div>');
  } else {
    const htmlMine = mineItems.map(it => {
      const dispTitle = getDisplayTitle(it);
      return `
        <div class="balllist-item" data-id="${it.id}" tabindex="0">
          <div class="bl-title">
            ${safe(dispTitle)}
            <button class="bl-note-btn" title="詳細を開く" aria-label="詳細を開く">📝</button>
          </div>
          ${it.text
            ? `<div class="bl-note">${App.utils.escapeHtml(it.text)}</div>`
            : `<div class="bl-note" style="opacity:.6;">（メモなし）</div>`}
        </div>`;
    }).join('');
    $ballListMine.html(htmlMine);
  }

  // 向こう
  if (!theirsItems.length){
    $ballListTheirs.html('<div class="balllist-empty">（なし）</div>');
  } else {
    const htmlTheirs = theirsItems.map(it => {
      const dispTitle = getDisplayTitle(it);
      return `
        <div class="balllist-item" data-id="${it.id}" tabindex="0">
          <div class="bl-title">
            ${safe(dispTitle)}
            <button class="bl-note-btn" title="詳細を開く" aria-label="詳細を開く">📝</button>
          </div>
          ${it.text
            ? `<div class="bl-note">${App.utils.escapeHtml(it.text)}</div>`
            : `<div class="bl-note" style="opacity:.6;">（メモなし）</div>`}
        </div>`;
    }).join('');
    $ballListTheirs.html(htmlTheirs);
  }

  // ★ 制作
  if (!$ballListProd.length) return; // 万一DOMが無いときは無視

  if (!prodItems.length){
    $ballListProd.html('<div class="balllist-empty">（なし）</div>');
  } else {
    const htmlProd = prodItems.map(it => {
      const dispTitle = getDisplayTitle(it);
      return `
        <div class="balllist-item" data-id="${it.id}" tabindex="0">
          <div class="bl-title">
            ${safe(dispTitle)}
            <button class="bl-note-btn" title="詳細を開く" aria-label="詳細を開く">📝</button>
          </div>
          ${it.text
            ? `<div class="bl-note">${App.utils.escapeHtml(it.text)}</div>`
            : `<div class="bl-note" style="opacity:.6;">（メモなし）</div>`}
        </div>`;
    }).join('');
    $ballListProd.html(htmlProd);
  }
}



function updateStageClasses($card){
  if (!$card || !$card.length) return;

  // いったん全解除
  $card.removeClass(STAGE_ALL_CLASSES);

  // フラグ（チェックONならその項目はクラス付与しない）
  const doneStart    = $card.attr('data-f-start')    === '1';
  const doneTest     = $card.attr('data-f-test')     === '1';
  const doneProof    = $card.attr('data-f-proof')    === '1';
  const doneDelivery = $card.attr('data-f-delivery') === '1';
  // FB は今回の対象外。ボールもチェック連動なし。

  // 各日付
  const diffStart    = daysDiffFromToday($card.attr('data-start')    || '');
  const diffTest     = daysDiffFromToday($card.attr('data-testup')   || '');
  const diffProof    = daysDiffFromToday($card.attr('data-proof')    || '');
  const diffDelivery = daysDiffFromToday($card.attr('data-delivery') || '');
  const diffBall     = daysDiffFromToday($card.attr('data-ball-due') || '');

  // 今日 / 過去 でクラスを付与（チェックONならスキップ）
  if (!doneStart && diffStart !== null){
    if (diffStart === 0) $card.addClass(STAGE.start.today);
    else if (diffStart < 0) $card.addClass(STAGE.start.over);
  }
  if (!doneTest && diffTest !== null){
    if (diffTest === 0) $card.addClass(STAGE.test.today);
    else if (diffTest < 0) $card.addClass(STAGE.test.over);
  }
  if (!doneProof && diffProof !== null){
    if (diffProof === 0) $card.addClass(STAGE.proof.today);
    else if (diffProof < 0) $card.addClass(STAGE.proof.over);
  }
  if (!doneDelivery && diffDelivery !== null){
    if (diffDelivery === 0) $card.addClass(STAGE.delivery.today);
    else if (diffDelivery < 0) $card.addClass(STAGE.delivery.over);
  }
  // ボールはチェック連動なし（期限のみで付与）
  // ボールはチェック連動なし（期限のみで付与）
  if (diffBall !== null){
    if (diffBall < 0){
      // 期限切れ → 赤
      $card.addClass(STAGE.ball.over);
    } else if (diffBall === 0){
      // 今日 → オレンジ
      $card.addClass(STAGE.ball.today);
    } else if (diffBall === 1){
      // 明日 → 黄土色
      $card.addClass(STAGE.ball.tomorrow);
    } else if (diffBall === 2){
      // 明後日 → 黄色
      $card.addClass(STAGE.ball.dayafter);
    } else if (diffBall <= 7){
      // 3〜7日 → 緑
      $card.addClass(STAGE.ball.week);
    } else if (diffBall <= 30){
      // 8〜30日 → 青
      $card.addClass(STAGE.ball.month);
    } else {
      // 31日より先 → 水色
      $card.addClass(STAGE.ball.later);
    }
  }

}

// 今日の日付を "YYYY-MM-DD" 形式で取得
function getTodayDateStr(){
  const d = App.utils?.today ? App.utils.today() : new Date();
  const pad2 = (n)=> String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

// 今日のボール期限タスクの estHours 合計を header に表示
function updateTodayEstHours(){
  const todayStr = getTodayDateStr();
  let total = 0;

  $('#board .card').each(function(){
    const $c = $(this);
    const due = $c.attr('data-ball-due') || '';
    if (due !== todayStr) return; // 期限が今日じゃないカードはスキップ

    const estStr = $c.attr('data-est-hours');
    if (!estStr) return;
    const n = parseFloat(estStr);
    if (!Number.isFinite(n)) return;

    total += n;
  });

  const $out = $('#todayEstTotal');
  if (!$out.length) return;

  // 表示をきれいに（.00消す／小数1桁の末尾0消す）
  const tidy = (n) => {
    const s = n.toFixed(2);
    return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  };

  $out.text(tidy(total));
}


// ===== タイトル表示：カテゴリ名を先頭に合成（表示専用） =====
function getCatNameById(id){
  const numId = Number(id || 0);

  // 0 は「すべて/未設定」扱い → タイトルに前置しない
  if (numId === 0) return '';

  // categories から素の名前（件数なし）を最優先で取得
  const cat = App.categories?.getById ? App.categories.getById(numId) : null;
  if (cat && cat.name) return cat.name;

  // フォールバック：チップの .txt から取得。ただし .count は除去してからテキスト化
  const $txt = $(`.category-chip[data-id="${numId}"] .txt`).first();
  if ($txt.length){
    const name = $txt.clone().find('.count').remove().end().text().trim();
    return name;
  }

  // さらに保険：<select> の option 表示名（末尾の（数字）は除去）
  const $opt = $(`#taskCategory option[value="${numId}"]`).first();
  if ($opt.length){
    return $opt.text().trim().replace(/（\d+）$/, '');
  }

  return '';
}



// ==== 検索用：カード1枚ぶんの「検索対象文字列」を作る ====
// タイトル + カテゴリ名 をまとめて lowerCase にしたもの
function getCardSearchText($card){
  // 純タイトル（カテゴリ名が前に付いてない方）
  const rawTitle = String(
    $card.data('raw_title') ||
    $card.find('.title .t').text() ||
    ''
  );

  // カテゴリID
  const catId = Number($card.attr('data-cat') || 0);

  // カテゴリ名（App.categories から取る）
  let catName = '';
  if (App.categories && App.categories.getById){
    const cat = App.categories.getById(catId);
    if (cat && cat.name) catName = cat.name;
  }

  // 「カテゴリ名 タイトル」を検索対象にする
  // 例: 「WEB制作_ランディングページ作成」 なら「WEB制作 ランディングページ作成」
  const haystack = (catName + ' ' + rawTitle).toLowerCase();
  return haystack;
}




function composeDisplayTitle(rawTitle, catId){
  const catName = getCatNameById(catId);
  return catName ? `${catName}_${rawTitle}` : rawTitle;  // 全角アンダー
}
function renderCardTitle($card){
  const raw = $card.data('raw_title') || $card.find('.title .t').text() || '';
  const catId = Number($card.attr('data-cat') || 0);
  $card.find('.title .t').text(composeDisplayTitle(raw, catId));
}

// 選択中のボール（0=こっち/1=向こう/2=なし）のメモだけ表示
function renderCardBallNote($card){
  const side   = Number($card.attr('data-ball-side') ?? 2);
  const mine   = String($card.data('ball_mine')   ?? '').trim();
  const theirs = String($card.data('ball_theirs') ?? '').trim();
  const prod   = String($card.data('ball_prod')   ?? '').trim();

  // 既存の表示をクリア
  $card.find('.ball-note').remove();

  let head = '', text = '';
  if (side === 0 && mine)       { head = 'こっちのボール';  text = mine; }
  else if (side === 1 && theirs){ head = '向こうのボール'; text = theirs; }
 else if (side === 2 && prod){ head = '制作のボール'; text = prod;}
  else {
  return; // 何も書いてなければ非表示
}

  const $note = $(`
    <div class="ball-note">
      <div class="ball-note-body"></div>
    </div>
  `);
  // XSS対策で text() で入れる
  $note.find('.ball-note-body').text(text);

  // 「こっち/向こう」ラベルがある行(.title-btm)の直下に挿入
  const $anchor = $card.find('.title-btm').first();
  if ($anchor.length) $anchor.after($note);
  else $card.append($note);
}

// 02-categories.js などから呼べるように公開
App.tasks = App.tasks || {};
App.tasks.renderCardBallNote = renderCardBallNote;


// 02 から呼べるように公開
App.tasks = App.tasks || {};
App.tasks.renderCardTitle = renderCardTitle;

    // ---- カード描画・ドラッグ ----
    function addCard(item){

      if (App.state.isSubpage) {
        item.category_id = App.state.PARENT_CAT_ID;
      }

      const $el = $(`
        <div class="card" data-id="${item.id}" data-left="${item.left_pct}" data-top="${item.top_pct}" data-cat="${item.category_id||0}">
          <div class="title-top"><span class="eta"></span></div>
          <h4 class="title"><span class="t"></span><span class="cnt" style="display:none;"></span></h4>
          <div class="title-btm"><span class="state-pill"></span><span class="ball-pill" style="margin-left:8px; opacity:.85;"></span></div>
          <button class="note-btn" title="詳細を開く">📝</button>
        </div>
      `);
      // data-* に日付
      $el.attr({
        'data-start':    item.start_date    || '',
        'data-testup':   item.testup_date   || '',
        'data-proof':    item.proof_date    || '',
          'data-delivery': item.delivery_date || '',
         'data-start-time':    item.start_time    || '',
         'data-testup-time':   item.testup_time   || '',
         'data-proof-time':    item.proof_time    || '',
         'data-delivery-time': item.delivery_time || '',
         'data-ball-due-time': item.ball_due_time || '',
         'data-est-hours': (item.est_hours ?? '')
      });
  
      // 純タイトルは data に保持、表示はカテゴリ名付きにする
      $el.data('raw_title', item.title || '');
      $el.find('.title .t').text(composeDisplayTitle(item.title || '', item.category_id || 0));
      $el.css({ left: item.left_pct + '%', top: item.top_pct + '%' });
      $el.data('body', item.body || '');

  
      $el.attr('data-ball-side', String(item.ball_side ?? 0));
      $el.attr('data-ball-due',  item.ball_due || '');
      $el.data('ball_mine',   item.ball_mine   || '');
      $el.data('ball_theirs', item.ball_theirs || '');
      $el.data('ball_prod',   item.ball_prod   || ''); 
      renderCardBallNote($el);
  
      const cat = App.categories.getById(item.category_id||0);
      if (cat){
        const base = cat.color, dark = App.utils.shade(cat.color, -40);
        $el.css('background', `linear-gradient(180deg, ${base}, ${dark})`)
           .css('border-color', 'rgba(255,255,255,.10)');
      }
      renderCardTitle($el); // 最終的に表示タイトルを確定
  
// addCard の $board.append($el); makeDraggable($el); の直前～直後に追加
 const flags = {
     start:    !!Number(item.flag_start),
     test:     !!Number(item.flag_test),
     proof:    !!Number(item.flag_proof),
     delivery: !!Number(item.flag_delivery),
     fb:       !!Number(item.flag_fb)
   };

setCardFlags($el, flags);
$board.append($el);
makeDraggable($el);
updateCardBadges($el);
updateStageClasses($el); 
 // 追加直後に02側のフィルタを適用（class付けは02に一元化）
 App.categories?.applyFilter?.();
 applyBallFilterAndRenderList();
 updateTodayEstHours();
 updateCardScale(); 


}
  

  // カードDOM -> openModalに渡せるオブジェクトへ
function itemFromCard($card){
    return {
        id: parseInt($card.attr('data-id'), 10),
        title: $card.data('raw_title') || $card.find('.title .t').text(),
        body: $card.data('body') || '',
        category_id: Number($card.attr('data-cat') || 0),
        start_date:    $card.attr('data-start')    || '',
        testup_date:   $card.attr('data-testup')   || '',
        proof_date:    $card.attr('data-proof')    || '',
        delivery_date: $card.attr('data-delivery') || '',
       start_time:    $card.attr('data-start-time')    || '',
         testup_time:   $card.attr('data-testup-time')   || '',
         proof_time:    $card.attr('data-proof-time')    || '',
         delivery_time: $card.attr('data-delivery-time') || '',
        flag_start:    Number($card.attr('data-f-start')||0),
        flag_test:     Number($card.attr('data-f-test')||0),
        flag_proof:    Number($card.attr('data-f-proof')||0),
        flag_delivery: Number($card.attr('data-f-delivery')||0),
        flag_fb:       Number($card.attr('data-f-fb')||0),
        ball_side:     Number($card.attr('data-ball-side')||0),
        ball_mine:     ($card.data('ball_mine')||''),
        ball_theirs:   ($card.data('ball_theirs')||''),
        ball_prod:     ($card.data('ball_prod')||''),
        ball_due:      ($card.attr('data-ball-due')||''),
        ball_due_time: ($card.attr('data-ball-due-time')||''),
        est_hours: ($card.attr('data-est-hours') || '')
      };
    }
    function makeDraggable($card){
      let isDown = false;
      let isDragging = false;
      let startX=0, startY=0, cardLeft=0, cardTop=0;
      let activeId = null; // 追う touch の identifier
      const THRESH = 5;    // 5px 以上動いたらドラッグ開始
    
      // 指定 ID の座標を返す（mouse はそのまま）
      const getXY = (e, opts={ forEnd:false }) => {
        const oe = e.originalEvent || e;
        // mouse
        if (!oe.touches && !oe.changedTouches){
          return { x: oe.clientX, y: oe.clientY, ok: true };
        }
        // touch
        const list = opts.forEnd ? oe.changedTouches : (oe.touches || oe.changedTouches);
        if (!list || list.length === 0) return { ok:false };
        // activeId が決まっていないときは先頭を使う
        if (activeId == null){
          const t = list[0];
          return { x: t.clientX, y: t.clientY, id: t.identifier, ok: true };
        }
        // 既に追っている指だけ処理
        for (let i=0;i<list.length;i++){
          if (list[i].identifier === activeId){
            return { x: list[i].clientX, y: list[i].clientY, ok: true };
          }
        }
        return { ok:false };
      };
    
      const onStart = (e) => {
        if (App.state?.modalOpen) return;                 // モーダル中は無効
        if (e.type === 'mousedown' && e.button !== 0) return;
        // ノートボタンはドラッグにしない（クリック優先）
        if (e.target && e.target.closest('.note-btn')) return;
    
        isDown = true;
        isDragging = false;
        $card.css('cursor','grab');
    
        const rect = $board[0].getBoundingClientRect();
        const pos = getXY(e);
        if (!pos.ok) return;
        startX = pos.x; startY = pos.y;
        if (pos.id != null) activeId = pos.id;
    
        const pctLeft = parseFloat($card.attr('data-left'));
        const pctTop  = parseFloat($card.attr('data-top'));
        cardLeft = rect.left + rect.width  * (pctLeft / 100);
        cardTop  = rect.top  + rect.height * (pctTop  / 100);
    
        $(window).on('mousemove.tasksdrag touchmove.tasksdrag', onMove);
        $(window).on('mouseup.tasksdrag touchend.tasksdrag touchcancel.tasksdrag', onEnd);
        // ここでは preventDefault しない → タップはクリックに化けられる
      };
    
      const onMove = (e) => {
        if (!isDown) return;
        const rect = $board[0].getBoundingClientRect();
        const pos = getXY(e);
        if (!pos.ok) return;
    
        const dx = pos.x - startX;
        const dy = pos.y - startY;
    
        // しきい値を超えたらドラッグ開始
        if (!isDragging && (Math.abs(dx) > THRESH || Math.abs(dy) > THRESH)){
          isDragging = true;
          $card.css('cursor','grabbing');
        }
        if (!isDragging) return; // まだタップ中
    
        // 本格ドラッグ中だけ既定動作を止める
        e.preventDefault();
    
        let nx = cardLeft + dx - rect.left;
        let ny = cardTop  + dy - rect.top;
        nx = Math.max(0, Math.min(rect.width,  nx));
        ny = Math.max(0, Math.min(rect.height, ny));
        const leftPct = (nx / rect.width) * 100;
        const topPct  = (ny / rect.height) * 100;
    
        $card.css({ left: leftPct + '%', top: topPct + '%' })
             .attr('data-left', leftPct).attr('data-top', topPct);
      };
    
      const onEnd = (e) => {
        if (!isDown) return;
        // 自分が追ってる指の終了だけ処理
        const pos = getXY(e, { forEnd:true });
        if (!pos.ok && activeId != null) return;
    
        $(window).off('.tasksdrag');
        const wasDragging = isDragging;
        isDown = false;
        isDragging = false;
        activeId = null;
        $card.css('cursor','grab');
    
        // クリック（ドラッグしてない）なら保存しない
        if (!wasDragging) return;
    
        const id = $card.data('id') || $card.attr('data-id');
        App.api.post(App.api.url('?action=update'), {
          id,
          left_pct: $card.attr('data-left'),
          top_pct:  $card.attr('data-top')
        }).done(j=>{ if (j.ok) App.utils.showToast('位置を保存しました'); });
      };
    
      $card.off('mousedown touchstart').on('mousedown touchstart', onStart);
    
 
// PC ダブルクリック：メイン→子ページのみ許可 / 子ページでは無効（詳細を開かない）
$card.off('dblclick').on('dblclick', function(e){
  e.preventDefault();
  e.stopPropagation();

  // サブページ（?sub=...）判定
  const isSub = $('body').attr('data-subpage') === '1'
             || $('body').data('subpage') === 1
             || !!App.state.SUB_ID;

  if (isSub) {
    // 子ページではダブルクリックは何もしない（詳細も開かない）
    return;
  }

  // メインページではダブルクリックで子ページへ
  const id = parseInt(this.getAttribute('data-id') || $(this).data('id'), 10);
  if (id) location.href = `?sub=${encodeURIComponent(id)}`;
});
    }
    
    
    // ---- 小タスク件数バッジ ----
    function refreshSubCounts(){
      if (App.state.SUB_ID) return;
      const ids = [];
       $board.find('.card').each(function(){
           const id = $(this).data('id') ?? $(this).attr('data-id');
           if (id) ids.push(id);
         });
      if (!ids.length) return;
  
      App.api.post('?action=subcounts', { ids: ids.join(',') }).done(res=>{
        if (!res.ok || !res.counts) return;
        Object.entries(res.counts).forEach(([id, n])=>{
          const $card = $board.find(`.card[data-id="${id}"]`);
          const $cnt  = $card.find('.title .cnt');
          const $note = $card.find('.note-btn');
          if (Number(n) > 0){
            $cnt.text(`（${n}）`).show();
            $note && $note.removeClass('is-empty');
          } else {
            $cnt.text('').hide();
            $note && $note.addClass('is-empty');
          }
        });
      });
    }
  
    // ---- モーダル ----
    function openModal(item=null){
      resetSaving();   
      App.state.modalOpen = true;
      $board.css('pointer-events','none'); // 背面を触れなくする
      $(window).off('.tasksdrag');         // 念のためドラッグ系を全解除

      $modal.css('display','flex').attr('aria-hidden','false');
      $('body').css('overflow','hidden');
      $btnSave.attr('title', 'Ctrl/Cmd + Enter でも保存できます');
      $btnSave.attr('type','button').prop('disabled', false);
  
      if (item && item.id){
        $('#modalTitle').text('タスク編集');
        $title.val(item.title || '');
        $body.val(item.body || '');
        App.state.editingId = item.id;
        $btnDelete.show();
        $btnComplete.show();
        $ballMine.val(item.ball_mine || '');
        $ballTheirs.val(item.ball_theirs || '');
        $ballDue.val(item.ball_due || '');
        $ballDueTime.val(item.ball_due_time || '');
        setBallSide(item.ball_side ?? 0); // 0=こっち,1=向こう,2=制作
        $estHours.val(item.est_hours ?? '');
        $ballProd.val(item.ball_prod || ''); 
        
  
        if (!App.state.SUB_ID && App.state.editingId && $subtasksPane.length){
          $subtasksPane.prop('hidden', false).attr('data-parent', String(App.state.editingId));
          if ($openSubPageBtn.length){
            $openSubPageBtn.attr('href', `?sub=${encodeURIComponent(App.state.editingId)}`);
          }
          loadSubtasks(App.state.editingId);
        } else {


          $subtasksPane.prop('hidden', true).removeAttr('data-parent');
        }
  
        $taskStart.val(item.start_date    || '');
        $taskTest.val(item.testup_date    || '');
        $taskProof.val(item.proof_date    || '');
        $taskDelivery.val(item.delivery_date || '');
        $taskStartTime.val(item.start_time    || '');
        $taskTestTime.val(item.testup_time    || '');
        $taskProofTime.val(item.proof_time    || '');
        $taskDeliveryTime.val(item.delivery_time || '');
  
        App.categories.renderSelect(item.category_id || 0);
        $taskCategory.val(String(item.category_id || 0));

        $chkStart.prop('checked',    !!Number(item.flag_start));
        $chkTest.prop('checked',     !!Number(item.flag_test));
        $chkProof.prop('checked',    !!Number(item.flag_proof));
        $chkDelivery.prop('checked', !!Number(item.flag_delivery));
        $chkFB.prop('checked',       !!Number(item.flag_fb));


      } else {
        $('#modalTitle').text('タスクを追加');
        $title.val('');
        $body.val('');
        App.state.editingId = null;
        $btnDelete.hide();
        $btnComplete.hide();
        $subtasksPane.prop('hidden', true).removeAttr('data-parent');
  
        $taskStart.val('');
        $taskTest.val('');
        $taskProof.val('');
        $taskDelivery.val('');
        $taskStartTime.val('');
        $taskTestTime.val('');
        $taskProofTime.val('');
        $taskDeliveryTime.val('');
  
        App.categories.renderSelect(0);
        $taskCategory.val('0');

         // チェック初期値
         const today = App.utils.today();
         $chkStart.prop('checked', false);   // 既定で今日なのでON
         $chkTest.prop('checked', false);
         $chkProof.prop('checked', false);
         $chkDelivery.prop('checked', false);
         $chkFB.prop('checked', false);
         // 新規は「こっち」＋ 期限は空
         $ballMine.val('');
         $ballTheirs.val('');
         $ballProd.val(''); 
         $ballDue.val('');
         $ballDueTime.val('');
         setBallSide(0);
         $estHours.val('');
      }
  
      $title.trigger('focus');
    }



    function closeModal(){
      if (App.state.editingId !== null){
        const $card = $(`[data-id="${App.state.editingId}"]`);
        if ($card.length) $card.data('body', ($body.val()||'').trim());
      }
      $modal.hide().attr('aria-hidden','true');
      $('body').css('overflow','');
      App.state.modalOpen = false;
      $board.css('pointer-events','');
      resetSaving();
    }


     // ---- 共通ヘルパー：フォーム→送信用オブジェクト ----
     function collectTaskPayload(){
      const payload = {
        title:        ($title.val()||'').trim(),
        body:         ($body.val()||'').trim(),
        category_id:  Number($taskCategory.val()||0),
        start_date:   ($taskStart.val()||'').trim(),
        testup_date:  ($taskTest.val()||'').trim(),
        proof_date:   ($taskProof.val()||'').trim(),
        delivery_date:( $taskDelivery.val()||'').trim(),
        start_time:    ($taskStartTime.val()||'').trim(),
        testup_time:   ($taskTestTime.val()||'').trim(),
        proof_time:    ($taskProofTime.val()||'').trim(),
        delivery_time: ($taskDeliveryTime.val()||'').trim(),
        flag_start:    $chkStart.is(':checked')    ? 1 : 0,
        flag_test:     $chkTest.is(':checked')     ? 1 : 0,
        flag_proof:    $chkProof.is(':checked')    ? 1 : 0,
        flag_delivery: $chkDelivery.is(':checked') ? 1 : 0,
        flag_fb:       $chkFB.is(':checked')       ? 1 : 0,
        ball_side:     Number($ballSide.val()||0),
        ball_mine:    ($ballMine.val()||'').trim(),
        ball_theirs:  ($ballTheirs.val()||'').trim(),
        ball_prod:    ($ballProd.val()||'').trim(),
        ball_due:     ($ballDue.val()||'').trim(),
        ball_due_time:($ballDueTime.val()||'').trim(),
        est_hours: (()=>{ 
          const v = ($estHours.val()||'').trim();
          if (v==='') return '';
          const n = Math.max(0, Math.min(24, parseFloat(v)||0));
          return String(n);
        })()
      };
      // ★ 子ページでは親カテゴリを強制上書き
      return App.utils.ensureChildCategory(payload);
    }
    

 // ---- 共通ヘルパー：カードDOMへ一括反映 ----
 function applyPayloadToCard($card, p){
   $card.attr({
     'data-start':     p.start_date   || '',
     'data-testup':    p.testup_date  || '',
     'data-proof':     p.proof_date   || '',
     'data-delivery':  p.delivery_date|| '',
     'data-ball-side': String(p.ball_side ?? 0),
      'data-ball-due':  p.ball_due || '',
    'data-start-time':    p.start_time    || '',
    'data-testup-time':   p.testup_time   || '',
    'data-proof-time':    p.proof_time    || '',
    'data-delivery-time': p.delivery_time || '',
    'data-ball-due-time': p.ball_due_time || '',
    'data-est-hours': (p.est_hours ?? '')
   });
   $card.data('ball_mine',   p.ball_mine   || '');
   $card.data('ball_theirs', p.ball_theirs || '');
   $card.data('ball_prod',   p.ball_prod   || ''); 

   setCardFlags($card, {
     start: !!p.flag_start, test: !!p.flag_test, proof: !!p.flag_proof,
     delivery: !!p.flag_delivery, fb: !!p.flag_fb
   });
   updateCardBadges($card);
   updateStageClasses($card); 
   applyBallFilterAndRenderList();

   renderCardBallNote($card);

   updateTodayEstHours();
   updateCardScale(); 
 }

 function resetSaving(){
  App.state.saving = false;
  $('#btnSave').prop('disabled', false).removeClass('is-busy');
}
  
    // ---- 保存/更新/削除/完了 ----
    function doSave(){
      // 二重押下ガード
      if (App.state.saving) return;
      App.state.saving = true;
    
      const $save = $('#btnSave');
      $save.prop('disabled', true).addClass('is-busy');
    
      const p = collectTaskPayload(); // ← これ1回だけ
    
      // バリデーション
      if (!p.title){
        App.utils.showToast('タイトルを入力してください');
        $title.focus();
        resetSaving();  // ← 忘れず解除
        return;
      }
      if (!p.start_date && (p.testup_date || p.proof_date || p.delivery_date)){
        App.utils.showToast('着手日が未設定のまま、他の日付は設定できません');
        resetSaving();
        return;
      }
    
      // 新規 or 更新
      if (App.state.editingId === null){
        App.api.post(App.api.url('?action=create'), p)
          .done(json => {
            if (json.ok){
              addCard(json.item);
              const $c = $(`[data-id="${json.item.id}"]`);
              applyPayloadToCard($c, p);

               $c.data('raw_title', p.title);
               $c.find('.title .t').text(composeDisplayTitle(p.title, p.category_id));
              $c.data('body', p.body);

              const cat = App.categories.getById(json.item.category_id);
              if (cat){
                const base = cat.color, dark = App.utils.shade(cat.color, -40);
                $c.css('background', `linear-gradient(180deg, ${base}, ${dark})`)
                  .css('border-color', 'rgba(255,255,255,.10)');
              }
    
              refreshSubCounts();
              App.categories.refreshCounts();
              App.categories.applyFilter();
              if (App.calendar && App.calendar.isActive()) App.calendar.render();
    
              closeModal();
              App.utils.showToast('追加しました');
            } else {
              App.utils.showToast(json.error || 'エラー');
            }
          })
          .fail(() => App.utils.showToast('通信エラー'))
          .always(resetSaving);   // ← 必ず解除
        } else {
          const id = App.state.editingId;
          App.api.post(App.api.url('?action=update'), { id, ...p })
            .done(json => {
              if (json.ok){
                const $card = $(`[data-id="${id}"]`);
                if (!$card.length){ App.utils.showToast('カードが見つかりません'); resetSaving(); return; }
        
                applyPayloadToCard($card, p);
        
                // 純タイトル & 本文をDOMに保持
                $card.data('raw_title', p.title);
                $card.data('body', p.body);
        
                // 先にカテゴリ反映（表示名合成で参照するため）
                $card.attr('data-cat', String(p.category_id));
        
                // 見た目（色など）
                const cat = App.categories.getById(p.category_id);
                if (cat){
                  const base = cat.color, dark = App.utils.shade(cat.color, -40);
                  $card.css('background', `linear-gradient(180deg, ${base}, ${dark})`)
                       .css('border-color', 'rgba(255,255,255,.10)');
                } else {
                  $card.css({ background:'', borderColor:'' });
                }
        
                // 表示タイトル更新（カテゴリ名＿タイトル）
                // renderCardTitle が無ければ下の1行でOK
                // $card.find('.title .t').text(composeDisplayTitle(p.title, p.category_id));
                renderCardTitle?.($card);
        
                App.categories.applyFilter();
                App.categories.refreshCounts();
                if (App.calendar && App.calendar.isActive()) App.calendar.render();
        
                closeModal();
                App.utils.showToast('更新しました');
              } else {
                App.utils.showToast(json.error || 'エラー');
              }
            })
            .fail(() => App.utils.showToast('通信エラー'))
            .always(resetSaving);
        }
    }
  
   // フラグ分離
App.state.tagSaving = false;

// リセット関数
function resetTagSaving($btn){

  
  App.state.tagSaving = false;
  $btn && $btn.prop('disabled', false).removeClass('is-busy');
}

function collectTagPayload(){
  const idFromBackdrop = Number($('#catModalBackdrop').data('id'));
  const idFromActive   = Number($('.category-chip.active').first().data('id'));
  const id = Number.isFinite(idFromBackdrop) && idFromBackdrop > 0
    ? idFromBackdrop
    : (Number.isFinite(idFromActive) ? idFromActive : 0);

  return {
    id,
    name:  ($('#catEditName').val()||'').trim(),
    notes: ($('#catEditNotes').val()||'').trim(),
    // （色など扱っているならここで拾う）
    // color: ($('#catEditColor').val()||'').trim()
  };
}


  
    function doDelete(){
      if (App.state.editingId === null) return;
      if (!window.confirm('削除しますか？')) return;
    
      App.api.post(App.api.url('?action=delete'), { id: App.state.editingId })
        .done(json => {
          if (!json.ok){ App.utils.showToast(json.error||'エラー'); return; }
          $(`[data-id="${App.state.editingId}"]`).remove();
          App.categories.applyFilter();
          App.categories.refreshCounts();
          closeModal();
          App.utils.showToast('削除しました');
          updateTodayEstHours(); 
          updateCardScale(); 
        })
        .fail(() => App.utils.showToast('通信エラー：削除できませんでした'));
    }
    
    function doComplete(){
      if (App.state.editingId == null) return;
      const $card = $(`[data-id="${App.state.editingId}"]`);
      if (!$card.length) return;
    
      const item = {
        id: App.state.editingId,
        title: ($title.val() || $card.find('h4').text() || '(無題)').trim(),
        body:  ($body.val()  || $card.data('body') || '').trim()
      };
      App.shell.completed.add({ title: item.title, body: item.body });
    
      App.api.post(App.api.url('?action=delete'), { id: App.state.editingId })
        .done(json => {
          if (!json.ok){ App.utils.showToast(json.error || '削除エラー'); return; }
          $card.remove();
          App.categories.applyFilter();
          App.categories.refreshCounts();
          if (App.calendar && App.calendar.isActive()) App.calendar.render();
          closeModal();
          App.utils.showToast('完了に移動＆削除しました');
          updateTodayEstHours(); 
          updateCardScale(); 
        })
        .fail(() => App.utils.showToast('通信エラー：削除できませんでした'));
    }
  
    // ---- 右カラム(小タスク) 追加/削除 ----
    $subtaskAddBtn.on('click', function(){
      const $pane = $subtasksPane;
      if (!$pane.length) return;
      const parentId = Number($pane.attr('data-parent')) || 0;
      if (!parentId) return;
      const title = ($subtaskTitleInput.val()||'').trim();
      if (!title) return;
      App.api.post(App.api.urlSub('?action=create', parentId), { title, body:'' }).done(j=>{
        if (j.ok){
          $subtaskTitleInput.val('');
          loadSubtasks(parentId);
          refreshSubCounts();
        } else {
          App.utils.showToast(j.error||'追加エラー');
        }
      });
    });
    $subtasksList.on('click', '.st-del', function(){
      const $btn = $(this);
      const parentId = Number($subtasksPane.attr('data-parent')) || 0;
      const sid = Number($btn.data('id')||0);
      if (!parentId || !sid) return;
      App.api.post(App.api.urlSub('?action=delete', parentId), { id: sid }).done(j=>{
        if (j.ok){
          $btn.closest('.st-item').remove();
          if (!$subtasksList.find('.st-item').length){
            $subtasksList.html('<div class="st-empty">小タスクはまだありません</div>');
          }
          refreshSubCounts();
        } else {
          App.utils.showToast(j.error||'削除エラー');
        }
      });
    });
  


// === 検索オーバーライド ===
// 検索中は「ボール/期限/カテゴリのフィルタ設定」を一時的に退避して
// all/all/カテゴリ0 で強制表示する

function enterSearchOverride(){
  if (App.state.searchOverride) return;

  // 現在のフィルタ状態を保存しておく
  App.state._savedFilters = {
    ballFilter   : App.state.ballFilter   || 'all',
    ballDueFilter: App.state.ballDueFilter|| 'all',
    activeCatId  : (App.categories?.getActiveCategoryId?.() ?? getActiveCategoryId())
  };
  App.state.searchOverride = true;

  // UIを「すべて」状態に揃えるが、退避した値は保持しておく
  App.state.ballFilter = 'all';
  $('#ballFilterBar .bf-btn')
    .removeClass('is-active')
    .attr('aria-pressed','false')
    .filter('[data-ball="all"]')
      .addClass('is-active')
      .attr('aria-pressed','true');

  App.state.ballDueFilter = 'all';
  $('#dueFilterBar .df-btn')
    .removeClass('is-active')
    .attr('aria-pressed','false')
    .filter('[data-due="all"]')
      .addClass('is-active')
      .attr('aria-pressed','true');

  $('#categoryBar .category-chip')
    .removeClass('active')
    .attr('aria-pressed','false')
    .filter('[data-id="0"]')
      .addClass('active')
      .attr('aria-pressed','true');

  App.categories?.applyFilter?.();
}

function exitSearchOverride(){
  if (!App.state.searchOverride) return;

  const sv = App.state._savedFilters || {
    ballFilter:'all',
    ballDueFilter:'all',
    activeCatId:0
  };

  App.state.searchOverride = false;
  App.state._savedFilters = null;

  // 退避しておいたフィルタ状態を戻す
  App.state.ballFilter    = sv.ballFilter;
  App.state.ballDueFilter = sv.ballDueFilter;

  // ボールフィルタUI
  $('#ballFilterBar .bf-btn')
    .removeClass('is-active')
    .attr('aria-pressed','false')
    .filter(`[data-ball="${sv.ballFilter}"]`)
      .addClass('is-active')
      .attr('aria-pressed','true');

  // 期限フィルタUI
  $('#dueFilterBar .df-btn')
    .removeClass('is-active')
    .attr('aria-pressed','false')
    .filter(`[data-due="${sv.ballDueFilter}"]`)
      .addClass('is-active')
      .attr('aria-pressed','true');

  // カテゴリUI
  $('#categoryBar .category-chip')
    .removeClass('active')
    .attr('aria-pressed','false')
    .filter(`[data-id="${sv.activeCatId}"]`)
      .addClass('active')
      .attr('aria-pressed','true');

  App.categories?.applyFilter?.();
}



// 全フィルタをデフォルト状態に戻す（UIもstateも）
function resetAllFiltersUI(){
  // --- ボール側（こっち/向こう）
  App.state.ballFilter = 'all';
  $('#ballFilterBar .bf-btn')
    .removeClass('is-active')
    .attr('aria-pressed', 'false')
    .filter('[data-ball="all"]')
      .addClass('is-active')
      .attr('aria-pressed', 'true');

  // --- 期限側
  App.state.ballDueFilter = 'all';
  $('#dueFilterBar .df-btn')
    .removeClass('is-active')
    .attr('aria-pressed', 'false')
    .filter('[data-due="all"]')
      .addClass('is-active')
      .attr('aria-pressed', 'true');

  // --- カテゴリ側
  // data-id="0" が「すべて」想定
  $('#categoryBar .category-chip')
    .removeClass('active')
    .attr('aria-pressed','false')
    .filter('[data-id="0"]')
      .addClass('active')
      .attr('aria-pressed','true');

  // カテゴリの見た目（非アクティブを半透明とか）を更新
  // これは今までカテゴリクリックのたびに呼んでたやつ
 
  applyBallFilterAndRenderList();
}


App.tasks = App.tasks || {};
App.tasks.resetAllFiltersUI = resetAllFiltersUI;



// 実働予測：セットボタン（押した数値に置き換え）
(function attachEstHourSetButtons(){
  // 表示をきれいに（.00は消す/小数1桁の末尾0を削る）
  const tidy = (n) => {
    const s = Number(n).toFixed(2);
    return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  };

  $('#modalBackdrop').off('click.eh').on('click.eh', '.eh-btn', function(e){
    e.preventDefault();
    const v = parseFloat($(this).data('val'));
    if (Number.isNaN(v)) return;
    const clamped = Math.max(0, Math.min(24, v)); // 0〜24に制限
    $('#estHours').val(tidy(clamped)).trigger('change');
  });
})();

function debounce(fn, wait){
  let t = null;
  return function(){
    clearTimeout(t);
    const ctx = this, args = arguments;
    t = setTimeout(() => fn.apply(ctx, args), wait);
  };
}


    // ---- イベント束ね ----
    function bindEvents(){
      $btnAdd.on('click', ()=> openModal());
      $btnCancel.on('click', closeModal);
      //$modal.on('click', function(e){ if (e.target === this) closeModal(); });

          // ==== 検索ボックス ====
    const $search = $('#taskSearch');
    const $searchClear = $('#taskSearchClear');

    if ($search.length){
      const applySearch = debounce(function(){
        const v = normalizeQuery($search.val());
        App.state.searchText = v;
    
        if (v){
          // 全フィルタをデフォルトに戻す
          resetAllFiltersUI();
    
          // ★ カテゴリの内部フィルタも「すべて」に固定
          if (App.categories && App.categories.setFilter){
            App.categories.setFilter(0);
          }
        }
    
        applyBallFilterAndRenderList();
      }, 120);
    
      $search.off('input.search').on('input.search', applySearch);
    }
    

    if ($searchClear.length){
      $searchClear.off('click.search').on('click.search', function(e){
        e.preventDefault();
        if (!$search.length) return;
        $search.val('');
        App.state.searchText = '';
      
        // 全部リセット（カテゴリも0）
        resetAllFiltersUI();
        if (App.categories && App.categories.setFilter){
          App.categories.setFilter(0);
        }
      
        applyBallFilterAndRenderList();
        $search.trigger('focus');
      });
      
    }


        // ===== クイック日付（ballDueDate など）=====
        // data-kind: today|tomorrow|dayafter|week|month
        (function attachQuickDateButtons(){
          const pad2 = (n)=> String(n).padStart(2,'0');
          const fmtDateInput = (d)=> `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
          const plusDays = (base, days)=>{
            const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
            d.setDate(d.getDate() + days);
            return d;
          };
          const plus1Month = (base)=>{
            const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
            // 月繰り上げ（末日吸収もブラウザがよしなに処理）
            d.setMonth(d.getMonth() + 1);
            return d;
          };
      
          $('#modalBackdrop').on('click.qd', '.qd-btn', function(e){
            e.preventDefault();
            e.stopPropagation();
            const targetSel = $(this).data('target') || '#ballDueDate';
            const kind = String($(this).data('kind') || 'today');
            const $inp = $(targetSel);
            if (!$inp.length) return;
      
            const today = App.utils?.today ? App.utils.today() : new Date();
            let d = today;
            if (kind === 'today')    d = today;
            else if (kind === 'tomorrow') d = plusDays(today, 1);
            else if (kind === 'dayafter') d = plusDays(today, 2);
            else if (kind === 'week')     d = plusDays(today, 7);
            else if (kind === 'month')    d = plus1Month(today);
      
            $inp.val(fmtDateInput(d)).trigger('change');  // ← 既存の change 連動でカードへ反映
          });
        })();
      
        // ===== クイック時刻（taskStartTime など）=====
        // data-time: "HH:MM"（例 "09:00"）
        (function attachQuickTimeButtons(){
          const Z2H = (s)=> s.replace(/[０-９：時分　]/g, (ch)=>{
            const code = ch.charCodeAt(0);
            if (ch === '：') return ':';      // 全角コロン
            if (ch === '時' || ch === '分') return ':'; // "時" "分" → 区切り扱い（多重コロンは後で潰す）
            if (ch === '　') return ' ';      // 全角スペース
            if (code >= 0xFF10 && code <= 0xFF19) return String(code - 0xFF10); // 全角数字
            return ch;
          });
        
          const pad2 = (n)=> String(Math.max(0, Number(n)||0)).padStart(2,'0');
        
          const toHHMM = (raw)=>{
            if (raw == null) return null;
            let s = String(raw).trim();
            if (!s) return null;
        
            // 全角や "時/分" を半角の ":" に寄せる
            s = Z2H(s);
            // 余計な文字をスペースに（数字とコロン以外）
            s = s.replace(/[^\d:]/g, ' ').replace(/\s+/g, ' ').trim();
        
            // パターン1: "h:m" / "hh:mm"
            if (/^\d{1,2}:\d{1,2}$/.test(s)) {
              let [h,m] = s.split(':');
              return `${pad2(h)}:${pad2(m)}`;
            }
        
            // パターン2: "h" / "hh" → 時のみ
            if (/^\d{1,2}$/.test(s)) {
              return `${pad2(s)}:00`;
            }
        
            // パターン3: "hmm" / "hhmm"（例: 930, 1530）
            if (/^\d{3,4}$/.test(s)) {
              const h = s.length === 3 ? s.slice(0,1) : s.slice(0,2);
              const m = s.slice(-2);
              return `${pad2(h)}:${pad2(m)}`;
            }
        
            // パターン4: 区切りが多重化したとき（"9::30" 等）を救済
            if (s.includes(':')) {
              const parts = s.split(':').filter(Boolean); // 空要素除去
              if (parts.length === 1 && /^\d{1,2}$/.test(parts[0])) {
                return `${pad2(parts[0])}:00`;
              }
              if (parts.length >= 2 && /^\d{1,2}$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1])) {
                return `${pad2(parts[0])}:${pad2(parts[1])}`;
              }
            }
        
            // 日本語ショートカット
            if (s === '今日中' || /きょうじゅう/i.test(s)) return '18:00';
        
            return null; // どうしても解釈できない
          };
        
          $('#modalBackdrop')
            .off('click.qt')
            .on('click.qt', '.qt-btn', function(e){
              e.preventDefault();
              e.stopPropagation();
        
              const targetSel = $(this).data('target') || '#taskStartTime';
              const $inp = $(targetSel);
              if (!$inp.length) return;
        
              const hhmm = toHHMM($(this).data('time'));
              if (!hhmm) return;
        
              // 入力が <input type="time"> でも確実に入るフォーマット（HH:MM）
              $inp.val(hhmm).trigger('change');
            });
        })();



// --- モーダル外クリックで閉じる（ドラッグは閉じない）---
(function attachBackdropCloseGuard(){
 $modal.off('.backdrop');

  let isDownOnBackdrop = false;
  let startX = 0, startY = 0;

  const getXY = (ev) => {
    const e = ev.originalEvent || ev;
    const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    return { x: t.clientX, y: t.clientY };
  };


      // ── ボールフィルタボタン
      $('#ballFilterBar').on('click', '.bf-btn', function(e){
        // Ctrl/Cmd 押しながらなら一旦全部リセット
        if (e.ctrlKey || e.metaKey){
          resetAllFiltersUI();
        }
      
        // このボタンをアクティブに
        $('#ballFilterBar .bf-btn')
          .removeClass('is-active')
          .attr('aria-pressed','false');
        $(this)
          .addClass('is-active')
          .attr('aria-pressed','true');
      
        // state更新
        const m = String($(this).data('ball'));           // "all"|"mine"|"theirs"|"prod"
        const ALLOWED_SIDE = ['mine','theirs','prod'];    // サイド指定あり
        App.state.ballFilter = ALLOWED_SIDE.includes(m) ? m : 'all';
      
        // 絞り込み＆バッジ更新
        applyBallFilterAndRenderList();
      });
      

      // ── 期限フィルタボタン
      $('#dueFilterBar').on('click', '.df-btn', function(e){
        if (e.ctrlKey || e.metaKey){
          resetAllFiltersUI();
        }
      
        $('#dueFilterBar .df-btn')
          .removeClass('is-active')
          .attr('aria-pressed','false');
        $(this)
          .addClass('is-active')
          .attr('aria-pressed','true');
      
          const d = String($(this).data('due')); 
          const ALLOWED = ['overdue','today','tomorrow','dayafter','week','month','later','none'];
          App.state.ballDueFilter = ALLOWED.includes(d) ? d : 'all';
             
        applyBallFilterAndRenderList();
      });
      
      


// === 右端パネルの開閉（矢印で開く・×/背景で閉じる）===
$ballPeek.on('click', function(){
  $ballPanel.attr('aria-hidden','false');
  $ballBackdrop.attr('aria-hidden','false').show();
});

$ballCloseBtn.on('click', function(){
  $ballPanel.attr('aria-hidden','true');
  $ballBackdrop.attr('aria-hidden','true').hide();
});

$ballBackdrop.on('click', function(){
  $ballPanel.attr('aria-hidden','true');
  $ballBackdrop.attr('aria-hidden','true').hide();
});

// ===== 右端3列リスト（こっち／向こう／制作）の挙動 =====
const $bothLists = $ballListMine.add($ballListTheirs).add($ballListProd);


// 1) 📝で編集モーダル
$bothLists.off('click.bl').on('click.bl', '.bl-note-btn', function(e){
  e.preventDefault();
  e.stopPropagation();
  const $item = $(this).closest('.balllist-item');
  const id = $item.data('id');
  const $card = $(`#board .card[data-id="${id}"]`);
  if ($card.length) openModal(itemFromCard($card));
});

// 保険：ダブルクリックのバブリング抑止
$bothLists.on('dblclick.bl', '.bl-note-btn', function(e){
  e.preventDefault();
  e.stopPropagation();
});

// 2) 行ダブルクリック：メインだけ子ページへ
$bothLists.on('dblclick.bl', '.balllist-item', function(e){
  e.preventDefault();
  e.stopPropagation();
  const isSub = $('body').attr('data-subpage') === '1'
             || $('body').data('subpage') === 1
             || !!App.state.SUB_ID;
  if (isSub) return;
  const id = $(this).data('id');
  if (id) location.href = `?sub=${encodeURIComponent(id)}`;
});

// 3) キーボード：Enter=📝 / Shift+Enter=子ページ
$bothLists.on('keydown.bl', '.balllist-item', function(e){
  if (e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    $(this).find('.bl-note-btn').trigger('click');
  } else if (e.key === 'Enter' && e.shiftKey){
    e.preventDefault();
    $(this).trigger('dblclick');
  }
});


      
      // 右パネルの×で閉じる → すべて表示に戻す
      $('#ballListClose, #ballListBackdrop').on('click', function(){
        App.state.ballListManuallyHidden = true; // 手動で閉じたことを記録
        $('#ballListPanel').attr('aria-hidden','true');
        $('#ballListBackdrop').attr('aria-hidden','true').hide();
      });

      

  $modal.on('mousedown.backdrop touchstart.backdrop', function(e){
    // 背景（backdrop）そのものを押したときだけカウント
    if (e.target !== this) { isDownOnBackdrop = false; return; }
    isDownOnBackdrop = true;
    const p = getXY(e);
    startX = p.x; startY = p.y;
  });

  $modal.on('mouseup.backdrop touchend.backdrop', function(e){
    if (!isDownOnBackdrop) return;
    // 離した場所も backdrop 自身じゃなければ閉じない
    if (e.target !== this) { isDownOnBackdrop = false; return; }

    const p = getXY(e);
    const dx = Math.abs(p.x - startX);
    const dy = Math.abs(p.y - startY);
    const THRESH = 6; // px（これ以上動いていればドラッグ扱い）

    if (dx <= THRESH && dy <= THRESH){
      closeModal();
    }
    isDownOnBackdrop = false;
  });
})();



    
      $btnDelete.on('click', doDelete);
      $btnComplete.on('click', doComplete);

      $ballTabMine.on('click',   ()=> setBallSide(0));
      $ballTabTheirs.on('click', ()=> setBallSide(1));
      $ballTabNone.on('click',   ()=> setBallSide(2));

      $(document)
      .off('click.btnsave')
      .on('click.btnsave', '#btnSave', function(e){
        e.preventDefault();
        e.stopPropagation();
        if (App.state.saving) return;   // 二重実行ガード
        doSave();
      });

 
// --- 日付変更（着手/テストアップ/校了/納品/ボール期限）をカードへミラーして再計算
$modal.on('change', '#taskStart, #taskTest, #taskProof, #taskDelivery, #ballDueDate', function(){
  if (!App.state.editingId) return;
  const $card = $(`[data-id="${App.state.editingId}"]`);
  if (!$card.length) return;

  const id2attr = {
    taskStart   : 'data-start',
    taskTest    : 'data-testup',
    taskProof   : 'data-proof',
    taskDelivery: 'data-delivery',
    ballDueDate : 'data-ball-due'
  };
  const attr = id2attr[this.id];
  if (attr) $card.attr(attr, $(this).val() || '');

  // 表示の再計算（ETA と ステージ用クラス）
  updateCardBadges($card);
  updateStageClasses($card);
  updateTodayEstHours();
  updateCardScale(); 
});


// 追加：時刻 change（対応する data-*-time を更新）
$modal.on('change', '#taskStartTime, #taskTestTime, #taskProofTime, #taskDeliveryTime, #ballDueTime', function(){
    if (!App.state.editingId) return;
    const $card = $(`[data-id="${App.state.editingId}"]`);
    if (!$card.length) return;
  
    const id2attr = {
      taskStartTime    : 'data-start-time',
      taskTestTime     : 'data-testup-time',
      taskProofTime    : 'data-proof-time',
      taskDeliveryTime : 'data-delivery-time',
      ballDueTime      : 'data-ball-due-time'
    };
    const attr = id2attr[this.id];
    if (attr) $card.attr(attr, $(this).val() || '');
  
    // 日付ベースの表示はそのままだが、再計算しておくと安心
    updateCardBadges($card);
    updateStageClasses($card);
  });
  
// 既存の date-clear を置き換え（.off で重複防止）
$modal.off('click.dateclear').on('click.dateclear', '.date-clear', function(e){
  e.preventDefault();
  e.stopPropagation();
  $(this).attr('type','button'); // 念のため

  const sel = $(this).data('target');
  const $inp = sel ? $(sel) : $(this).prev('input[type="date"]');
  if (!$inp.length) return;

  // 対象の日付を消す
  $inp.val('').trigger('change');
 // 対応する time も消す
  const id = $inp.attr('id');
  const pair = {
    taskStart:    $taskStartTime,
    taskTest:     $taskTestTime,
    taskProof:    $taskProofTime,
    taskDelivery: $taskDeliveryTime,
    ballDueDate:  $ballDueTime
  }[id];
  if (pair && pair.length){ pair.val('').trigger('change'); }

  // 連動チェックOFF（change も飛ばす）
  if (id === 'taskStart')    $chkStart.prop('checked', false).trigger('change');
  if (id === 'taskTest')     $chkTest.prop('checked', false).trigger('change');
  if (id === 'taskProof')    $chkProof.prop('checked', false).trigger('change');
  if (id === 'taskDelivery') $chkDelivery.prop('checked', false).trigger('change');

  // ★ UX改善：着手日を消したら他の日付も一緒に消しておく（バリデ回避）
  if (id === 'taskStart'){
    $taskTest.val('').trigger('change');
    $taskProof.val('').trigger('change');
    $taskDelivery.val('').trigger('change');
    $taskTestTime.val('').trigger('change');
    $taskProofTime.val('').trigger('change');
    $taskDeliveryTime.val('').trigger('change');
    $chkTest.prop('checked', false).trigger('change');
    $chkProof.prop('checked', false).trigger('change');
    $chkDelivery.prop('checked', false).trigger('change');
  }

  // 万一 saving が立っていたら解除しておく
  resetSaving();
});




// --- チェック変更（着手/テスト/校了/納品）をカードへミラーして再計算
$modal.on('change', '#chkStart, #chkTest, #chkProof, #chkDelivery', function(){
  if (!App.state.editingId) return;
  const $card = $(`[data-id="${App.state.editingId}"]`);
  if (!$card.length) return;

  const id2flag = {
    chkStart   : 'data-f-start',
    chkTest    : 'data-f-test',
    chkProof   : 'data-f-proof',
    chkDelivery: 'data-f-delivery'
  };
  const attr = id2flag[this.id];
  if (attr) $card.attr(attr, this.checked ? '1' : '0');

  updateStageClasses($card);
});




  
      // ---- ノートボタン ----
      $board.off('click', '.note-btn'); // 念のため前の委譲を解除
      $board.on('click', '.note-btn', function(e){
        e.preventDefault();
        e.stopPropagation();
        const $card = $(this).closest('.card');
        if (!$card.length) return;
        openModal(itemFromCard($card));   // ← 詳細（編集モーダル）を開く
      });
      
      // ダブルクリックが親のdblclickに波及しないよう保険
      $board.on('dblclick', '.note-btn', function(e){
        e.preventDefault();
        e.stopPropagation();
      });
  
            $(window).on('keydown.tasks', function(e){
                // IME変換中は無視
                if (e.originalEvent && e.originalEvent.isComposing) return;
        
                const modalOpen = isModalOpen();
        
                // 新規（Shift  ""）
                if (!modalOpen && e.shiftKey && (e.key === '+' || e.key === '=')){
                  e.preventDefault();
                  openModal();
                  return;
                }
        
                if (!modalOpen) return;
        
                // 保存：Ctrl/Cmd  Enter
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter'){
                  e.preventDefault();
                  doSave();
                  return;
                }
                // 完了：Shift  D
                if (e.shiftKey && (e.key === 'D' || e.key === 'd')){
                  e.preventDefault();
                  doComplete();
                  return;
                }
                // Enter 単体は何もしない（デフォルト動作：テキストエリアの改行など）
            });
    }
  
   
    // ---- 公開API（上書きしない版）----
Object.assign(App.tasks, {
  init: async function(){
    bindEvents();
    await this.loadAll();
  },
  loadAll: async function(){
    return App.api.get(App.api.url('?action=list')).done(json=>{
      if (json.ok){
        (json.items||[]).forEach(addCard);
        refreshSubCounts();
        App.categories.applyFilter();
        applyBallFilterAndRenderList();
        updateTodayEstHours(); 
        updateCardScale();
      }
      App.shell?.completed?.render?.();
    }).always(()=>{
      if (App.calendar && App.calendar.isActive()) App.calendar.render();
    });
  },
  addCard, openModal, closeModal, refreshSubCounts
});

// ---- 内部関数の公開（将来の分割用・今は未使用でもOK）----
Object.assign(App.tasks.api, {
  addCard,
  openModal,
  closeModal,
  refreshSubCounts,
  applyPayloadToCard,
  collectTaskPayload,
  updateCardBadges,
  updateStageClasses,
  setCardFlags,
  makeDraggable,
  itemFromCard,
  doSave,
  doDelete,
  doComplete,
  renderCardTitle,
});

  
  })(window.App);
  