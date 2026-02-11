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

                const $group = $(`<div style="display:inline-block; margin-right:15px; margin-bottom:5px;"></div>`);
                $group.append(`<span style="color:#888; font-size:11px; margin-right:4px;">${type.name}:</span>`);
                
                groupTags.forEach(tag => {
                    const $btn = $(`<button class="btn btn-sm tag-filter-btn" data-id="${tag.id}" style="border-left:3px solid ${tag.color}; margin-right:2px;">${tag.name}</button>`);
                    $btn.on('click', function(){
                        $(this).toggleClass('active');
                        // フィルタ適用ロジック（簡易的）
                        const activeIds = [];
                        $('.tag-filter-btn.active').each(function(){ activeIds.push(Number($(this).data('id'))); });
                        
                        $('.card').each(function(){
                            const tid = Number($(this).attr('data-id'));
                            const myTags = App.tags.getTagsForTask(tid);
                            // 選択されたタグをすべて持っているか（AND検索）
                            const hit = activeIds.every(id => myTags.includes(id));
                            if(hit) $(this).css('opacity', 1).css('pointer-events', 'auto');
                            else    $(this).css('opacity', 0.1).css('pointer-events', 'none');
                        });
                    });
                    $group.append($btn);
                });
                $filterContainer.append($group);
            });
        },

        // タスク編集モーダル内の描画
        renderSelect(currentTagIds = []){
            $selectContainer.empty();
            if(TAG_TYPES.length === 0) {
                $selectContainer.html('<div style="color:#aaa">タググループがありません。「タグ管理」から作成してください。</div>');
                return;
            }

            TAG_TYPES.forEach(type => {
                const groupTags = TAGS.filter(t => t.type_id == type.id);
                
                const $row = $(`<div style="margin-bottom:8px; border-bottom:1px solid #444; padding-bottom:4px;"></div>`);
                $row.append(`<div style="font-size:12px; color:#aaa; margin-bottom:4px;">${type.name}</div>`);
                
                const $wrap = $(`<div style="display:flex; flex-wrap:wrap; gap:8px;"></div>`);
                
                if(groupTags.length === 0) {
                    $wrap.append('<span style="font-size:10px; color:#666;">タグなし</span>');
                }

                groupTags.forEach(tag => {
                    const isChecked = currentTagIds.includes(Number(tag.id));
                    const $label = $(`
                        <label style="display:flex; align-items:center; background:#444; padding:2px 6px; border-radius:4px; font-size:12px;">
                            <input type="checkbox" name="tags[]" value="${tag.id}" ${isChecked ? 'checked' : ''} style="margin-right:4px;">
                            ${tag.name}
                        </label>
                    `);
                    $wrap.append($label);
                });
                
                // その場でタグ追加ボタン
                const $addBtn = $(`<button style="font-size:10px; background:#555; border:none; color:#fff; cursor:pointer;">+追加</button>`);
                $addBtn.on('click', ()=>{
                    const newName = prompt(`${type.name} に新しいタグを追加:`);
                    if(newName){
                        App.api.post('?action=tag_create', { type_id: type.id, name: newName, color: getRandomColor() })
                        .done(async ()=>{ await this.loadAll(); this.renderSelect(currentTagIds); this.renderFilters(); });
                    }
                });
                $wrap.append($addBtn);

                $row.append($wrap);
                $selectContainer.append($row);
            });
        },
        
        getSelectedTagIds(){
            const ids = [];
            $selectContainer.find('input[type="checkbox"]:checked').each(function(){
                ids.push($(this).val());
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
                if(name) {
                    App.api.post('?action=tagtype_create', { name }).done(async ()=>{
                        $('#newTagTypeName').val('');
                        await this.loadAll();
                        this.renderManageList();
                        this.renderFilters();
                    });
                }
            });
        },

        renderManageList(){
            $manageList.empty();
            TAG_TYPES.forEach(type => {
                const $div = $(`<div style="padding:5px; border-bottom:1px solid #eee;">${type.name}</div>`);
                $manageList.append($div);
            });
        }
    };

})(window.App);