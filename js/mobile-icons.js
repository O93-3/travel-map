
// Mobile bar: iconize buttons and wire actions (non-invasive)
(function(){
  'use strict';
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(function(){
    var body = document.body;
    var ui = document.getElementById('ui');
    if(!ui) return;

    var bar = document.getElementById('mobileBar');
    if(!bar){
      bar = document.createElement('div');
      bar.id = 'mobileBar';
      document.body.appendChild(bar);
    }
    // Render icon buttons (accessible labels)
    bar.innerHTML = '<div class="mb-left">'
      + '<span class="mb-title">TRAVEL MAP</span>'
      + '<button id="toggleCompact" class="icon-btn" type="button" aria-pressed="false" aria-label="コンパクト表示の切替">'
      +   '<span class="ico compact" aria-hidden="true"></span>'
      +   '<span class="lbl">コンパクト</span>'
      + '</button>'
      + '<button id="toggleMenu" class="icon-btn" type="button" aria-pressed="false" aria-label="メニューの表示切替">'
      +   '<span class="ico menu" aria-hidden="true"></span>'
      +   '<span class="lbl">メニュー</span>'
      + '</button>'
      + '</div>';

    var btnCompact = document.getElementById('toggleCompact');
    var btnMenu = document.getElementById('toggleMenu');

    if(btnCompact){
      btnCompact.addEventListener('click', function(){
        body.classList.toggle('compact');
        var pressed = body.classList.contains('compact');
        btnCompact.setAttribute('aria-pressed', String(pressed));
      });
    }
    if(btnMenu){
      btnMenu.addEventListener('click', function(){
        var hidden = ui.style.display === 'none';
        ui.style.display = hidden ? '' : 'none';
        btnMenu.setAttribute('aria-pressed', String(!hidden));
      });
    }

    // Mobile initial state
    try {
      if(window.matchMedia('(max-width: 640px)').matches){
        body.classList.add('compact');
        var groups = ui.querySelectorAll('details.ui-group');
        groups.forEach(function(d){ d.open = false; });
        if(btnCompact) btnCompact.setAttribute('aria-pressed','true');
      }
    } catch(_){}
  });
})();
