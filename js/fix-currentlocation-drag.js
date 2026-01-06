// Fix: Current Location bubble drag should not deform (stable add-on v2)
(function(){
  'use strict';
  function ready(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function(){
    var el = document.getElementById('currentLocation');
    if(!el) return;

    // Disable legacy inline drag handler if present (app.js used onmousedown + document.onmousemove).
    try{ if(typeof el.onmousedown === 'function') el.onmousedown = null; }catch(_){ }

    var key = 'locUI';

    function forceLeftTop(x, y){
      // IMPORTANT: clear right/bottom FIRST so width doesn't stretch.
      try{ el.style.setProperty('right','auto','important'); }catch(_){ el.style.right='auto'; }
      try{ el.style.setProperty('bottom','auto','important'); }catch(_){ el.style.bottom='auto'; }
      el.style.left = Math.round(x) + 'px';
      el.style.top  = Math.round(y) + 'px';
      try{ el.style.setProperty('transform','none','important'); }catch(_){ el.style.transform='none'; }
    }

    // Normalize default position to left/top once (even without saved state)
    (function normalizeInitial(){
      try{
        var pos = JSON.parse(localStorage.getItem(key) || 'null');
        if(pos && typeof pos.x==='number' && typeof pos.y==='number'){
          forceLeftTop(pos.x, pos.y);
          return;
        }
      }catch(_){ }
      var r = el.getBoundingClientRect();
      forceLeftTop(r.left, r.top);
    })();

    var dragging=false, dx=0, dy=0;
    function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
    function isLocked(){
      try{ return localStorage.getItem('locLocked') === '1'; }catch(_){ return false; }
    }

    function onDown(e){
      if(isLocked()) return;
      if(e.button !== undefined && e.button !== 0) return;
      var r = el.getBoundingClientRect();
      forceLeftTop(r.left, r.top);
      dragging=true;
      dx = e.clientX - r.left;
      dy = e.clientY - r.top;
      el.classList.add('dragging');
      try{ el.setPointerCapture && e.pointerId !== undefined && el.setPointerCapture(e.pointerId); }catch(_){ }
      try{ e.preventDefault(); }catch(_){ }
    }

    function onMove(e){
      if(!dragging) return;
      var vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      var vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      var w = el.offsetWidth;
      var h = el.offsetHeight;
      var x = Math.round(e.clientX - dx);
      var y = Math.round(e.clientY - dy);
      x = clamp(x, 0, vw - w);
      y = clamp(y, 0, vh - h);
      forceLeftTop(x, y);
      try{ e.preventDefault(); }catch(_){ }
    }

    function onUp(e){
      if(!dragging) return;
      dragging=false;
      el.classList.remove('dragging');
      try{ localStorage.setItem(key, JSON.stringify({x: el.offsetLeft, y: el.offsetTop})); }catch(_){ }
      try{ el.releasePointerCapture && e.pointerId !== undefined && el.releasePointerCapture(e.pointerId); }catch(_){ }
      try{ e.preventDefault(); }catch(_){ }
    }

    if('PointerEvent' in window){
      el.addEventListener('pointerdown', onDown, {capture:true});
      window.addEventListener('pointermove', onMove, {passive:false});
      window.addEventListener('pointerup', onUp, {passive:false});
      window.addEventListener('pointercancel', onUp, {passive:false});
    }else{
      el.addEventListener('mousedown', onDown, true);
      window.addEventListener('mousemove', onMove, false);
      window.addEventListener('mouseup', onUp, false);
    }
  });
})();
