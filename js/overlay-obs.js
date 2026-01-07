// OBS Overlay logic: FROM -> TO + distance + auto-zoom mini map
(function(){
  'use strict';
  const THEME_KEY='tmTheme';

  function getTheme(){
    try{ return localStorage.getItem(THEME_KEY) || 'neon'; }catch(_){ return 'neon'; }
  }

  function applyTheme(){
    document.body.dataset.theme = getTheme();
  }

  function getHistory(){
    try{ return JSON.parse(localStorage.getItem('travelHistory')||'[]') || []; }catch(_){ return []; }
  }

  function labelCountry(city, lang){
    if(!city) return '';
    const jp = city.country_jp || city.country || '';
    const en = city.country || city.country_jp || '';
    const name = (lang==='jp') ? jp : en;
    const code = (city.countryCode||'').toUpperCase();
    return code ? `${name}（${code}）` : name;
  }

  function labelCity(city, lang){
    if(!city) return '';
    const jp = city.name_jp || city.name || '';
    const en = city.name || city.name_jp || '';
    return (lang==='jp') ? jp : en;
  }

  function flagUrl(code, baseW){
    const c=String(code||'').toLowerCase();
    const w0=Number(baseW)||42;
    const desiredH=Math.max(12, Math.round(w0*3/4));
    const H=[12,15,18,21,24,27,30,36,42,45,48,54,60,63,72,81,84,90,96,108,120,144,168,192];
    const h=H.reduce((best,v)=>Math.abs(v-desiredH)<Math.abs(best-desiredH)?v:best, H[0]);
    const w=Math.round(h*4/3);
    return `https://flagcdn.com/${w}x${h}/${c}.png`;
  }

  function haversineKm(a,b){
    const R=6371;
    const toRad=(d)=>d*Math.PI/180;
    const dLat=toRad((b.lat||0)-(a.lat||0));
    const dLon=toRad((b.lon||0)-(a.lon||0));
    const lat1=toRad(a.lat||0);
    const lat2=toRad(b.lat||0);
    const s=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    const c=2*Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
    return R*c;
  }

  function round10km(km){
    return Math.round(km/10)*10;
  }

  function fmtKm(km){
    const n=round10km(km);
    return `約 ${n.toLocaleString()} km`;
  }

  function renderCard(from,to){
    const lang = (function(){
      try{ return (localStorage.getItem('lang')||'jp'); }catch(_){ return 'jp'; }
    })();

    const fromCountry=document.getElementById('fromCountry');
    const fromCity=document.getElementById('fromCity');
    const toCountry=document.getElementById('toCountry');
    const toCity=document.getElementById('toCity');
    const fromFlag=document.getElementById('fromFlag');
    const toFlag=document.getElementById('toFlag');
    const dist=document.getElementById('distance');
    const empty=document.getElementById('emptyHint');

    if(!from || !to){
      empty.style.display='block';
      dist.textContent='';
      return;
    }

    empty.style.display='none';

    fromCountry.textContent=labelCountry(from, lang);
    fromCity.textContent=labelCity(from, lang);
    toCountry.textContent=labelCountry(to, lang);
    toCity.textContent=labelCity(to, lang);

    const fcode=(from.countryCode||'').toUpperCase();
    const tcode=(to.countryCode||'').toUpperCase();
    if(fcode){ fromFlag.src=flagUrl(fcode, 42); fromFlag.style.visibility='visible'; }
    else { fromFlag.style.visibility='hidden'; }
    if(tcode){ toFlag.src=flagUrl(tcode, 42); toFlag.style.visibility='visible'; }
    else { toFlag.style.visibility='hidden'; }

    const km=haversineKm(from,to);
    dist.textContent=fmtKm(km);
  }

  function initMap(){
    const map=L.map('miniMap', {zoomControl:false, attributionControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, boxZoom:false, keyboard:false, tap:false});
    // simple OSM tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 8}).addTo(map);
    return map;
  }

  function updateMiniMap(map, from, to){
    map.eachLayer((layer)=>{
      if(layer && layer.options && layer.options.pane === 'markerPane') {
        // keep tile layer
      }
    });

    // Remove existing polylines/markers we created by tagging
    map.eachLayer((layer)=>{
      if(layer && layer.__tmOverlay){
        try{ map.removeLayer(layer); }catch(_){ }
      }
    });

    if(!from || !to){
      map.setView([20,0],2);
      return;
    }

    const p1=[from.lat, from.lon];
    const p2=[to.lat, to.lon];

    const line=L.polyline([p1,p2], {color:getComputedStyle(document.body).getPropertyValue('--accent').trim()||'#00e5ff', weight:4, opacity:0.95});
    line.__tmOverlay=true; line.addTo(map);

    const mkStyle = (color)=>L.divIcon({className:'', iconSize:[14,14], iconAnchor:[7,7], html:`<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,.95);box-shadow:0 0 10px rgba(0,0,0,.35);"></div>`});
    const m1=L.marker(p1,{icon:mkStyle('#00e5ff')}); m1.__tmOverlay=true; m1.addTo(map);
    const m2=L.marker(p2,{icon:mkStyle('#ffb020')}); m2.__tmOverlay=true; m2.addTo(map);

    const bounds=L.latLngBounds([p1,p2]);
    map.fitBounds(bounds, {padding:[24,28], maxZoom:6});
  }

  function tick(map){
    applyTheme();
    const hist=getHistory();
    const n=hist.length;
    const from=(n>=2)?hist[n-2]:null;
    const to=(n>=1)?hist[n-1]:null;
    renderCard(from,to);
    updateMiniMap(map, from, to);
  }

  function init(){
    applyTheme();
    const map=initMap();
    // initial render
    tick(map);
    // update on storage changes (when main page updates history)
    window.addEventListener('storage', ()=>tick(map));
    // also poll in case same-tab update
    setInterval(()=>tick(map), 800);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
