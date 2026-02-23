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
        // 最初のタグの色を返す、などのルール
        getColorForTask(taskId){
            const tids = this.getTagsForTask(taskId);
            if(tids.length > 0) {
                const tag = TAGS.find(t => t.id == tids[0]);
                if(tag && tag.color) return tag.color;
            }
            return null;
        },

        // 画面上部フィルタ描画
        renderFilters(){
            $filterContainer.empty();
            
            TAG_TYPES.forEach(type => {
                const groupTags = TAGS.filter(t => t.type_id == type.id);
                if(groupTags.length === 0) return;

            // 変更前: const $group = $(`<div style="display:flex; ..."></div>`);
            const $group = $(`<div class="tag-filter-group"></div>`);
                
            // 変更前: $group.append(`<span style="color:#bbb; ...">${type.name}</span>`);
            $group.append(`<span class="tag-filter-label">${type.name}</span>`);
            
            groupTags.forEach(tag => {
                // ★ボタンに data-name を追加し、初期表示を (0) にする
                const $btn = $(`<button class="tag-filter-btn" data-id="${tag.id}" data-name="${tag.name}" style="border-left-color: ${tag.color};">${tag.name} (0)</button>`);
                
                $btn.on('click', function(){
                    $(this).toggleClass('active');
                    // ★独自処理を消し、メインの絞り込み処理に合流させる
                    if (App.tasks && App.tasks.applyBallFilterAndRenderList) {
                        App.tasks.applyBallFilterAndRenderList();
                    }
                });
                $group.append($btn);
            });
                $filterContainer.append($group);
            });
        },

        // タスク編集モーダル内の描画
        // タスク編集モーダル内の描画
        renderSelect(currentTagIds = []){
            $selectContainer.empty();
            if(TAG_TYPES.length === 0) {
                $selectContainer.html('<div style="color:#aaa">タググループがありません。「タグ管理」から作成してください。</div>');
                return;
            }

            TAG_TYPES.forEach(type => {
                const groupTags = TAGS.filter(t => t.type_id == type.id);
                // ★修正: タググループの「複数選択許可フラグ」を order 列から読み取る
                const isMultiMode = (type.order == 1); 
                
                const $row = $(`<div style="margin-bottom:8px; border-bottom:1px solid #444; padding-bottom:4px;"></div>`);
                
                // 分かりやすいようにグループ名に (複数選択可) を表示
                $row.append(`<div style="font-size:12px; color:#aaa; margin-bottom:4px;">${type.name} ${isMultiMode ? '<span style="font-size:10px; color:#8f8;">(複数選択可)</span>' : ''}</div>`);
                
                const $wrap = $(`<div style="display:flex; flex-wrap:wrap; gap:8px;"></div>`);
                
                // 単一選択（ラジオ）の場合のクリアボタン
                if (!isMultiMode) {
                    const $clearLabel = $(`
                        <label style="display:flex; align-items:center; background:#555; color:#ccc; padding:2px 6px; border-radius:4px; font-size:12px; cursor:pointer;">
                            <input type="radio" name="tags_${type.id}" value="" style="margin-right:4px;">
                            (なし)
                        </label>
                    `);
                    $wrap.append($clearLabel);
                } else if(groupTags.length === 0) {
                    $wrap.append('<span style="font-size:10px; color:#666;">タグなし</span>');
                }

                groupTags.forEach(tag => {
                    const isChecked = currentTagIds.includes(Number(tag.id));
                    const inputType = isMultiMode ? 'checkbox' : 'radio';
                    const inputName = isMultiMode ? 'tags[]' : `tags_${type.id}`;

                    const $label = $(`
                        <label style="display:flex; align-items:center; background:#444; padding:2px 6px; border-radius:4px; font-size:12px; cursor:pointer;">
                            <input type="${inputType}" name="${inputName}" value="${tag.id}" ${isChecked ? 'checked' : ''} style="margin-right:4px;">
                            ${tag.name}
                        </label>
                    `);
                    $wrap.append($label);
                });
                
                const $addBtn = $(`<button type="button" style="font-size:10px; background:#555; border:none; color:#fff; cursor:pointer; padding:2px 6px; border-radius:4px;">+追加</button>`);
                $addBtn.on('click', ()=>{
                    const newName = prompt(`${type.name} に新しいタグを追加:`);
                    if(newName){
                        App.api.post('?action=tag_create', { type_id: type.id, name: newName, color: getRandomColor() })
                        .done(async ()=>{ 
                            await this.loadAll(); 
                            const newTag = TAGS.find(t => t.name === newName && t.type_id === type.id);
                            if (newTag) currentTagIds.push(Number(newTag.id));
                            this.renderSelect(currentTagIds); 
                            this.renderFilters(); 
                        });
                    }
                });
                $wrap.append($addBtn);

                $row.append($wrap);
                $selectContainer.append($row);
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
                
                // グループ名の行（右側に編集・削除ボタン）
                const $div = $(`
                    <div style="padding:10px; border-bottom:1px solid #ddd; background:#f9f9f9; margin-bottom:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span style="font-size:14px; font-weight:bold; color:#333;">${App.utils && App.utils.escapeHtml ? App.utils.escapeHtml(type.name) : type.name}${multiBadge}</span>
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
                    // タグごとの行（右側に編集・削除ボタン）
                    groupTags.forEach(tag => {
                        const $tagRow = $(`
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px dashed #ccc;">
                                <span style="font-size:13px; color:#555;">
                                    <span style="display:inline-block; width:12px; height:12px; background:${tag.color}; margin-right:6px; border-radius:2px;"></span>
                                    ${App.utils && App.utils.escapeHtml ? App.utils.escapeHtml(tag.name) : tag.name}
                                </span>
                                <div>
                                    <button class="btn btn-sm btn-edit-tag" data-id="${tag.id}" data-name="${tag.name}" style="padding:2px 6px; font-size:11px; margin-right:4px; background:#fff; color:#333; border:1px solid #ccc;">編集</button>
                                    <button class="btn btn-sm btn-del-tag" data-id="${tag.id}" style="padding:2px 6px; font-size:11px; background:#fff; color:#e53935; border:1px solid #ccc;">削除</button>
                                </div>
                            </div>
                        `);
                        $tagsContainer.append($tagRow);
                    });
                }
                $manageList.append($div);
            });
        }
    };

})(window.App);