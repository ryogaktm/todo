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

// タスクカード上にタグのバッジを描画する
renderCardTags($card){
    const $wrap = $card.find('.card-tags');
    if (!$wrap.length) return;
    $wrap.empty();
    
    const tagStr = $card.attr('data-tags') || '';
    const tids = tagStr.split(',').map(Number).filter(n => n > 0);
    if (tids.length === 0) return;
    
    // ★変更：常に「タグ管理画面のグループ順」に合わせてバッジを並び替える
    const sortedTags = [];
    TAG_TYPES.forEach(type => {
        const groupTags = TAGS.filter(t => t.type_id == type.id && tids.includes(Number(t.id)));
        groupTags.forEach(tag => sortedTags.push(tag));
    });
    
    sortedTags.forEach(tag => {
        $wrap.append(`<span class="card-tag-badge" style="border-left-color: ${tag.color};">${App.utils && App.utils.escapeHtml ? App.utils.escapeHtml(tag.name) : tag.name}</span>`);
    });
},

        // タスクカード上にタグのバッジを描画する
        renderCardTags($card){
            const $wrap = $card.find('.card-tags');
            if (!$wrap.length) return;
            $wrap.empty();
            
            const tagStr = $card.attr('data-tags') || '';
            const tids = tagStr.split(',').map(Number).filter(n => n > 0);
            if (tids.length === 0) return;
            
            tids.forEach(tid => {
                const tag = TAGS.find(t => t.id == tid);
                if (tag) {
                    $wrap.append(`<span class="card-tag-badge" style="border-left-color: ${tag.color};">${App.utils && App.utils.escapeHtml ? App.utils.escapeHtml(tag.name) : tag.name}</span>`);
                }
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
            const $btn = $(`<button class="tag-filter-btn ${isActive ? 'active' : ''}" data-id="${tag.id}" data-name="${tag.name}" style="border-left-color: ${tag.color};">${tag.name} (0)</button>`);
            
            $btn.on('click', function(){
                if ($(this).hasClass('active')) return; // 選択中は解除しない
                $group.find('.tag-filter-btn').removeClass('active'); // グループ内の他を解除
                $(this).addClass('active'); // 自分を選択
                if (App.tasks && App.tasks.applyBallFilterAndRenderList) {
                    App.tasks.applyBallFilterAndRenderList();
                }
            });
            $group.append($btn);
        });
        
        $filterContainer.append($group);
    });
},

     
// タスク編集モーダル内の描画（クリックでパカッと開く方式）
renderSelect(currentTagIds = []){
    $selectContainer.empty();
    if(TAG_TYPES.length === 0) {
        $selectContainer.html('<div style="color:#aaa">タググループがありません。「タグ管理」から作成してください。</div>');
        return;
    }

    TAG_TYPES.forEach(type => {
        const groupTags = TAGS.filter(t => t.type_id == type.id);
        const isMultiMode = (type.order == 1); 

        // 選択されているタグを抽出
        const selectedTags = groupTags.filter(tag => currentTagIds.includes(Number(tag.id)));
        
   
// --- スッキリ表示（行全体をクリック可能にする） ---
                // クラス名だけを付与。イベント用に trigger-row-ID も付与。
                const $row = $(`<div class="tag-display-row trigger-row-${type.id}"></div>`);
                
                const modeLabelClass = isMultiMode ? 'mode-multi' : 'mode-single';
                const modeLabelText  = isMultiMode ? '(複数選択可)' : '(単一選択)';
                
                const $titleWrap = $(`
                    <div class="tag-row-title-wrap">
                        <span class="tag-row-title">${type.name}</span>
                        <span class="tag-row-mode ${modeLabelClass}">${modeLabelText}</span>
                    </div>
                `);

                const $tagsWrap = $(`<div class="tag-row-tags-wrap"></div>`);

                if (selectedTags.length === 0) {
                    $tagsWrap.append(`<span class="tag-empty-text">（未選択）</span>`);
                } else {
                    selectedTags.forEach(tag => {
                        // 色だけは動的データなのでJSで指定
                        $tagsWrap.append(`<span class="tag-selected-badge" style="border-left-color: ${tag.color};">${tag.name}</span>`);
                    });
                }

                const $iconWrap = $(`<div class="tag-row-icon">▼</div>`);
                
                $row.append($titleWrap);
                $row.append($tagsWrap);
                $row.append($iconWrap);

        // --- 隠しポップアップ（選択肢一覧） ---
        const $popup = $(`<div style="display:none; width:100%; background:#222; border:1px solid #555; border-radius:4px; padding:10px; margin-bottom:12px; box-shadow:0 4px 12px rgba(0,0,0,0.5);"></div>`);
        const $popupInner = $(`<div style="display:flex; flex-wrap:wrap; gap:8px;"></div>`);

        // 「なし」クリアボタン（単一選択時）
        if (!isMultiMode) {
            const $clearLabel = $(`
                <label style="display:flex; align-items:center; background:#444; color:#ccc; padding:2px 6px; border-radius:4px; font-size:12px; cursor:pointer;">
                    <input type="radio" name="tags_${type.id}" value="" style="margin-right:4px;">
                    (なし)
                </label>
            `);
            $popupInner.append($clearLabel);
        }

        // 選択肢の生成
        groupTags.forEach(tag => {
            const isChecked = currentTagIds.includes(Number(tag.id));
            const inputType = isMultiMode ? 'checkbox' : 'radio';
            const inputName = isMultiMode ? 'tags[]' : `tags_${type.id}`;

            const $label = $(`
                <label style="display:flex; align-items:center; background:#333; padding:2px 6px; border-radius:4px; font-size:12px; cursor:pointer; border-left:3px solid ${tag.color};">
                    <input type="${inputType}" name="${inputName}" value="${tag.id}" ${isChecked ? 'checked' : ''} style="margin-right:4px;">
                    ${tag.name}
                </label>
            `);
            $popupInner.append($label);
        });

        // その場で追加ボタン
        const $addBtn = $(`<button type="button" style="font-size:10px; background:#666; border:none; color:#fff; cursor:pointer; padding:2px 6px; border-radius:4px;">+追加</button>`);
        $addBtn.on('click', ()=>{
            const newName = prompt(`${type.name} に新しいタグを追加:`);
            if(newName){
                // 追加時に現在の選択状態を保存して、再描画時に引き継ぐ
                const currentIds = App.tags.getSelectedTagIds();
                App.api.post('?action=tag_create', { type_id: type.id, name: newName, color: getRandomColor() })
                .done(async ()=>{ 
                    await App.tags.loadAll(); 
                    const newTag = TAGS.find(t => t.name === newName && t.type_id === type.id);
                    if (newTag) currentIds.push(Number(newTag.id));
                    App.tags.renderSelect(currentIds); 
                    App.tags.renderFilters(); 
                    // 再描画直後にポップアップを開き直す（行を強制クリック）
                    $selectContainer.find(`.trigger-row-${type.id}`).click();
                });
            }
        });
        $popupInner.append($addBtn);

        // 閉じるボタン
        const $closeBtnWrap = $(`<div style="text-align:right; margin-top:8px;"><button type="button" style="background:#007bff; border:none; color:#fff; padding:4px 12px; border-radius:4px; cursor:pointer; font-size:11px;">閉じる</button></div>`);
        
        $popup.append($popupInner);
        $popup.append($closeBtnWrap);

        $selectContainer.append($row);
        $selectContainer.append($popup);

        // イベント：行をクリックしたらポップアップを開く
        $row.addClass(`trigger-row-${type.id}`).on('click', () => {
            $row.hide();
            $popup.slideDown(150);
        });

        // イベント：閉じるボタンでポップアップを閉じ、表示を更新
        $closeBtnWrap.find('button').on('click', () => {
            $popup.slideUp(150, () => {
                // 閉じた瞬間に現在の選択状態を取得して再描画
                const currentIds = App.tags.getSelectedTagIds();
                App.tags.renderSelect(currentIds);
            });
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
                        await this.loadAll();
                        this.renderManageList();
                        this.renderFilters();
                    });
                }
            });


            // ▼ 追加: グループの編集
            $manageList.on('click', '.btn-edit-type', function(){
                const id = $(this).data('id');
                const oldName = $(this).data('name');
                const newName = prompt('グループ名を変更:', oldName);
                if(newName && newName.trim() !== '' && newName !== oldName){
                    App.api.post('?action=tagtype_update', { id: id, name: newName.trim() }).done(async ()=>{
                        await App.tags.loadAll();
                        App.tags.renderManageList();
                        App.tags.renderFilters();
                        if (App.tasks && App.tasks.applyBallFilterAndRenderList) App.tasks.applyBallFilterAndRenderList();
                    });
                }
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
                            <div>
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
                    groupTags.forEach(tag => {
                        // ★修正: data-id を付与し、ドラッグ用のハンドル (☰) を追加
                        const $tagRow = $(`
                            <div data-id="${tag.id}" style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px dashed #ccc; background:#fff;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span class="drag-handle-tag" style="cursor:grab; color:#ccc; font-size:14px;" title="ドラッグで並び替え">☰</span>
                                    <span style="font-size:13px; color:#555; display:flex; align-items:center;">
                                        <span style="display:inline-block; width:12px; height:12px; background:${tag.color}; margin-right:6px; border-radius:2px;"></span>
                                        ${App.utils && App.utils.escapeHtml ? App.utils.escapeHtml(tag.name) : tag.name}
                                    </span>
                                </div>
                                <div>
                                    <button class="btn btn-sm btn-edit-tag" data-id="${tag.id}" data-name="${tag.name}" style="padding:2px 6px; font-size:11px; margin-right:4px; background:#fff; color:#333; border:1px solid #ccc;">編集</button>
                                    <button class="btn btn-sm btn-del-tag" data-id="${tag.id}" style="padding:2px 6px; font-size:11px; background:#fff; color:#e53935; border:1px solid #ccc;">削除</button>
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

})(window.App);