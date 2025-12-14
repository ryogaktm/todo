// 02-categories.js
(function(App){
    if (!App) return;
  
    const $bar = $('#categoryBar');
    const $sel = $('#taskCategory');
    const $catModal = $('#catModalBackdrop');
    const $catEditName = $('#catEditName');
    const $catEditNotes= $('#catEditNotes');
    const $catEditSave = $('#catEditSave');
    const $catEditCancel = $('#catEditCancel');
    const $catEditDelete = $('#catEditDelete');  
    const $newCatName = $('#newCatName');
    const $newCatAddBtn = $('#newCatAddBtn');  
    const CAT_FILTER_KEY = 'quad_current_cat';  
    let CATEGORIES = [];  // {id,name,color}
    let currentFilter = Number(localStorage.getItem(CAT_FILTER_KEY) || 0);
    let editingCatId = null;  

    // === 濃色パレット（50+） ===
// === はっきり違う濃色を自動生成（等間隔＋ゴールデンアングル） ===
function hslToHex(h, s, l){
  // s,l: 0-100
  s/=100; l/=100;
  const c = (1 - Math.abs(2*l - 1)) * s;
  const x = c * (1 - Math.abs((h/60)%2 - 1));
  const m = l - c/2;
  let [r,g,b] = [0,0,0];
  if (0<=h && h<60)   [r,g,b]=[c,x,0];
  else if (60<=h && h<120) [r,g,b]=[x,c,0];
  else if (120<=h && h<180)[r,g,b]=[0,c,x];
  else if (180<=h && h<240)[r,g,b]=[0,x,c];
  else if (240<=h && h<300)[r,g,b]=[x,0,c];
  else                     [r,g,b]=[c,0,x];
  const toHex = v => (Math.round((v+m)*255)).toString(16).padStart(2,'0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// しっかり濃いめ（白文字向き）の HSL 値で n 色生成
function genDistinct(n){
  const out = [];
  let h = 0;
  for (let i=0;i<n;i++){
    // ゴールデンアングル（約137.508°）で色相を飛ばして被りを回避
    h = (h + 137.508) % 360;
    const hex = hslToHex(h, 85, 32); // 高彩度・低明度でクッキリ
    out.push(ensureDark(hex, 160));  // 念のため更に暗さを担保（白文字前提）
  }
  return out;
}

// ★ここで個数を調整（まずは 28 色。多すぎて近ければ 24/20 に下げてもOK）
const CAT_PALETTE = genDistinct(28);


// 明度(YIQ)
function yiqLuma(hex){
  const h = (hex||'').replace('#','').replace(/^([0-9a-f])([0-9a-f])([0-9a-f])$/i,'$1$1$2$2$3$3');
  if (!/^[0-9a-f]{6}$/i.test(h)) return 0;
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return (r*299 + g*587 + b*114) / 1000;
}

// 薄ければ暗く矯正（閾値は150〜170で好み調整）
function ensureDark(hex, min=150){
  let c = (hex||'#666666').toUpperCase();
  if (c[0] !== '#') c = '#'+c;
  let tries = 0;
  while (yiqLuma(c) > min && tries < 12){
    c = App.utils.shade(c, -10);
    tries++;
  }
  return c;
}

// パレットからインデックスで色を返す（必ず濃色化）
function colorByIndex(i){
  return ensureDark(CAT_PALETTE[i % CAT_PALETTE.length]);
}

// すべてのカテゴリを「ID昇順」でパレット順に再配色し保存
async function recolorAllAndPersist(){
  const list = [...CATEGORIES].sort((a,b)=>a.id-b.id);
  const posts = [];
  for (let i=0;i<list.length;i++){
    const wanted = colorByIndex(i);
    if (list[i].color !== wanted){
      posts.push(App.api.post('?action=cat_update', { id: list[i].id, color: wanted }));
    }
  }
  if (posts.length){
    await Promise.allSettled(posts);
    // 反映を読み直し
    const j = await App.api.get('?action=cat_list');
    if (j.ok){
      CATEGORIES = (j.items||[]).map(it=>({
        id:Number(it.id), name:it.name, color:ensureDark(it.color||'#666666')
      }));
    }
  }
}





    // ---- Load / Render ----
    function load(){
      return App.api.get('?action=cat_list').then(j=>{
        if (j.ok){
          CATEGORIES = (j.items||[]).map(it=>({
            id: Number(it.id),
            name: it.name,
            color: ensureDark(it.color || '#666666') // ★濃色へ正規化
          }));
        }
        return CATEGORIES;
      });
    }
  
    function renderSelect(selectedId=0){
      if (!$sel.length) return;
      $sel.find('option:not([value="0"])').remove();
      CATEGORIES.forEach(c=> $sel.append(`<option value="${c.id}">${c.name}</option>`));
      $sel.val(String(selectedId||0));
    }
  
    function renderBar(){
      if (App.state.SUB_ID) return;
    
      const chips = [];
    
      // すべて (id=0)
      chips.push(`
        <button class="category-chip ${currentFilter===0?'active':''}" data-id="0"
                style="background:#333333; color:#fff;">
          <span class="txt">すべて <span class="count">（0）</span></span>
          <span class="cat-note-btn" role="button" tabindex="0" title="カテゴリー詳細">📝</span>
        </button>
      `);
    
      // 各カテゴリ
      CATEGORIES.forEach(c=>{
        const bg = ensureDark(c.color || '#666666');
        chips.push(`
          <button class="category-chip ${currentFilter===c.id?'active':''}" data-id="${c.id}"
                  style="background:${bg}; color:#fff;">
            <span class="txt">${c.name} <span class="count">（0）</span></span>
            <span class="cat-note-btn" role="button" tabindex="0" title="カテゴリー詳細">📝</span>
          </button>
        `);
      });
    
      $bar.html(chips.join('')).prop('hidden', false);
    }
    
    function refreshCounts(){
      if (App.state.SUB_ID) return;
    
      // 1) バーを描き直す（今の currentFilter も反映する）
      renderBar();
    
      // 2) dim付け直し
      applyFilter();
    
      // 3) tasks 側のフィルタ計算を回して、
      //    期限・ボール・カテゴリの数字、右パネル、.ball-hide/.ball-dim を全部更新
      if (App.tasks && App.tasks.applyBallFilterAndRenderList){
        App.tasks.applyBallFilterAndRenderList();
      }
      $('.card').each(function(){ App.tasks?.renderCardTitle?.($(this)); });
    }
    
  
    function applyFilter(){
      const $cards = $('.card');
      if (currentFilter === 0) {
        $cards.removeClass('dim');
      } else {
        $cards.each(function(){
          const cid = Number($(this).attr('data-cat') || 0);
          $(this).toggleClass('dim', cid !== currentFilter);
        });
      }
    }
  
    function repaintAllCards(){
      $('.card').each(function(){
        const $c = $(this);
        const cid = Number($c.attr('data-cat')||0);
        const cat = getById(cid);
        if (cat){
          const base = ensureDark(cat.color || '#666666');
          const dark = App.utils.shade(base, -35);
          $c.css('background', `linear-gradient(180deg, ${base}, ${dark})`)
            .css('border-color', 'rgba(255,255,255,.10)')
            .css('color', '#fff');
        } else {
          $c.css({ background:'', borderColor:'', color:'' });
        }
      });
    }
  
    // ---- Modal ----
    function openCatModal(catId){
      editingCatId = Number(catId)||0;
      if (!editingCatId){ App.utils.showToast('カテゴリIDが取得できません'); return; }
      $catModal.data('id', editingCatId);   // ← 保険で保持
      App.api.get(`?action=cat_get&id=${encodeURIComponent(editingCatId)}`).done(j=>{
        if (!j.ok){ App.utils.showToast(j.error||'取得エラー'); return; }
        $catEditName.val(j.item.name || '');
        $catEditNotes.val(j.item.notes || '');
        $catModal.css('display','flex').attr('aria-hidden','false');
        $('body').css('overflow','hidden');
        $catEditName.trigger('focus');
      });
    }
    function closeCatModal(){
      $catModal.hide().attr('aria-hidden','true');
      $('body').css('overflow','');
      editingCatId = null;
    }
  
    // ---- Events ----
    function bind(){
 // バー：クリックでフィルタ、📝クリックで詳細
 $bar.off('click', '.category-chip');
 $bar.on('click', '.category-chip', function(e){
  if ($(e.target).closest('.cat-note-btn').length) return;

  if (e.ctrlKey || e.metaKey){
    if (App.tasks && App.tasks.resetAllFiltersUI){
      App.tasks.resetAllFiltersUI();
    }
  }

  const id = Number($(this).data('id') || 0);
  setFilter(id);
});



 
 $bar.off('dblclick', '.category-chip'); // ダブルクリック編集は廃止
 $bar.on('click', '.cat-note-btn', function(e){
   e.preventDefault();
   e.stopPropagation();
   const id = Number($(this).closest('.category-chip').data('id')||0);
   if (id === 0) return; // 「すべて」は対象外
   openCatModal(id);
 });
 // キーボード操作（Enter/Space）でも📝起動
 $bar.on('keydown', '.cat-note-btn', function(e){
   if (e.key === 'Enter' || e.key === ' ') {
     e.preventDefault();
     $(this).trigger('click');
   }
 });
  
      // モーダル
      $catEditCancel.on('click', closeCatModal);
      $catModal.on('click', function(e){ if (e.target === this) closeCatModal(); });
      $catEditSave.on('click', function(){
        const name  = ($catEditName.val()||'').trim();
        const notes = ($catEditNotes.val()||'').trim();
        const oldId = Number(editingCatId||0);
        if (!oldId || !name){ App.utils.showToast('名前を入力してください'); return; }
      
        const keepSelected = String($sel.val()||'0');
        const keepFilter   = currentFilter;
      
        App.api.post('?action=cat_update', { id: oldId, name, notes }).done(async (j)=>{
          if (!j?.ok){ App.utils.showToast(j?.error||'更新エラー'); return; }
      
          const newId   = Number(j.item?.id ?? oldId);
          const newName = j.item?.name ?? name;
      
          // 画面の data-cat を先に新IDへ（体感の気持ち悪さを減らす）
          if (newId !== oldId){
            $('.card').each(function(){
              if (Number(this.getAttribute('data-cat')||0) === oldId){
                this.setAttribute('data-cat', String(newId));
              }
            });
            if (keepFilter === oldId) currentFilter = newId;
          }
      
          // 表示タイトルを再合成
          $('.card').each(function(){
            if (Number(this.getAttribute('data-cat')||0) === newId){
         
              (App.tasks?.renderCardTitle)?.($(this)); 
            }
            

          });
      
          // ===== ここが重要：サーバー側のタスクも新カテゴリIDへ再割当 =====
          if (newId !== oldId){
            const ids = $('.card').filter((_,el)=> Number(el.getAttribute('data-cat')||0) === newId)
                                  .map((_,el)=> Number(el.getAttribute('data-id'))).get();
      
            try{
              // まとめて更新（並列）
              await Promise.all(ids.map(tid =>
                App.api.post(App.api.url('?action=update'), { id: tid, category_id: newId })
              ));
              // 旧カテゴリは空になったはずなので削除（重複抑止）
              await App.api.post('?action=cat_delete', { id: oldId });
            }catch(_e){
              // 失敗しても後続は実行。見た目は崩さない
            }
          }
      
          // リストとカウントを最新化
          load().then(()=>{
            const nextSel = (keepSelected === String(oldId)) ? String(newId) : keepSelected;
            renderSelect(nextSel);
            refreshCounts();
            repaintAllCards();
            applyFilter();
          });
      
          closeCatModal();
          App.utils.showToast('カテゴリーを更新しました');
        });
      });
      $catEditDelete.on('click', function(){
        if (!editingCatId) return;
        if (!window.confirm('このカテゴリーを削除しますか？\n属するタスクは「未設定」に移動します。')) return;
        const delId = editingCatId;
        App.api.post('?action=cat_delete', { id: delId }).done(j=>{
          if (!j.ok){ App.utils.showToast(j.error||'削除エラー'); return; }
          closeCatModal();
          if (currentFilter === delId) currentFilter = 0;
          // 画面上のカードから見た目だけ未設定に
          $('.card').each(function(){
            if (Number($(this).attr('data-cat')||0) === delId){
              $(this).attr('data-cat', '0').css({ background:'', borderColor:'' });
            }
          });
          load().then(()=>{
            renderSelect($('#taskCategory').val());
            refreshCounts();
            repaintAllCards();
          });
          App.utils.showToast('カテゴリーを削除しました');
        });
      });
  
      // 新規カテゴリ追加
      $newCatAddBtn.on('click', function(){
        const name = ($newCatName.val()||'').trim();
        if (!name){ App.utils.showToast('カテゴリ名を入力'); return; }
        App.api.post('?action=cat_create', { name }).done(async (j)=>{
          if (!j.ok){ App.utils.showToast(j.error||'登録に失敗'); return; }
          await load();
          await recolorAllAndPersist(); // ★作成後に全体をパレット順で塗り直す
          renderSelect(j.item.id);
          $newCatName.val('');
          refreshCounts();
          repaintAllCards();
        });
      });
    }
  
// ---- Helpers ----
function setFilter(id){
  // 内部ステート ＋ localStorage 更新
  currentFilter = Number(id) || 0;
  localStorage.setItem(CAT_FILTER_KEY, String(currentFilter));

  // バーの見た目（active）更新
  if ($bar && $bar.length){
    $bar.find('.category-chip')
      .removeClass('active')
      .attr('aria-pressed','false')
      .filter(`[data-id="${currentFilter}"]`)
        .addClass('active')
        .attr('aria-pressed','true');
  }

  // カードの dim を更新
  applyFilter();

  // 期限/ボール/カテゴリの数字と右パネルも更新
  if (App.tasks && App.tasks.applyBallFilterAndRenderList){
    App.tasks.applyBallFilterAndRenderList();
  }
}

    function getById(id){ return CATEGORIES.find(c=>c.id===Number(id)); }
  
    // ---- Public API ----
 
    App.categories = {
      async init(){
        bind();
        await load();
        await recolorAllAndPersist();
        renderSelect(0);
        refreshCounts();
        repaintAllCards();
      },
      getById,
      renderSelect,
      refreshCounts,
      applyFilter,
      repaintAllCards,
      restoreFilter(){ currentFilter = Number(localStorage.getItem(CAT_FILTER_KEY)||0); },

      // ★ 追加：外からフィルタを変更する用
      setFilter,

      getActiveCategoryId(){
        return currentFilter || 0;
      },

      state: { get currentFilter(){ return currentFilter; } }
    };

    


  })(window.App);
  