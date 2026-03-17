/* ================================================================
   options-main.js — Initialisation entry point
   Loaded last; all other options-*.js must be loaded before this.
   ================================================================ */

document.addEventListener('DOMContentLoaded', function () {
  // content.js の設定ボタン注入と同じ方法でアイコンを解決
  var _rt = (typeof browser !== 'undefined' && browser && browser.runtime)
    ? browser.runtime : chrome.runtime;
  var brandImg = document.getElementById('opts-brand-img');
  if (brandImg) brandImg.src = _rt.getURL('icons/icon1024.png');

  var webclassImg = document.getElementById('opts-brand-webclass-img');
  if (webclassImg) webclassImg.src = _rt.getURL('icons/webclass.png');

  loadDomains();
  loadLinkBehavior();
  setupWindowSizeListeners();

  var addBtn = document.getElementById('addDomainBtn');
  var saveBtn = document.getElementById('saveBtn');

  if (addBtn) addBtn.addEventListener('click', addDomain);
  if (saveBtn) saveBtn.addEventListener('click', saveDomains);
});
