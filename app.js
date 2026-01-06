(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // UI elements（id属性から明示的に取得：暗黙のグローバル依存を排除）
  const mapStyleSelect = $('mapStyleSelect');
  const toggleBorders  = $('toggleBorders');
  const regionSelect   = $('regionSelect');
  const countrySelect  = $('countrySelect');
  const stateSelect = $('stateSelect');
  const stateSearch = $('stateSearch');
  const citySelect     = $('citySelect');
  const recentSelect = $('recentSelect');
  const citySearch    = $('citySearch');
  const cityResults   = $('cityResults');
  const addBtn         = $('addBtn');
  const undoBtn        = $('undoBtn');
  const langBtn        = $('langBtn');
  const streamBtn      = $('streamBtn');
  const exportBtn      = $('exportBtn');
  const importBtn      = $('importBtn');
  const importFile     = $('importFile');

  const showLocation      = $('showLocation');
  const currentMarkerSize = $('currentMarkerSize');
  const pastMarkerColor = $('pastMarkerColor');
  const lineColorInput = $('lineColor');
  const lineWeightInput = $('lineWeight');
  const currentMarkerColorInput = $('currentMarkerColor');
  const locFontSize       = $('locFontSize');
  const locFlagSize       = $('locFlagSize');
  const locPadding        = $('locPadding');

  const currentLocation = $('currentLocation');
  const flag = $('flag');
  const currentText = $('currentText');

  // ===== Route Editor / OBS Overlay refs =====
  const routeList = $('routeList');
  const insertModeLabel = $('insertModeLabel');
  const cancelInsertBtn = $('cancelInsertBtn');

  const streamIndicator = $('streamIndicator');
  const safeFrame = $('safeFrame');
  const obsSafeFrame = $('obsSafeFrame');

  const routeOverlay = $('routeOverlay');
  const roProgress = $('roProgress');
  const roNowCity = $('roNowCity');
  const roNowCountry = $('roNowCountry');
  const roNowFlag = $('roNowFlag');
  const roFromCity = $('roFromCity');
  const roFromCountry = $('roFromCountry');
  const roFromFlag = $('roFromFlag');
  const roHistory = $('roHistory');

  const showRouteOverlay = $('showRouteOverlay');
  const overlayFontSize = $('overlayFontSize');
  const overlayFlagSize = $('overlayFlagSize');
  const overlayOnlyInStream = $('overlayOnlyInStream');

  const lockLocationBtn = $('lockLocationBtn');

  // ===== 状態の保存/読み込み（エクスポート/インポート） =====
  const STATE_VERSION = 'travelmap-state-v1';
  const STATE_KEYS = ['mapStyle','bordersOn','lineColor','currentColor','pastColor','curSize','locFontSize','locFlagSize','locPadding','locUI'];

  function collectState(){
    const state = { version: STATE_VERSION, savedAt: new Date().toISOString(), keys: {}, travelHistory: [] };
    for (const k of STATE_KEYS){
      const v = localStorage.getItem(k);
      if (v !== null) state.keys[k] = v;
    }
    try { state.travelHistory = JSON.parse(localStorage.getItem('travelHistory') || '[]'); } catch (_) { state.travelHistory = []; }
    return state;
  }

  function applyState(state){
    if (!state || typeof state !== 'object') throw new Error('state is not object');
    const keys = state.keys || {};
    for (const k of STATE_KEYS){
      if (Object.prototype.hasOwnProperty.call(keys, k)) localStorage.setItem(k, String(keys[k]));
    }
    if (Array.isArray(state.travelHistory)) localStorage.setItem('travelHistory', JSON.stringify(state.travelHistory));
  }

  function tsFile(){
    const d = new Date();
    const pad = (n) => String(n).padStart(2,'0');
    return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'_'+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds());
  }

  function downloadJson(filename, obj){
    const text = JSON.stringify(obj, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (exportBtn){
    exportBtn.onclick = () => {
      try { downloadJson('travelmap_state_'+tsFile()+'.json', collectState()); }
      catch (e){ alert('保存に失敗しました: ' + (e && e.message ? e.message : e)); }
    };
  }

  if (importBtn && importFile){
    importBtn.onclick = () => importFile.click();
  }

  if (importFile){
    importFile.addEventListener('change', (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { applyState(JSON.parse(String(reader.result || ''))); location.reload(); }
        catch (e){ alert('読み込みに失敗しました（JSON形式を確認）: ' + (e && e.message ? e.message : e)); }
      };
      reader.readAsText(file);
      ev.target.value='';
    });
  }

  if (!mapStyleSelect || !toggleBorders || !regionSelect || !countrySelect || !citySelect) {
    console.error('[TravelMap] required elements are missing.');
    return;
  }


  // 最近の都市セレクト
  if(recentSelect){
    recentSelect.addEventListener('change', ()=>{
      const id = recentSelect.value;
      if(!id) return;
      const c = findCityById(id);
      if(c) applyCityObject(c);
      recentSelect.value='';
    });
  }
  /* ===== 基本 ===== */
  const map=L.map("map",{zoomControl:false}).setView([20,0],2)

  // ==============================
  // OBS / Route Overlay / Route Editor (B)
  // ==============================
  function isStreaming(){ return document.body.classList.contains('streaming'); }

  function setStreaming(on){
    const streamingOn = !!on;
    document.body.classList.toggle('streaming', streamingOn);
    if(streamIndicator){ streamIndicator.style.display = streamingOn ? 'inline-flex' : 'none'; }
    // 配信中は地図操作をロック（誤操作防止）
    try{
      if(streamingOn){
        map.dragging.disable(); map.scrollWheelZoom.disable(); map.doubleClickZoom.disable();
        map.boxZoom.disable(); map.keyboard.disable(); map.touchZoom.disable();
      }else{
        map.dragging.enable(); map.scrollWheelZoom.enable(); map.doubleClickZoom.enable();
        map.boxZoom.enable(); map.keyboard.enable(); map.touchZoom.enable();
      }
    }catch(_){/* ignore */}
    updateObsUI();
  }

  // --- current location lock ---
  const LOC_LOCK_KEY='locLocked';
  let locLocked=(localStorage.getItem(LOC_LOCK_KEY)==='1');
  function updateLocLockBtn(){ if(lockLocationBtn) lockLocationBtn.textContent = locLocked ? '位置ロック: ON' : '位置ロック: OFF'; }
  if(lockLocationBtn){ updateLocLockBtn(); lockLocationBtn.onclick=()=>{ locLocked=!locLocked; localStorage.setItem(LOC_LOCK_KEY, locLocked?'1':'0'); updateLocLockBtn(); }; }

  // --- Route Editor state ---
  let insertAfterIndex=null;
  let selectedRouteIndex=null;

  function setInsertMode(afterIndex){
    insertAfterIndex=(afterIndex===null||afterIndex===undefined)?null:Number(afterIndex);
    if(insertModeLabel) insertModeLabel.textContent = (insertAfterIndex===null)?'OFF':`ON（${insertAfterIndex+1}番の次）`;
  }
  function setSelectedRouteIndex(idx){
    selectedRouteIndex=(idx===null||idx===undefined)?null:Number(idx);
    if(routeList){
      routeList.querySelectorAll('li.route-item').forEach(li=>{
        const i=Number(li.dataset.index);
        li.classList.toggle('selected', Number.isFinite(selectedRouteIndex) && i===selectedRouteIndex);
      });
    }
  }

  function renderRouteList(){
    if(!routeList) return;
    routeList.innerHTML='';
    if(!history || history.length===0){
      const li=document.createElement('li');
      li.style.opacity='0.75'; li.style.fontSize='12px';
      li.textContent=(lang==='jp')?'まだルートがありません。都市を追加してください。':'No route yet. Add a city.';
      routeList.appendChild(li);
      return;
    }


  // ===== Route/UI Sync (single source of truth) =====
  function syncRouteUI(){
    // route list
    if(typeof renderRouteList==='function'){
      try{ renderRouteList(); }catch(_){ }
    }
    // overlay etc.
    if(typeof updateObsUI==='function'){
      try{ updateObsUI(); }catch(_){ }
    }
  }
    for(let i=0;i<history.length;i++){
      const c=history[i];
      const li=document.createElement('li');
      li.className='route-item';
      if(Number.isFinite(selectedRouteIndex) && selectedRouteIndex===i) li.classList.add('selected');
      li.dataset.index=String(i);
      li.draggable=true;
      li.innerHTML=`
        <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap">
          <span style="font-weight:700">${i+1}.</span>
          <span style="font-weight:650">${cityLabel(c)}</span>
          <span style="opacity:.75;font-size:12px">${countryLabel(c)}${c.countryCode?` (${String(c.countryCode).toUpperCase()})`:''}</span>
        </div>
        <div class="route-actions" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
          <button type="button" data-act="goto">移動</button>
          <button type="button" data-act="insert">挿入</button>
          <button type="button" data-act="up">↑</button>
          <button type="button" data-act="down">↓</button>
          <button type="button" data-act="del">削除</button>
        </div>`;
      routeList.appendChild(li);
    }
  }

  function rebuildRouteVisual(){
    try{ markers.forEach(m=>map.removeLayer(m)); }catch(_){ }
    markers=[]; points=[];
    try{ line.setLatLngs([]); }catch(_){ }
    if(currentMarker){ try{ map.removeLayer(currentMarker); }catch(_){ } currentMarker=null; }
    restore();
    renderRouteList();
    updateObsUI();
    syncRouteUI();
  }

  function deleteHistoryAt(idx){
    if(!history||idx<0||idx>=history.length) return;
    const c=history[idx];
    if(!confirm(`${idx+1}番「${cityLabel(c)}」を削除しますか？`)) return;
    history.splice(idx,1);
    localStorage.setItem('travelHistory', JSON.stringify(history));
    setInsertMode(null);
    rebuildRouteVisual();
  }

  function moveHistory(from,to){
    if(!history) return;
    if(to<0||to>=history.length||from===to) return;
    const [c]=history.splice(from,1);
    history.splice(to,0,c);
    localStorage.setItem('travelHistory', JSON.stringify(history));
    setInsertMode(null);
    rebuildRouteVisual();
    setSelectedRouteIndex(to);
  }

  function enableRouteDnD(){
    if(!routeList || enableRouteDnD._bound) return; enableRouteDnD._bound=true;
    let dragIndex=null;
    routeList.addEventListener('dragstart',(e)=>{
      const li=e.target.closest('li.route-item'); if(!li) return;
      dragIndex=Number(li.dataset.index);
      e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setData('text/plain', String(dragIndex));
      li.style.opacity='0.6';
    });
    routeList.addEventListener('dragend',(e)=>{ const li=e.target.closest('li.route-item'); if(li) li.style.opacity=''; });
    routeList.addEventListener('dragover',(e)=>{ if(dragIndex===null) return; e.preventDefault(); });
    routeList.addEventListener('drop',(e)=>{
      e.preventDefault();
      const li=e.target.closest('li.route-item'); if(!li) return;
      const dropIndex=Number(li.dataset.index);
      const from=dragIndex; dragIndex=null;
      if(!Number.isFinite(from)||!Number.isFinite(dropIndex)||from===dropIndex) return;
      moveHistory(from, dropIndex);
    });
    routeList.addEventListener('mousedown',(e)=>{
      const li=e.target.closest('li.route-item'); if(!li) return;
      if(e.target.closest('button')) return;
      const idx=Number(li.dataset.index);
      if(Number.isFinite(idx)) setSelectedRouteIndex(idx);
    });
    routeList.addEventListener('click',(e)=>{
      const btn=e.target.closest('button'); if(!btn) return;
      const li=e.target.closest('li.route-item'); if(!li) return;
      const idx=Number(li.dataset.index);
      setSelectedRouteIndex(idx);
      const act=btn.dataset.act;
      if(act==='goto'){ const c=history[idx]; if(c) map.setView([c.lat,c.lon],5); }
      if(act==='insert') setInsertMode(idx);
      if(act==='up') moveHistory(idx, idx-1);
      if(act==='down') moveHistory(idx, idx+1);
      if(act==='del') deleteHistoryAt(idx);
    });
  }

  if(cancelInsertBtn) cancelInsertBtn.onclick=()=>setInsertMode(null);

  // --- Overlay settings & renderer ---
  const OVERLAY_SHOW_KEY='overlayShow';
  const OVERLAY_SIZE_KEY='overlayFontSize';
  const OVERLAY_FLAG_KEY='overlayFlagSize';
  const OVERLAY_ONLY_STREAM_KEY='overlayOnlyInStream';
  const SAFE_FRAME_KEY='obsSafeFrame';

  function getOverlaySettings(){
    const show=(localStorage.getItem(OVERLAY_SHOW_KEY)??'1')==='1';
    const size=Number(localStorage.getItem(OVERLAY_SIZE_KEY)??'18');
    const flagSize=Number(localStorage.getItem(OVERLAY_FLAG_KEY)??'22');
    const onlyStream=(localStorage.getItem(OVERLAY_ONLY_STREAM_KEY)??'0')==='1';
    const safe=(localStorage.getItem(SAFE_FRAME_KEY)??'0')==='1';
    return {show,size,flagSize,onlyStream,safe};
  }

  function applyOverlaySettingsToUI(){
    const s=getOverlaySettings();
    // 初回はUIデフォルトを採用
    if(localStorage.getItem(OVERLAY_ONLY_STREAM_KEY)===null && overlayOnlyInStream){
      localStorage.setItem(OVERLAY_ONLY_STREAM_KEY, overlayOnlyInStream.checked?'1':'0');
    }
    if(showRouteOverlay) showRouteOverlay.checked=s.show;
    if(overlayFontSize) overlayFontSize.value=String(s.size);
    if(overlayFlagSize) overlayFlagSize.value=String(s.flagSize);
    if(overlayOnlyInStream) overlayOnlyInStream.checked=s.onlyStream;
    if(obsSafeFrame) obsSafeFrame.checked=s.safe;
    if(safeFrame) safeFrame.style.display=s.safe?'block':'none';
  }

  function flagCdnUrl(code,height){
    if(!code) return null;
    const H=[12,15,18,21,24,27,30,36,42,45,48,54,60,63,72,81,84,90,96,108,120,144,168,192];
    const base=Number(height)||24;
    const h=H.reduce((best,v)=>(Math.abs(v-base)<Math.abs(best-base)?v:best),H[0]);
    const w=Math.round(h*4/3);
    return {url:`https://flagcdn.com/${w}x${h}/${String(code).toLowerCase()}.png`,w,h};
  }

  function renderRoHistory(){
    if(!roHistory) return;
    roHistory.innerHTML='';

    const s = getOverlaySettings();
    const total = Array.isArray(history)?history.length:0;

    // 過去5件は「FROM(=直前)」を除外して表示：NOW, FROM, HIS(過去5) で被り防止
    const pastRaw = (total>2) ? history.slice(0,-2).slice(-5).reverse() : [];
    const past = pastRaw.concat(Array(Math.max(0, 5-pastRaw.length)).fill(null));

    // 文字サイズ（overlayFontSizeに追従）
    const baseFs = Math.max(12, Math.min(40, Number(s.size)||18));
    const cityFs = Math.max(11, baseFs-5);
    const countryFs = Math.max(10, baseFs-7);

    // 国旗サイズ（overlayFlagSizeに追従）
    const flagBase = Math.max(12, Math.min(192, Number(s.flagSize)||22));

    const frag=document.createDocumentFragment();
    let lastCC = null;

    past.slice(0,5).forEach((c, i)=>{
      const row=document.createElement('div');
      row.className='ro-h-item';

      const no=document.createElement('div');
      no.className='ro-h-no';
      no.textContent=String(i+1);
      row.appendChild(no);

      const img=document.createElement('img');
      if(c && c.countryCode){
        const f = flagCdnUrl(c.countryCode, flagBase);
        if(f){
          img.src=f.url;
          img.style.width=f.w+'px';
          img.style.height=f.h+'px';
          img.style.display='block';
        }else{
          img.style.display='none';
        }
      }else{
        img.style.display='none';
      }
      row.appendChild(img);

      const wrap=document.createElement('div');
      wrap.style.display='flex';
      wrap.style.flexDirection='column';
      wrap.style.minWidth='0';

      const city=document.createElement('div');
      city.className='ro-h-city';
      city.style.fontSize=cityFs+'px';
      city.textContent=c?cityLabel(c):'-';
      wrap.appendChild(city);

      const cc = c && c.countryCode ? String(c.countryCode).toUpperCase() : null;
      const showCountry = c && cc && cc !== lastCC;
      if(cc) lastCC = cc;
      if(showCountry){
        const country=document.createElement('div');
        country.className='ro-h-country';
        country.style.fontSize=countryFs+'px';
        country.textContent=countryLabel(c) + (cc?(' ('+cc+')'):'');
        wrap.appendChild(country);
      }

      row.appendChild(wrap);
      frag.appendChild(row);
    });

    roHistory.appendChild(frag);
  }

function updateRouteOverlay(){
    if(!routeOverlay) return;
    const s=getOverlaySettings();
    const shouldShow=s.show && (!s.onlyStream || isStreaming());
    routeOverlay.style.display=shouldShow?'block':'none';

    const total=Array.isArray(history)?history.length:0;
    const nowIdx=total?total-1:0;
    const now=total?history[nowIdx]:null;
    const from=(total>=2)?history[total-2]:null;

    if(roProgress) roProgress.textContent=`${total?(nowIdx+1):0}/${total}`;

    // NOW
    if(roNowCity) roNowCity.textContent=now?cityLabel(now):'-';
    if(roNowCountry) roNowCountry.textContent=now?countryLabel(now)+(now.countryCode?` (${String(now.countryCode).toUpperCase()})`:''):'-';
    if(roNowFlag){
      const f=now?.countryCode?flagCdnUrl(now.countryCode,s.flagSize):null;
      if(f){ roNowFlag.src=f.url; roNowFlag.style.width=f.w+'px'; roNowFlag.style.height=f.h+'px'; roNowFlag.style.display='block'; }
      else { roNowFlag.style.display='none'; }
    }

    // FROM
    if(roFromCity) roFromCity.textContent=from?cityLabel(from):'-';
    if(roFromCountry) roFromCountry.textContent=from?countryLabel(from)+(from.countryCode?` (${String(from.countryCode).toUpperCase()})`:''):'-';
    if(roFromFlag){
      const f=from?.countryCode?flagCdnUrl(from.countryCode,s.flagSize):null;
      if(f){ roFromFlag.src=f.url; roFromFlag.style.width=f.w+'px'; roFromFlag.style.height=f.h+'px'; roFromFlag.style.display='block'; }
      else { roFromFlag.style.display='none'; }
    }

    renderRoHistory();
    // font sizes
    const p=Math.max(12,Math.min(40,s.size));
    if(roNowCity) roNowCity.style.fontSize=p+'px';
    if(roNowCountry) roNowCountry.style.fontSize=Math.max(12,p-5)+'px';
    if(roFromCity) roFromCity.style.fontSize=Math.max(12,p-2)+'px';
    if(roFromCountry) roFromCountry.style.fontSize=Math.max(12,p-6)+'px';
  }

  function updateObsUI(){
    applyOverlaySettingsToUI();
    updateRouteOverlay();
  }

  
  const tileLayers={
   osm:L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
   bw:L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"),
   sat:L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"),
   topo:L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png")
  }
  
  let currentTile
  let savedStyle = localStorage.getItem("mapStyle") || "bw";
  if (!tileLayers[savedStyle]) savedStyle = "bw";
  currentTile = tileLayers[savedStyle];
  currentTile.addTo(map);
  mapStyleSelect.value = savedStyle;
  localStorage.setItem("mapStyle", savedStyle)
  
  mapStyleSelect.onchange=e=>{
   if(currentTile) map.removeLayer(currentTile)
   const v=e.target.value
   currentTile = tileLayers[v] || tileLayers.bw
   currentTile.addTo(map)
   localStorage.setItem("mapStyle", tileLayers[v] ? v : "bw")
  }
  
  
  /* ===== 国境 ===== */
  let borderLayer;
  
  // 追加：ON/OFF状態を保存・復元するキー
  const BORDER_KEY = "bordersOn";
  
  // 追加：保存値から初期状態を決定（未保存なら true=ON）
  let bordersOn = localStorage.getItem(BORDER_KEY);
  bordersOn = (bordersOn === null) ? false : (bordersOn === "1");
  
  function countryColor(name){
    const c=["#f44336","#e91e63","#9c27b0","#673ab7","#3f51b5",
    "#2196f3","#03a9f4","#00bcd4","#009688","#4caf50",
    "#8bc34a","#cddc39","#ffeb3b","#ffc107","#ff9800"];
    let h=0; for(let i of name) h += i.charCodeAt(0);
    return c[h % c.length];
  }
  
  // 変更：レイヤーは作るが、「ONのときだけ」addTo(map)する
  (async()=>{
      try{ return await fetch('countries.geojson'); }
      catch(_){ return await fetch('countries.geo.json'); }
    })().then(r=>r.json()).then(j=>{
    borderLayer = L.geoJSON(j,{
      style:f=>({
        color:"#fff",
        weight:1,
        fillColor:countryColor(f.properties.name),
        fillOpacity:.6
      })
    });
  
    if (bordersOn) {
      borderLayer.addTo(map);
    }
  });
  
  // 変更：トグル時に localStorage に保存
  toggleBorders.onclick = ()=>{
    if(!borderLayer) return;
  
    if (bordersOn) {
      map.removeLayer(borderLayer);
    } else {
      map.addLayer(borderLayer);
    }
  
    bordersOn = !bordersOn;
    localStorage.setItem(BORDER_KEY, bordersOn ? "1" : "0");
  };
  
  
  /* ===== 都市 ===== */
  let cities=[]

  // ===== City datasets (ETS2 / ATS) =====
  const GROUP_KEY = 'cityGroup';
  const GROUPS = [
    { key: 'EURO', labelJP: 'EURO (ETS2)', labelEN: 'EURO (ETS2)' },
    { key: 'AMERICA', labelJP: 'AMERICA (ATS)', labelEN: 'AMERICA (ATS)' }
  ];
  let allCities = [];
  const citiesByGroup = { EURO: [], AMERICA: [] };
  let currentGroup = (localStorage.getItem(GROUP_KEY) || 'EURO');

  function groupOfCity(c){
    const r = c && c.region ? String(c.region) : '';
    if (r === 'Europe') return 'EURO';
    if (r === 'North America') return 'AMERICA';
    return 'EURO';
  }
  function groupLabel(key){
    const g = GROUPS.find(x => x.key === key);
    if (!g) return key;
    return (lang === 'jp') ? g.labelJP : g.labelEN;
  }
  function stateLabel(c){
    if (!c) return '';
    return (lang === 'jp') ? (c.state_jp || c.state || '') : (c.state || c.state_jp || '');
  }
  function cityOptionLabel(c){
    const s = stateLabel(c);
    return s ? `${cityLabel(c)} / ${s}` : cityLabel(c);
  }
  function ensureCityId(c){
    if (!c) return c;
    if (!c.id){
      const cc = String(c.countryCode || '').toUpperCase();
      const sc = String(c.stateCode || c.provinceCode || '').toUpperCase();
      const safe = String(c.name || '').replace(/[^A-Za-z0-9]/g, '');
      c.id = sc ? `${cc}-${sc}-${safe}` : `${cc}-${safe}`;
    }
    c.group = c.group || groupOfCity(c);
    return c;
  }
  async function loadCityDatasets(){
    const euroP = fetch('cities.json').then(r => r.json()).catch(() => []);
    const atsP  = fetch('cities-ATS.json').then(r => r.json()).catch(() => []);
    const [euro, ats] = await Promise.all([euroP, atsP]);
    allCities = ([]).concat(euro || [], ats || []).map(ensureCityId);
    citiesByGroup.EURO = allCities.filter(c => c.group === 'EURO');
    citiesByGroup.AMERICA = allCities.filter(c => c.group === 'AMERICA');
    if (!citiesByGroup[currentGroup]) currentGroup = 'EURO';
    cities = citiesByGroup[currentGroup] || [];
  }


  // ===== 最近使った都市（直近10件） =====
  const RECENT_CITY_KEY = 'recentCityIds';
  function loadRecentCityIds(){
    try{
      const a = JSON.parse(localStorage.getItem(RECENT_CITY_KEY) || '[]');
      return Array.isArray(a) ? a.filter(x=>typeof x==='string') : [];
    }catch(_){ return []; }
  }
  function saveRecentCityIds(ids){
    try{ localStorage.setItem(RECENT_CITY_KEY, JSON.stringify(ids.slice(0,10))); }catch(_){ }
  }
  function pushRecentCityId(id){
    if(!id) return;
    const ids = loadRecentCityIds();
    const next = [id, ...ids.filter(x=>x!==id)].slice(0,10);
    saveRecentCityIds(next);
    renderRecentSelect();
  }
  function findCityById(id){
    if(!id) return null;
    return (Array.isArray(allCities) ? allCities : []).find(c => c && c.id === id) || null;
  }
  function recentOptionLabel(c){
    if(!c) return '';
    const st = stateLabel(c);
    const g = groupLabel(c.group || groupOfCity(c));
    return st ? `${cityLabel(c)} / ${st} / ${g}` : `${cityLabel(c)} / ${g}`;
  }
  function renderRecentSelect(){
    if(!recentSelect) return;
    const ids = loadRecentCityIds();
    const placeholder = (lang==='jp') ? '最近の都市' : 'Recent';
    recentSelect.innerHTML = `<option value="">${placeholder}</option>`;
    for(const id of ids){
      const c = findCityById(id);
      if(!c) continue;
      recentSelect.add(new Option(recentOptionLabel(c), id));
    }
  }
  function applyCityObject(c){
    if(!c) return;
    const g = c.group || groupOfCity(c);
    regionSelect.value = g;
    regionSelect.onchange?.();

    if(g==='AMERICA'){
      if(stateSelect && stateSelect.style.display !== 'none'){
        const sk = stateKey(c);
        if(sk){ stateSelect.value = sk; stateSelect.onchange?.(); }
      }
      citySelect.value = c.id;
    }else{
      countrySelect.value = c.country;
      countrySelect.onchange?.();
      citySelect.value = c.id;
    }

    if(citySearch) citySearch.value = cityLabel(c);
    pushRecentCityId(c.id);
  }
  let history=JSON.parse(localStorage.getItem("travelHistory"))||[]
  let markers=[],points=[]
  let lineColor=localStorage.getItem("lineColor")||"#ff3333"
  let lineWeight = Number(localStorage.getItem('lineWeight')||'4');
  if(!Number.isFinite(lineWeight) || lineWeight<1) lineWeight = 4;
  let line=L.polyline([], {
    color: lineColor, weight: lineWeight
  }).addTo(map)
  
  let lang="jp";
  
  ;(async()=>{
  await loadCityDatasets();
  buildRegion();
  restore();
  if(typeof renderRouteList==='function') renderRouteList();
  if(typeof enableRouteDnD==='function') enableRouteDnD();
  if(typeof updateObsUI==='function') updateObsUI();
  setupCitySearch();
  try{ renderRecentSelect(); }catch(_){ }
  setupStateSearch();
})();

// ===== 州検索（ATS） =====
let __stateSearchBound = false;
function setupStateSearch(){
  if(__stateSearchBound) return;
  if(!stateSearch || !stateSelect) return;
  stateSearch.placeholder = '州を検索';
  stateSearch && stateSearch.addEventListener('input', ()=>{
    // 入力に応じて州候補を絞り込む
    try{ rebuildStateOptions(); }catch(_){ }
    // 州が変わる可能性があるので都市も更新
    try{ rebuildCityOptions(); }catch(_){ }
  });
  __stateSearchBound = true;
}

/* ===== 都市検索 ===== */
  const norm=(s)=>(s??'').toString().trim().toLowerCase().normalize('NFKC');

  // 現在地（＝最後に追加した都市。なければ地図中心）に近い順で優先するための距離計算
  function getRefLatLon(){
    if (history && history.length){
      const last = history.at(-1);
      if (last && typeof last.lat === 'number' && typeof last.lon === 'number') return {lat:last.lat, lon:last.lon};
    }
    const c = map.getCenter();
    return {lat:c.lat, lon:c.lng};
  }

  function haversineKm(lat1, lon1, lat2, lon2){
    const R = 6371;
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }


  function cityLabel(c){
    return lang==='jp' ? (c.name_jp||c.name||'') : (c.name||c.name_jp||'');
  }
  function countryLabel(c){
    return lang==='jp' ? (c.country_jp||c.country||'') : (c.country||c.country_jp||'');
  }

  function buildSearchResults(q){
    const nq=norm(q);
    const ref=getRefLatLon();
    if(!nq) return [];
    const scored=[];
    for(let i=0;i<cities.length;i++){
      const c=cities[i];
      const hay=[norm(c.name_jp),norm(c.name),norm(c.country_jp),norm(c.country),norm(c.countryCode),norm(c.state_jp),norm(c.state),norm(c.stateCode),norm(c.provinceCode)].filter(Boolean);
      let best=Infinity;
      for(const h of hay){
        if(h.startsWith(nq)) best=Math.min(best,0);
        else if(h.includes(nq)) best=Math.min(best,1);
      }
      if(best!==Infinity){
        const ln=(norm(c.name_jp)||norm(c.name)||'').length;
        const dist = (ref && typeof c.lat==='number' && typeof c.lon==='number') ? haversineKm(ref.lat, ref.lon, c.lat, c.lon) : Infinity;
      scored.push({i,best,ln,dist});
      }
    }
    scored.sort((a,b)=> a.best-b.best || a.dist-b.dist || a.ln-b.ln || a.i-b.i);
    return scored.slice(0,30).map(x=>x.i);
  }

  function closeResults(){
    if(!cityResults) return;
    cityResults.classList.remove('open');
    cityResults.innerHTML='';
  }

  function applyCitySelection(idx){
  const c=cities[idx];
  if(!c) return;
  regionSelect.value=(c.group||groupOfCity(c));
  regionSelect.onchange?.();

  if(currentGroup==='AMERICA'){
    if(stateSelect && stateSelect.style.display!=='none'){
      const sk = stateKey(c);
      if(sk){ stateSelect.value=sk; stateSelect.onchange?.(); }
    }
    citySelect.value=c.id;
    if(citySearch) citySearch.value=cityLabel(c);
    try{ pushRecentCityId(c.id); }catch(_){ }
    return;
  }

  countrySelect.value=c.country;
  countrySelect.onchange?.();
  citySelect.value=c.id;
  if(citySearch) citySearch.value=cityLabel(c);
  try{ pushRecentCityId(c.id); }catch(_){ }
}

function renderResults(indices, activePos = -1){
    if(!cityResults) return;
    cityResults.innerHTML='';
    if(!indices.length){ closeResults(); return; }

    const frag=document.createDocumentFragment();
    for(const idx of indices){
      const c=cities[idx];
      const item=document.createElement('div');
      item.className='city-item';
      item.dataset.idx=String(idx);

      const activeIdx = (activePos >= 0 && activePos < indices.length) ? indices[activePos] : -1;
      if (idx === activeIdx) item.classList.add('active');

      const main=document.createElement('div');
      main.className='main';
      main.textContent=cityLabel(c);

      const sub=document.createElement('div');
      sub.className='sub';
      sub.textContent=`${countryLabel(c)}${stateLabel(c)?(' / '+stateLabel(c)) : ''} / ${groupLabel(c.group||groupOfCity(c))}${c.countryCode?(' / '+c.countryCode):''}${c.stateCode?(' / '+c.stateCode):''}`;

      item.appendChild(main);
      item.appendChild(sub);

      // 候補クリック＝即『追加＋移動』。blurより先に確実に拾うため mousedown で処理
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyCitySelection(Number(item.dataset.idx));
        if (citySearch) citySearch.value = '';
        closeResults();
        addBtn?.click();
      });

      frag.appendChild(item);
    }
    cityResults.appendChild(frag);
    cityResults.classList.add('open');
  }

 

  // --- City Search: event binding + global exposure（配信向け最適版） ---
  let __citySearchBound = false;

  function setupCitySearch() {
    window.setupCitySearch = setupCitySearch;

    if (__citySearchBound) return;
    if (!citySearch || !cityResults) {
      console.warn('[TravelMap] citySearch / cityResults が見つかりません');
      return;
    }

    // blur のタイミングで閉じてクリックが食われる問題を避ける
    let closeTimer = null;
    const scheduleClose = () => {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(() => { closeTimer = null; closeResults(); }, 250);
    };
    const cancelClose = () => {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    };

    let lastIndices = [];
    let activePos = -1;

    const runNow = () => {
      const q = (citySearch.value || '').trim();
      if(!q){
        lastIndices = [];
        activePos = -1;
        closeResults();
        return;
      }
      lastIndices = buildSearchResults(q);
      activePos = lastIndices.length ? 0 : -1;
      renderResults(lastIndices, activePos);
    };

    // デバウンス（入力が止まってから検索）
    let t = null;
    const run = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        t = null;
        runNow();
      }, 120);
    };

    citySearch.addEventListener('input', run);

    // 結果リスト上の操作中は close をキャンセル
    cityResults.addEventListener('mousedown', () => { cancelClose(); });

    // キーボード：↑↓で候補移動 / Enterで確定（追加＋移動） / Escで閉じる
    citySearch.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeResults();
        citySearch.blur();
        return;
      }
      if (!lastIndices.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activePos = Math.min(activePos + 1, lastIndices.length - 1);
        renderResults(lastIndices, activePos);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        activePos = Math.max(activePos - 1, 0);
        renderResults(lastIndices, activePos);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const cityIdx = lastIndices[activePos];
        if (cityIdx == null) return;
        applyCitySelection(cityIdx);
        if (citySearch) citySearch.value = '';
        closeResults();
        addBtn?.click();
        return;
      }
    });

    citySearch.addEventListener('blur', scheduleClose);

    citySearch.addEventListener('focus', () => {
      cancelClose();
      if ((citySearch.value || '').trim()) runNow();
    });

    // 外側クリックで閉じる
    document.addEventListener('mousedown', (e) => {
      const wrap = citySearch.closest('.searchWrap');
      if (wrap && wrap.contains(e.target)) return;
      closeResults();
    });

    __citySearchBound = true;
    console.log('[setupCitySearch] ready');
  }

  window.setupCitySearch = setupCitySearch;

function buildRegion(){
  // 地域セレクト = モード（EURO/AMERICA）
  regionSelect.innerHTML = `<option value="">${lang==='jp'?'モード':'Mode'}</option>`;
  GROUPS.forEach(g => regionSelect.add(new Option(groupLabel(g.key), g.key)));
  regionSelect.value = currentGroup;

  // 初期化
  countrySelect.innerHTML = `<option value="">${lang==='jp'?'国':'Country'}</option>`;
  if(stateSelect){
    stateSelect.innerHTML = `<option value="">${lang==='jp'?'州':'State'}</option>`;
    stateSelect.style.display = 'none';
  }
  citySelect.innerHTML = `<option value="">${lang==='jp'?'都市':'City'}</option>`;

  if(currentGroup) regionSelect.onchange?.();
}

function uniqueCountriesByName(list){
  const m=new Map();
  for(const c of list){
    if(!c||!c.country) continue;
    if(!m.has(c.country)) m.set(c.country,c);
  }
  return Array.from(m.values());
}

// ATS用：州のキー（value）を統一
function stateKey(c){
  if(!c) return '';
  return String(c.stateCode || c.provinceCode || c.state || c.state_jp || '').trim();
}

function rebuildStateOptions(){
  if(!stateSelect) return;
  stateSelect.innerHTML = `<option value="">${lang==='jp'?'州':'State'}</option>`;

  // AMERICA(ATS): 国を使わず州リストを作る（US運用前提）
  const map = new Map();
  for(const c of cities){
    const key = stateKey(c);
    if(!key) continue;
    if(!map.has(key)) map.set(key, c);
  }

  const entries = Array.from(map.entries()).map(([key,c])=>({
    key,
    label: (lang==='jp') ? String(c.state_jp||c.state||key).trim() : String(c.state||c.state_jp||key).trim(),
  }));
  entries.sort((a,b)=>String(a.label).localeCompare(String(b.label),'ja'));

  entries.forEach(e=>stateSelect.add(new Option(e.label, e.key)));
  stateSelect.style.display = entries.length ? '' : 'none';
}

function rebuildCityOptions(){
  citySelect.innerHTML = `<option value="">${lang==='jp'?'都市':'City'}</option>`;

  let list;
  if(currentGroup==='AMERICA'){
    list = cities.slice();
  }else{
    const cc = countrySelect.value;
    if(!cc) return;
    list = cities.filter(c=>c.country===cc);
  }

  if(currentGroup==='AMERICA' && stateSelect && stateSelect.style.display!=='none'){
    const sk = stateSelect.value;
    if(sk) list = list.filter(c => stateKey(c)===sk);
  }

  list.sort((a,b)=>{
    const sa=stateLabel(a)||''; const sb=stateLabel(b)||'';
    const ca=cityLabel(a)||'';  const cb=cityLabel(b)||'';
    const s=sa.localeCompare(sb,'ja');
    return s!==0? s : ca.localeCompare(cb,'ja');
  });

  list.forEach(c => citySelect.add(new Option(cityOptionLabel(c), c.id)));
}

regionSelect.onchange = ()=>{
  countrySelect.innerHTML = `<option value="">${lang==='jp'?'国':'Country'}</option>`;
  if(stateSelect){
    stateSelect.innerHTML = `<option value="">${lang==='jp'?'州':'State'}</option>`;
    stateSelect.style.display = 'none';
  }
  citySelect.innerHTML = `<option value="">${lang==='jp'?'都市':'City'}</option>`;

  const v = regionSelect.value;
  if(!v) return;
  currentGroup = v;
  localStorage.setItem(GROUP_KEY, currentGroup);
  cities = citiesByGroup[currentGroup] || [];

  if(currentGroup==='EURO'){
    if(stateSelect) stateSelect.style.display='none';
    countrySelect.style.display='';

    const countries = uniqueCountriesByName(cities);
    countries.sort((a,b)=>{
      const la=(lang==='jp'?(a.country_jp||a.country):(a.country||a.country_jp))||'';
      const lb=(lang==='jp'?(b.country_jp||b.country):(b.country||b.country_jp))||'';
      return la.localeCompare(lb,'ja');
    });
    countries.forEach(c=>{
      const label=(lang==='jp')?(c.country_jp||c.country):(c.country||c.country_jp);
      countrySelect.add(new Option(label, c.country));
    });
    return;
  }

  // AMERICA(ATS)
  countrySelect.style.display='none';
  if(stateSelect){
    rebuildStateOptions();
  }
  rebuildCityOptions();
};

countrySelect.onchange = ()=>{
  if(currentGroup!=='EURO') return;
  rebuildCityOptions();
  // EURO: 国の中心へズーム
  try{
    const cc = countrySelect.value;
    if(!cc) return;
    const arr = cities.filter(c => c && c.country===cc && Number.isFinite(c.lat) && Number.isFinite(c.lon));
    if(!arr.length) return;
    const lat = arr.reduce((s,c)=>s+c.lat,0)/arr.length;
    const lon = arr.reduce((s,c)=>s+c.lon,0)/arr.length;
    map.setView([lat, lon], 5);
  }catch(_){ }
};

if(stateSelect){
  stateSelect.onchange = ()=>{
    if(currentGroup!=='AMERICA') return;
    rebuildCityOptions();
    // ATS: 州の中心へズーム
    try{
      const sk = stateSelect.value;
      if(!sk) return;
      const arr = cities.filter(c => stateKey(c)===sk && Number.isFinite(c.lat) && Number.isFinite(c.lon));
      if(!arr.length) return;
      const lat = arr.reduce((s,c)=>s+c.lat,0)/arr.length;
      const lon = arr.reduce((s,c)=>s+c.lon,0)/arr.length;
      map.setView([lat, lon], 5);
    }catch(_){ }
  };
}


// 都市選択（手動）も最近に記録
if(citySelect){
  citySelect.addEventListener('change', ()=>{
    try{ const id = citySelect.value; if(id) pushRecentCityId(id); }catch(_){ }
  });
}
/* ===== 言語切替（完全修正） ===== */
  langBtn.onclick=()=>{
   lang=lang==="jp"?"en":"jp"
   langBtn.textContent=lang==="jp"?"日本語":"English"
   buildRegion()
   if(regionSelect.value){
    regionSelect.onchange()
    if(countrySelect.value) countrySelect.onchange()
   }
   if(history.length) updateCurrent(history.at(-1))
  }
  
  /* ===== マーカー ===== */
  let currentMarker
  let curSize=localStorage.getItem("curSize")||20
  let pastColor=localStorage.getItem("pastColor")||"#ff3333"
  let currentColor=localStorage.getItem("currentColor")||"#00ffff"
  currentMarkerSize.value=curSize
  if (pastMarkerColor) pastMarkerColor.value=pastColor
  if (lineColorInput) lineColorInput.value=lineColor
  if (lineWeightInput) lineWeightInput.value=String(lineWeight)
  if (currentMarkerColorInput) currentMarkerColorInput.value=currentColor
  
  function addCurrent(city){
   if(currentMarker)map.removeLayer(currentMarker)
   const icon=L.divIcon({
    className:"pulsate",
    html:`<div style="width:${curSize}px;height:${curSize}px;
    background:${currentColor};border:2px solid #fff;border-radius:50%"></div>`
   })
   currentMarker=L.marker([city.lat,city.lon],{icon}).addTo(map)
   updateCurrent(city)
  }
  
  
  
  function updateCurrent(city) {
    // 表示名（言語に応じて）
    const countryName = (lang === "jp")
      ? (city.country_jp || city.country || "")
      : (city.country || city.country_jp || "");
  
    const cityName = (lang === "jp")
      ? (city.name_jp || city.name || "")
      : (city.name || city.name_jp || "");
  
    // 国コード（あれば併記）
    const code = (city.countryCode || "").toUpperCase();
  
    // 国（コード）／都市
    const line1 = code ? `${countryName}（${code}）` : countryName;
    const line2 = cityName;
  
    // 2要素に出し分け
    const countryEl = document.getElementById("currentCountry");
    const cityEl    = document.getElementById("currentCity");
  
    const fallback = (lang === "jp") ? "現在地未設定" : "Location not set";
  
    if (countryEl && cityEl) {
      // どちらか片方だけでも表示できるように
      if (line1 || line2) {
        countryEl.textContent = line1 || "";
        cityEl.textContent    = line2 || "";
        // 都市が空なら都市行を消す（見た目をスッキリ）
        cityEl.style.display = line2 ? "block" : "none";
      } else {
        countryEl.textContent = fallback;
        cityEl.textContent = "";
        cityEl.style.display = "none";
      }
    } else {
      // 念のため旧方式の保険（要素が無い場合）
      currentText.textContent =
        (line1 && line2) ? `${line1}\n${line2}` : (line1 || line2 || fallback);
    }
  
    // 旗（countryCode がある場合のみ表示）
    if (code) {
      const base = Number(document.getElementById("locFlagSize")?.value) || 24;
  
      // FlagCDNの対応サイズ（高さ）に丸める
      const AVAILABLE_H = [12,15,18,21,24,27,30,36,42,45,48,54,60,63,72,81,84,90,96,108,120,144,168,192];
      const h = AVAILABLE_H.reduce((best, v) =>
        Math.abs(v - base) < Math.abs(best - base) ? v : best
      , AVAILABLE_H[0]);
  
      const w = Math.round(h * 4 / 3); // 4:3（例: 24→32）
  
      flag.src = `https://flagcdn.com/${w}x${h}/${code.toLowerCase()}.png`;
      flag.style.width = `${w}px`;
      flag.style.height = `${h}px`;
      flag.style.display = "block";
    } else {
      flag.style.display = "none";
    }
  }
  
  
  /* ===== 追加/戻す ===== */
  addBtn.onclick=()=>{
    const city=cities.find(c=>c.id===citySelect.value)
    if(!city)return

    // 挿入モードONの場合：指定位置に挿入
    if(typeof insertAfterIndex !== 'undefined' && insertAfterIndex !== null){
      const pos=Math.max(0, Math.min(insertAfterIndex+1, history.length));
      history.splice(pos, 0, city);
      localStorage.setItem('travelHistory', JSON.stringify(history));
      if(typeof setInsertMode==='function') setInsertMode(null);
      if(typeof rebuildRouteVisual==='function') rebuildRouteVisual();
      syncRouteUI();
      map.setView([city.lat, city.lon], 5);
      return;
    }
   // 直前と同じ都市なら追加しない（配信中の連打事故防止）
   if(history.length && history.at(-1)?.name===city.name) return
   if(markers.length)markers.at(-1).setStyle({fillColor:pastColor})
   const m=L.circleMarker([city.lat,city.lon],{
    radius:8,color:"#fff",fillColor:currentColor,fillOpacity:1
   }).addTo(map)
   markers.push(m)
   points.push([city.lat,city.lon])
   line.setLatLngs(points)
   history.push(city)
   localStorage.setItem("travelHistory",JSON.stringify(history))
   addCurrent(city)
   syncRouteUI();
   map.setView([city.lat,city.lon],5)
  }
  
  undoBtn.onclick=()=>{
   if(!history.length)return
   history.pop()
   localStorage.setItem("travelHistory",JSON.stringify(history))
   map.removeLayer(markers.pop())
   points.pop()
   line.setLatLngs(points)
   if(history.length)addCurrent(history.at(-1))
    if(typeof renderRouteList==='function') renderRouteList();
    if(typeof updateObsUI==='function') updateObsUI();
   syncRouteUI();
  }

  function restore(){
   history.forEach((c,i)=>{
    const m=L.circleMarker([c.lat,c.lon],{
     radius:8,color:"#fff",
     fillColor:i===history.length-1?currentColor:pastColor,
     fillOpacity:1
    }).addTo(map)
    markers.push(m)
    points.push([c.lat,c.lon])
   })
   line.setLatLngs(points)
   if(history.length)addCurrent(history.at(-1))
    // sync UI after restore
    syncRouteUI();
  }
  
  /* ===== UI ===== */
  currentMarkerSize.oninput=e=>{
   curSize=e.target.value
   localStorage.setItem("curSize",curSize)
   if(history.length)addCurrent(history.at(-1))
  }
  
  if (pastMarkerColor) pastMarkerColor.oninput=e=>{
   pastColor=e.target.value
   localStorage.setItem("pastColor",pastColor)
   markers.slice(0,-1).forEach(m=>m.setStyle({fillColor:pastColor}))
  }
  
  
  

  if (lineColorInput) lineColorInput.oninput=e=>{
   lineColor=e.target.value
   localStorage.setItem("lineColor",lineColor)
   try{ line.setStyle({color:lineColor}) }catch(_){}

  if(lineWeightInput) lineWeightInput.oninput = (e)=>{
    lineWeight = Number(e.target.value);
    if(!Number.isFinite(lineWeight) || lineWeight<1) lineWeight = 4;
    try{ localStorage.setItem('lineWeight', String(lineWeight)); }catch(_){}
    try{ line.setStyle({weight: lineWeight}); }catch(_){}
  };
  }

  if (currentMarkerColorInput) currentMarkerColorInput.oninput=e=>{
   currentColor=e.target.value
   localStorage.setItem("currentColor",currentColor)
   // 最新マーカーの色を更新
   if(markers.length) markers.at(-1).setStyle({fillColor:currentColor})
   // 現在地マーカー（脈動）も更新
   if(history.length) addCurrent(history.at(-1))
  }
showLocation.onchange = (e) => {
    // 現在地テロップ表示/非表示
    currentLocation.style.display = e.target.checked ? 'flex' : 'none';
  };

  // ===== OBS controls wiring =====
  // ※ showLocation の変更イベントの外で一度だけ設定する（UI操作が効かないバグ防止）
  if (showRouteOverlay) {
    showRouteOverlay.onchange = (e) => {
      localStorage.setItem(OVERLAY_SHOW_KEY, e.target.checked ? '1' : '0');
      updateObsUI();
    };
  }
  if (overlayFontSize) {
    overlayFontSize.oninput = (e) => {
      localStorage.setItem(OVERLAY_SIZE_KEY, String(e.target.value));
      updateObsUI();
    };
  }
  if (overlayFlagSize) {
    overlayFlagSize.oninput = (e) => {
      localStorage.setItem(OVERLAY_FLAG_KEY, String(e.target.value));
      updateObsUI();
    };
  }
  if (overlayOnlyInStream) {
    overlayOnlyInStream.onchange = (e) => {
      localStorage.setItem(OVERLAY_ONLY_STREAM_KEY, e.target.checked ? '1' : '0');
      updateObsUI();
    };
  }
  if (obsSafeFrame) {
    obsSafeFrame.onchange = (e) => {
      localStorage.setItem(SAFE_FRAME_KEY, e.target.checked ? '1' : '0');
      updateObsUI();
    };
  }

  // 初期状態をUIへ反映
  updateObsUI();

  
  locFlagSize.oninput = (e) => {
    locFlag = parseInt(e.target.value, 10);
    localStorage.setItem(locFlagKey, String(locFlag));
    applyCurrentLocationStyle();
  };
  
  locPadding.oninput = (e) => {
    locPad = parseInt(e.target.value, 10);
    localStorage.setItem(locPadKey, String(locPad));
    applyCurrentLocationStyle();
  };
  
  
  

  /* ===== Current Location UI (robust) ===== */
  (function setupCurrentLocationUI(){
    const locFontSizeEl = document.getElementById('locFontSize');
    const locFlagSizeEl = document.getElementById('locFlagSize');
    const locPaddingEl  = document.getElementById('locPadding');
    const showLocationEl = document.getElementById('showLocation');
    const currentLocationEl = document.getElementById('currentLocation');
    const flagEl = document.getElementById('flag');
    const currentTextEl = document.getElementById('currentText');
    if(!locFontSizeEl || !locFlagSizeEl || !locPaddingEl || !showLocationEl || !currentLocationEl || !flagEl || !currentTextEl) return;

    const locFontKey = 'locFontSize';
    const locFlagKey = 'locFlagSize';
    const locPadKey  = 'locPadding';

    let locFont = parseInt(localStorage.getItem(locFontKey) || String(locFontSizeEl.value || 18), 10);
    let locFlag = parseInt(localStorage.getItem(locFlagKey) || String(locFlagSizeEl.value || 24), 10);
    let locPad  = parseInt(localStorage.getItem(locPadKey)  || String(locPaddingEl.value  || 10), 10);

    function apply(){
      currentLocationEl.style.display = showLocationEl.checked ? 'flex' : 'none';
      currentLocationEl.style.fontSize = locFont + 'px';
      currentLocationEl.style.padding  = locPad + 'px ' + Math.round(locPad * 1.8) + 'px';
      flagEl.style.width  = locFlag + 'px';
      flagEl.style.height = Math.round(locFlag * 0.65) + 'px';
      flagEl.style.objectFit = 'cover';
      currentTextEl.style.lineHeight = '1.1';
    }

    locFontSizeEl.value = String(locFont);
    locFlagSizeEl.value = String(locFlag);
    locPaddingEl.value  = String(locPad);
    apply();

    showLocationEl.onchange = () => apply();
    locFontSizeEl.oninput = (e) => { locFont = parseInt(e.target.value, 10); localStorage.setItem(locFontKey, String(locFont)); apply(); };
    locFlagSizeEl.oninput = (e) => { locFlag = parseInt(e.target.value, 10); localStorage.setItem(locFlagKey, String(locFlag)); apply(); };
    locPaddingEl.oninput  = (e) => { locPad  = parseInt(e.target.value, 10); localStorage.setItem(locPadKey,  String(locPad));  apply(); };
  })();
/* ===== ドラッグ（現在地：変形しない left/top 固定）===== */
  (function(){
    if(!currentLocation) return;
    let dragging = false;
    let dx = 0, dy = 0;
    const KEY = 'locUI';

    // restore
    try{
      const pos = JSON.parse(localStorage.getItem(KEY) || 'null');
      if(pos && typeof pos.x === 'number' && typeof pos.y === 'number'){
        currentLocation.style.left = pos.x + 'px';
        currentLocation.style.top  = pos.y + 'px';
        currentLocation.style.right = 'auto';
        currentLocation.style.bottom = 'auto';
        currentLocation.style.transform = 'none';
      }
    }catch(_){ }

    // if saved position overlaps UI, push it out (first load safety)
    try{
      const ui = document.getElementById('ui');
      if(ui){
        const r1 = currentLocation.getBoundingClientRect();
        const r2 = ui.getBoundingClientRect();
        const overlap = !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
        if(overlap){
          currentLocation.style.left = '16px';
          currentLocation.style.top = 'auto';
          currentLocation.style.bottom = '16px';
          currentLocation.style.right = 'auto';
        }
      }
    }catch(_){ }

    function onDown(e){
      if (typeof locLocked !== 'undefined' && locLocked) return;
      if(e.button !== 0) return;
      dragging = true;
      const rect = currentLocation.getBoundingClientRect();
      dx = e.clientX - rect.left;
      dy = e.clientY - rect.top;
      currentLocation.style.left = rect.left + 'px';
      currentLocation.style.top  = rect.top  + 'px';
      currentLocation.style.right = 'auto';
      currentLocation.style.bottom = 'auto';
      currentLocation.style.transform = 'none';
      e.preventDefault();
    }

    function onMove(e){
      if(!dragging) return;
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      const w = currentLocation.offsetWidth;
      const h = currentLocation.offsetHeight;
      let x = Math.round(e.clientX - dx);
      let y = Math.round(e.clientY - dy);
      x = Math.max(0, Math.min(vw - w, x));
      y = Math.max(0, Math.min(vh - h, y));
      currentLocation.style.left = x + 'px';
      currentLocation.style.top  = y + 'px';
    }

    function onUp(){
      if(!dragging) return;
      dragging = false;
      try{
        localStorage.setItem(KEY, JSON.stringify({
          x: currentLocation.offsetLeft,
          y: currentLocation.offsetTop
        }));
      }catch(_){ }
    }

    currentLocation.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  })();
  // 他タブ/別プロセス（OBS等）で travelHistory が更新されたら反映する
  window.addEventListener("storage", (e) => {
    if (e.key !== "travelHistory") return;
  
    // 1) 新しい履歴を読む
    history = JSON.parse(e.newValue || "[]");
  
    // 2) 既存の表示を消す（安全にやる）
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    points = [];
    line.setLatLngs([]);
  
    // 3) もう一度復元
    restore();
  
    // 4) 最終地点があれば現在地更新
    if (history.length) addCurrent(history.at(-1));
  });



  // ===== Route history reset =====
  if(resetHistoryBtn){
    resetHistoryBtn.onclick = ()=>{
      const total = Array.isArray(history)?history.length:0;
      if(!total){
        alert(lang==='jp'?'履歴は空です。':'History is empty.');
        return;
      }
      const msg = (lang==='jp') ? `ルート履歴をすべて削除しますか？（${total}件）` : `Clear all route history? (${total} items)`;
      if(!confirm(msg)) return;
      try{ history = []; localStorage.setItem('travelHistory','[]'); }catch(_){ }
      try{ setInsertMode(null); }catch(_){ }
      try{ setSelectedRouteIndex(null); }catch(_){ }
      try{ rebuildRouteVisual(); }catch(_){ try{ syncRouteUI(); }catch(__){} }
    };
  }
// Service Worker（PWA）
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
  }


  // ===== Public API (for GitHub Pages modularization) =====
  try {
    const TM = (window.TravelMap = window.TravelMap || {});
    TM.version = TM.version || 'stable-v6.2-pages';
    TM.getHistory = () => (typeof history !== 'undefined' ? history : []);
    TM.getCities  = () => (typeof cities !== 'undefined' ? cities : []);
    TM.syncRouteUI = (typeof syncRouteUI === 'function') ? syncRouteUI : null;
    TM.renderRouteList = (typeof renderRouteList === 'function') ? renderRouteList : null;
    TM.isStreaming = (typeof isStreaming === 'function') ? isStreaming : () => document.body.classList.contains('streaming');
    TM.setStreaming = (typeof setStreaming === 'function') ? setStreaming : null;
    TM.updateObsUI = (typeof updateObsUI === 'function') ? updateObsUI : null;
    TM.updateRouteOverlay = (typeof updateRouteOverlay === 'function') ? updateRouteOverlay : null;
  } catch (_) { /* ignore */ }


  /* ===== STABILIZER_V2 ===== */
  // GitHub Pages でも壊れにくいよう、必要なイベント登録を最後に必ず上書きする。

  const _isEditing = () => {
    const el = document.activeElement;
    const tag = el && el.tagName ? el.tagName.toLowerCase() : '';
    return (tag === 'input' || tag === 'textarea' || tag === 'select' || (el && el.isContentEditable));
  };

  function syncRouteUI(){
    try{ if(typeof renderRouteList==='function') renderRouteList(); }catch(_){ }
    try{ if(typeof updateObsUI==='function') updateObsUI(); }catch(_){ }
  }

  // ensure stream button works
  if (streamBtn && !streamBtn.dataset.boundStb) {
    streamBtn.dataset.boundStb = '1';
    streamBtn.addEventListener('click', () => {
      if(typeof setStreaming==='function') setStreaming(!isStreaming());
    });
  }

  // global shortcuts
  if (!document.body.dataset.shortcutsBoundStb) {
    document.body.dataset.shortcutsBoundStb = '1';
    document.addEventListener('keydown', (e) => {
      // ESC: streaming off
      if(e.key === 'Escape'){
        if(typeof isStreaming==='function' && isStreaming()){
          e.preventDefault();
          if(typeof setStreaming==='function') setStreaming(false);
        }
        return;
      }

      const editing = _isEditing();
      const allowWhileEditing = editing && e.altKey && !e.ctrlKey && !e.metaKey;
      if(editing && !allowWhileEditing) return;

      const k = (e.key || '').toLowerCase();
      if(k === 's' && !e.ctrlKey && !e.metaKey){
        e.preventDefault();
        if(typeof setStreaming==='function') setStreaming(!isStreaming());
        return;
      }
      if(k === 'r' && !e.ctrlKey && !e.metaKey){
        e.preventDefault();
        try{
          const cur = (localStorage.getItem(OVERLAY_SHOW_KEY) ?? '1') === '1';
          localStorage.setItem(OVERLAY_SHOW_KEY, cur ? '0' : '1');
          if(typeof updateObsUI==='function') updateObsUI();
        }catch(_){ }
        return;
      }
if((e.ctrlKey||e.metaKey) && k === 'z'){
        e.preventDefault();
        undoBtn?.click();
        return;
      }
    });
  }

  // make sure add/undo always refresh route list
  (function wrapAddUndo(){
    if(addBtn && !addBtn.dataset.wrapSync){
      addBtn.dataset.wrapSync='1';
      const old = addBtn.onclick;
      addBtn.onclick = (ev) => { try{ if(old) old(ev); } finally { syncRouteUI(); } };
    }
    if(undoBtn && !undoBtn.dataset.wrapSync){
      undoBtn.dataset.wrapSync='1';
      const old = undoBtn.onclick;
      undoBtn.onclick = (ev) => { try{ if(old) old(ev); } finally { syncRouteUI(); } };
    }
  })();

  // current location UI ensure sliders always work
  (function bindCurrentLocationUI(){
    if(document.body.dataset.locUiBoundStb) return;
    document.body.dataset.locUiBoundStb='1';

    const locFontSizeEl = document.getElementById('locFontSize');
    const locFlagSizeEl = document.getElementById('locFlagSize');
    const locPaddingEl  = document.getElementById('locPadding');
    const showLocationEl = document.getElementById('showLocation');
    const currentLocationEl = document.getElementById('currentLocation');
    const flagEl = document.getElementById('flag');
    const currentTextEl = document.getElementById('currentText');
    if(!locFontSizeEl || !locFlagSizeEl || !locPaddingEl || !showLocationEl || !currentLocationEl || !flagEl || !currentTextEl) return;

    const locFontKey='locFontSize', locFlagKey='locFlagSize', locPadKey='locPadding';
    let locFont=parseInt(localStorage.getItem(locFontKey) || String(locFontSizeEl.value||18),10);
    let locFlag=parseInt(localStorage.getItem(locFlagKey) || String(locFlagSizeEl.value||24),10);
    let locPad =parseInt(localStorage.getItem(locPadKey)  || String(locPaddingEl.value ||10),10);

    const showSaved = localStorage.getItem('showLocation');
    if(showSaved !== null) { showLocationEl.checked = (showSaved==='1'); }
    else { showLocationEl.checked = true; try{ localStorage.setItem('showLocation','1'); }catch(_){ } }

    function apply(){
      currentLocationEl.style.display = showLocationEl.checked ? 'flex':'none';
      currentLocationEl.style.fontSize = locFont+'px';
      currentLocationEl.style.padding  = locPad+'px '+Math.round(locPad*1.8)+'px';
      flagEl.style.width = locFlag+'px';
      flagEl.style.height = Math.round(locFlag*0.65)+'px';
      flagEl.style.objectFit='cover';
      currentTextEl.style.lineHeight='1.1';
    }

    locFontSizeEl.value=String(locFont);
    locFlagSizeEl.value=String(locFlag);
    locPaddingEl.value=String(locPad);
    apply();

    showLocationEl.onchange=(e)=>{ localStorage.setItem('showLocation', e.target.checked?'1':'0'); apply(); };
    locFontSizeEl.oninput=(e)=>{ locFont=parseInt(e.target.value,10); localStorage.setItem(locFontKey,String(locFont)); apply(); };
    locFlagSizeEl.oninput=(e)=>{ locFlag=parseInt(e.target.value,10); localStorage.setItem(locFlagKey,String(locFlag)); apply(); };
    locPaddingEl.oninput =(e)=>{ locPad =parseInt(e.target.value,10); localStorage.setItem(locPadKey,String(locPad)); apply(); };
  })();

  // initial sync
  try{ syncRouteUI(); }catch(_){ }
})();