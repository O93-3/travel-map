// Current Location Readability controls (opacity & bg alpha & line-height)
(function(){
  'use strict';
  function ready(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  function bind(id, cssVar, key){
    var el=document.getElementById(id);
    if(!el) return;
    try{
      var saved=localStorage.getItem(key);
      if(saved!==null && saved!=='') el.value=String(saved);
    }catch(_){ }
    function apply(v){
      document.documentElement.style.setProperty(cssVar, String(v));
      try{ localStorage.setItem(key, String(v)); }catch(_){ }
    }
    apply(el.value);
    el.addEventListener('input', function(){ apply(el.value); });
  }
  ready(function(){
    bind('locOpacity', '--loc-opacity', 'locOpacity');
    bind('locBgAlpha', '--loc-bg-alpha', 'locBgAlpha');
    bind('locLineHeight', '--loc-line-height', 'locLineHeight');
  });
})();
