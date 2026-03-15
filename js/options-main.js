/* ================================================================
   options-main.js — Initialisation entry point
   Loaded last; all other options-*.js must be loaded before this.
   ================================================================ */

document.addEventListener('DOMContentLoaded', function () {
  loadDomains();
  loadLinkBehavior();
  setupWindowSizeListeners();

  var addBtn  = document.getElementById('addDomainBtn');
  var saveBtn = document.getElementById('saveBtn');

  if (addBtn)  addBtn.addEventListener('click', addDomain);
  if (saveBtn) saveBtn.addEventListener('click', saveDomains);
});
