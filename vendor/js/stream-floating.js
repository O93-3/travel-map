// Floating Stream Button (stablefix)
(function(){
  'use strict';
  function ready(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  function ensureBtn(){
    var btn = document.getElementById('streamBtnFloating');
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'streamBtnFloating';
      btn.type = 'button';
      btn.textContent = '配信';
      document.body.appendChild(btn);
    }
    return btn;
  }
  function toggle(){
    try{
      var TM = window.TravelMap || {};
      if(typeof TM.isStreaming === 'function' && typeof TM.setStreaming === 'function'){
        TM.setStreaming(!TM.isStreaming());
        return;
      }
    }catch(_){ }
    // fallback
    document.body.classList.toggle('streaming');
  }
  ready(function(){
    var btn = ensureBtn();
    if(btn.dataset.bound==='1') return;
    btn.dataset.bound='1';
    btn.addEventListener('click', function(e){ try{ e.preventDefault(); }catch(_){} toggle(); }, true);
    btn.addEventListener('pointerup', function(e){ try{ e.preventDefault(); }catch(_){} toggle(); }, true);
  });
})();
