/* ================================================================
   options-domains.js — Domain list UI
   add/remove は DOM 上の現在値を使うのでストレージ不要。
   ================================================================ */
/* depends on: options-constants.js */

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
  domains.forEach(function (d) { appendDomainItem(d); });
  if (window.refreshAcItem) refreshAcItem(list);
}

/** 現在の DOM から値を配列で返す */
function getDomainsFromDOM() {
  var inputs = document.querySelectorAll('.domain-item .domain-input');
  var out = [];
  inputs.forEach(function (input) {
    var v = input.value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
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
    if (last) last.focus();
  }
}

/** ストレージから読み込んで描画（初回のみ） */
function loadDomains() {
  WC_API.storage.sync.get(['domains'], function (result) {
    displayDomains(result.domains || DEFAULT_DOMAINS.slice());
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