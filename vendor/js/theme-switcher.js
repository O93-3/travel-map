// Theme Switcher (3 presets)
(function(){
  'use strict';
  var KEY='uiTheme';
  var THEMES=['neon','graphite','sunset'];
  function apply(t){
    var body=document.body;
    THEMES.forEach(function(x){ body.classList.remove('theme-'+x); });
    body.classList.add('theme-'+t);
    try{ localStorage.setItem(KEY, t); }catch(_){ }
    var btns=document.querySelectorAll('#themeButtons button[data-theme]');
    btns.forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-theme')===t)); });
  }
  function init(){
    var t='neon';
    try{ t=localStorage.getItem(KEY) || 'neon'; }catch(_){ }
    if(THEMES.indexOf(t)===-1) t='neon';
    apply(t);
    var box=document.getElementById('themeButtons');
    if(!box) return;
    box.addEventListener('click', function(e){
      var b = e.target && e.target.closest ? e.target.closest('button[data-theme]') : null;
      if(!b) return;
      var nt=b.getAttribute('data-theme');
      if(THEMES.indexOf(nt)===-1) return;
      apply(nt);
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
