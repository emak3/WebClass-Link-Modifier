/* ================================================================
   options-constants.js — WC_CONFIG から導出する定数群
   初期値の編集は js/config.js で行ってください。
   ================================================================ */
/* depends on: config.js (must be loaded first) */

// ── 後方互換エイリアス ──────────────────────────────────────
var DEFAULT_DOMAINS   = WC_CONFIG.defaults.domains.slice();
var DEFAULT_SETTINGS  = (function () {
  var s = {};
  // behavior キーをそのままコピー
  Object.keys(WC_CONFIG.defaults.behaviors).forEach(function (k) {
    s[k] = WC_CONFIG.defaults.behaviors[k];
  });
  // windowSize は "<prefix>WindowSize" のキー名に変換して格納
  Object.keys(WC_CONFIG.defaults.windowSizes).forEach(function (prefix) {
    s[prefix + 'WindowSize'] = WC_CONFIG.defaults.windowSizes[prefix];
  });
  return s;
}());

// オプションページが behavior ラジオを操作するためのキー一覧
var BEHAVIOR_KEYS = Object.keys(WC_CONFIG.defaults.behaviors);

// ウィンドウサイズ設定のプレフィックス一覧
var WS_PREFIXES = Object.keys(WC_CONFIG.defaults.windowSizes);

// prefix → storage キー名のマップ（例: 'mail' → 'mailWindowSize'）
var WS_KEY_MAP = (function () {
  var m = {};
  WS_PREFIXES.forEach(function (p) { m[p] = p + 'WindowSize'; });
  return m;
}());