// Custom Blink + UI label (isolated; avoids touching core app.js)
(function(){
  'use strict';
  const KEY='blinkCurrentMarker';

  function getEnabled(){
    try{
      const v=localStorage.getItem(KEY);
      return (v===null || v==='') ? true : (v==='1');
    }catch(_){ return true; }
  }
  function setEnabled(v){
    try{ localStorage.setItem(KEY, v?'1':'0'); }catch(_){ }
  }

  function applyLabelStyle(){
    const cb=document.getElementById('blinkCurrentMarker');
    if(!cb) return;
    const label=cb.closest('label');
    if(!label) return;
    label.classList.add('blink-row');
    // normalize: checkbox then plain text
    // If label has span, remove it but keep text
    const spans=label.querySelectorAll('span');
    spans.forEach(s=>s.remove());
    // Ensure text exists after checkbox
    const txt='現在地マーカー明滅';
    // remove existing text nodes (trim)
    Array.from(label.childNodes).forEach(n=>{
      if(n.nodeType===3){
        if((n.textContent||'').replace(/\s+/g,'')==='') label.removeChild(n);
      }
    });
    // If label text doesn't include, set it
    if(!label.textContent.includes(txt)){
      label.appendChild(document.createTextNode(txt));
    }
  }

  function findCurrentMarkerEl(){
    // Prefer currentMarker DOM: Leaflet marker with divIcon class 'pulsate'
    // It is created as .leaflet-marker-icon.pulsate
    return document.querySelector('.leaflet-marker-pane .leaflet-marker-icon.pulsate');
  }

  function setBlinkToExisting(enabled){
    const el=findCurrentMarkerEl();
    if(el){
      el.classList.toggle('tm-blink', !!enabled);
    }
  }

  function observeMarker(){
    const pane=document.querySelector('.leaflet-marker-pane');
    if(!pane) return;

    const enabled=getEnabled();
    setBlinkToExisting(enabled);

    const obs=new MutationObserver(()=>{
      setBlinkToExisting(getEnabled());
    });
    obs.observe(pane, {childList:true, subtree:true});
  }

  function init(){
    applyLabelStyle();
    const cb=document.getElementById('blinkCurrentMarker');
    if(cb){
      const enabled=getEnabled();
      cb.checked=enabled;
      // Apply immediately (no need to toggle)
      setTimeout(()=>{ observeMarker(); }, 0);
      cb.addEventListener('change', ()=>{
        const v=!!cb.checked;
        setEnabled(v);
        setBlinkToExisting(v);
      });
    }else{
      // still observe markers even if checkbox missing
      setTimeout(()=>{ observeMarker(); }, 0);
    }
    // Retry a bit because Leaflet may init after DOMContentLoaded
    let tries=0;
    const t=setInterval(()=>{
      tries++;
      observeMarker();
      if(tries>=30) clearInterval(t);
    }, 150);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
