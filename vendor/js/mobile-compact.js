
// Mobile compact UI toggles (non-invasive, fixed)
(function(){
  'use strict';
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(function(){
    var body = document.body;
    var ui = document.getElementById('ui');
    if(!ui) return;

    // If a mobileBar already exists in HTML, reuse it; else create one.
    var bar = document.getElementById('mobileBar');
    if(!bar){
      bar = document.createElement('div');
      bar.id = 'mobileBar';
      bar.innerHTML = '<div class="mb-left">'
        + '<span class="mb-title">TRAVEL MAP</span>'
        + '<button id="toggleCompact" type="button">コンパクト</button>'
        + '<button id="toggleMenu" type="button">メニュー表示/非表示</button>'
        + '</div>';
      document.body.appendChild(bar);
    }

    var toggleCompact = document.getElementById('toggleCompact');
    var toggleMenu = document.getElementById('toggleMenu');

    if(toggleCompact){
      toggleCompact.addEventListener('click', function(){
        body.classList.toggle('compact');
      });
    }
    if(toggleMenu){
      toggleMenu.addEventListener('click', function(){
        var isHidden = ui.style.display === 'none';
        ui.style.display = isHidden ? '' : 'none';
      });
    }

    // Mobile initial state
    try {
      if(window.matchMedia('(max-width: 640px)').matches){
        body.classList.add('compact');
        var groups = ui.querySelectorAll('details.ui-group');
        groups.forEach(function(d){ d.open = false; });
      }
    } catch(_){}
  });
})();
