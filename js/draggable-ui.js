// Draggable UI Panel (safe add-on)
(function(){
  'use strict';
  function ready(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(function(){
    var ui = document.getElementById('ui');
    if(!ui) return;
    var handle = document.getElementById('uiDragHandle') || ui;
    var STORAGE_KEY = 'uiPanelPos';

    // restore
    try{
      var pos = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if(pos && typeof pos.x==='number' && typeof pos.y==='number'){
        ui.style.left = pos.x + 'px';
        ui.style.top  = pos.y + 'px';
        ui.style.right = 'auto';
      }
    }catch(_){ }

    var dragging=false, dx=0, dy=0;

    function shouldIgnoreTarget(t){
      if(!t) return false;
      var tag=(t.tagName||'').toLowerCase();
      if(tag==='button'||tag==='input'||tag==='select'||tag==='textarea'||tag==='summary'||tag==='a') return true;
      if(t.isContentEditable) return true;
      return false;
    }

    handle.addEventListener('mousedown', function(e){
      if(e.button!==0) return;
      if(shouldIgnoreTarget(e.target)) return;
      dragging=true;
      var rect=ui.getBoundingClientRect();
      dx=e.clientX-rect.left; dy=e.clientY-rect.top;
      ui.style.right='auto';
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e){
      if(!dragging) return;
      var vw=Math.max(document.documentElement.clientWidth, window.innerWidth||0);
      var vh=Math.max(document.documentElement.clientHeight, window.innerHeight||0);
      var w=ui.offsetWidth, h=ui.offsetHeight;
      var x=Math.round(e.clientX-dx), y=Math.round(e.clientY-dy);
      x=Math.max(0, Math.min(vw-w, x));
      y=Math.max(0, Math.min(vh-h, y));
      ui.style.left=x+'px';
      ui.style.top=y+'px';
    });

    document.addEventListener('mouseup', function(){
      if(!dragging) return;
      dragging=false;
      try{
        localStorage.setItem(STORAGE_KEY, JSON.stringify({x: ui.offsetLeft, y: ui.offsetTop}));
      }catch(_){ }
    });
  });
})();
