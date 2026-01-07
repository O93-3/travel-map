// Left drawer UI controller (no backdrop)
(function(){
  'use strict';
  function ready(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(function(){
    var btn=document.getElementById('uiToggle');
    var ui=document.getElementById('ui');
    var body=document.body;
    if(!btn || !ui) return;

    function setOpen(open){
      body.classList.toggle('ui-open', !!open);
      btn.setAttribute('aria-expanded', String(!!open));
    }

    setOpen(false);

    btn.addEventListener('click', function(){
      setOpen(!body.classList.contains('ui-open'));
    });

    document.addEventListener('pointerdown', function(e){
      if(!body.classList.contains('ui-open')) return;
      var t=e.target;
      if(t===btn || btn.contains(t)) return;
      if(t===ui || ui.contains(t)) return;
      setOpen(false);
    }, true);

    document.addEventListener('keydown', function(e){
      if(e.key==='Escape' && body.classList.contains('ui-open')) setOpen(false);
    });
  });
})();
