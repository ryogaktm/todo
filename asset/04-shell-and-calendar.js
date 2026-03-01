// 04-shell-and-calendar.js
(function(App){
    if (!App) { console.error('App core missing'); return; }
  
    // ===================== Shell =====================
    App.shell = {
      init(){
        this.completed.init();
        this.shortcuts.init();
        this.viewToggle.init();
        this.dailyWork.init();
      },
  
      // ---- 完了パネル ----
      completed: (function(){
        const LS_KEY = 'quad_completed_v1';
        const $panel = $('#completedPanel');
        const $list  = $('#completedList');
        const $backdrop = $('#completedBackdrop');
        const $btnToggle = $('#btnCompletedToggle');
  
        function load(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(e){ return []; } }
        function save(arr){ localStorage.setItem(LS_KEY, JSON.stringify(arr)); }
  
        let store = load();
  
        function render(){
          $list.empty();
          if (!store.length){
            $list.append('<div class="completed-empty">まだ完了タスクはありません</div>');
            return;
          }
          store.forEach(it=>{
            $list.append(
              $(`<div class="completed-item">
                   <h5 class="completed-title">${App.utils.escapeHtml(it.title)}</h5>
                   <button class="completed-delete" type="button" title="削除" aria-label="削除">🗑</button>
                 </div>`)
            );
          });
        }
  
        function isOpen(){ return $panel.hasClass('open'); }
        function toggle(){
          $panel.toggleClass('open');
          const open = isOpen();
          $panel.attr('aria-hidden', open ? 'false' : 'true');
          $backdrop.attr('aria-hidden', open ? 'false' : 'true');
        }
        function open(){ if (!isOpen()) toggle(); }
        function close(){ if (isOpen()) toggle(); }
  
        function bind(){
          $btnToggle.on('click', toggle);
          $(window).on('keydown.shellCompleted', function(e){
            if (e.shiftKey && (e.key==='D' || e.key==='d')){
              if ($('#modalBackdrop').is(':visible')) return;
              e.preventDefault(); toggle();
            }
          });
          $list.on('click', '.completed-delete', function(){
            const idx = $(this).closest('.completed-item').index();
            if (idx > -1){ store.splice(idx,1); save(store); render(); }
          });
          $backdrop.on('click', close);
        }
  
        return {
          init(){ bind(); render(); },
          render,
          add(it){ store.unshift({ title: it.title, body: it.body, completed_at: new Date().toISOString() }); save(store); render(); },
          remove(index){ if (index>-1){ store.splice(index,1); save(store); render(); } },
          isOpen, open, close
        };
      })(),
  

      // ---- 一日の作業リスト ----
      dailyWork: (function(){
        const LS_KEY = 'quad_dailywork_v1';
        const $panel = $('#dailyWorkPanel');
        const $list  = $('#dailyWorkList');
        const $backdrop = $('#dailyWorkBackdrop');
        const $btnToggle = $('#btnDailyWorkToggle');
        const $btnClose = $('#dailyWorkClose');
        const $currentDate = $('#dwCurrentDate');
        
        let store = []; // { id, date, title, tags, note, hours }
        let currentDateStr = App.utils.today().toISOString().slice(0,10); // YYYY-MM-DD

        function load(){ try{ store = JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(e){ store = []; } }
        function save(){ localStorage.setItem(LS_KEY, JSON.stringify(store)); }
        
        function getItemsForDate(dateStr) { return store.filter(it => it.date === dateStr); }

        function render(){
            $list.empty();
            const items = getItemsForDate(currentDateStr);
            $currentDate.text(currentDateStr.replace(/-/g, '/'));
            let total = 0;

            if (items.length === 0) {
                $list.append('<div class="completed-empty">この日の作業記録はありません</div>');
            } else {
                items.forEach(it => {
                    const h = parseFloat(it.hours) || 0;
                    total += h;
                    const tagsHtml = it.tags ? `<div class="dw-item-tags">${App.utils.escapeHtml(it.tags)}</div>` : '';
                    const noteHtml = it.note ? `<div class="dw-item-note">${App.utils.escapeHtml(it.note)}</div>` : '';
                    
                    $list.append(`
                        <div class="dw-item" data-id="${it.id}">
                            <div class="dw-item-row">
                                <input type="text" class="dw-edit-title" value="${App.utils.escapeHtml(it.title)}" title="クリックで編集">
                                <input type="number" class="dw-edit-hours" value="${h}" step="0.25" title="クリックで編集">
                                <span style="font-size:12px; color:#555; font-weight:bold;">h</span>
                                <button class="dw-item-del" title="削除">✕</button>
                            </div>
                            ${tagsHtml}
                            ${noteHtml}
                        </div>
                    `);
                });
            }
            $('#dwTotalHours').text(total.toFixed(2).replace(/\.00$/, ''));
        }

        function toggle(){
            $panel.toggleClass('open');
            const open = $panel.hasClass('open');
            $panel.attr('aria-hidden', open ? 'false' : 'true');
            $backdrop.attr('aria-hidden', open ? 'false' : 'true');
            if(open) { load(); render(); }
        }

        function changeDate(days) {
            const d = new Date(currentDateStr);
            d.setDate(d.getDate() + days);
            const pad2 = n => String(n).padStart(2,'0');
            currentDateStr = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
            render();
        }

        function bind(){
            $btnToggle.on('click', toggle);
            $btnClose.on('click', toggle);
            $backdrop.on('click', toggle);
            $('#dwPrevDay').on('click', () => changeDate(-1));
            $('#dwNextDay').on('click', () => changeDate(1));

            // 手動追加
            $('#dwAddBtn').on('click', () => {
                const title = $('#dwAddTitle').val().trim();
                const hours = parseFloat($('#dwAddHours').val()) || 0;
                if (!title) return;
                
                store.push({ id: Date.now().toString(), date: currentDateStr, title, tags: '', note: '', hours });
                save();
                $('#dwAddTitle').val('');
                $('#dwAddHours').val('');
                render();
            });

            // 編集（タイトル）
            $list.on('change', '.dw-edit-title', function(){
                const id = $(this).closest('.dw-item').data('id');
                const val = $(this).val().trim();
                const item = store.find(it => it.id == id);
                if(item) { item.title = val; save(); }
            });

            // 編集（時間）
            $list.on('change', '.dw-edit-hours', function(){
                const id = $(this).closest('.dw-item').data('id');
                const val = Math.max(0, parseFloat($(this).val()) || 0);
                const item = store.find(it => it.id == id);
                if(item) { item.hours = val; save(); render(); }
            });

            // 削除
            $list.on('click', '.dw-item-del', function(){
                if(!confirm('この作業記録を削除しますか？')) return;
                const id = $(this).closest('.dw-item').data('id');
                store = store.filter(it => it.id != id);
                save(); render();
            });
        }

        return {
            init(){ load(); bind(); },
            addRecord(data) {
                load();
                const todayStr = App.utils.today().toISOString().slice(0,10);
                store.push({
                    id: Date.now().toString(),
                    date: todayStr,
                    title: data.title || '(無題)',
                    tags: data.tags || '',
                    note: data.note || '',
                    hours: parseFloat(data.hours) || 0
                });
                save();
                if ($panel.hasClass('open')) {
                    currentDateStr = todayStr; // 強制的に今日を表示
                    render();
                }
            }
        };
      })(),
      
      // ---- ショートカットモーダル ----
      shortcuts: (function(){
        const $btn = $('#shortcutBtn');
        const $bd  = $('#shortcutBackdrop');
        const $close = $('#shortcutCloseBtn');
  
        function setOpen(open){
          $bd.css('display', open ? 'flex' : 'none')
             .attr('aria-hidden', open ? 'false' : 'true');
        }
  
        function bind(){
          $btn.on('click', ()=> setOpen(true));
          $close.on('click', ()=> setOpen(false));
          $bd.on('click', function(e){ if (e.target === this) setOpen(false); });
          $(window).on('keydown.shellShortcuts', function(e){
            if (e.shiftKey && (e.key==='S' || e.key==='s')){
              e.preventDefault();
              const open = $bd.css('display') === 'flex';
              setOpen(!open);
            }
          });
        }
  
        return { init: bind, setOpen };
      })(),
  
      // ---- ビュー切替（ボード/カレンダー）----
      viewToggle: (function(){
        const $btn = $('#btnViewToggle');
        const $calendarView = $('#calendarView');
        const $board = $('#board');
        let current = 'board';
  
        function set(v){
          if (v === 'calendar'){
            $board.hide();
            $calendarView.removeAttr('hidden').show();
            $btn.text('タスク表').data('view','calendar');
            current = 'calendar';
            App.calendar.render();
          } else {
            $calendarView.hide().attr('hidden', true);
            $board.show();
            $btn.text('スケジュール表').data('view','board');
            current = 'board';
          }
        }
  
        function init(){
          $btn.on('click', function(){ set(current === 'board' ? 'calendar' : 'board'); });
          const vq = new URLSearchParams(location.search).get('view');
          if (!App.state.SUB_ID && vq === 'calendar') set('calendar'); else set('board');
        }
  
        return { init, set, get current(){ return current; } };
      })()
    };
  
    // ===================== Calendar =====================
    App.calendar = (function(){
      const $calGrid   = $('#calGrid');
      const $calTitle  = $('#calTitle');
      const $calPrev   = $('#calPrev');
      const $calNext   = $('#calNext');
      const $calOverflow = $('#calOverflow');

       // 表示ラベル（予定名）
    const TYPE_LABEL = { start:'着手', test:'テストアップ', proof:'校了', delivery:'納品' };
  
      function sameDay(a,b){ return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
      function tintFromCard($card){
        const bg = $card.css('backgroundImage') || $card.css('backgroundColor');
        return bg || '#eee';
      }
  
      function render(){
        if (App.state.SUB_ID){
          $calGrid.empty(); $calTitle.text('サブページは親のみ'); return;
        }
  
        const y = App.state.calRef.getFullYear();
        const m = App.state.calRef.getMonth();
        const firstDow = new Date(y, m, 1).getDay();
        const daysInMonth = new Date(y, m+1, 0).getDate();
  
        $calTitle.text(`${y}年 ${m+1}月`);
  
        const names = ['日','月','火','水','木','金','土'];
        $calGrid.empty();
        for (let i=0;i<7;i++){
          const h = $('<div class="cal-day">').append(`<div class="d" style="font-weight:700">${names[i]}</div>`);
          h.css('background','#f7f7f7');
          $calGrid.append(h);
        }
  
        for (let i=0;i<firstDow;i++) $calGrid.append($('<div class="cal-day">'));
  
        const t = App.utils.today();
        for (let d=1; d<=daysInMonth; d++){
          const cell = $('<div class="cal-day">');
          const dd = new Date(y, m, d);
          cell.append(`<div class="d">${d}</div>`);
          if (sameDay(dd, t)) cell.addClass('is-today');
          $calGrid.append(cell);
        }
  
                // ===== ピン留め描画（各マイルストーンを該当日付セルへ） =====
                // 日付1日のセルindexは「曜日ヘッダ7 ＋ その月1日の曜日ズレ」
                const firstCellIndex = 7 + firstDow;
                const cellIndexFor = (d)=>{
                  if (!d) return -1;
                  if (d.getFullYear()!==y || d.getMonth()!==m) return -1; // 当月のみ表示
                  return firstCellIndex + (d.getDate()-1);
                };
        
                // 盤面からマイルストーンを収集
                const pinsByIndex = {}; // { index: [ {id,title,type} ] }
                $('.card').each(function(){
                  const $c = $(this);
                  const id = Number($c.attr('data-id'));
                  const title = $c.find('.title .t').text() || $c.find('.title').text();
                  const start = App.utils.parseDate($c.attr('data-start'));
                  const test  = App.utils.parseDate($c.attr('data-testup'));
                  const proof = App.utils.parseDate($c.attr('data-proof'));
                  const deli  = App.utils.parseDate($c.attr('data-delivery'));
                  const pushPin = (date, type)=>{
                    const idx = cellIndexFor(date);
                    if (idx < 0) return;
                    (pinsByIndex[idx] ||= []).push({ id, title, type });
                  };
                  if (start) pushPin(start, 'start');
                  if (test)  pushPin(test,  'test');
                  if (proof) pushPin(proof, 'proof');
                  if (deli)  pushPin(deli,  'delivery');
                });
        
                // セルへ描画
                Object.entries(pinsByIndex).forEach(([idx, list])=>{
                  const $cell = $calGrid.children().eq(Number(idx));
                  if (!$cell.length) return;
                  const $wrap = $('<div class="cal-pins">');
                  list.forEach(it=>{
                                        const label = TYPE_LABEL[it.type] || it.type;
                                        const text  = `${label}＿${it.title}`;
                                        const $pin = $('<div class="cal-item">')
                                          .append(`<span class="mark m-${it.type}"></span>`)
                                          .append($('<span class="txt">').text(' ' + text))
                                          .attr('title', text)
                                          .on('dblclick', ()=> location.href = `?sub=${encodeURIComponent(it.id)}&view=calendar`);
                    $wrap.append($pin);
                  });
                  $cell.append($wrap);
                });
        
                // ピン方式では下部の「その他…」は非表示
                $calOverflow.prop('hidden', true).text('');
      }
  
      function bind(){
        $calPrev.on('click', ()=>{ App.state.calRef.setMonth(App.state.calRef.getMonth()-1); render(); });
        $calNext.on('click', ()=>{ App.state.calRef.setMonth(App.state.calRef.getMonth()+1); render(); });
      }
  
      return {
        init(){ bind(); },
        render,
        isActive(){ return App.shell.viewToggle.current === 'calendar'; }
      };
    })();
  
  })(window.App);
  