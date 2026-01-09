// Unified Overlay for index.html (Stream mode + Adjust mode)
(function(){
  'use strict';

  const LS={
    cardX:'tmOvCardX', cardY:'tmOvCardY', mapX:'tmOvMapX', mapY:'tmOvMapY',
    cardScale:'tmOvCardScale', mapScale:'tmOvMapScale', citySize:'tmOvCitySize', countrySize:'tmOvCountrySize',
    borderW:'tmOvBorderW', flagH:'tmOvFlagH', pinSize:'tmOvPinSize',
    cardW:'tmOvCardW', cardH:'tmOvCardH', mapW:'tmOvMapW', mapH:'tmOvMapH',
    theme:'tmOvTheme', font:'tmOvFont', headScale:'tmOvHeadScale', mapLabelSize:'tmOvMapLabelSize',
    showCard:'tmOvShowCard', showMap:'tmOvShowMap', showFrame:'tmOvShowFrame'
  };

  const TILE_URLS={
    osm:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    bw:'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    sat:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    topo:'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
  };

  const $=(id)=>document.getElementById(id);
  const clamp=(n,min,max)=>{ n=Number(n); if(!isFinite(n)) return min; return Math.min(max, Math.max(min,n)); };
  const getLS=(k,fb)=>{ try{ const v=localStorage.getItem(k); return (v===null||v==='')?fb:v; }catch(_){ return fb; } };
  const setLS=(k,v)=>{ try{ localStorage.setItem(k,String(v)); }catch(_){ } };
  const getBool=(k,def=true)=>{ const v=getLS(k, def?'1':'0'); return v==='1'||v==='true'; };

  const getMapStyle=()=>{ try{ return localStorage.getItem('mapStyle')||'bw'; }catch(_){ return 'bw'; } };
  const setOvTheme=(v)=>document.body.setAttribute('data-ovtheme', String(v||'neon'));
  const setOvFont =(v)=>document.body.setAttribute('data-ovfont',  String(v||'yugothic'));

  function setMainMapStyle(style){
    const v=(style==='osm'||style==='bw'||style==='sat'||style==='topo')?style:'bw';
    try{ localStorage.setItem('mapStyle', v); }catch(_){ }
    const sel=document.getElementById('mapStyleSelect');
    if(sel){
      sel.value=v;
      try{ sel.dispatchEvent(new Event('change',{bubbles:true})); }catch(_){ }
    }
  }

  function flagCdnUrl(code,height){
    if(!code) return null;
    const H=[12,15,18,21,24,27,30,36,42,45,48,54,60,63,72,81,84,90,96,108,120,144,168,192];
    const base=Number(height)||42;
    const h=H.reduce((best,v)=>(Math.abs(v-base)<Math.abs(best-base)?v:best),H[0]);
    const w=Math.round(h*4/3);
    return {url:`https://flagcdn.com/${w}x${h}/${String(code).toLowerCase()}.png`, w, h};
  }

  function getLang(){ try{ return localStorage.getItem('lang')||'jp'; }catch(_){ return 'jp'; } }
  function labelCity(city){ if(!city) return '-'; const lang=getLang(); const jp=city.name_jp||city.name||''; const en=city.name||city.name_jp||''; return (lang==='jp')?jp:en; }
  function labelCountry(city){ if(!city) return '-'; const lang=getLang(); const jp=city.country_jp||city.country||''; const en=city.country||city.country_jp||''; const code=(city.countryCode||'').toUpperCase(); const name=(lang==='jp')?jp:en; return code?`${name}（${code}）`:name; }
  function breakLabel(text){ const t=String(text||'').trim(); if(!t) return ''; if(t.length<=10) return t; return t.slice(0,10)+'<br>'+t.slice(10); }

  function haversineKm(a,b){
    if(!a||!b) return NaN;
    const R=6371, toRad=(x)=>x*Math.PI/180;
    const lat1=toRad(parseFloat(a.lat)), lon1=toRad(parseFloat(a.lon));
    const lat2=toRad(parseFloat(b.lat)), lon2=toRad(parseFloat(b.lon));
    if(!isFinite(lat1)||!isFinite(lon1)||!isFinite(lat2)||!isFinite(lon2)) return NaN;
    const dLat=lat2-lat1, dLon=lon2-lon1;
    const s=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
  }

  function getHistory(){
    try{ const TM=window.TravelMap; if(TM && typeof TM.getHistory==='function'){ const h=TM.getHistory(); if(Array.isArray(h)) return h; } }catch(_){ }
    try{ return JSON.parse(localStorage.getItem('travelHistory')||'[]')||[]; }catch(_){ return []; }
  }

  function applyVars(){
    const stage=$('tmOverlayStage');
    if(!stage) return;

    const cardScale=clamp(getLS(LS.cardScale,'1'),0.60,1.40);
    const mapScale =clamp(getLS(LS.mapScale,'1'),0.60,1.60);
    const citySize =clamp(getLS(LS.citySize,'32'),14,44);
    const countrySize=clamp(getLS(LS.countrySize,'16'),12,28);
    const borderW =clamp(getLS(LS.borderW,'2'),0,6);
    const flagH   =clamp(getLS(LS.flagH,'42'),16,64);
    const pinSize =clamp(getLS(LS.pinSize,'12'),4,20);

    const cardW=clamp(getLS(LS.cardW,'320'),260,560);
    const cardH=clamp(getLS(LS.cardH,'0'),0,460);
    const mapW =clamp(getLS(LS.mapW,'480'),360,820);
    const mapH =clamp(getLS(LS.mapH,'255'),180,520);

    const headScale=clamp(getLS(LS.headScale,'1'),0.80,1.60);
    const mapLabelSize=clamp(getLS(LS.mapLabelSize,'12'),10,20);

    const theme=String(getLS(LS.theme,'neon')||'neon');
    const font =String(getLS(LS.font,'yugothic')||'yugothic');
    setOvTheme(theme); setOvFont(font);

    const showCard=getBool(LS.showCard,true);
    const showMap =getBool(LS.showMap,true);
    const showFrame=getBool(LS.showFrame,true);

    stage.style.setProperty('--tm-ov-show-card', showCard?'block':'none');
    stage.style.setProperty('--tm-ov-show-map',  showMap?'block':'none');
    stage.style.setProperty('--tm-ov-border-w-effective', showFrame?(borderW+'px'):'0px');
    stage.style.setProperty('--tm-ov-shadow', showFrame?'':'none');

    stage.style.setProperty('--tm-ov-country-size', countrySize+'px');
    stage.style.setProperty('--tm-ov-card-scale', cardScale);
    stage.style.setProperty('--tm-ov-map-scale', mapScale);
    stage.style.setProperty('--tm-ov-city-size', citySize+'px');
    stage.style.setProperty('--tm-ov-card-w', cardW+'px');
    stage.style.setProperty('--tm-ov-card-h', cardH+'px');
    stage.style.setProperty('--tm-ov-map-w', mapW+'px');
    stage.style.setProperty('--tm-ov-map-h', mapH+'px');
    stage.style.setProperty('--tm-ov-head-scale', headScale);
    stage.style.setProperty('--tm-ov-maplabel-size', mapLabelSize+'px');

    stage.style.setProperty('--tm-ov-card-x', clamp(getLS(LS.cardX,'70'),0,100)+'vw');
    stage.style.setProperty('--tm-ov-card-y', clamp(getLS(LS.cardY,'10'),0,100)+'vh');
    stage.style.setProperty('--tm-ov-map-x',  clamp(getLS(LS.mapX,'70'),0,100)+'vw');
    stage.style.setProperty('--tm-ov-map-y',  clamp(getLS(LS.mapY,'46'),0,100)+'vh');

    // sync controls
    const setv=(id,v)=>{ const el=$(id); if(el) el.value=String(v); };
    const setc=(id,v)=>{ const el=$(id); if(el) el.checked=!!v; };
    setv('tmOvThemeSel', theme);
    setv('tmOvFontSel', font);
    setv('tmOvHeadScale', headScale.toFixed(2));
    setc('tmOvShowCard', showCard);
    setc('tmOvShowMap', showMap);
    setc('tmOvShowFrame', showFrame);
    setv('tmOvBorderW', borderW);
    setv('tmOvCardW', cardW);
    setv('tmOvCardH', cardH);
    setv('tmOvCardScale', cardScale.toFixed(2));
    setv('tmOvCitySize', citySize);
    setv('tmOvCountrySize', countrySize);
    setv('tmOvFlagH', flagH);
    setv('tmOvMapW', mapW);
    setv('tmOvMapH', mapH);
    setv('tmOvMapScale', mapScale.toFixed(2));
    setv('tmOvMapLabelSize', mapLabelSize);
    setv('tmOvPin', pinSize);
    setv('tmOvMapStyleSel', getMapStyle());
  }

  // MiniMap
  let miniMap=null, miniLayerGroup=null, miniReady=false, miniTile=null, lastMiniStyle='';
  function setMiniTile(style){
    if(!miniMap || !window.L) return;
    const s=TILE_URLS[style]?style:'bw';
    if(miniTile){ try{ miniMap.removeLayer(miniTile); }catch(_){ } miniTile=null; }
    try{ miniTile=window.L.tileLayer(TILE_URLS[s], {maxZoom:19}); miniTile.addTo(miniMap); }catch(_){ }
    lastMiniStyle=s;
  }
  function syncMiniTile(){ const s=getMapStyle(); if(s!==lastMiniStyle) setMiniTile(s); }
  function initMiniMap(){
    if(miniReady) return;
    const el=$('tmOvMiniMap');
    if(!el || !window.L) return;
    miniMap=window.L.map(el,{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false});
    setMiniTile(getMapStyle());
    miniLayerGroup=window.L.layerGroup().addTo(miniMap);
    miniMap.setView([20,0],2);
    miniReady=true;
  }
  function clearMini(){ try{ miniLayerGroup && miniLayerGroup.clearLayers(); }catch(_){ } }
  function makeToIcon(size){
    const s=Math.max(18, Math.min(60, Number(size)||36));
    const svg='<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.5 1.2 6.6L12 17.8 6.1 20.5l1.2-6.6-4.8-4.5 6.6-.9z"/></svg>';
    const html='<div class="tm-ov-to-wrap"><div class="tm-ov-to-bg"></div><div class="tm-ov-to-star">'+svg+'</div></div>';
    return window.L.divIcon({className:'tm-ov-to-icon', html, iconSize:[s,s], iconAnchor:[s/2,s/2]});
  }
  function makeCarIcon(size){
    const s=Math.max(18, Math.min(56, Number(size)||32));
    const svg='<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
      +'<path class="car-body" d="M14 38l6-14c1.3-3 4.2-5 7.5-5h9c3.3 0 6.2 2 7.5 5l6 14h2c3 0 5 2 5 5v5c0 2-2 4-4 4h-2c-.8 3.4-3.8 6-7.5 6s-6.7-2.6-7.5-6H29c-.8 3.4-3.8 6-7.5 6S14.8 60.4 14 57H12c-2 0-4-2-4-4v-5c0-3 2-5 5-5h1z"/>'
      +'<path fill="#0a0c12" opacity="0.55" d="M22 26h20l4 10H18l4-10z"/>'
      +'<circle cx="21.5" cy="54" r="4.5" fill="#0a0c12"/>'
      +'<circle cx="50.5" cy="54" r="4.5" fill="#0a0c12"/>'
      +'</svg>';
    const html='<div class="tm-ov-car-wrap"><div class="tm-ov-car-bg"></div><div class="tm-ov-car">'+svg+'</div></div>';
    return window.L.divIcon({className:'tm-ov-car-icon', html, iconSize:[s,s], iconAnchor:[s/2,s/2]});
  }

  function updateMini(from,to){
    if(!miniReady || !miniMap || !miniLayerGroup) return;
    syncMiniTile();
    clearMini();
    if(!from || !to) return;
    const L=window.L;
    const p1=L.latLng(parseFloat(from.lat), parseFloat(from.lon));
    const p2=L.latLng(parseFloat(to.lat), parseFloat(to.lon));
    if(!isFinite(p1.lat)||!isFinite(p1.lng)||!isFinite(p2.lat)||!isFinite(p2.lng)) return;
    const lineColor=(function(){ try{ return localStorage.getItem('lineColor')||'#00e5ff'; }catch(_){ return '#00e5ff'; } })();
    const pin=clamp(getLS(LS.pinSize,'12'),4,20);
    L.polyline([p1,p2],{color:lineColor,weight:4,opacity:0.95}).addTo(miniLayerGroup);
    const carSize=Math.round(Math.max(24, pin*2.8));
    const starSize=Math.round(Math.max(30, pin*3.5));
    const mFrom=L.marker(p1,{icon:makeCarIcon(carSize),interactive:false,zIndexOffset:900}).addTo(miniLayerGroup);
    const mTo=L.marker(p2,{icon:makeToIcon(starSize),interactive:false,zIndexOffset:1000}).addTo(miniLayerGroup);
    try{
      mFrom.bindTooltip(breakLabel(labelCity(from)),{permanent:true,direction:'right',offset:[10,-10],className:'tm-ov-map-tooltip from',opacity:0.95});
      mTo.bindTooltip(breakLabel(labelCity(to)),{permanent:true,direction:'left',offset:[-10,-10],className:'tm-ov-map-tooltip to',opacity:0.95});
    }catch(_){ }
    const bounds=L.latLngBounds([p1,p2]);
    try{ miniMap.fitBounds(bounds,{padding:[60,60],maxZoom:11}); }catch(_){ }
    setTimeout(()=>{ try{ miniMap.invalidateSize(true); miniMap.fitBounds(bounds,{padding:[60,60],maxZoom:11}); }catch(_){ } },120);
  }

  function updateCard(from,to){
    const empty=$('tmOvEmpty');
    if(!from || !to){
      if(empty) empty.style.display='block';
      $('tmOvFromCountry').textContent='-';
      $('tmOvFromCity').textContent='-';
      $('tmOvToCountry').textContent='-';
      $('tmOvToCity').textContent='-';
      $('tmOvDistance').textContent='- km';
      $('tmOvFromFlag').style.display='none';
      $('tmOvToFlag').style.display='none';
      return;
    }
    if(empty) empty.style.display='none';
    $('tmOvToCountry').textContent=labelCountry(to);
    $('tmOvToCity').textContent=labelCity(to);
    $('tmOvFromCountry').textContent=labelCountry(from);
    $('tmOvFromCity').textContent=labelCity(from);
    const km=haversineKm(from,to);
    $('tmOvDistance').textContent=isFinite(km)?`${Math.round(km).toLocaleString('ja-JP')} km`:'- km';
    const flagH=clamp(getLS(LS.flagH,'42'),16,64);
    const fTo=to.countryCode?flagCdnUrl(to.countryCode,flagH):null;
    const imgTo=$('tmOvToFlag');
    if(fTo && imgTo){ imgTo.src=fTo.url; imgTo.style.width=fTo.w+'px'; imgTo.style.height=fTo.h+'px'; imgTo.style.display='block'; } else if(imgTo){ imgTo.style.display='none'; }
    const fFrom=from.countryCode?flagCdnUrl(from.countryCode,flagH):null;
    const imgFrom=$('tmOvFromFlag');
    if(fFrom && imgFrom){ imgFrom.src=fFrom.url; imgFrom.style.width=fFrom.w+'px'; imgFrom.style.height=fFrom.h+'px'; imgFrom.style.display='block'; } else if(imgFrom){ imgFrom.style.display='none'; }
  }

  function updateFromHistory(){
    const h=getHistory();
    const n=Array.isArray(h)?h.length:0;
    const to=n>=1?h[n-1]:null;
    const from=n>=2?h[n-2]:null;
    updateCard(from,to);
    updateMini(from,to);
  }

  function ensureMini(){ initMiniMap(); if(miniReady) setTimeout(()=>{ try{ miniMap.invalidateSize(true); }catch(_){ } updateFromHistory(); },60); }

  function updateStageState(){
    const stage=$('tmOverlayStage');
    if(!stage) return;
    const streaming=document.body.classList.contains('streaming');
    const adjusting=document.body.classList.contains('tm-ov-adjust');
    stage.setAttribute('aria-hidden', (streaming||adjusting)?'false':'true');
    if(streaming||adjusting) ensureMini();
  }

  function enterAdjust(){ document.body.classList.add('tm-ov-adjust'); applyVars(); updateStageState(); }
  function exitAdjust(){ document.body.classList.remove('tm-ov-adjust'); updateStageState(); }
  function toggleAdjust(){ document.body.classList.contains('tm-ov-adjust')?exitAdjust():enterAdjust(); }

  function bindDrag(box, keyX, keyY){
    if(!box) return;
    let dragging=false, sx=0, sy=0, bx=0, by=0;
    const getPos=()=>({x:clamp(getLS(keyX,'0'),0,100), y:clamp(getLS(keyY,'0'),0,100)});
    box.addEventListener('pointerdown', (e)=>{
      if(!(document.body.classList.contains('tm-ov-adjust') || document.body.classList.contains('streaming'))) return;
      dragging=true; box.setPointerCapture(e.pointerId);
      sx=e.clientX; sy=e.clientY;
      const p=getPos(); bx=p.x; by=p.y;
      e.preventDefault();
    });
    box.addEventListener('pointermove', (e)=>{
      if(!dragging) return;
      const nx=clamp(bx + (e.clientX-sx)/window.innerWidth*100, 0, 100);
      const ny=clamp(by + (e.clientY-sy)/window.innerHeight*100,0,100);
      setLS(keyX, nx.toFixed(2));
      setLS(keyY, ny.toFixed(2));
      applyVars(); ensureMini();
    });
    const end=(e)=>{ if(!dragging) return; dragging=false; try{ box.releasePointerCapture(e.pointerId); }catch(_){ } };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
  }

  function bindControls(){
    const onSel=(id, fn)=>{ const el=$(id); if(el) el.addEventListener('change', fn); };
    const onInp=(id, fn)=>{ const el=$(id); if(el) el.addEventListener('input', fn); };
    const onChk=(id, fn)=>{ const el=$(id); if(el) el.addEventListener('change', fn); };

    onSel('tmOvThemeSel', ()=>{ setLS(LS.theme, $('tmOvThemeSel').value); applyVars(); updateFromHistory(); });
    onSel('tmOvFontSel', ()=>{ setLS(LS.font, $('tmOvFontSel').value); applyVars(); });
    onSel('tmOvMapStyleSel', ()=>{ setMainMapStyle($('tmOvMapStyleSel').value); applyVars(); ensureMini(); });

    onChk('tmOvShowCard', ()=>{ setLS(LS.showCard, $('tmOvShowCard').checked?'1':'0'); applyVars(); });
    onChk('tmOvShowMap', ()=>{ setLS(LS.showMap, $('tmOvShowMap').checked?'1':'0'); applyVars(); ensureMini(); });
    onChk('tmOvShowFrame', ()=>{ setLS(LS.showFrame, $('tmOvShowFrame').checked?'1':'0'); applyVars(); });

    onInp('tmOvBorderW', ()=>{ setLS(LS.borderW, clamp($('tmOvBorderW').value,0,6)); applyVars(); });
    onInp('tmOvHeadScale', ()=>{ setLS(LS.headScale, clamp($('tmOvHeadScale').value,0.80,1.60).toFixed(2)); applyVars(); });

    onInp('tmOvCardW', ()=>{ setLS(LS.cardW, clamp($('tmOvCardW').value,260,560)); applyVars(); });
    onInp('tmOvCardH', ()=>{ setLS(LS.cardH, clamp($('tmOvCardH').value,0,460)); applyVars(); });
    onInp('tmOvCardScale', ()=>{ setLS(LS.cardScale, clamp($('tmOvCardScale').value,0.60,1.40).toFixed(2)); applyVars(); });
    onInp('tmOvCitySize', ()=>{ setLS(LS.citySize, clamp($('tmOvCitySize').value,14,44)); applyVars(); updateFromHistory(); });
    onInp('tmOvCountrySize', ()=>{ setLS(LS.countrySize, clamp($('tmOvCountrySize').value,12,28)); applyVars(); });
    onInp('tmOvFlagH', ()=>{ setLS(LS.flagH, clamp($('tmOvFlagH').value,16,64)); applyVars(); updateFromHistory(); });

    onInp('tmOvMapW', ()=>{ setLS(LS.mapW, clamp($('tmOvMapW').value,360,820)); applyVars(); ensureMini(); });
    onInp('tmOvMapH', ()=>{ setLS(LS.mapH, clamp($('tmOvMapH').value,180,520)); applyVars(); ensureMini(); });
    onInp('tmOvMapScale', ()=>{ setLS(LS.mapScale, clamp($('tmOvMapScale').value,0.60,1.60).toFixed(2)); applyVars(); ensureMini(); });
    onInp('tmOvMapLabelSize', ()=>{ setLS(LS.mapLabelSize, clamp($('tmOvMapLabelSize').value,10,20)); applyVars(); ensureMini(); });
    onInp('tmOvPin', ()=>{ setLS(LS.pinSize, clamp($('tmOvPin').value,4,20)); applyVars(); updateFromHistory(); });

    const close=$('tmOvClose');
    if(close) close.addEventListener('click', ()=>exitAdjust());
  }

  function init(){
    // defaults
    if(getLS(LS.cardX,null)===null){ setLS(LS.cardX,'70'); setLS(LS.cardY,'10'); }
    if(getLS(LS.mapX,null)===null){ setLS(LS.mapX,'70'); setLS(LS.mapY,'46'); }
    if(getLS(LS.pinSize,null)===null) setLS(LS.pinSize,'12');
    if(getLS(LS.theme,null)===null) setLS(LS.theme,'neon');
    if(getLS(LS.font,null)===null) setLS(LS.font,'yugothic');
    if(getLS(LS.headScale,null)===null) setLS(LS.headScale,'1');
    if(getLS(LS.mapLabelSize,null)===null) setLS(LS.mapLabelSize,'12');
    if(getLS(LS.showCard,null)===null) setLS(LS.showCard,'1');
    if(getLS(LS.showMap,null)===null) setLS(LS.showMap,'1');
    if(getLS(LS.showFrame,null)===null) setLS(LS.showFrame,'1');

    applyVars();
    updateFromHistory();

    // Robust click handler (works even if button added later)
    document.addEventListener('click', (e)=>{
      const t=e.target;
      if(t && t.closest && t.closest('#overlayAdjustBtn')){ e.preventDefault(); toggleAdjust(); }
      if(t && t.closest && t.closest('#tmOvClose')){ e.preventDefault(); exitAdjust(); }
    }, true);

    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && document.body.classList.contains('tm-ov-adjust')){ e.preventDefault(); exitAdjust(); } }, true);

    bindDrag($('tmOverlayCard'), LS.cardX, LS.cardY);
    bindDrag($('tmOverlayMap'),  LS.mapX,  LS.mapY);
    bindControls();

    const mo=new MutationObserver(()=>updateStageState());
    try{ mo.observe(document.body,{attributes:true,attributeFilter:['class']}); }catch(_){ }
    updateStageState();

    setInterval(()=>{ applyVars(); updateFromHistory(); }, 800);
    window.addEventListener('resize', ()=>{ applyVars(); ensureMini(); updateStageState(); });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
