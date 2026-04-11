// asset/02-tags.js
(function(App){
    if (!App) return;

    let TAG_TYPES = []; 
    let TAGS = [];      
    let TASK_TAG_MAP = {}; // taskId -> [tagId, ...]

    const $filterContainer = $('#tagFiltersContainer');
    const $selectContainer = $('#tagSelectContainer');
    const $manageModal = $('#tagTypeModalBackdrop');
    const $manageList = $('#tagTypesList');

    // 色生成用
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 16)];
        return color;
    }

    App.tags = {
        async init(){
            await this.loadAll();
            this.renderFilters();
            this.bindEvents();
        },
        
        async loadAll(){
            const [types, tags, map] = await Promise.all([
                App.api.get('?action=tagtype_list'),
                App.api.get('?action=tag_list'),
                App.api.get('?action=task_tags_list')
            ]);
            if(types.ok) TAG_TYPES = types.items;
            if(tags.ok) TAGS = tags.items;
            if(map.ok) TASK_TAG_MAP = map.map;
        },

        getTagsForTask(taskId){
            return TASK_TAG_MAP[taskId] || [];
        },


// タグの色を取得（タスクカードの色付けに使用）
getColorForTask(taskId){
    let tids = this.getTagsForTask(taskId);
    // 読み込み直後などでデータが見つからない場合はDOMから安全に拾う
    if (!tids || tids.length === 0) {
        const $c = $(`.card[data-id="${taskId}"]`);
        if ($c.length) {
            tids = ($c.attr('data-tags') || '').split(',').map(Number).filter(n => n > 0);
        }
    }
    if(!tids || tids.length === 0) return null;

    for (let i = 0; i < TAG_TYPES.length; i++) {
        const type = TAG_TYPES[i];
        const matchTag = TAGS.find(t => t.type_id == type.id && tids.includes(Number(t.id)));
        if (matchTag && matchTag.color) {
            return matchTag.color;
        }
    }
    return null;
},

// タスクカード上にタグのバッジを描画する（タイトルも書き換える）
renderCardTags($card){
    const $wrap = $card.find('.card-tags');
    if (!$wrap.length) return;
    $wrap.empty();
    
    const tagStr = $card.attr('data-tags') || '';
    const tids = tagStr.split(',').map(Number).filter(n => n > 0);
    
    // ★追加：元の生タイトルを取得しておく
    const rawTitle = $card.data('raw_title') || '';

    if (tids.length === 0) {
        // タグがない場合は元のタイトルだけ表示
        $card.find('.title .t').text(rawTitle);
        return;
    }
    
    // 常に「タグ管理画面のグループ順」に合わせてバッジを並び替える
    const sortedTags = [];
    TAG_TYPES.forEach(type => {
        const groupTags = TAGS.filter(t => t.type_id == type.id && tids.includes(Number(t.id)));
        groupTags.forEach(tag => sortedTags.push(tag));
    });
    
    // ★追加：一番最初のタグ名をタイトルの前につける
    if (sortedTags.length > 0) {
        $card.find('.title .t').text(`${sortedTags[0].name}_${rawTitle}`);
    } else {
        $card.find('.title .t').text(rawTitle);
    }

    sortedTags.forEach(tag => {
        $wrap.append(`<span class="card-tag-badge" style="border-left-color: ${tag.color};">${App.utils && App.utils.escapeHtml ? App.utils.escapeHtml(tag.name) : tag.name}</span>`);
    });
},


        // 画面上部フィルタ描画
        renderFilters(){
    // 再描画時に選択状態を維持するため、現在の active なタグIDを記憶
    const activeIds = [];
    $filterContainer.find('.tag-filter-btn.active').each(function(){
        const id = Number($(this).data('id'));
        if (id) activeIds.push(id);
    });

    $filterContainer.empty();
    
    TAG_TYPES.forEach(type => {
        const groupTags = TAGS.filter(t => t.type_id == type.id);
        if(groupTags.length === 0) return;

        const $group = $(`<div class="tag-filter-group"></div>`);
        $group.append(`<span class="tag-filter-label">${type.name}</span>`);
        
        // グループ内で1つでも選択されているタグがあるか？
        const isAnyActive = groupTags.some(tag => activeIds.includes(Number(tag.id)));

     // 「すべて」ボタンの作成
     const $allBtn = $(`<button class="tag-filter-btn ${!isAnyActive ? 'active' : ''}" data-id="0" style="border-left-color: transparent;">すべて (0)</button>`);
        $allBtn.on('click', function(){
            if ($(this).hasClass('active')) return; // 選択中は解除しない
            $group.find('.tag-filter-btn').removeClass('active');
            $(this).addClass('active');
            if (App.tasks && App.tasks.applyBallFilterAndRenderList) {
                App.tasks.applyBallFilterAndRenderList();
            }
        });
        $group.append($allBtn);

// タグボタンの作成
groupTags.forEach(tag => {
    const isActive = activeIds.includes(Number(tag.id));
    
    // ★追加: ボタンと鉛筆アイコンをくっつけるための「枠（ラッパー）」
    const $wrap = $('<div style="display:inline-flex; align-items:stretch; border-radius:4px; overflow:hidden; background:#333;"></div>');

    // ★修正: 枠の中に入れるため、角丸や余白をリセットしたボタン
    const $btn = $(`<button class="tag-filter-btn ${isActive ? 'active' : ''}" data-id="${tag.id}" data-name="${tag.name}" style="border-left-color: ${tag.color}; border-radius:0; margin:0;" title="左クリック: 絞り込み / 右・ダブルクリック: 詳細編集">${tag.name} (0)</button>`);
    
    // ★追加: 鉛筆ボタン
    const $editBtn = $(`<button type="button" title="詳細編集" style="background:transparent; border:none; border-left:1px solid #444; color:#aaa; cursor:pointer; padding:0 6px; font-size:11px; transition:0.2s;">✏️</button>`);
    
    // 鉛筆ボタンにマウスを乗せたときのアニメーション
    $editBtn.on('mouseover', function(){ $(this).css({background:'#555', color:'#fff'}); });
    $editBtn.on('mouseout',  function(){ $(this).css({background:'transparent', color:'#aaa'}); });

    $btn.on('click', function(){
        if ($(this).hasClass('active')) return; // 選択中は解除しない
        $group.find('.tag-filter-btn').removeClass('active'); // グループ内の他を解除
        $(this).addClass('active'); // 自分を選択
        if (App.tasks && App.tasks.applyBallFilterAndRenderList) {
            App.tasks.applyBallFilterAndRenderList();
        }
    });

    // 編集モーダルを開く共通処理
    const openEditModal = () => {
        App.state.editingTagId = tag.id;
        $('#tagEditName').val(tag.name || '');
        $('#tagEditNote').val(tag.note || '');
        if (typeof window.renderTagLinksUI === 'function') window.renderTagLinksUI(tag.links);
        $('#tagEditModalBackdrop').css('display', 'flex').attr('aria-hidden', 'false');
    };

    // 右クリック、またはダブルクリック（慣れている人向けのショートカットとして残す）
    $btn.on('contextmenu dblclick', function(e) {
        e.preventDefault(); 
        openEditModal();
    });

    // ★追加: 鉛筆ボタンをクリックした時
    $editBtn.on('click', function(e){
        e.preventDefault();
        openEditModal();
    });

    // 枠に2つのボタンを入れて、グループに追加
    $wrap.append($btn).append($editBtn);
    $group.append($wrap);
});

        
        $filterContainer.append($group);
    });
},

     
// タスク編集モーダル内の描画（常に表示・半透明方式）
renderSelect(currentTagIds = []){
    $selectContainer.empty();
    if(TAG_TYPES.length === 0) {
        $selectContainer.html('<div style="color:#aaa">タググループがありません。「タグ管理」から作成してください。</div>');
        return;
    }

    TAG_TYPES.forEach(type => {
        const groupTags = TAGS.filter(t => t.type_id == type.id);
        const isMultiMode = (type.order == 1); 

        const modeLabelClass = isMultiMode ? 'mode-multi' : 'mode-single';
        const modeLabelText  = isMultiMode ? '(複数選択可)' : '(単一選択)';
        
        // 新しい行（v2）
        const $row = $(`<div class="tag-display-row-v2" data-type-id="${type.id}"></div>`);
        
        const $titleWrap = $(`
            <div class="tag-row-title-wrap">
                <span class="tag-row-title">${type.name}</span>
                <span class="tag-row-mode ${modeLabelClass}">${modeLabelText}</span>
            </div>
        `);

      
     // ★全行表示するコンテナ（初期状態で開いておく）
     const $tagsWrap = $(`<div class="tag-row-tags-list"></div>`);

        // 「なし」ボタン（単一選択時のみ）
        if (!isMultiMode) {
            const hasSelected = currentTagIds.some(id => groupTags.find(t => t.id == id));
            const isNoneSelected = !hasSelected;
            
            const $clearLabel = $(`
                <label class="tag-select-lbl ${isNoneSelected ? 'is-selected' : ''}" style="border-left: 3px solid transparent;">
                    <input type="radio" name="tags_${type.id}" value="" ${isNoneSelected ? 'checked' : ''} style="margin-right:4px;">
                    (なし)
                </label>
            `);
            $tagsWrap.append($clearLabel);
        }

        // タグの生成
        groupTags.forEach(tag => {
            const isChecked = currentTagIds.includes(Number(tag.id));
            const inputType = isMultiMode ? 'checkbox' : 'radio';
            const inputName = isMultiMode ? 'tags[]' : `tags_${type.id}`;

            const $label = $(`
                <label class="tag-select-lbl ${isChecked ? 'is-selected' : ''}" style="border-left: 3px solid ${tag.color};">
                    <input type="${inputType}" name="${inputName}" value="${tag.id}" ${isChecked ? 'checked' : ''} style="margin-right:4px;">
                    ${tag.name}
                </label>
            `);
            $tagsWrap.append($label);
        });

        // その場で追加ボタン
        const $addBtn = $(`<button type="button" class="tag-add-btn">+追加</button>`);
        $addBtn.on('click', ()=>{
            const newName = prompt(`${type.name} に新しいタグを追加:`);
            if(newName){
                const currentIds = App.tags.getSelectedTagIds();
                App.api.post('?action=tag_create', { type_id: type.id, name: newName, color: getRandomColor() })
                .done(async ()=>{ 
                    await App.tags.loadAll(); 
                    const newTag = TAGS.find(t => t.name === newName && t.type_id === type.id);
                    if (newTag) currentIds.push(Number(newTag.id));
                    App.tags.renderSelect(currentIds); 
                    App.tags.renderFilters(); 
                    if (App.tasks && App.tasks.applyBallFilterAndRenderList) App.tasks.applyBallFilterAndRenderList(); 
                    
                    // 追加後は全て見えるように展開しておく
                    const $targetWrap = $selectContainer.find(`.tag-display-row-v2[data-type-id="${type.id}"] .tag-row-tags-list`);
                    $targetWrap.removeClass('is-collapsed');
                    $targetWrap.next('.tag-expand-wrap').find('button').text('▲');
                });
            }
        });
        $tagsWrap.append($addBtn);

       // 展開（閉じる）ボタン（▲）
       const $expandWrap = $(`<div class="tag-expand-wrap"><button type="button" class="tag-expand-btn">▲</button></div>`);

        $row.append($titleWrap);
        $row.append($tagsWrap);
        $row.append($expandWrap);
        $selectContainer.append($row);

        // ★選択状態の切り替え連動（色をクッキリさせる処理）
        $tagsWrap.find('input').on('change', function() {
            if (!isMultiMode) {
                $tagsWrap.find('.tag-select-lbl').removeClass('is-selected');
            }
            if ($(this).is(':checked')) {
                $(this).closest('.tag-select-lbl').addClass('is-selected');
            } else {
                $(this).closest('.tag-select-lbl').removeClass('is-selected');
            }
        });

        // ★DOM描画後に「1行に収まっているか？」を判定して、収まっていれば展開ボタンを消す
        setTimeout(() => {
            if ($tagsWrap[0].scrollHeight <= 32) {
                $expandWrap.css('visibility', 'hidden'); 
            }
        }, 0);

        // 展開イベント
        $expandWrap.find('.tag-expand-btn').on('click', function() {
            if ($tagsWrap.hasClass('is-collapsed')) {
                $tagsWrap.removeClass('is-collapsed');
                $(this).text('▲');
            } else {
                $tagsWrap.addClass('is-collapsed');
                $(this).text('▼');
            }
        });
    });
},
        
getSelectedTagIds(){
    const ids = [];
    // チェックボックスとラジオボタンの両方から取得
    $selectContainer.find('input:checked').each(function(){
        const val = $(this).val();
        if (val) ids.push(Number(val));
    });
    return ids;
},

        bindEvents(){
            $('#btnManageTags').on('click', ()=> {
                $manageModal.show().attr('aria-hidden', 'false');
                this.renderManageList();
            });
            $('#tagTypeModalClose').on('click', ()=> $manageModal.hide());

            $('#newTagTypeAddBtn').on('click', ()=>{
                const name = $('#newTagTypeName').val().trim();
                const isMulti = $('#newTagTypeMulti').is(':checked') ? 1 : 0;
                if(name) {
                    App.api.post('?action=tagtype_create', { name, is_multi: isMulti }).done(async ()=>{
                        $('#newTagTypeName').val('');
                        $('#newTagTypeMulti').prop('checked', false);
                        await App.tags.loadAll();
                        App.tags.renderManageList();
                        App.tags.renderFilters();
                        if (App.tasks && App.tasks.applyBallFilterAndRenderList) App.tasks.applyBallFilterAndRenderList(); // ★追加
                    });
                }
            });


            // ▼ 追加: グループの編集
// ▼ 修正: グループの編集（名前の変更のみ・安全）
$manageList.on('click', '.btn-edit-type', function(){
    const id = $(this).data('id');
    const oldName = $(this).data('name');
    
    const newName = prompt('グループ名を変更:', oldName);
    if(newName === null) return; // キャンセルした場合は何もしない
    const finalName = newName.trim() === '' ? oldName : newName.trim();

    if (finalName !== oldName) {
        // 名前だけを更新（複数/単一のフラグは触らない）
        App.api.post('?action=tagtype_update', { id: id, name: finalName }).done(async ()=>{
            await App.tags.loadAll();
            App.tags.renderManageList();
            App.tags.renderFilters();
            if (App.tasks && App.tasks.applyBallFilterAndRenderList) App.tasks.applyBallFilterAndRenderList();
        });
    }
});

// ▼ 追加: 複数選択のトグル切り替え（ここで切り替えとクレンジングを行う）
$manageList.on('change', '.cb-multi-toggle', function(){
    const id = $(this).data('id');
    const name = $(this).data('name');
    const isMulti = $(this).is(':checked') ? 1 : 0;
    const $cb = $(this);

    // 複数選択 -> 単一選択 に変更する時だけ警告を出す
    if (isMulti === 0) {
        if (!confirm('単一選択に変更すると、現在このグループで複数選択されているタスクのタグが「1つだけ」残して消去されます。\n本当によろしいですか？')) {
            $cb.prop('checked', true); // キャンセル時はチェックを元に戻す
            return;
        }
    }

    App.api.post('?action=tagtype_update', { id: id, name: name, is_multi: isMulti }).done(async ()=>{
        // ★修正: 画面を更新する前に、必ずタグの最新データを読み込む
        await App.tags.loadAll();
        
        // タスクカードのタグ状態を完全に反映させるため再読み込み
        if (App.tasks && App.tasks.loadAll) {
            await App.tasks.loadAll(); 
        } else {
            App.tags.renderFilters();
        }
        App.tags.renderManageList();
    });
});
            // ▼ 追加: グループの削除
            $manageList.on('click', '.btn-del-type', function(){
                if(confirm('このグループと、中に含まれるすべてのタグを削除しますか？')){
                    const id = $(this).data('id');
                    App.api.post('?action=tagtype_delete', { id: id }).done(async ()=>{
                        await App.tags.loadAll();
                        App.tags.renderManageList();
                        App.tags.renderFilters();
                        if (App.tasks && App.tasks.applyBallFilterAndRenderList) App.tasks.applyBallFilterAndRenderList();
                    });
                }
            });
// ▼ 追加: タグのメモ自動保存
$manageList.on('change', '.tag-edit-note', function(){
    const id = $(this).closest('.tag-manage-item').data('id');
    const note = $(this).val().trim();
    const $ta = $(this);
    
    $ta.addClass('is-saving'); // 保存中エフェクト
    App.api.post('?action=tag_update', { id: id, note: note }).done(async ()=>{
        await App.tags.loadAll(); // データだけ最新に（画面は再描画しないのでフォーカスが飛ばない）
        setTimeout(() => $ta.removeClass('is-saving'), 300);
    });
});

// ▼ 追加: タグ自体の編集
$manageList.on('click', '.btn-edit-tag', function(){
                const id = $(this).data('id');
                const oldName = $(this).data('name');
                const newName = prompt('タグ名を変更:', oldName);
                if(newName && newName.trim() !== '' && newName !== oldName){
                    App.api.post('?action=tag_update', { id: id, name: newName.trim() }).done(async ()=>{
                        await App.tags.loadAll();
                        App.tags.renderManageList();
                        App.tags.renderFilters();
                        if (App.tasks && App.tasks.applyBallFilterAndRenderList) App.tasks.applyBallFilterAndRenderList();
                    });
                }
            });

            // ▼ 追加: タグ自体の削除
            $manageList.on('click', '.btn-del-tag', function(){
                if(confirm('このタグを削除しますか？')){
                    const id = $(this).data('id');
                    App.api.post('?action=tag_delete', { id: id }).done(async ()=>{
                        await App.tags.loadAll();
                        App.tags.renderManageList();
                        App.tags.renderFilters();
                        if (App.tasks && App.tasks.applyBallFilterAndRenderList) App.tasks.applyBallFilterAndRenderList();
                    });
                }
            });
        },

        renderManageList(){
            $manageList.empty();
            TAG_TYPES.forEach(type => {
                const groupTags = TAGS.filter(t => t.type_id == type.id);
                
                const multiBadge = type.order == 1 
                    ? '<span style="font-size:10px; background:#4CAF50; color:#fff; padding:2px 6px; border-radius:10px; margin-left:8px; vertical-align:middle;">複数選択可</span>' 
                    : '<span style="font-size:10px; background:#888; color:#fff; padding:2px 6px; border-radius:10px; margin-left:8px; vertical-align:middle;">単一選択</span>';
                
                // ★修正: data-id を付与し、ドラッグ用のハンドル (☰) を追加
                const $div = $(`
                    <div data-id="${type.id}" style="padding:10px; border-bottom:1px solid #ddd; background:#f9f9f9; margin-bottom:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span class="drag-handle-type" style="cursor:grab; color:#999; font-size:16px;" title="ドラッグで並び替え">☰</span>
                                <span style="font-size:14px; font-weight:bold; color:#333;">${App.utils && App.utils.escapeHtml ? App.utils.escapeHtml(type.name) : type.name}${multiBadge}</span>
                            </div>
<div style="display:flex; align-items:center;">
                                <label style="font-size:11px; color:#555; margin-right:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                    <input type="checkbox" class="cb-multi-toggle" data-id="${type.id}" data-name="${type.name}" ${type.order == 1 ? 'checked' : ''} style="margin:0;">
                                    複数選択可
                                </label>
                                <button class="btn btn-sm btn-edit-type" data-id="${type.id}" data-name="${type.name}" style="padding:2px 8px; margin-right:4px;">編集</button>
                                <button class="btn btn-sm btn-del-type" data-id="${type.id}" style="padding:2px 8px; background:#e53935; color:#fff; border:none;">削除</button>
                            </div>
                        </div>
                        <div class="tags-in-group" style="padding-left:10px;"></div>
                    </div>
                `);

                const $tagsContainer = $div.find('.tags-in-group');
                
                if (groupTags.length === 0) {
                    $tagsContainer.append('<div style="font-size:12px; color:#888;">中にタグがありません</div>');
                } else {
// タグごとの行（メモ機能付き）
groupTags.forEach(tag => {
    const safeName = App.utils && App.utils.escapeHtml ? App.utils.escapeHtml(tag.name) : tag.name;
    const safeNote = App.utils && App.utils.escapeHtml ? App.utils.escapeHtml(tag.note || '') : (tag.note || '');
    
    const $tagRow = $(`
        <div class="tag-manage-item" data-id="${tag.id}">
            <div class="tag-manage-item-head">
                <div class="tag-manage-item-left">
                    <span class="drag-handle-tag" title="ドラッグで並び替え">☰</span>
                    <span class="tag-manage-item-name">
                        <span class="tag-manage-item-color" style="background:${tag.color};"></span>
                        ${safeName}
                    </span>
                </div>
                <div>
                    <button class="btn btn-sm btn-edit-tag" data-id="${tag.id}" data-name="${tag.name}" style="padding:2px 6px; font-size:11px; margin-right:4px; background:#fff; color:#333; border:1px solid #ccc;">編集</button>
                    <button class="btn btn-sm btn-del-tag" data-id="${tag.id}" style="padding:2px 6px; font-size:11px; background:#fff; color:#e53935; border:1px solid #ccc;">削除</button>
                </div>
            </div>
            <div class="tag-manage-item-note-wrap">
                <textarea class="tag-edit-note" placeholder="タグのメモ・概要を追加 (入力すると自動保存)">${safeNote}</textarea>
            </div>
        </div>
    `);
    $tagsContainer.append($tagRow);
});

                    // ★追加: グループ内の「タグ」の並び替え設定
                    if (window.Sortable) {
                        new Sortable($tagsContainer[0], {
                            animation: 150,
                            handle: '.drag-handle-tag',
                            onEnd: function () {
                                const ids = [];
                                $tagsContainer.children().each(function(){ ids.push($(this).data('id')); });
                                App.api.post('?action=tag_reorder', { ids }).done(async () => {
                                    await App.tags.loadAll();
                                    App.tags.renderFilters();
                                    if (App.tasks && App.tasks.applyBallFilterAndRenderList) App.tasks.applyBallFilterAndRenderList(); // ★追加
                                });
                            }
                        });
                    }
                }
                $manageList.append($div);
            });

            // ★追加: 「グループ」自体の並び替え設定
            if (window.Sortable) {
                new Sortable($manageList[0], {
                    animation: 150,
                    handle: '.drag-handle-type',
                    onEnd: function () {
                        const ids = [];
                        $manageList.children().each(function(){ ids.push($(this).data('id')); });
                        App.api.post('?action=tagtype_reorder', { ids }).done(async () => {
                            await App.tags.loadAll();
                            App.tags.renderFilters();
                            // 並び順が変わると「どの色が優先されるか」が変わるのでカードの色を更新する
                            if (App.tasks && App.tasks.applyBallFilterAndRenderList) App.tasks.applyBallFilterAndRenderList();
                            
                      // ボード上の全カードの色とバッジ順を再計算
                      $('.card').each(function(){
                        const $c = $(this);
                        const id = $c.attr('data-id');
                        const color = App.tags.getColorForTask(id);
                        if (color) {
                            // ★修正：白文字が読めるようにベースの色を強制的に暗く（-80）する
                            const baseColor = App.utils && App.utils.shade ? App.utils.shade(color, -80) : color;
                            const darkColor = App.utils && App.utils.shade ? App.utils.shade(color, -120) : '#222';
                            $c.css('background', `linear-gradient(180deg, ${baseColor}, ${darkColor})`)
                              .css('border-color', 'rgba(255,255,255,.10)');
                        } else {
                            $c.css({ background:'', borderColor:'' });
                        }
                        // ★追加：バッジも新しい順番に合わせて再描画する
                        App.tags.renderCardTags($c);
                    });
                        });
                    }
                });
            }
        }
    };

    // =========================================
    // タグ詳細編集モーダルの制御機能
    // =========================================
    App.state.editingTagId = null;

    $('#tagEditModalClose, #btnCancelTagEdit').on('click', function(){
        $('#tagEditModalBackdrop').hide().attr('aria-hidden', 'true');
        App.state.editingTagId = null;
    });

    $('#btnSaveTagEdit').on('click', function(){
        const id = App.state.editingTagId;
        const name = $('#tagEditName').val().trim();
        const note = $('#tagEditNote').val().trim();

        if(!name) { App.utils.showToast('タグ名を入力してください'); return; }

        const links = [];
        $('#tagLinksContainer .tl-row').each(function(){
            if ($(this).hasClass('tl-display')) {
                links.push({ type: $(this).data('type'), title: $(this).data('title'), path: $(this).data('path') });
            } else if ($(this).hasClass('tl-edit')) {
                const type = $(this).data('type');
                const title = $(this).find('.tl-in-title').val().trim();
                const path = $(this).find('.tl-in-path').val().trim();
                if(type && title && path) links.push({ type, title, path });
            }
        });

        App.api.post('?action=tag_update', { id: id, name: name, note: note, links: JSON.stringify(links) }).done(async ()=>{
            await App.tags.loadAll();
            App.tags.renderManageList();
            App.tags.renderFilters();
            if (App.tasks && App.tasks.applyBallFilterAndRenderList) App.tasks.applyBallFilterAndRenderList();
            
            $('#tagEditModalBackdrop').hide().attr('aria-hidden', 'true');
            App.state.editingTagId = null;
            App.utils.showToast('タグを更新しました');
        });
    });

    // タグ用：関連フォルダ・リンク機能
    window.renderTagLinksUI = function(linksJson) {
        const $cont = $('#tagLinksContainer');
        $cont.empty();
        let links = [];
        try { links = JSON.parse(linksJson || '[]'); } catch(e){}
        links.forEach(lk => $cont.append(createTagDisplayRow(lk.title, lk.type, lk.path)));
        checkTagAddButton();
    };

    function checkTagAddButton() {
        if ($('#tagLinksContainer .tl-row').length >= 6) $('#btnAddTagLinkRow').hide();
        else $('#btnAddTagLinkRow').show();
    }

    function createTagEditRow(title = '', type = '', path = '', isNew = false) {
        const $row = $('<div class="tl-row tl-edit"></div>').data('type', type);
        $row.data('orig-title', title);
        $row.data('orig-type', type);
        $row.data('orig-path', path);
        $row.data('is-new', isNew);

        let currentTitle = title;
        if (currentTitle === '') {
            if (type === 'folder') currentTitle = '対象フォルダ';
            if (type === 'link')   currentTitle = '対象リンク';
        }

        $row.append(`<input type="text" class="tl-in-title" placeholder="表示名" value="${App.utils.escapeHtml(currentTitle)}" style="background:#fff; color:#000; border:1px solid #ccc; height:32px;">`);
        
        const $btnFolder = $(`<button type="button" class="btn tl-type-btn tl-btn-folder ${type==='folder'?'is-selected':''}">📁 フォルダ</button>`);
        const $btnLink = $(`<button type="button" class="btn tl-type-btn tl-btn-link ${type==='link'?'is-selected':''}">🔗 リンク</button>`);
        
        if (type === 'folder') $btnLink.hide();
        if (type === 'link') $btnFolder.hide();
        
        $row.append($btnFolder).append($btnLink);
        
        const $inPath = $(`<input type="text" class="tl-in-path" placeholder="${type==='link'?'URL (例: https://...)':'パスをペースト (例: C:\\Users\\...)'}" value="${App.utils.escapeHtml(path)}" style="background:#fff; color:#000; border:1px solid #ccc; height:32px;">`);
        if (!type) $inPath.hide();

        $row.append($inPath);
        
        $row.append(`<button type="button" class="btn tl-btn-cancel-edit">戻る</button>`);
        $row.append(`<button type="button" class="btn tl-btn-save">確定</button>`);
        $row.append(`<button type="button" class="tl-btn-del" title="削除" style="color:#888; background:transparent; border:none; cursor:pointer; font-size:16px;">✕</button>`);
        return $row;
    }

    function createTagDisplayRow(title, type, path) {
        const icon = type === 'folder' ? '📁' : '🔗';
        const $row = $(`<div class="tl-row tl-display" data-type="${type}" data-title="${App.utils.escapeHtml(title)}" data-path="${App.utils.escapeHtml(path)}"></div>`);
        $row.append(`<span class="tl-icon" style="color:#000;">${icon}</span>`);
        $row.append(`<a href="#" class="tl-link-go" style="flex:1; color:#0066cc; text-decoration:none; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:bold;">${App.utils.escapeHtml(title)}</a>`);
        $row.append(`<button type="button" class="tl-btn-edit" title="編集" style="color:#888; background:transparent; border:none; cursor:pointer; font-size:16px;">✏️</button>`);
        $row.append(`<button type="button" class="tl-btn-del" title="削除" style="color:#888; background:transparent; border:none; cursor:pointer; font-size:16px;">✕</button>`);
        return $row;
    }

    // タグリンク用イベントバインディング
    $('#btnAddTagLinkRow').on('click', function(){
        $('#tagLinksContainer').append(createTagEditRow('', '', '', true));
        checkTagAddButton();
    });

    const $tmod = $('#tagEditModalBackdrop');

    $tmod.on('click', '.tl-btn-cancel-edit', function(){
        const $row = $(this).closest('.tl-row');
        if ($row.data('is-new')) {
            $row.remove(); 
        } else {
            $row.replaceWith(createTagDisplayRow($row.data('orig-title'), $row.data('orig-type'), $row.data('orig-path')));
        }
        checkTagAddButton();
    });

    $tmod.on('click', '.tl-btn-folder', function(){
        const $row = $(this).closest('.tl-row');
        $row.find('.tl-btn-link').hide();
        $(this).addClass('is-selected');
        const $titleInp = $row.find('.tl-in-title');
        const currentVal = $titleInp.val().trim();
        if (currentVal === '' || currentVal === '対象リンク') {
            $titleInp.val('対象フォルダ');
        }
        $row.find('.tl-in-path').attr('placeholder', 'パスをペースト (例: C:\\Users\\...)').show().focus();
        $row.data('type', 'folder');
    });

    $tmod.on('click', '.tl-btn-link', function(){
        const $row = $(this).closest('.tl-row');
        $row.find('.tl-btn-folder').hide();
        $(this).addClass('is-selected');
        const $titleInp = $row.find('.tl-in-title');
        const currentVal = $titleInp.val().trim();
        if (currentVal === '' || currentVal === '対象フォルダ') {
            $titleInp.val('対象リンク');
        }
        $row.find('.tl-in-path').attr('placeholder', 'URL (例: https://...)').show().focus();
        $row.data('type', 'link');
    });

    $tmod.on('click', '.tl-btn-save', function(){
        const $row = $(this).closest('.tl-row');
        const title = $row.find('.tl-in-title').val().trim();
        const path = $row.find('.tl-in-path').val().trim();
        const type = $row.data('type');
        if(!title || !type || !path) { App.utils.showToast('タイトル、種類、パスをすべて入力してください'); return; }
        $row.replaceWith(createTagDisplayRow(title, type, path));
        checkTagAddButton();
    });

    $tmod.on('click', '.tl-btn-edit', function(){
        const $row = $(this).closest('.tl-row');
        $row.replaceWith(createTagEditRow($row.data('title'), $row.data('type'), $row.data('path'), false));
        checkTagAddButton();
    });

    $tmod.on('click', '.tl-btn-del', function(){
        $(this).closest('.tl-row').remove();
        checkTagAddButton();
    });

    $tmod.on('click', '.tl-link-go', function(e){
        e.preventDefault();
        const $row = $(this).closest('.tl-row');
        const type = $row.data('type');
        const path = $row.data('path');
        if (type === 'link') {
            window.open(path, '_blank');
        } else if (type === 'folder') {
            App.api.post('?action=open_folder', { path: path }).done(res => {
                if(!res.ok) App.utils.showToast(res.error || 'フォルダが開けません');
            });
        }
    });

})(window.App);