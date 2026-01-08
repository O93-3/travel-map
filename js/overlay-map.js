// Overlay Map (map only) - v14 zoom hotfix
(function(){
  'use strict';
  const THEME_KEY='tmTheme';
  function $(id){ return document.getElementById(id); }

  function getTheme(){
    try{ return localStorage.getItem(THEME_KEY) || 'neon'; }catch(_){ return 'neon'; }
  }
  function applyTheme(){ document.body.dataset.theme = getTheme(); }

  function getHistory(){
    try{ return JSON.parse(localStorage.getItem('travelHistory')||'[]') || []; }catch(_){ return []; }
  }

  function labelCity(city, lang){
    if(!city) return '';
    const jp = city.name_jp || city.name || '';
    const en = city.name || city.name_jp || '';
    return (lang==='jp') ? jp : en;
  }

  function showError(msg){
    const el = $('mapError');
    if(!el) return;
    el.style.display='flex';
    if(msg) el.innerHTML = msg;
  }

  function chooseBreak(text){
    const t = String(text||'').trim();
    if(!t) return {txt:'', cls:'ovMapLabel'};
    const max1 = 7;
    const max2 = 10;
    if(t.length <= max2) return {txt:t, cls:'ovMapLabel'};
    const seps = [' ', '/', '-', '—', '–', '_'];
    for(const sep of seps){
      const idx = t.indexOf(sep);
      if(idx>=2 && idx <= Math.max(10, t.length-3)){
        const a = t.slice(0, idx).trim();
        const b = t.slice(idx+1).trim();
        if(a.length>=2 && b.length>=2){
          const cls = (Math.max(a.length,b.length) > max1) ? 'ovMapLabel sm' : 'ovMapLabel';
          return {txt: a + '\n' + b, cls};
        }
      }
    }
    let mid = Math.ceil(t.length/2);
    mid = Math.max(3, mid);
    mid = Math.min(t.length-3, mid);
    if(t[mid-1] === '・') mid += 1;
    if(t[mid] === '・') mid += 1;
    if(mid >= t.length-2) mid = t.length-2;
    const a = t.slice(0, mid);
    const b = t.slice(mid);
    const cls = (Math.max(a.length,b.length) > max1) ? 'ovMapLabel xs' : 'ovMapLabel sm';
    return {txt: a + '\n' + b, cls};
  }

  function mkDotIcon(color, size){
    const s = size|0;
    const r = Math.max(4, Math.round(s/2));
    return L.divIcon({
      className:'',
      iconSize:[s,s],
      iconAnchor:[Math.round(s/2), Math.round(s/2)],
      html:`<div style="width:${s}px;height:${s}px;border-radius:${r}px;background:${color};border:2px solid rgba(255,255,255,.96);box-shadow:0 0 12px rgba(0,0,0,.35);"></div>`
    });
  }

  function starIcon(){
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 32 32">
      <path d="M16 2.8l3.8 9.4 10.1.8-7.7 6.6 2.3 9.8-8.5-5.2-8.5 5.2 2.3-9.8-7.7-6.6 10.1-.8z"
        fill="#ffb020" stroke="rgba(255,255,255,.96)" stroke-width="2" />
    </svg>`;
    return L.divIcon({
      className:'',
      iconSize:[30,30],
      iconAnchor:[15,15],
      html:`<div class="tmStarWrap"><div class="tmRing"></div><div class="tmStar">${svg}</div></div>`
    });
  }

  function bindCityLabel(marker, text){
    const raw = String(text||'').trim();
    if(!raw) return;
    const r = chooseBreak(raw);
    try{ marker.bindTooltip(r.txt, {permanent:true, direction:'top', offset:[0,-14], opacity:0.96, className:r.cls}); }catch(_){ }
  }

  async function loadBorders(map){
    const urls = ['./countries.geojson','./countries.geo.json'];
    let data=null;
    for(const u of urls){
      try{
        const res = await fetch(u, {cache:'no-store'});
        if(res.ok){ data = await res.json(); break; }
      }catch(_){ }
    }
    if(!data) return null;
    map.createPane('bordersPane');
    map.getPane('bordersPane').style.zIndex = 360;
    const layer = L.geoJSON(data, {
      pane:'bordersPane',
      style: { color: 'rgba(0,0,0,0.18)', weight: 1.1, opacity: 1.0, fillOpacity: 0 }
    });
    layer.addTo(map);
    return layer;
  }

  function initMap(){
    const map=L.map('miniMap', {zoomControl:false, attributionControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, boxZoom:false, keyboard:false, tap:false});
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 12, subdomains:'abc', crossOrigin:true});
    tiles.on('tileerror', ()=>{ showError('地図タイルの読み込みに失敗しました。<br>通信/OBSの制限を確認してください。'); });
    tiles.addTo(map);

    map.createPane('routePane');
    map.getPane('routePane').style.zIndex = 420;
    map.createPane('markerPane');
    map.getPane('markerPane').style.zIndex = 430;

    loadBorders(map);

    setTimeout(()=>{ try{ map.invalidateSize(true); }catch(_){ } }, 80);
    return map;
  }

  function update(map){
    applyTheme();
    const lang = (function(){ try{ return (localStorage.getItem('lang')||'jp'); }catch(_){ return 'jp'; } })();
    const hist=getHistory();
    const n=hist.length;
    const from=(n>=2)?hist[n-2]:null;
    const to=(n>=1)?hist[n-1]:null;

    map.eachLayer((l)=>{
      if(l instanceof L.TileLayer) return;
      if(l && l.options && l.options.pane==='bordersPane') return;
      map.removeLayer(l);
    });

    if(!from || !to) {
      map.setView([20,0], 2);
      return;
    }
    const lat1=parseFloat(from.lat), lon1=parseFloat(from.lon);
    const lat2=parseFloat(to.lat), lon2=parseFloat(to.lon);
    if(!isFinite(lat1)||!isFinite(lon1)||!isFinite(lat2)||!isFinite(lon2)){
      map.setView([20,0], 2);
      return;
    }

    const p1=[lat1, lon1];
    const p2=[lat2, lon2];

    L.polyline([p1,p2], {pane:'routePane', color:'rgba(0,0,0,0.32)', weight:7, opacity:1}).addTo(map);
    L.polyline([p1,p2], {pane:'routePane', color:'#ffb020', weight:4.4, opacity:0.96}).addTo(map);

    const mTo=L.marker(p2,{pane:'markerPane', icon:starIcon()}); mTo.addTo(map); bindCityLabel(mTo, labelCity(to, lang));
    const mFrom=L.marker(p1,{pane:'markerPane', icon:mkDotIcon('#00e5ff', 12)}); mFrom.addTo(map); bindCityLabel(mFrom, labelCity(from, lang));

    const bounds=L.latLngBounds([p1,p2]);
    try{ map.fitBounds(bounds, {padding:[60,60], maxZoom:11}); }catch(_){ }
    // second pass after layout settles (OBS/CEF quirk)
    setTimeout(()=>{ try{ map.invalidateSize(true); map.fitBounds(bounds, {padding:[60,60], maxZoom:11}); }catch(_){ } }, 120);

    const err = $('mapError');
    if(err) err.style.display='none';
  }

  let map=null;
  try{ map = initMap(); }
  catch(e){ showError('地図の初期化に失敗しました。<br>（console参照）'); try{ console.error(e);}catch(_){ } return; }

  function tick(){
    try{ update(map); }
    catch(e){ showError('地図の更新でエラーが発生しました。<br>（console参照）'); try{ console.error(e);}catch(_){ } }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>{ tick(); setInterval(tick, 900); });
  else { tick(); setInterval(tick, 900); }

  window.addEventListener('storage', ()=>{ tick(); });
})();
