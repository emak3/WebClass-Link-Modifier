/* ================================================================
   api.js — Chrome/Edge (chrome.*) + Firefox (browser.*) compatible API wrapper
   Exposes: global `WC_API`
   ================================================================ */
'use strict';

var WC_API = (function () {
  // Firefox WebExtension
  if (typeof browser !== 'undefined' && browser && browser.runtime) return browser;

  // Chromium-based (Chrome / Edge)
  if (typeof chrome !== 'undefined' && chrome) return chrome;

  return null;
}());

if (!WC_API) {
  console.error('WebClass Link Modifier: neither `browser` nor `chrome` API is available.');
}

