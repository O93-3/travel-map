// Fix: route line thickness slider works without changing color
// No changes to app.js; just triggers lineColor oninput once to bind the nested handler.
(function(){
  'use strict';
  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(function(){
    try {
      var lineColorInput = document.getElementById('lineColor');
      var lineWeightInput = document.getElementById('lineWeight');
      if(!lineColorInput || !lineWeightInput) return;
      var ev = new Event('input', {bubbles:true});
      lineColorInput.dispatchEvent(ev);
      var evW = new Event('input', {bubbles:true});
      lineWeightInput.dispatchEvent(evW);
    } catch(e){ /* silent */ }
  });
})();
