/* ================================================================
   icons.js — SVG アイコンレジストリ
   ================================================================

   【使い方①】HTML に data-icon 属性を書くだけ（推奨）
   -------------------------------------------------------
   <span data-icon="mail"></span>
   <span data-icon="mail" data-size="20"></span>
   <span data-icon="mail" data-size="20" data-stroke="2.5" aria-hidden="true"></span>

   DOMContentLoaded 時に自動で SVG に置き換えます。
   aria-hidden はそのまま引き継がれます。

   【使い方②】JS から SVG 文字列を取得
   -------------------------------------------------------
   const svg = WcIcons.get('mail');              // 14px, stroke 2
   const svg = WcIcons.get('mail', 20);          // サイズ指定
   const svg = WcIcons.get('check', 14, 2.5);   // stroke-width 指定

   【属性一覧】
   -------------------------------------------------------
   data-icon   : アイコン名（必須）
   data-size   : px 数値（省略時 14）
   data-stroke : stroke-width（省略時 2）

   【アイコン一覧】
   -------------------------------------------------------
   汎用:
     info            情報 (i マーク円)
     info-circle     情報 (テキスト付き i)
     alert-triangle  警告三角
     check           チェック (チェックボックス付き)
     check-circle    チェック円
     x               ✕ 閉じる
     plus            ＋ 追加
     chevron-down    下向き山形
     shield          シールド (プライバシーバッジ)
     clock           時計
     circle-dot      小円＋縦線 (使用目的)

   リンク種別:
     mail            メール封筒
     file            ファイル
     paperclip       添付ファイル
     lock            南京錠 (WebClass ログイン)
     book            本 (授業リンク)
     external-link   外部リンク
     bell            お知らせ
     globe           ドメイン / 地球

   開き方オプション:
     new-tab         新しいタブ
     new-window      サブウィンドウ
     same-tab        同じタブ

   UI:
     save            保存 (フロッピー)
     user            ユーザー
     users           複数ユーザー
     tool            ツール / 設定
     link            リンク鎖
   ================================================================ */

'use strict';

var WcIcons = (function () {

  /* ── パス定義 ─────────────────────────────────────────────────
     各値は <svg> タグの中身（子要素）のみ。
     get() が viewBox・stroke 属性などを付与した <svg> で包む。
  ──────────────────────────────────────────────────────────────── */
  var PATHS = {

    /* ─── 汎用 ─── */
    'info':
      '<circle cx="12" cy="12" r="10"/>' +
      '<line x1="12" y1="16" x2="12" y2="12"/>' +
      '<line x1="12" y1="8" x2="12.01" y2="8"/>',

    'info-circle':
      '<circle cx="12" cy="12" r="10"/>' +
      '<path d="M12 16v-4m0-4h.01"/>',

    'alert-triangle':
      '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>' +
      '<line x1="12" y1="9" x2="12" y2="13"/>' +
      '<line x1="12" y1="17" x2="12.01" y2="17"/>',

    'check':
      '<polyline points="9 11 12 14 22 4"/>' +
      '<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',

    'check-circle':
      '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>' +
      '<polyline points="22 4 12 14.01 9 11.01"/>',

    'x':
      '<path d="M18 6L6 18M6 6l12 12"/>',

    'plus':
      '<line x1="12" y1="5" x2="12" y2="19"/>' +
      '<line x1="5" y1="12" x2="19" y2="12"/>',

    'chevron-down':
      '<polyline points="6 9 12 15 18 9"/>',

    'shield':
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',

    'clock':
      '<circle cx="12" cy="12" r="10"/>' +
      '<path d="M12 6v6l4 2"/>',

    'circle-dot':
      '<circle cx="12" cy="12" r="3"/>' +
      '<path d="M12 1v6m0 6v6"/>',

    /* ─── リンク種別 ─── */
    'mail':
      '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>' +
      '<polyline points="22,6 12,13 2,6"/>',

    'file':
      '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>' +
      '<polyline points="13 2 13 9 20 9"/>',

    'paperclip':
      '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',

    'lock':
      '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>' +
      '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>',

    'book':
      '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>' +
      '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',

    'external-link':
      '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
      '<polyline points="15 3 21 3 21 9"/>' +
      '<line x1="10" x2="21" y1="14" y2="3"/>',

    'bell':
      '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>' +
      '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>',

    'globe':
      '<circle cx="12" cy="12" r="10"/>' +
      '<line x1="2" y1="12" x2="22" y2="12"/>' +
      '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',

    /* ─── 開き方オプション ─── */
    'new-tab':
      '<line x1="15" x2="15" y1="12" y2="18"/>' +
      '<line x1="12" x2="18" y1="15" y2="15"/>' +
      '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>' +
      '<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',

    'new-window':
      '<rect x="2" y="4" width="20" height="16" rx="2"/>' +
      '<path d="M10 4v4"/>' +
      '<path d="M2 8h20"/>' +
      '<path d="M6 4v4"/>',

    'same-tab':
      '<rect width="18" height="18" x="3" y="3" rx="2"/>' +
      '<path d="M8 12h8"/>' +
      '<path d="M12 8v8"/>',

    /* ─── UI / ナビ ─── */
    'save':
      '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>' +
      '<path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/>' +
      '<path d="M7 3v4a1 1 0 0 0 1 1h7"/>',

    'user':
      '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>' +
      '<circle cx="12" cy="7" r="4"/>',

    'users':
      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>' +
      '<circle cx="9" cy="7" r="4"/>' +
      '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>' +
      '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>',

    'tool':
      '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',

    'link':
      '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
      '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  };

  /* ── SVG 文字列生成 ──────────────────────────────────────────
     @param {string} name        - アイコン名（PATHS のキー）
     @param {number} [size=14]   - 幅・高さ px
     @param {number} [stroke=2]  - stroke-width
     @returns {string} <svg>...</svg>。未知の名前は空文字を返す。
  ──────────────────────────────────────────────────────────────── */
  function get(name, size, stroke) {
    var paths = PATHS[name];
    if (!paths) {
      console.warn('[WcIcons] unknown icon: "' + name + '"');
      return '';
    }
    var s  = size   || 14;
    var sw = stroke || 2;
    return (
      '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24"' +
      ' fill="none" stroke="currentColor"' +
      ' stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' +
      paths +
      '</svg>'
    );
  }

  /* ── DOM への自動注入 ─────────────────────────────────────────
     対象: [data-icon] を持つ任意の要素
     inject(element) で部分的な再注入も可能（動的追加要素に使う）
  ──────────────────────────────────────────────────────────────── */
  function inject(root) {
    var targets = (root || document).querySelectorAll('[data-icon]');
    targets.forEach(function (el) {
      var name        = el.getAttribute('data-icon');
      var size        = parseInt(el.getAttribute('data-size'),   10) || 14;
      var strokeWidth = parseFloat(el.getAttribute('data-stroke'))   || 2;
      var ariaHidden  = el.getAttribute('aria-hidden');
      var svg         = get(name, size, strokeWidth);
      if (!svg) return;
      if (ariaHidden !== null) {
        svg = svg.replace('<svg ', '<svg aria-hidden="' + ariaHidden + '" ');
      }
      el.innerHTML = svg;
    });
  }

  /* ── 公開 API ──────────────────────────────────────────────── */
  return {
    get:    get,
    inject: inject,
    list:   function () { return Object.keys(PATHS); },
  };

})();

/* ── グローバルスタイル注入 ───────────────────────────────────────
   [data-icon] を持つ要素を inline-flex にして SVG を縦中央揃えにする。
   これにより、テキストと並んだアイコンが行の中央に揃う。
   （display:inline のままだと SVG がベースラインに乗って上にずれる）
────────────────────────────────────────────────────────────────── */
(function () {
  if (document.getElementById('wc-icons-style')) return;
  var style = document.createElement('style');
  style.id = 'wc-icons-style';
  style.textContent =
    '[data-icon] {' +
    '  display: inline-flex;' +
    '  align-items: center;' +
    '  justify-content: center;' +
    '  flex-shrink: 0;' +
    '  vertical-align: middle;' +
    '}';
  (document.head || document.documentElement).appendChild(style);
})();

/* ── 自動初期化 ───────────────────────────────────────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { WcIcons.inject(); });
} else {
  WcIcons.inject();
}