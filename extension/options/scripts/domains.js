/* ================================================================
   options-domains.js — Domain list UI
   add/remove は DOM 上の現在値を使うのでストレージ不要。
   ================================================================ */
/* depends on: options-constants.js */

/**
 * ドメイン欄の入力をホスト名に揃える（URL や /webclass/ 付きを許容）
 */
function normalizeDomainHost(raw) {
  var s = String(raw || '').trim();
  if (!s) return '';

  function hostnameFromUrl(urlStr) {
    try {
      var u = new URL(urlStr);
      return (u.hostname || '').replace(/^\[|\]$/g, '');
    } catch (e) {
      return '';
    }
  }

  if (/^https?:\/\//i.test(s)) {
    var h1 = hostnameFromUrl(s);
    if (h1) return h1;
  }
  if (/^\/\//.test(s)) {
    var h2 = hostnameFromUrl('https:' + s);
    if (h2) return h2;
  }
  var h3 = hostnameFromUrl('https://' + s.replace(/^\/+/, ''));
  if (h3) return h3;

  var stripped = s.replace(/^https?:\/\//i, '');
  var hostPart = stripped.split('/')[0].split('?')[0].split('#')[0];
  hostPart = hostPart.replace(/:\d+$/, '');
  return hostPart.trim();
}

function scrollSaveBarIntoView() {
  var btn = document.getElementById('saveBtn');
  if (!btn) return;

  function viewportHeight() {
    return window.visualViewport ? window.visualViewport.height : window.innerHeight;
  }

  /** 保存ボタン下端がビューポート内に収まるまで document をスクロール */
  function doScroll() {
    var rect = btn.getBoundingClientRect();
    var vh = viewportHeight();
    var pad = 28;
    if (rect.bottom <= vh - pad) return;
    var dy = rect.bottom - (vh - pad);
    if (dy <= 0) return;
    try {
      window.scrollBy({ top: dy, left: 0, behavior: 'auto' });
    } catch (e) {
      window.scrollBy(0, dy);
    }
  }

  /* アコーディオンの高さ transition（~0.38s）後にレイアウトが確定するので複数回試行 */
  requestAnimationFrame(function () {
    requestAnimationFrame(doScroll);
  });
  setTimeout(doScroll, 0);
  setTimeout(doScroll, 100);
  setTimeout(doScroll, 400);
}

/** focusin / focusout の委譲（domainList は displayDomains で中身が差し替わっても維持される） */
function initDomainFieldBehavior() {
  var list = document.getElementById('domainList');
  if (!list || list.dataset.wclmDomainUi === '1') return;
  list.dataset.wclmDomainUi = '1';

  list.addEventListener('focusin', function (ev) {
    if (!ev.target.classList || !ev.target.classList.contains('domain-input')) return;
    requestAnimationFrame(function () {
      scrollSaveBarIntoView();
    });
  });

  list.addEventListener('focusout', function (ev) {
    if (!ev.target.classList || !ev.target.classList.contains('domain-input')) return;
    var el = ev.target;
    var norm = normalizeDomainHost(el.value);
    if (norm) {
      if (el.value.trim() !== norm) el.value = norm;
    }
  });
}

var REMOVE_SVG =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M18 6L6 18M6 6l12 12"/>' +
  '</svg>';

/** アイテム1行を生成してリストに追加する */
function appendDomainItem(value) {
  var list = document.getElementById('domainList');
  if (!list) return;

  var item = document.createElement('div');
  item.className = 'domain-item';
  item.innerHTML =
    '<input type="text" class="domain-input" value="' + escHtml(value) + '" ' +
      'placeholder="例: lms.example.ac.jp" />' +
    '<button class="btn-remove" title="削除" aria-label="ドメインを削除">' +
      REMOVE_SVG +
    '</button>';

  item.querySelector('.btn-remove').addEventListener('click', function () {
    item.remove();
    if (document.getElementById('domainList').children.length === 0) {
      appendDomainItem('');
    }
    if (window.refreshAcItem) refreshAcItem(list);
  });

  list.appendChild(item);
  if (window.refreshAcItem) refreshAcItem(list);
}

/** 初期描画 — 配列からまとめて生成 */
function displayDomains(domains) {
  var list = document.getElementById('domainList');
  if (!list) return;
  list.innerHTML = '';
  domains.forEach(function (d) {
    var host = normalizeDomainHost(d);
    appendDomainItem(host || d);
  });
  if (domains.length === 0) appendDomainItem('');
  if (window.refreshAcItem) refreshAcItem(list);
}

/** 現在の DOM から値を配列で返す */
function getDomainsFromDOM() {
  var inputs = document.querySelectorAll('.domain-item .domain-input');
  var out = [];
  inputs.forEach(function (input) {
    var v = normalizeDomainHost(input.value);
    if (v) out.push(v);
  });
  return out;
}

/** 「ドメインを追加」— ストレージを読まずに空行を追加 */
function addDomain() {
  appendDomainItem('');
  /* 追加した入力欄にフォーカス */
  var list = document.getElementById('domainList');
  if (list) {
    var last = list.querySelector('.domain-item:last-child .domain-input');
    if (last) {
      last.focus();
      requestAnimationFrame(function () { scrollSaveBarIntoView(); });
    }
  }
}

var emptyDomainsPromptShown = false;

/** ストレージから読み込んで描画（初回のみ） */
function loadDomains() {
  WC_API.storage.sync.get(['domains'], function (result) {
    var raw = result.domains;
    var domains = Array.isArray(raw) ? raw : DEFAULT_DOMAINS.slice();
    displayDomains(domains);
    if (domains.length > 0) {
      emptyDomainsPromptShown = false;
      return;
    }
    if (emptyDomainsPromptShown) return;
    emptyDomainsPromptShown = true;
    setTimeout(function () {
      try {
        alert(
          'WebClass のドメインがまだ登録されていません。\n\n' +
          '「対象ドメイン」に大学の WebClass のホスト名（例: lms.example.ac.jp）を入力し、「設定を保存」を押してください。' +
          'ブラウザの許可ダイアログではサイトへのアクセスを許可してください。'
        );
      } catch (e) { /* ignore */ }
      var list = document.getElementById('domainList');
      var first = list && list.querySelector('.domain-item .domain-input');
      if (first) {
        try {
          first.focus();
          first.select();
          requestAnimationFrame(function () { scrollSaveBarIntoView(); });
        } catch (e2) { /* ignore */ }
      }
    }, 0);
  });
}

/* Helper */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}