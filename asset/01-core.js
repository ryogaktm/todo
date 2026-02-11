// 01-core.js
(function(w, $){
    const App = w.App = w.App || {};
  
    // ---- State ----
    const urlParams = new URLSearchParams(location.search);
    App.state = {
      SUB_ID: urlParams.get('sub') || null,
      editingId: null,
      calRef: (()=>{ const d=new Date(); d.setDate(1); return d; })(),
 // ★ 追加: 親カテゴリID（PHPから body の data 属性で受け取る）
 PARENT_CAT_ID: Number(document.body.getAttribute('data-parent-cat') || 0),
 // あると便利: サブページ判定のブール版
 get isSubpage(){ return !!this.SUB_ID; }
    };
    $('body').attr('data-subpage', App.state.SUB_ID ? '1' : '0');
  
    // ---- Utils ----
    App.utils = {
      escapeHtml: (s='') => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
      shade(hex, amt){
        hex = (hex||'').replace('#','');
        if (!hex) return '#cccccc';
        if (hex.length===3) hex = hex.split('').map(x=>x+x).join('');
        let [r,g,b] = hex.match(/.{2}/g).map(h=>parseInt(h,16));
        const adj=v=>Math.max(0,Math.min(255,v+amt));
        r=adj(r); g=adj(g); b=adj(b);
        return `#${[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}`;
      },
      fmt: (d)=> d ? d.toISOString().slice(0,10) : '',
      parseDate: (s)=>{
        if (!s) return null;
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
        if (!m) return null;
        const d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
        return isNaN(d.getTime()) ? null : d;
      },
      today: ()=> { const d=new Date(); d.setHours(0,0,0,0); return d; },
          showToast(msg){ $('#toast').text(msg).show(); setTimeout(()=>$('#toast').hide(), 1600); },
         // ★ 追加: 子タスクの category_id を親で強制するための小ユーティリティ
        ensureChildCategory(payload){
      if (App.state.isSubpage) {
        // 明示的に category_id が来ていても上書きする
        return { ...payload, category_id: App.state.PARENT_CAT_ID };
      }
      return payload;
    }
    };
  
    // ---- API helper ----
    App.api = {
      url(q){ return App.state.SUB_ID ? `${q}&sub=${encodeURIComponent(App.state.SUB_ID)}` : q; },
      urlSub(q, pid){ return `${q}&sub=${encodeURIComponent(pid)}`; },
      get(u){ return $.getJSON(u); },
      post(u, data){ return $.ajax({ url:u, method:'POST', data, dataType:'json' }); }
    };
  
    // ---- Boot (DOM Ready後に呼ぶ) ----
    App.boot = async function(){
      try{
        if (App.categories?.init) await App.categories.init();
        if (App.tasks?.init) await App.tasks.init();
        if (App.shell?.init) App.shell.init();
        if (App.calendar?.init) App.calendar.init();
      } catch(e){ console.error(e); }
    };
  
    // DOMReady
    $(App.boot);
  })(window, jQuery);
  