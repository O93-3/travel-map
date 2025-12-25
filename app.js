(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // UI elements（id属性から明示的に取得：暗黙のグローバル依存を排除）
  const mapStyleSelect = $('mapStyleSelect');
  const toggleBorders  = $('toggleBorders');
  const regionSelect   = $('regionSelect');
  const countrySelect  = $('countrySelect');
  const citySelect     = $('citySelect');
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
  const currentMarkerColorInput = $('currentMarkerColor');
  const locFontSize       = $('locFontSize');
  const locFlagSize       = $('locFlagSize');
  const locPadding        = $('locPadding');

  const currentLocation = $('currentLocation');
  const flag = $('flag');
  const currentText = $('currentText');

  // ===== OBS Route Overlay =====
  const routeOverlay = $('routeOverlay');
  const roProgress = $('roProgress');
  const roNowCity = $('roNowCity');
  const roNowCountry = $('roNowCountry');
  const roNowFlag = $('roNowFlag');
  const roFromCity = $('roFromCity');
  const roFromCountry = $('roFromCountry');
  const roFromFlag = $('roFromFlag');
  const showRouteOverlay = $('showRouteOverlay');
  const overlayFontSize = $('overlayFontSize');
  const overlayFlagSize = $('overlayFlagSize');
  const overlayOnlyInStream = $('overlayOnlyInStream');
  const obsSafeFrame = $('obsSafeFrame');
  const safeFrame = $('safeFrame');
  const streamIndicator = $('streamIndicator');
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

  /* ===== 基本 ===== */
  const map=L.map("map",{zoomControl:false}).setView([20,0],2)

  // ===== OBS / Overlay =====
  function isStreaming(){
    return document.body.classList.contains('streaming');
  }

  function setStreaming(on){
    const streamingOn = !!on;
    document.body.classList.toggle('streaming', streamingOn);
    if(streamIndicator){
      streamIndicator.style.display = streamingOn ? 'inline-flex' : 'none';
    }
    // 配信中は地図操作をロック
    try{
      if(streamingOn){
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();
        map.touchZoom.disable();
      }else{
        map.dragging.enable();
        map.scrollWheelZoom.enable();
        map.doubleClickZoom.enable();
        map.boxZoom.enable();
        map.keyboard.enable();
        map.touchZoom.enable();
      }
    }catch(_){/* ignore */}

    updateObsUI();
  }

  // currentLocation lock
  const LOC_LOCK_KEY = 'locLocked';
  let locLocked = (localStorage.getItem(LOC_LOCK_KEY) === '1');
  function updateLocLockBtn(){
    if(!lockLocationBtn) return;
    lockLocationBtn.textContent = locLocked ? '位置ロック: ON' : '位置ロック: OFF';
  }
  if(lockLocationBtn){
    updateLocLockBtn();
    lockLocationBtn.onclick = () => {
      locLocked = !locLocked;
      localStorage.setItem(LOC_LOCK_KEY, locLocked ? '1' : '0');
      updateLocLockBtn();
    };
  }

  const OVERLAY_SHOW_KEY = 'overlayShow';
  const OVERLAY_SIZE_KEY = 'overlayFontSize';
  const OVERLAY_FLAG_KEY = 'overlayFlagSize';
  const OVERLAY_ONLY_STREAM_KEY = 'overlayOnlyInStream';
  const SAFE_FRAME_KEY = 'obsSafeFrame';

  function getOverlaySettings(){
    const show = (localStorage.getItem(OVERLAY_SHOW_KEY) ?? '1') === '1';
    const size = Number(localStorage.getItem(OVERLAY_SIZE_KEY) ?? '18');
    const flagSize = Number(localStorage.getItem(OVERLAY_FLAG_KEY) ?? '22');
    const onlyStream = (localStorage.getItem(OVERLAY_ONLY_STREAM_KEY) ?? '1') === '1';
    const safe = (localStorage.getItem(SAFE_FRAME_KEY) ?? '0') === '1';
    return { show, size, flagSize, onlyStream, safe };
  }

  function applyOverlaySettingsToUI(){
    const s = getOverlaySettings();
    if(showRouteOverlay) showRouteOverlay.checked = s.show;
    if(overlayFontSize) overlayFontSize.value = String(s.size);
    if(overlayFlagSize) overlayFlagSize.value = String(s.flagSize);
    if(overlayOnlyInStream) overlayOnlyInStream.checked = s.onlyStream;
    if(obsSafeFrame) obsSafeFrame.checked = s.safe;
    if(safeFrame) safeFrame.style.display = s.safe ? 'block' : 'none';
  }

  function setOverlayVisible(visible){
    if(!routeOverlay) return;
    routeOverlay.style.display = visible ? 'block' : 'none';
  }

  function setOverlayFontSize(px){
    const p = Math.max(12, Math.min(40, Number(px) || 18));
    if(roNowCity) roNowCity.style.fontSize = p + 'px';
    if(roFromCity) roFromCity.style.fontSize = Math.max(12, p-2) + 'px';
  }

  function flagCdnUrl(code, height){
    if(!code) return '';
    const AVAILABLE_H = [12,15,18,21,24,27,30,36,42,45,48,54,60,63,72,81,84,90,96,108,120,144,168,192];
    const base = Number(height) || 24;
    const h = AVAILABLE_H.reduce((best, v) => (Math.abs(v - base) < Math.abs(best - base) ? v : best), AVAILABLE_H[0]);
    const w = Math.round(h * 4 / 3);
    return { url: `https://flagcdn.com/${w}x${h}/${String(code).toLowerCase()}.png`, w, h };
  }

  function updateRouteOverlay(){
    if(!routeOverlay) return;
    const s = getOverlaySettings();
    const shouldShow = s.show && (!s.onlyStream || isStreaming());
    setOverlayVisible(shouldShow);
    setOverlayFontSize(s.size);

    const total = Array.isArray(history) ? history.length : 0;
    const nowIdx = total ? total - 1 : 0;
    const now = total ? history[nowIdx] : null;
    const from = (total >= 2) ? history[total - 2] : null;

    if(roProgress) roProgress.textContent = `${total ? (nowIdx+1) : 0}/${total}`;

    // NOW
    if(roNowCity) roNowCity.textContent = now ? cityLabel(now) : '-';
    if(roNowCountry) roNowCountry.textContent = now ? countryLabel(now) + ((now.countryCode) ? ` (${String(now.countryCode).toUpperCase()})` : '') : '-';
    if(roNowFlag){
      const code = now?.countryCode ? String(now.countryCode).toLowerCase() : '';
      if(code){
        const f = flagCdnUrl(code, s.flagSize);
        roNowFlag.src = f.url;
        roNowFlag.style.width = f.w + 'px';
        roNowFlag.style.height = f.h + 'px';
        roNowFlag.style.display = 'block';
      }else{
        roNowFlag.style.display = 'none';
      }
    }

    // FROM
    if(roFromCity) roFromCity.textContent = from ? cityLabel(from) : '-';
    if(roFromCountry) roFromCountry.textContent = from ? countryLabel(from) + ((from.countryCode) ? ` (${String(from.countryCode).toUpperCase()})` : '') : '-';
    if(roFromFlag){
      const code = from?.countryCode ? String(from.countryCode).toLowerCase() : '';
      if(code){
        const f = flagCdnUrl(code, s.flagSize);
        roFromFlag.src = f.url;
        roFromFlag.style.width = f.w + 'px';
        roFromFlag.style.height = f.h + 'px';
        roFromFlag.style.display = 'block';
      }else{
        roFromFlag.style.display = 'none';
      }
    }
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
  const savedStyle=localStorage.getItem("mapStyle")||"bw"
  currentTile=tileLayers[savedStyle]
  currentTile.addTo(map)
  mapStyleSelect.value=savedStyle
  
  mapStyleSelect.onchange=e=>{
   map.removeLayer(currentTile)
   currentTile=tileLayers[e.target.value]
   currentTile.addTo(map)
   localStorage.setItem("mapStyle",e.target.value)
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
  fetch("countries.geojson").then(r=>r.json()).then(j=>{
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
  let history=JSON.parse(localStorage.getItem("travelHistory"))||[]
  let markers=[],points=[]
  let lineColor=localStorage.getItem("lineColor")||"#ff3333"
  let line=L.polyline([], {
   color:lineColor, weight:4
  }).addTo(map)
  
  let lang="jp"
  
  fetch("cities.json").then(r=>r.json()).then(j=>{
   cities=j
   buildRegion()
   restore()
   updateObsUI();
   setupCitySearch();
  })
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
      const hay=[norm(c.name_jp),norm(c.name),norm(c.country_jp),norm(c.country),norm(c.countryCode)].filter(Boolean);
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

  function closeResults(){ cityResults?.classList.remove('open'); }

  function applyCitySelection(idx){
    const c=cities[idx];
    if(!c) return;
    // 既存の連動ロジックに合わせる（region/countryを更新して citySelect を再構築）
    regionSelect.value=c.region;
    regionSelect.onchange?.();

    countrySelect.value=c.country;
    countrySelect.onchange?.();

    // 現行実装：citySelect の value は city.name
    citySelect.value=c.name;

    if(citySearch) citySearch.value=cityLabel(c);
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
      sub.textContent=`${countryLabel(c)} / ${c.region||''}${c.countryCode?(' / '+c.countryCode):''}`;

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
      const q = citySearch.value || '';
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
   regionSelect.innerHTML=`<option value="">${lang==="jp"?"地域":"Region"}</option>`
   ;[...new Set(cities.map(c=>c.region))].forEach(r=>{
    const label=lang==="jp"?r:r
    regionSelect.add(new Option(label,r))
   })
   countrySelect.innerHTML=`<option value="">${lang==="jp"?"国":"Country"}</option>`
   citySelect.innerHTML=`<option value="">${lang==="jp"?"都市":"City"}</option>`
  }
  
  regionSelect.onchange=()=>{
   countrySelect.innerHTML=`<option value="">${lang==="jp"?"国":"Country"}</option>`
   citySelect.innerHTML=`<option value="">${lang==="jp"?"都市":"City"}</option>`
   cities.filter(c=>c.region===regionSelect.value)
    .map(c=>c.country).filter((v,i,a)=>a.indexOf(v)===i)
    .forEach(code=>{
     const c=cities.find(x=>x.country===code)
     const label=lang==="jp"?c.country_jp:c.country
     countrySelect.add(new Option(label,code))
    })
  }
  
  countrySelect.onchange=()=>{
   citySelect.innerHTML=`<option value="">${lang==="jp"?"都市":"City"}</option>`
   cities.filter(c=>c.country===countrySelect.value)
    .forEach(c=>{
     const label=lang==="jp"?c.name_jp:c.name
     citySelect.add(new Option(label,c.name))
    })
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
   updateObsUI();
  }
  
  /* ===== マーカー ===== */
  let currentMarker
  let curSize=localStorage.getItem("curSize")||20
  let pastColor=localStorage.getItem("pastColor")||"#ff3333"
  let currentColor=localStorage.getItem("currentColor")||"#00ffff"
  currentMarkerSize.value=curSize
  if (pastMarkerColor) pastMarkerColor.value=pastColor
  if (lineColorInput) lineColorInput.value=lineColor
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
   const city=cities.find(c=>c.name===citySelect.value)
   if(!city)return

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
    updateObsUI();
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
  }

  if (currentMarkerColorInput) currentMarkerColorInput.oninput=e=>{
   currentColor=e.target.value
   localStorage.setItem("currentColor",currentColor)
   // 最新マーカーの色を更新
   if(markers.length) markers.at(-1).setStyle({fillColor:currentColor})
   // 現在地マーカー（脈動）も更新
   if(history.length) addCurrent(history.at(-1))
  }
showLocation.onchange=e=>{


  // OBS overlay controls
  updateObsUI();

  if(showRouteOverlay){
    showRouteOverlay.onchange = (e) => { localStorage.setItem(OVERLAY_SHOW_KEY, e.target.checked ? '1' : '0'); updateObsUI(); };
  }
  if(overlayFontSize){
    overlayFontSize.oninput = (e) => { localStorage.setItem(OVERLAY_SIZE_KEY, String(e.target.value)); updateObsUI(); };
  }
  if(overlayFlagSize){
    overlayFlagSize.oninput = (e) => { localStorage.setItem(OVERLAY_FLAG_KEY, String(e.target.value)); updateObsUI(); };
  }
  if(overlayOnlyInStream){
    overlayOnlyInStream.onchange = (e) => { localStorage.setItem(OVERLAY_ONLY_STREAM_KEY, e.target.checked ? '1' : '0'); updateObsUI(); };
  }
  if(obsSafeFrame){
    obsSafeFrame.onchange = (e) => { localStorage.setItem(SAFE_FRAME_KEY, e.target.checked ? '1' : '0'); updateObsUI(); };
  }
   currentLocation.style.display=e.target.checked?"flex":"none"
  }
  
  streamBtn.onclick=()=>setStreaming(!isStreaming())
  
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape"){ setStreaming(false); return; }
    if(e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey && !e.altKey){ setStreaming(!isStreaming()); return; }
    if(e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey){
      const s = getOverlaySettings();
      localStorage.setItem(OVERLAY_SHOW_KEY, s.show ? '0' : '1');
      updateObsUI();
      return;
    }
  });
  
  
  /* ===== 現在地表示（サイズ調整） ===== */
  const locFontKey = "locFontSize";
  const locFlagKey = "locFlagSize";
  const locPadKey  = "locPadding";
  
  let locFont = parseInt(localStorage.getItem(locFontKey) || "18", 10);
  let locFlag = parseInt(localStorage.getItem(locFlagKey) || "24", 10);
  let locPad  = parseInt(localStorage.getItem(locPadKey)  || "10", 10);
  
  function applyCurrentLocationStyle(){
    // テロップ全体
    currentLocation.style.fontSize = locFont + "px";
    currentLocation.style.padding  = locPad + "px " + (locPad * 1.8) + "px";
  
    // 旗
    flag.style.width  = locFlag + "px";
    flag.style.height = Math.round(locFlag * 0.65) + "px"; // 旗っぽい比率
    flag.style.objectFit = "cover";
    
    // テキスト（必要なら個別調整も可能）
    currentText.style.lineHeight = "1.1";
  }
  
  // UI初期値を反映
  locFontSize.value = locFont;
  locFlagSize.value = locFlag;
  locPadding.value  = locPad;
  applyCurrentLocationStyle();
  
  // 変更イベント
  locFontSize.oninput = (e) => {
    locFont = parseInt(e.target.value, 10);
    localStorage.setItem(locFontKey, String(locFont));
    applyCurrentLocationStyle();
  };
  
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
  
  
  /* ===== ドラッグ ===== */
  let drag=false,dx,dy
  const pos=JSON.parse(localStorage.getItem("locUI"))
  if(pos){
   currentLocation.style.left=pos.x+"px"
   currentLocation.style.top=pos.y+"px"
   currentLocation.style.transform="none"
  }
  
  currentLocation.onmousedown=e=>{
   drag=true
   dx=e.clientX-currentLocation.offsetLeft
   dy=e.clientY-currentLocation.offsetTop
  }
  document.onmousemove=e=>{
   if(!drag)return
   currentLocation.style.left=e.clientX-dx+"px"
   currentLocation.style.top=e.clientY-dy+"px"
  }
  document.onmouseup=()=>{
   if(!drag)return
   drag=false
   localStorage.setItem("locUI",JSON.stringify({
    x:currentLocation.offsetLeft,
    y:currentLocation.offsetTop
   }))
  }
  
  

  
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

// Service Worker（PWA）
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
  }
})();