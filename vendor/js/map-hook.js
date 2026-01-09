// Hook Leaflet map instance to window.__tmMap (for extensions)
// IMPORTANT: must hook BEFORE app.js creates the map.
(function(){
  'use strict';

  function install(){
    if(!window.L || !L.map) return false;
    if(L.map.__tmWrapped) return true;
    const orig = L.map;
    L.map = function(){
      const m = orig.apply(this, arguments);
      try{ window.__tmMap = m; }catch(_){ }
      try{ document.dispatchEvent(new CustomEvent('tm:map-ready', { detail:{ map:m } })); }catch(_){ }
      return m;
    };
    L.map.__tmWrapped = true;
    return true;
  }

  // Try immediately (scripts are at end of body; Leaflet is already loaded)
  if(!install()){
    // Fallback: retry a short time if something is late
    let tries=0;
    const t=setInterval(()=>{
      tries++;
      if(install() || tries>=50) clearInterval(t);
    }, 20);
  }
})();
