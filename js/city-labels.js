// City labels on map (route/history) - small readable text
(function(){
  'use strict';
  const KEY_MODE='tmCityLabels';   // off | route | all
  const KEY_SIZE='tmCityLabelSize';// px
  const KEY_LANG='lang';          // existing key (jp/en)

  let layer=null;
  let lastSig='';

  function getMode(){
    try{ return localStorage.getItem(KEY_MODE) || 'route'; }catch(_){ return 'route'; }
  }
  function getSize(){
    try{ return Math.max(8, Math.min(24, Number(localStorage.getItem(KEY_SIZE) || 12))); }catch(_){ return 12; }
  }
  function getLang(){
    try{ return (localStorage.getItem(KEY_LANG) || 'jp') === 'en' ? 'en' : 'jp'; }catch(_){ return 'jp'; }
  }

  function labelCity(c, lang){
    if(!c) return '';
    const jp = c.name_jp || c.name || '';
    const en = c.name || c.name_jp || '';
    return (lang==='en') ? en : jp;
  }

  function getHistory(){
    try{
      if(window.TravelMap && typeof window.TravelMap.getHistory==='function'){
        const h = window.TravelMap.getHistory();
        return Array.isArray(h) ? h : [];
      }
    }catch(_){ }
    try{ return JSON.parse(localStorage.getItem('travelHistory')||'[]') || []; }catch(_){ return []; }
  }

  function ensureUI(){
    const sel = document.getElementById('cityLabelMode');
    const rng = document.getElementById('cityLabelSize');
    if(sel){
      sel.value = getMode();
      sel.addEventListener('change', ()=>{ try{ localStorage.setItem(KEY_MODE, sel.value); }catch(_){ } render(true); });
    }
    if(rng){
      rng.value = String(getSize());
      rng.addEventListener('input', ()=>{ try{ localStorage.setItem(KEY_SIZE, rng.value); }catch(_){ } render(true); });
    }
  }

  function signature(mode, size, lang, hist){
    const last = hist.length ? (hist[hist.length-1].id || hist[hist.length-1].name || '') : '';
    return [mode,size,lang,hist.length,last].join('|');
  }

  function render(force){
    const map = window.__tmMap;
    if(!map || !window.L) return;

    const mode=getMode();
    const size=getSize();
    const lang=getLang();
    const hist=getHistory();

    const sig=signature(mode,size,lang,hist);
    if(!force && sig===lastSig) return;
    lastSig=sig;

    if(layer){
      try{ layer.clearLayers(); }catch(_){ }
    } else {
      layer = L.layerGroup();
      try{ layer.addTo(map); }catch(_){ }
    }

    if(mode==='off') return;

    const pts = (mode==='route') ? hist.slice(-2) : hist.slice();

    pts.forEach((c)=>{
      if(!c || typeof c.lat!=='number' || typeof c.lon!=='number') return;
      const text = labelCity(c, lang);
      if(!text) return;
      const html = `<div class="tm-citylabel" style="--lbl-size:${size}px"><span>${escapeHtml(text)}</span></div>`;
      const icon = L.divIcon({ className:'tm-citylabel-icon', html, iconSize:null });
      const m = L.marker([c.lat, c.lon], { icon, interactive:false, keyboard:false, zIndexOffset: 900 });
      try{ m.addTo(layer); }catch(_){ }
    });
  }

  function escapeHtml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function start(){
    ensureUI();
    setInterval(()=>render(false), 600);
    render(true);
  }

  document.addEventListener('tm:map-ready', ()=>render(true));
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
