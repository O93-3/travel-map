// TravelMap Extensions Hook (GitHub Pages ready)
// Keep app.js stable; add new features here in future steps.

(function(){
  'use strict';
  const TM = window.TravelMap;
  const debug = new URLSearchParams(location.search).get('debug') === '1';
  if(debug) console.log('[TravelMap][extensions] loaded', TM ? TM.version : '(no TM)');
})();
