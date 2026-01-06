// Debug Error Banner (shows only when ?debug=1)
(function(){
  'use strict';
  try{
    var debug = new URLSearchParams(location.search).get('debug') === '1';
    if(!debug) return;

    var box = document.createElement('div');
    box.id = 'errorBanner';
    box.style.cssText = [
      'position:fixed','left:12px','right:12px','bottom:12px',
      'z-index:99999','background:rgba(160,0,0,0.85)','color:#fff',
      'padding:10px 12px','border-radius:12px','font-weight:800',
      'font-family:system-ui, -apple-system, Segoe UI, Noto Sans JP, sans-serif',
      'box-shadow:0 18px 42px rgba(0,0,0,0.45)','display:none'
    ].join(';');
    document.body.appendChild(box);

    function show(msg){
      box.textContent = msg;
      box.style.display = 'block';
    }

    window.addEventListener('error', function(e){
      var msg = '[ERROR] ' + (e.message || 'unknown') + (e.filename ? (' @ ' + e.filename + ':' + e.lineno) : '');
      show(msg);
    });
    window.addEventListener('unhandledrejection', function(e){
      var r = e && e.reason;
      var msg = '[PROMISE] ' + (r && (r.message || String(r)) || 'unknown');
      show(msg);
    });
  }catch(_){ }
})();
