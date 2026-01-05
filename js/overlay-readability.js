
// Overlay Readability controls (opacity & line-height), non-invasive.
// Binds optional sliders: overlayOpacity (0.6-1.0), overlayBgAlpha (0.30-0.90), overlayLineHeight (1.00-1.50)
(function(){
  'use strict';
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function bindSlider(id, cssVar, transform){
    var el = document.getElementById(id);
    if(!el) return;
    var apply = function(v){ document.documentElement.style.setProperty(cssVar, transform ? transform(v) : v); };
    var val = parseFloat(el.value || el.getAttribute('value') || '1');
    apply(val);
    el.addEventListener('input', function(){ apply(parseFloat(el.value || '1')); });
  }
  ready(function(){
    bindSlider('overlayOpacity', '--ro-opacity');
    bindSlider('overlayBgAlpha', '--ro-bg-alpha');
    bindSlider('overlayLineHeight', '--ro-line-height', function(v){ return String(v); });
  });
})();
