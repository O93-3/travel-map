
// Draggable Route Overlay (safe add-on, clean JS)
(function(){
  'use strict';
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(function(){
    var overlay = document.getElementById('routeOverlay');
    if(!overlay) return;
    var STORAGE_KEY = 'routeOverlayUI';
    // apply saved position if present
    try {
      var pos = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if(pos && typeof pos.x==='number' && typeof pos.y==='number'){
        overlay.style.left = pos.x+'px';
        overlay.style.top  = pos.y+'px';
        overlay.style.right = 'auto';
        overlay.style.bottom = 'auto';
        overlay.style.transform = 'none';
      }
    } catch(_){}

    var dragging=false, dx=0, dy=0;
    function onDown(e){
      if(e.button!==0) return;
      var tag=(e.target.tagName||'').toLowerCase();
      if(tag==='button'||tag==='input'||tag==='select'||e.target.isContentEditable) return;
      dragging=true; overlay.classList.add('dragging');
      var rect=overlay.getBoundingClientRect();
      dx = e.clientX - rect.left; dy = e.clientY - rect.top;
      overlay.style.right='auto'; overlay.style.bottom='auto'; overlay.style.transform='none';
      e.preventDefault();
    }
    function onMove(e){
      if(!dragging) return;
      var x=Math.round(e.clientX - dx), y=Math.round(e.clientY - dy);
      var vw=Math.max(document.documentElement.clientWidth, window.innerWidth||0);
      var vh=Math.max(document.documentElement.clientHeight, window.innerHeight||0);
      var w=overlay.offsetWidth, h=overlay.offsetHeight;
      x=Math.max(0, Math.min(vw - w, x));
      y=Math.max(0, Math.min(vh - h, y));
      overlay.style.left=x+'px'; overlay.style.top=y+'px';
    }
    function onUp(){
      if(!dragging) return;
      dragging=false; overlay.classList.remove('dragging');
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({x: overlay.offsetLeft, y: overlay.offsetTop})); } catch(_){}
    }

    overlay.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
})();
