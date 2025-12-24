
// ===== Travel Map app.js (FULL MERGED / countryCode unified) =====
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);

  // ==== UI ====
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
  const streamBtn      = $('streamBtn');

  const showLocation   = $('showLocation');
  const currentLocation= $('currentLocation');
  const flag           = $('flag');
  const currentText    = $('currentText');
  const currentCountry = $('currentCountry');
  const currentCity    = $('currentCity');

  // ==== MAP ====
  const map = L.map("map",{zoomControl:false}).setView([20,0],2);
  const tileLayers={
    osm:L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
    bw:L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"),
    sat:L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"),
    topo:L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png")
  };
  let currentTile = tileLayers.osm;
  currentTile.addTo(map);

  // ==== DATA ====
  let cities=[];
  let history = JSON.parse(localStorage.getItem("travelHistory")) || [];
  let markers=[], points=[];
  let line = L.polyline([], {color:"#ff3333", weight:4}).addTo(map);
  let currentMarker;
  let lang="jp";

  fetch("cities.json").then(r=>r.json()).then(j=>{
    cities=j;
    buildRegion();
    restore();
    setupCitySearch();
  });

  // ==== LABEL ====
  const cityLabel = c => lang==="jp" ? (c.name_jp||c.name) : (c.name||c.name_jp);
  const countryLabel = c => lang==="jp" ? (c.country_jp||c.country) : (c.country||c.country_jp);

  // ==== REGION ====
  function buildRegion(){
    regionSelect.innerHTML = `<option value="">${lang==="jp"?"地域":"Region"}</option>`;
    [...new Set(cities.map(c=>c.region))].forEach(r=>{
      regionSelect.add(new Option(r,r));
    });
    countrySelect.innerHTML = `<option value="">${lang==="jp"?"国":"Country"}</option>`;
    citySelect.innerHTML = `<option value="">${lang==="jp"?"都市":"City"}</option>`;
  }

  // ==== REGION → COUNTRY (countryCode) ====
  regionSelect.onchange = () => {
    countrySelect.innerHTML = `<option value="">${lang==="jp"?"国":"Country"}</option>`;
    citySelect.innerHTML = `<option value="">${lang==="jp"?"都市":"City"}</option>`;

    const mapByCode = {};
    cities.filter(c=>c.region===regionSelect.value)
      .forEach(c=>{
        if(!mapByCode[c.countryCode]) mapByCode[c.countryCode]=c;
      });

    Object.values(mapByCode).forEach(c=>{
      countrySelect.add(new Option(countryLabel(c), c.countryCode));
    });
  };

  // ==== COUNTRY → CITY ====
  countrySelect.onchange = () => {
    citySelect.innerHTML = `<option value="">${lang==="jp"?"都市":"City"}</option>`;
    cities.filter(c=>c.countryCode===countrySelect.value)
      .forEach(c=>{
        citySelect.add(new Option(cityLabel(c), c.name));
      });
  };

  // ==== SEARCH ====
  function setupCitySearch(){
    if(!citySearch) return;
    citySearch.addEventListener("input",()=>{
      const q = citySearch.value.toLowerCase();
      cityResults.innerHTML="";
      if(!q) return;
      cities.filter(c=>
        cityLabel(c).toLowerCase().includes(q) ||
        countryLabel(c).toLowerCase().includes(q) ||
        c.countryCode.toLowerCase().includes(q)
      ).slice(0,30).forEach(c=>{
        const d=document.createElement("div");
        d.className="city-item";
        d.textContent = `${cityLabel(c)} / ${countryLabel(c)}`;
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

  // ==== ADD ====
  addBtn.onclick = () => {
    const city = cities.find(c=>c.name===citySelect.value);
    if(!city) return;
    if(history.length && history.at(-1).name===city.name) return;

    if(markers.length) markers.at(-1).setStyle({fillColor:"#ff3333"});

    const m = L.circleMarker([city.lat, city.lon],{
      radius:8,color:"#fff",fillColor:"#00ffff",fillOpacity:1
    }).addTo(map);

    markers.push(m);
    points.push([city.lat, city.lon]);
    line.setLatLngs(points);

    history.push(city);
    localStorage.setItem("travelHistory", JSON.stringify(history));

    addCurrent(city);
    map.setView([city.lat, city.lon],5);
  };

  undoBtn.onclick = () => {
    if(!history.length) return;
    history.pop();
    localStorage.setItem("travelHistory", JSON.stringify(history));
    map.removeLayer(markers.pop());
    points.pop();
    line.setLatLngs(points);
    if(history.length) addCurrent(history.at(-1));
  };

  function addCurrent(city){
    if(currentMarker) map.removeLayer(currentMarker);
    currentMarker = L.marker([city.lat, city.lon]).addTo(map);
    updateCurrent(city);
  }

  function updateCurrent(city){
    currentCountry.textContent = countryLabel(city);
    currentCity.textContent = cityLabel(city);
    if(city.countryCode){
      flag.src = `https://flagcdn.com/48x36/${city.countryCode.toLowerCase()}.png`;
      flag.style.display="block";
    } else {
      flag.style.display="none";
    }
  }

  function restore(){
    history.forEach((c,i)=>{
      const m = L.circleMarker([c.lat,c.lon],{
        radius:8,color:"#fff",
        fillColor:i===history.length-1?"#00ffff":"#ff3333",
        fillOpacity:1
      }).addTo(map);
      markers.push(m);
      points.push([c.lat,c.lon]);
    });
    line.setLatLngs(points);
    if(history.length) addCurrent(history.at(-1));
  }

  // ==== LANGUAGE ====
  langBtn.onclick = () => {
    lang = lang==="jp"?"en":"jp";
    langBtn.textContent = lang==="jp"?"日本語":"English";
    buildRegion();
    if(regionSelect.value){
      regionSelect.onchange();
      if(countrySelect.value) countrySelect.onchange();
    }
    if(history.length) updateCurrent(history.at(-1));
  };

  // ==== UI ====
  showLocation.onchange = e=>{
    currentLocation.style.display = e.target.checked?"flex":"none";
  };

  streamBtn.onclick = ()=>document.body.classList.add("streaming");
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape") document.body.classList.remove("streaming");
  });

})();
