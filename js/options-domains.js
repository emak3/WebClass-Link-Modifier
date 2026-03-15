/* ================================================================
   options-domains.js — Domain list UI
   ================================================================ */
/* depends on: options-constants.js */

/** Render the domain list from an array of strings. */
function displayDomains(domains) {
  var list = document.getElementById('domainList');
  if (!list) return;
  list.innerHTML = '';

  domains.forEach(function (domain, i) {
    var item = document.createElement('div');
    item.className = 'domain-item';
    item.innerHTML =
      '<input type="text" class="domain-input" value="' + escHtml(domain) + '" ' +
        'data-index="' + i + '" placeholder="例: lms.example.ac.jp" />' +
      '<button class="btn-remove" data-index="' + i + '" title="削除" aria-label="ドメインを削除">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
             'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M18 6L6 18M6 6l12 12"/>' +
        '</svg>' +
      '</button>';
    list.appendChild(item);
  });

  list.querySelectorAll('.btn-remove').forEach(function (btn) {
    btn.addEventListener('click', function () {
      removeDomain(parseInt(btn.dataset.index));
    });
  });
}

/** Add an empty domain entry. */
function addDomain() {
  chrome.storage.sync.get(['domains'], function (result) {
    var domains = result.domains || DEFAULT_DOMAINS.slice();
    domains.push('');
    displayDomains(domains);
  });
}

/** Remove domain at index. */
function removeDomain(index) {
  chrome.storage.sync.get(['domains'], function (result) {
    var domains = result.domains || DEFAULT_DOMAINS.slice();
    domains.splice(index, 1);
    if (domains.length === 0) domains.push('');
    displayDomains(domains);
  });
}

/** Load domains from storage and render. */
function loadDomains() {
  chrome.storage.sync.get(['domains'], function (result) {
    displayDomains(result.domains || DEFAULT_DOMAINS.slice());
  });
}

/* Helper: escape HTML to prevent injection in innerHTML */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
