// OBS Overlay settings (stored in localStorage for overlay.html)
(function(){
  'use strict';
  const pairs = [
    ['ovCardBg','tmOv_cardBg','rgba72'],
    ['ovCardBorder','tmOv_cardBorder','rgba18'],
    ['ovCardBorderW','tmOv_cardBorderW','raw'],
    ['ovText','tmOv_text','rgba96'],
    ['ovMuted','tmOv_muted','rgba72'],
    ['ovFrom','tmOv_from','hex'],
    ['ovTo','tmOv_to','hex'],
    ['ovFlagW','tmOv_flagW','raw'],
    ['ovCountrySize','tmOv_countrySize','raw'],
    ['ovCitySize','tmOv_citySize','raw'],
    ['ovCityLH','tmOv_cityLH','raw'],
    ['ovDistanceSize','tmOv_distanceSize','raw'],
    ['ovRowGap','tmOv_rowGap','raw'],
    ['ovRowMY','tmOv_rowMY','raw']
  ];
  function hexToRgba(hex, a){
    const h = String(hex||'').replace('#','');
    if(h.length!==6) return '';
    const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function saveOne(id, key, mode){
    const el=document.getElementById(id);
    if(!el) return;
    let v=el.value;
    if(el.type==='color'){
      if(mode==='rgba72') v = hexToRgba(v, 0.72);
      else if(mode==='rgba96') v = hexToRgba(v, 0.96);
      else if(mode==='rgba18') v = hexToRgba(v, 0.18);
    }
    try{ localStorage.setItem(key, String(v)); }catch(_){ }
  }
  function bind(){
    pairs.forEach(([id,key,mode])=>{
      const el=document.getElementById(id);
      if(!el) return;
      const h=()=>saveOne(id,key,mode);
      el.addEventListener('input', h);
      el.addEventListener('change', h);
    });
  }
  function init(){ bind(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
