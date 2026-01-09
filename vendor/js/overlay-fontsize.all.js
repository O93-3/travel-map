
// Overlay font size: apply to ALL texts without touching app.js
(function(){
  'use strict';
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(function(){
    var slider = document.getElementById('overlayFontSize');
    var overlay = document.getElementById('routeOverlay');
    if(!slider || !overlay) return;
    function apply(v){ document.documentElement.style.setProperty('--ro-font-size', v + 'px'); }
    // initial
    apply(parseInt(slider.value || '18', 10));
    // bind without overriding app.js handlers
    slider.addEventListener('input', function(){ apply(parseInt(slider.value || '18', 10)); });
  });
})();
