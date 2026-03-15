/* ================================================================
   options-ui.js — UI utility helpers
   ================================================================ */
/* depends on: options-constants.js */

/**
 * Show a status message below the save button.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showStatus(message, type) {
  var el = document.getElementById('statusMessage');
  if (!el) return;
  el.textContent = message;
  el.className = 'opts-status show ' + type;
  if (type !== 'info') {
    setTimeout(function () {
      el.className = 'opts-status';
    }, 5000);
  }
}
