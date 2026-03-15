/* ================================================================
   accordion.js — Shared accordion for privacy policy & options page
   Works on any element with [data-ac-item] / [data-ac-trigger] /
   [data-ac-panel] / [data-ac-inner]
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

  function closeItem(item) {
    var trigger = item.querySelector('[data-ac-trigger]');
    var panel   = item.querySelector('[data-ac-panel]');
    var inner   = item.querySelector('[data-ac-inner]');
    if (!trigger || !panel || !inner) return;
    panel.style.height = inner.offsetHeight + 'px';
    item.classList.remove('is-open');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        panel.style.height = '0';
      });
    });
    trigger.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
  }

  function init() {
    document.querySelectorAll('[data-ac-item]').forEach(function (item) {
      var trigger = item.querySelector('[data-ac-trigger]');
      if (!trigger) return;

      trigger.addEventListener('click', function () {
        if (item.classList.contains('is-open')) {
          closeItem(item);
        } else {
          openItem(item);
        }
      });

      /* キーボードアクセシビリティ (button 以外のトリガー向け) */
      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger.click();
        }
      });
    });

    /* 各グループの最初のアイテムを展開 */
    var groups = document.querySelectorAll('.accordion, .opts-section');
    groups.forEach(function (group) {
      var first = group.querySelector('[data-ac-item]');
      if (first) openItem(first);
    });

    /* グループ外のトップレベル最初のアイテムも展開（グループなし構造の場合）*/
    var allItems = document.querySelectorAll('[data-ac-item]');
    if (groups.length === 0 && allItems.length > 0) {
      openItem(allItems[0]);
    }
  }

  /**
   * 開いているパネルの高さを内部コンテンツに合わせて再計算する。
   * @param {Element} el - [data-ac-item] の要素、またはその子孫
   */
  function refreshAcItem(el) {
    var item = el.closest('[data-ac-item]') || el;
    if (!item.classList.contains('is-open')) return;
    var panel = item.querySelector('[data-ac-panel]');
    var inner = item.querySelector('[data-ac-inner]');
    if (!panel || !inner) return;
    panel.style.height = inner.offsetHeight + 'px';
  }

  /* グローバルに公開 */
  window.refreshAcItem = refreshAcItem;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();