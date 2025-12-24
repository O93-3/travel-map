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

  const showLocation      = $('showLocation');
  const currentMarkerSize = $('currentMarkerSize');
  const locFontSize       = $('locFontSize');
  const locFlagSize       = $('locFlagSize');
  const locPadding        = $('locPadding');

  const currentLocation = $('currentLocation');
  const flag = $('flag');
  const currentText = $('currentText');

  if (!mapStyleSelect || !toggleBorders || !regionSelect || !countrySelect || !citySelect) {
    console.error('[TravelMap] required elements are missing.');
    return;
  }

  /* ===== 基本 ===== */
  const map=L.map("map",{zoomControl:false}).setView([20,0],2)
  
  const tileLayers={
   osm:L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
   bw:L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"),
   sat:L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"),
   topo:L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png")
  }
  
  let currentTile
  const savedStyle=localStorage.getItem("mapStyle")||"osm"
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
  bordersOn = (bordersOn === null) ? true : (bordersOn === "1");
  
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
  let line=L.polyline([],{
   color:"#ff3333",weight:4
  }).addTo(map)
  
  let lang="jp"
  
  fetch("cities.json").then(r=>r.json()).then(j=>{
   cities=j
   buildRegion()
   restore()
  })
  
  

  /* ===== 都市検索 ===== */
  const norm = (s) => (s ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFKC');

  function cityLabel(c){
    return lang === 'jp' ? (c.name_jp || c.name || '') : (c.name || c.name_jp || '');
  }

  function countryLabel(c){
    return lang === 'jp' ? (c.country_jp || c.country || '') : (c.country || c.country_jp || '');
  }

  function buildSearchResults(q){
    const nq = norm(q);
    if(!nq) return [];

    const scored=[];
    for(let i=0;i<cities.length;i++){
      const c=cities[i];
      const hay=[norm(c.name_jp), norm(c.name), norm(c.country_jp), norm(c.country), norm(c.countryCode)].filter(Boolean);
      let best=Infinity;
      for(const h of hay){
        if(h.startsWith(nq)) best=Math.min(best,0);
        else if(h.includes(nq)) best=Math.min(best,1);
      }
      if(best!==Infinity){
        const len=(norm(c.name_jp)||norm(c.name)||'').length;
        scored.push({i,best,len});
      }
    }
    scored.sort((a,b)=>a.best-b.best || a.len-b.len || a.i-b.i);
    return scored.slice(0,30).map(x=>x.i);
  }

  function openResults(){
    cityResults?.classList.add('open');
  }
  function closeResults(){
    cityResults?.classList.remove('open');
  }

  function applyCitySelection(idx){
    const c=cities[idx];
    if(!c) return;

    // region -> country -> city の順に反映（既存ロジックに合わせる）
    regionSelect.value = c.region;
    regionSelect.onchange?.();

    countrySelect.value = c.country;
    countrySelect.onchange?.();

    // 現行実装では citySelect.value は city.name
    citySelect.value = c.name;

    if(citySearch) citySearch.value = cityLabel(c);
  }

  function renderResults(indices){
    if(!cityResults) return;
    cityResults.innerHTML='';

    if(!indices.length){
      closeResults();
      return;
    }

    const frag=document.createDocumentFragment();
    for(const idx of indices){
      const c=cities[idx];
      const item=document.createElement('div');
      item.className='city-item';
      item.dataset.idx=String(idx);

      const main=document.createElement('div');
      main.className='main';
      main.textContent=cityLabel(c);

      const sub=document.createElement('div');
      sub.className='sub';
      sub.textContent=`${countryLabel(c)} / ${c.region || ''}${c.countryCode ? ' / ' + c.countryCode : ''}`;

      item.appendChild(main);
      item.appendChild(sub);

      item.addEventListener('click',()=>{
        applyCitySelection(Number(item.dataset.idx));
        closeResults();
      });

      item.addEventListener('dblclick',()=>{
        applyCitySelection(Number(item.dataset.idx));
        closeResults();
        addBtn?.click();
      });

      frag.appendChild(item);
    }

    cityResults.appendChild(frag);
    openResults();
  }

  function setupCitySearch(){
    if(!citySearch || !cityResults) return;

    citySearch.addEventListener('input',()=>{
      renderResults(buildSearchResults(citySearch.value));
    });

    citySearch.addEventListener('focus',()=>{
      renderResults(buildSearchResults(citySearch.value));
    });

    citySearch.addEventListener('keydown',(e)=>{
      if(e.key==='Escape'){ closeResults(); return; }
      if(e.key!=='Enter') return;

      const first=cityResults.querySelector('.city-item');
      if(!first) return;

      const idx=Number(first.dataset.idx);
      applyCitySelection(idx);
      closeResults();

      if(e.shiftKey) addBtn?.click();
      e.preventDefault();
    });

    document.addEventListener('click',(e)=>{
      if(e.target===citySearch) return;
      if(cityResults.contains(e.target)) return;
      closeResults();
    });
  }

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
  }
  
  /* ===== マーカー ===== */
  let currentMarker
  let curSize=localStorage.getItem("curSize")||20
  let pastColor=localStorage.getItem("pastColor")||"#ff3333"
  currentMarkerSize.value=curSize
  pastMarkerColor.value=pastColor
  
  function addCurrent(city){
   if(currentMarker)map.removeLayer(currentMarker)
   const icon=L.divIcon({
    className:"pulsate",
    html:`<div style="width:${curSize}px;height:${curSize}px;
    background:#00ffff;border:2px solid #fff;border-radius:50%"></div>`
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
   if(markers.length)markers.at(-1).setStyle({fillColor:pastColor})
   const m=L.circleMarker([city.lat,city.lon],{
    radius:8,color:"#fff",fillColor:"#00ffff",fillOpacity:1
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
  }
  
  function restore(){
   history.forEach((c,i)=>{
    const m=L.circleMarker([c.lat,c.lon],{
     radius:8,color:"#fff",
     fillColor:i===history.length-1?"#00ffff":pastColor,
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
  
  pastMarkerColor.oninput=e=>{
   pastColor=e.target.value
   localStorage.setItem("pastColor",pastColor)
   markers.slice(0,-1).forEach(m=>m.setStyle({fillColor:pastColor}))
  }
  
  
  showLocation.onchange=e=>{
   currentLocation.style.display=e.target.checked?"flex":"none"
  }
  
  streamBtn.onclick=()=>document.body.classList.add("streaming")
  document.addEventListener("keydown",e=>{
   if(e.key==="Escape")document.body.classList.remove("streaming")
  })
  
  
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
