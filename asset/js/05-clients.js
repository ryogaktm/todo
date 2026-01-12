// 05-clients.js
(function(App){
    if (!App) return;
  
    const $bar = $('#clientBar');
    const $sel = $('#taskClient');
    const $modal = $('#clientModalBackdrop');
    const $editName = $('#clientEditName');
    const $editNotes= $('#clientEditNotes');
    const $editSave = $('#clientEditSave');
    const $editCancel = $('#clientEditCancel');
    const $editDelete = $('#clientEditDelete');  
    const $newName = $('#newClientName');
    const $newAddBtn = $('#newClientAddBtn');  

    const FILTER_KEY = 'quad_current_client';  
    let ITEMS = []; 
    let currentFilter = Number(localStorage.getItem(FILTER_KEY) || 0);
    let editingId = null;  

    // 色生成ロジックは categories.js にあるものを流用するか、ここで再定義
    // (ここでは省略して categories.js のヘルパーが使えれば使う、なければ簡易版)
    function ensureDark(hex){ return App.categories ? App.utils.shade(hex,-10) : hex; }

    function load(){
      return App.api.get('?action=client_list').then(j=>{
        if (j.ok){
          ITEMS = (j.items||[]).map(it=>({
            id: Number(it.id), name: it.name, color: ensureDark(it.color || '#444444')
          }));
        }
        return ITEMS;
      });
    }
  
    function renderSelect(selectedId=0){
      if (!$sel.length) return;
      $sel.find('option:not([value="0"])').remove();
      ITEMS.forEach(c=> $sel.append(`<option value="${c.id}">${c.name}</option>`));
      $sel.val(String(selectedId||0));
    }
  
    function renderBar(){
      if (App.state.SUB_ID) return; // サブページでは非表示ならここでreturn
    
      const chips = [];
      // すべて
      chips.push(`
        <button class="category-chip ${currentFilter===0?'active':''}" data-id="0" style="background:#333; color:#fff;">
          <span class="txt">すべて <span class="count">（0）</span></span>
        </button>
      `);
    
      ITEMS.forEach(c=>{
        // クライアント用は色を変えるか、categoriesと同じロジックにするか
        // ここでは青系固定などでも良いが、一旦データの色を使う
        chips.push(`
          <button class="category-chip ${currentFilter===c.id?'active':''}" data-id="${c.id}"
                  style="background:${c.color}; color:#fff;">
            <span class="txt">${c.name} <span class="count">（0）</span></span>
            <span class="cat-note-btn" role="button" tabindex="0" title="詳細">📝</span>
          </button>
        `);
      });
      $bar.html(chips.join('')).prop('hidden', false);
    }
    
    function refreshCounts(){
      renderBar();
      // フィルタ適用は tasks.js 側でまとめてやるので、ここではUI更新通知を送るか、
      // tasks側の再描画関数を呼ぶ
      if (App.tasks && App.tasks.applyBallFilterAndRenderList){
        App.tasks.applyBallFilterAndRenderList();
      }
    }

    function openModal(id){
      editingId = Number(id)||0;
      if (!editingId) return;
      App.api.get(`?action=client_get&id=${editingId}`).done(j=>{
        if (!j.ok) return;
        $editName.val(j.item.name || '');
        $editNotes.val(j.item.notes || '');
        $modal.css('display','flex').attr('aria-hidden','false');
      });
    }
    function closeModal(){
      $modal.hide().attr('aria-hidden','true');
      editingId = null;
    }

    // Bind Events
    function bind(){
        // チップクリック
        $bar.off('click', '.category-chip').on('click', '.category-chip', function(e){
            if ($(e.target).closest('.cat-note-btn').length) return;
            const id = Number($(this).data('id')||0);
            currentFilter = id;
            localStorage.setItem(FILTER_KEY, String(id));
            renderBar();
            if (App.tasks) App.tasks.applyBallFilterAndRenderList();
        });

        // 📝ボタン
        $bar.on('click', '.cat-note-btn', function(e){
            e.preventDefault(); e.stopPropagation();
            const id = Number($(this).closest('.category-chip').data('id'));
            openModal(id);
        });

        // モーダル操作
        $editCancel.on('click', closeModal);
        $editSave.on('click', function(){
            const name = $editName.val().trim();
            const notes = $editNotes.val().trim();
            if(!name) return;
            App.api.post('?action=client_update', { id: editingId, name, notes }).done(j=>{
                if(j.ok) {
                    load().then(()=>{ renderSelect(); refreshCounts(); });
                    closeModal();
                    App.utils.showToast('更新しました');
                }
            });
        });

        $editDelete.on('click', function(){
            if(!confirm('削除しますか？\n設定されていたタスクは「未設定」になります。')) return;
            App.api.post('?action=client_delete', { id: editingId }).done(j=>{
                if(j.ok){
                    if(currentFilter===editingId) currentFilter=0;
                    // 画面上のカード属性書き換え
                    $('.card').each(function(){
                        if(Number($(this).attr('data-client')||0)===editingId) $(this).attr('data-client','0');
                    });
                    load().then(()=>{ renderSelect(); refreshCounts(); });
                    closeModal();
                }
            });
        });

        // 新規作成
        $newAddBtn.on('click', function(){
            const name = $newName.val().trim();
            if(!name) return;
            // 色は自動生成などを入れるか、とりあえず固定
            const color = '#2E7D32'; // 緑系
            App.api.post('?action=client_create', { name, color }).done(j=>{
                if(j.ok){
                    $newName.val('');
                    load().then(()=>{ renderSelect(j.item.id); refreshCounts(); });
                }
            });
        });
    }

    // Public
    App.clients = {
        async init(){
            bind();
            await load();
            renderSelect(0);
            refreshCounts();
        },
        getById(id){ return ITEMS.find(c=>c.id===Number(id)); },
        renderSelect,
        refreshCounts,
        getActiveId(){ return currentFilter; },
        setFilter(id){
            currentFilter = Number(id)||0;
            localStorage.setItem(FILTER_KEY, currentFilter);
            renderBar();
            if(App.tasks) App.tasks.applyBallFilterAndRenderList();
        }
    };

})(window.App);