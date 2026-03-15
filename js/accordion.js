/* ================================================================
   accordion.js — Privacy policy page accordion
   ================================================================ */
(function () {
  'use strict';

  function openItem(item) {
    var trigger = item.querySelector('[data-ac-trigger]');
    var panel   = item.querySelector('[data-ac-panel]');
    var inner   = item.querySelector('[data-ac-inner]');
    if (!trigger || !panel || !inner) return;
    item.classList.add('is-open');
    panel.style.height = inner.offsetHeight + 'px';
    trigger.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');
  }

  function init() {
    document.querySelectorAll('[data-ac-item]').forEach(function (item) {
      var trigger = item.querySelector('[data-ac-trigger]');
      var panel   = item.querySelector('[data-ac-panel]');
      var inner   = item.querySelector('[data-ac-inner]');
      if (!trigger || !panel || !inner) return;

      trigger.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');

        if (isOpen) {
          // Lock height then animate to 0
          panel.style.height = inner.offsetHeight + 'px';
          item.classList.remove('is-open');
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              panel.style.height = '0';
            });
          });
          trigger.setAttribute('aria-expanded', 'false');
          panel.setAttribute('aria-hidden', 'true');
        } else {
          // Animate to inner height
          item.classList.add('is-open');
          panel.style.height = inner.offsetHeight + 'px';
          trigger.setAttribute('aria-expanded', 'true');
          panel.setAttribute('aria-hidden', 'false');
        }
      });
    });

    // 最初の項目を展開
    var first = document.querySelector('[data-ac-item]');
    if (first) openItem(first);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();