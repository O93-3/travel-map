// Overlay Card (no map) - v14 hotfix
(function(){
  'use strict';
  const THEME_KEY='tmTheme';
  function $(id){ return document.getElementById(id); }

  function showError(msg){
    const el = $('cardError');
    if(!el) return;
    el.style.display='flex';
    if(msg) el.innerHTML = msg;
  }

  function getTheme(){
    try{ return localStorage.getItem(THEME_KEY) || 'neon'; }catch(_){ return 'neon'; }
  }
  function applyTheme(){ document.body.dataset.theme = getTheme(); }

  function getHistory(){
    try{ return JSON.parse(localStorage.getItem('travelHistory')||'[]') || []; }catch(_){ return []; }
  }

  function fmtKmValue(km){
    if(!isFinite(km)) return '';
    const v = Math.round(km);
    return v.toLocaleString('ja-JP');
  }

  function haversineKm(a,b){
    if(!a||!b) return NaN;
    const R=6371;
    const toRad=(x)=>x*Math.PI/180;
    const lat1=toRad(parseFloat(a.lat));
    const lon1=toRad(parseFloat(a.lon));
    const lat2=toRad(parseFloat(b.lat));
    const lon2=toRad(parseFloat(b.lon));
    if(!isFinite(lat1)||!isFinite(lon1)||!isFinite(lat2)||!isFinite(lon2)) return NaN;
    const dLat=lat2-lat1;
    const dLon=lon2-lon1;
    const s=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(s));
  }

  function flagUrl(code){
    const c=String(code||'').toLowerCase();
    if(!c) return '';
    return 'https://flagcdn.com/w80/' + c + '.png';
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

  function applyLongClass(el, limit){
    if(!el) return;
    const t = String(el.textContent||'').trim();
    if(!t){ el.classList.remove('isLong'); return; }
    if(t.length > limit) el.classList.add('isLong');
    else el.classList.remove('isLong');
  }

  function setDistance(el, km){
    if(!el) return;
    if(!isFinite(km)) { el.textContent=''; return; }
    const v = fmtKmValue(km);
    el.innerHTML = `<span class="dIcon">↔</span><span class="dLabel">直線</span><span class="dValue">${v}</span><span class="dUnit">km</span>`;
  }

  function render(){
    applyTheme();
    const lang = (function(){ try{ return (localStorage.getItem('lang')||'jp'); }catch(_){ return 'jp'; } })();

    const hist=getHistory();
    const n=hist.length;
    const from=(n>=2)?hist[n-2]:null;
    const to=(n>=1)?hist[n-1]:null;

    const toCountry=$('toCountry');
    const toCity=$('toCity');
    const fromCountry=$('fromCountry');
    const fromCity=$('fromCity');
    const toFlag=$('toFlag');
    const fromFlag=$('fromFlag');
    const dist=$('distance');
    const empty=$('emptyHint');

    if(!from || !to){
      if(empty) empty.style.display='block';
      if(dist) dist.textContent='';
      return;
    }
    if(empty) empty.style.display='none';

    if(toCountry) toCountry.textContent = labelCountry(to, lang);
    if(toCity) toCity.textContent    = labelCity(to, lang);
    if(fromCountry) fromCountry.textContent = labelCountry(from, lang);
    if(fromCity) fromCity.textContent    = labelCity(from, lang);

    // delayed shrink
    applyLongClass(toCountry, 16);
    applyLongClass(toCity, 12);
    applyLongClass(fromCountry, 16);
    applyLongClass(fromCity, 12);

    const toCode = (to && to.countryCode || '').toLowerCase();
    const fromCode = (from && from.countryCode || '').toLowerCase();
    if(toFlag){
      const u=flagUrl(toCode);
      if(u){ toFlag.src=u; toFlag.style.visibility='visible'; } else { toFlag.style.visibility='hidden'; }
    }
    if(fromFlag){
      const u=flagUrl(fromCode);
      if(u){ fromFlag.src=u; fromFlag.style.visibility='visible'; } else { fromFlag.style.visibility='hidden'; }
    }

    const km=haversineKm(from,to);
    setDistance(dist, km);

    const err = $('cardError');
    if(err) err.style.display='none';
  }

  function tick(){
    try{ render(); }
    catch(e){
      showError('カード表示エラー<br>consoleを確認してください');
      try{ console.error('overlay-card error', e); }catch(_){ }
    }
  }

  function start(){
    tick();
    setInterval(tick, 700);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.addEventListener('storage', ()=>{ tick(); });
})();
