
// ===== Travel Map app.js (countryCode unified COMPLETE) =====
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const mapStyleSelect = $('mapStyleSelect');
  const toggleBorders  = $('toggleBorders');
  const regionSelect   = $('regionSelect');
  const countrySelect  = $('countrySelect');
  const citySelect     = $('citySelect');
  const citySearch     = $('citySearch');
  const cityResults    = $('cityResults');
  const addBtn         = $('addBtn');
  const undoBtn        = $('undoBtn');
  const langBtn        = $('langBtn');

  /* ===== 基本 ===== */
  const map = L.map("map",{zoomControl:false}).setView([20,0],2);

  const tileLayers={
    osm:L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
    bw:L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"),
    sat:L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"),
    topo:L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png")
  };

  let currentTile = tileLayers["osm"];
  currentTile.addTo(map);

  /* ===== 都市 ===== */
  let cities=[];
  let history = JSON.parse(localStorage.getItem("travelHistory")) || [];
  let lang="jp";

  fetch("cities.json").then(r=>r.json()).then(j=>{
    cities=j;
    buildRegion();
    restore();
    setupCitySearch();
  });

  /* ===== 表示ラベル ===== */
  const cityLabel = c => lang==="jp" ? (c.name_jp||c.name) : (c.name||c.name_jp);
  const countryLabel = c => lang==="jp" ? (c.country_jp||c.country) : (c.country||c.country_jp);

  /* ===== 地域 ===== */
  function buildRegion(){
    regionSelect.innerHTML =
      `<option value="">${lang==="jp"?"地域":"Region"}</option>`;

    [...new Set(cities.map(c=>c.region))].forEach(r=>{
      regionSelect.add(new Option(r,r));
    });

    countrySelect.innerHTML =
      `<option value="">${lang==="jp"?"国":"Country"}</option>`;
    citySelect.innerHTML =
      `<option value="">${lang==="jp"?"都市":"City"}</option>`;
  }

  /* ===== 地域 → 国 ===== */
  regionSelect.onchange = () => {
    countrySelect.innerHTML =
      `<option value="">${lang==="jp"?"国":"Country"}</option>`;
    citySelect.innerHTML =
      `<option value="">${lang==="jp"?"都市":"City"}</option>`;

    const mapByCode = {};
    cities
      .filter(c=>c.region===regionSelect.value)
      .forEach(c=>{
        if(!mapByCode[c.countryCode]) mapByCode[c.countryCode]=c;
      });

    Object.values(mapByCode).forEach(c=>{
      countrySelect.add(
        new Option(countryLabel(c), c.countryCode)
      );
    });
  };

  /* ===== 国 → 都市 ===== */
  countrySelect.onchange = () => {
    citySelect.innerHTML =
      `<option value="">${lang==="jp"?"都市":"City"}</option>`;

    cities
      .filter(c=>c.countryCode===countrySelect.value)
      .forEach(c=>{
        citySelect.add(
          new Option(cityLabel(c), c.name)
        );
      });
  };

  /* ===== 検索 ===== */
  function setupCitySearch(){
    if(!citySearch) return;
    citySearch.addEventListener("input",()=>{
      const q = citySearch.value.toLowerCase();
      cityResults.innerHTML="";
      if(!q) return;
      cities
        .filter(c=>
          cityLabel(c).toLowerCase().includes(q) ||
          countryLabel(c).toLowerCase().includes(q) ||
          c.countryCode.toLowerCase().includes(q)
        )
        .slice(0,30)
        .forEach(c=>{
          const d=document.createElement("div");
          d.textContent = cityLabel(c)+" / "+countryLabel(c);
          d.onclick=()=>{
            regionSelect.value=c.region;
            regionSelect.onchange();
            countrySelect.value=c.countryCode;
            countrySelect.onchange();
            citySelect.value=c.name;
            citySearch.value="";
          };
          cityResults.appendChild(d);
        });
    });
  }

  /* ===== 追加 ===== */
  addBtn.onclick = () => {
    const city = cities.find(c=>c.name===citySelect.value);
    if(!city) return;
    history.push(city);
    localStorage.setItem("travelHistory",JSON.stringify(history));
    map.setView([city.lat, city.lon],5);
  };

  /* ===== 復元 ===== */
  function restore(){
    if(history.length){
      const c = history.at(-1);
      map.setView([c.lat, c.lon],5);
    }
  }

  /* ===== 言語切替 ===== */
  langBtn.onclick = () => {
    lang = lang==="jp"?"en":"jp";
    langBtn.textContent = lang==="jp"?"日本語":"English";
    buildRegion();
    if(regionSelect.value){
      regionSelect.onchange();
      if(countrySelect.value) countrySelect.onchange();
    }
  };

})();
