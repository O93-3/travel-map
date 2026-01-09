// Theme picker (Neon / Graphite / Sunset)
(function(){
  'use strict';
  const KEY='tmTheme';
  const THEMES=['neon','graphite','sunset'];

  function apply(theme){
    const t = THEMES.includes(theme) ? theme : 'neon';
    document.body.dataset.theme = t;
    try{ localStorage.setItem(KEY, t); }catch(_){ }
  }

  function init(){
    let saved='neon';
    try{ saved = localStorage.getItem(KEY) || 'neon'; }catch(_){ }
    apply(saved);

    const sel = document.getElementById('themeSelect');
    if(sel){
      sel.value = document.body.dataset.theme || 'neon';
      sel.addEventListener('change', ()=>apply(sel.value));
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
