// Self-check & non-crash guards (prevents silent blank screen)
(function(){
  'use strict';
  function q(id){ return document.getElementById(id); }
  function ensureAfter(refId, html){
    var ref=q(refId);
    if(!ref) return;
    ref.insertAdjacentHTML('afterend', html);
  }

  function ensureCriticalUI(){
    if(!q('currentLocation')){
      ensureAfter('uiToggle', '
<div id="currentLocation"><img id="flag" alt="flag"><div id="currentText"><span id="currentCountry"></span><span id="currentCity"></span></div></div>
');
      console.warn('[SelfCheck] currentLocation was missing -> injected.');
    }
    if(!q('streamIndicator')){
      ensureAfter('currentLocation', '
<div id="streamIndicator"><span class="dot"></span> LIVE</div>
');
      console.warn('[SelfCheck] streamIndicator was missing -> injected.');
    }
    if(!q('routeOverlay')){
      ensureAfter('streamIndicator', '
<div id="routeOverlay"><div class="ro-head"><div class="ro-title">ROUTE</div><div id="roProgress" class="ro-progress">0/0</div></div><div class="ro-main"><div class="ro-block"><div class="ro-line1"><div class="ro-label">NOW</div><div id="roNowCity" class="ro-value">-</div></div><div class="ro-line2"><img id="roNowFlag" class="ro-flag" alt="flag"><div id="roNowCountry" class="ro-country">-</div></div></div><div class="ro-block"><div class="ro-line1"><div class="ro-label">FROM</div><div id="roFromCity" class="ro-value">-</div></div><div class="ro-line2"><img id="roFromFlag" class="ro-flag" alt="flag"><div id="roFromCountry" class="ro-country">-</div></div></div><div id="roHistory" class="ro-history"></div></div></div>
');
      console.warn('[SelfCheck] routeOverlay was missing -> injected.');
    }
  }

  function guardNullHandlers(){
    try{
      var el=q('currentLocation');
      if(!el) return;
      // If app.js crashed earlier, we still want the page to remain usable.
    }catch(_){ }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', function(){
      ensureCriticalUI();
      guardNullHandlers();
    });
  }else{
    ensureCriticalUI();
    guardNullHandlers();
  }
})();


// Error overlay (loop prevention)
(function(){
  function show(msg){
    try{
      var box=document.getElementById('tmErrorOverlay');
      if(!box){
        box=document.createElement('pre');
        box.id='tmErrorOverlay';
        box.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-height:40vh;overflow:auto;background:rgba(0,0,0,0.85);color:#ffcccc;border:1px solid rgba(255,80,80,0.6);padding:10px 12px;border-radius:12px;font-size:12px;white-space:pre-wrap;';
        document.body.appendChild(box);
      }
      box.textContent='[TravelMap Error]
'+msg;
    }catch(_){ }
  }
  window.addEventListener('error', function(e){
    var m=(e&&(e.message||(e.error&&e.error.message)))||'Unknown error';
    var f=(e&&e.filename)?('
'+e.filename+':'+e.lineno+':'+e.colno):'';
    show(m+f);
  });
  window.addEventListener('unhandledrejection', function(e){
    var r=e&&e.reason;
    show((r&&(r.message||String(r)))||'Unhandled rejection');
  });
})();
