document.addEventListener("DOMContentLoaded", () => {
"use strict";
const $=id=>document.getElementById(id);

/* MAP */
const map=L.map("map",{zoomControl:false}).setView([20,0],2);
const tiles={
 osm:L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
 bw:L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"),
 sat:L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"),
 topo:L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png")
};
let currentTile=tiles.osm; currentTile.addTo(map);

/* DATA */
let cities=[],lang="jp";
let history=JSON.parse(localStorage.getItem("travelHistory"))||[];
let markers=[],points=[];
let routeLine=L.polyline([], {color:"#ff3333",weight:4}).addTo(map);
let currentMarker=null;

/* LOAD */
fetch("cities.json").then(r=>r.json()).then(j=>{
 cities=j; buildRegion(); restore();
});

/* LABEL */
const cityLabel=c=>lang==="jp"?(c.name_jp||c.name):(c.name||c.name_jp);
const countryLabel=c=>lang==="jp"?(c.country_jp||c.country):(c.country||c.country_jp);

/* REGION */
function buildRegion(){
 $("regionSelect").innerHTML='<option value="">地域</option>';
 [...new Set(cities.map(c=>c.region))].forEach(r=>$("regionSelect").add(new Option(r,r)));
 $("countrySelect").innerHTML='<option value="">国</option>';
 $("citySelect").innerHTML='<option value="">都市</option>';
}

$("regionSelect").onchange=()=>{
 $("countrySelect").innerHTML='<option value="">国</option>';
 $("citySelect").innerHTML='<option value="">都市</option>';
 const m={};
 cities.filter(c=>c.region===$("regionSelect").value)
  .forEach(c=>{if(!m[c.countryCode])m[c.countryCode]=c;});
 Object.values(m).forEach(c=>$("countrySelect").add(new Option(countryLabel(c),c.countryCode)));
};

$("countrySelect").onchange=()=>{
 $("citySelect").innerHTML='<option value="">都市</option>';
 cities.filter(c=>c.countryCode===$("countrySelect").value)
  .forEach(c=>$("citySelect").add(new Option(cityLabel(c),c.name)));
};

/* SEARCH */
$("citySearch").oninput=()=>{
 const q=$("citySearch").value.toLowerCase();
 $("cityResults").innerHTML="";
 if(!q)return;
 cities.filter(c=>
  cityLabel(c).toLowerCase().includes(q)||
  countryLabel(c).toLowerCase().includes(q)||
  c.countryCode.toLowerCase().includes(q)
 ).slice(0,30).forEach(c=>{
  const d=document.createElement("div");
  d.className="city-item";
  d.textContent=`${cityLabel(c)} / ${countryLabel(c)}`;
  d.onclick=()=>{
   $("regionSelect").value=c.region; $("regionSelect").onchange();
   $("countrySelect").value=c.countryCode; $("countrySelect").onchange();
   $("citySelect").value=c.name;
   $("citySearch").value=""; $("cityResults").innerHTML="";
  };
  $("cityResults").appendChild(d);
 });
};

/* ADD / UNDO */
$("addBtn").onclick=()=>{
 const city=cities.find(c=>c.name===$("citySelect").value);
 if(!city)return;
 const m=L.circleMarker([city.lat,city.lon],{
  radius:Number($("currentMarkerSize").value||8),
  color:"#fff",
  fillColor:$("currentMarkerColor").value,
  fillOpacity:1
 }).addTo(map);
 markers.push(m); points.push([city.lat,city.lon]);
 routeLine.setLatLngs(points);
 history.push(city);
 localStorage.setItem("travelHistory",JSON.stringify(history));
 setCurrent(city); map.setView([city.lat,city.lon],5);
};

$("undoBtn").onclick=()=>{
 if(!history.length)return;
 history.pop(); localStorage.setItem("travelHistory",JSON.stringify(history));
 map.removeLayer(markers.pop());
 points.pop(); routeLine.setLatLngs(points);
 if(history.length)setCurrent(history.at(-1));
};

function setCurrent(city){
 if(currentMarker)map.removeLayer(currentMarker);
 currentMarker=L.marker([city.lat,city.lon]).addTo(map);
 $("currentCountry").textContent=countryLabel(city);
 $("currentCity").textContent=cityLabel(city);
 $("flag").src=`https://flagcdn.com/48x36/${city.countryCode.toLowerCase()}.png`;
}

/* RESTORE */
function restore(){
 history.forEach(c=>{
  const m=L.circleMarker([c.lat,c.lon],{
   radius:8,color:"#fff",fillColor:"#ff3333",fillOpacity:1
  }).addTo(map);
  markers.push(m); points.push([c.lat,c.lon]);
 });
 routeLine.setLatLngs(points);
 if(history.length)setCurrent(history.at(-1));
}

/* UI */
$("mapStyleSelect").onchange=()=>{
 map.removeLayer(currentTile);
 currentTile=tiles[$("mapStyleSelect").value];
 currentTile.addTo(map);
};
$("lineColor").oninput=e=>routeLine.setStyle({color:e.target.value});
$("pastMarkerColor").oninput=e=>markers.forEach(m=>m.setStyle({fillColor:e.target.value}));
$("locFontSize").oninput=e=>$("currentLocation").style.fontSize=e.target.value+"px";
$("locFlagSize").oninput=e=>$("flag").style.width=e.target.value+"px";
$("locPadding").oninput=e=>$("currentLocation").style.padding=e.target.value+"px";
$("showLocation").onchange=e=>$("currentLocation").style.display=e.target.checked?"flex":"none";

$("langBtn").onclick=()=>{
 lang=lang==="jp"?"en":"jp";
 $("langBtn").textContent=lang==="jp"?"日本語":"English";
 buildRegion(); if($("regionSelect").value)$("regionSelect").onchange();
};

$("streamBtn").onclick=()=>document.body.classList.add("streaming");
document.addEventListener("keydown",e=>{
 if(e.key==="Escape")document.body.classList.remove("streaming");
});
});
