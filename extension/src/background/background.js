/* ================================================================
   background.js — Service worker
   初期値の編集は src/shared/config.js で行ってください。
   ================================================================ */
importScripts('../shared/config.js');

// ── ドメイン取得 ─────────────────────────────────────────────
function getDomains(callback) {
  chrome.storage.sync.get(['domains'], function (result) {
    callback(result.domains || WC_CONFIG.defaults.domains.slice());
  });
}

// ── URLフィルター生成 ─────────────────────────────────────────
function generateUrlFilters(domains) {
  return domains.map(function (domain) { return { hostContains: domain }; });
}

// ── Content script 動的登録 ──────────────────────────────────
let isRegistering = false;

async function registerContentScripts(domains) {
  if (isRegistering) { console.log('既に登録処理中です'); return; }
  isRegistering = true;

  try {
    try {
      const scripts = await chrome.scripting.getRegisteredContentScripts();
      const ids = scripts.map(s => s.id);
      if (ids.length > 0) {
        await chrome.scripting.unregisterContentScripts({ ids });
        console.log('削除されたスクリプト:', ids);
      }
    } catch (e) {
      console.log('既存の content script はありません:', e.message);
    }

    const allowedDomains = [];
    for (const domain of domains) {
      const ok = await chrome.permissions.contains({ origins: [`https://${domain}/*`] });
      if (ok) allowedDomains.push(domain);
    }

    if (allowedDomains.length === 0) {
      console.log('権限のあるドメインがありません');
      return;
    }

    const matches = allowedDomains.map(d => `https://${d}/*`);
    await chrome.scripting.registerContentScripts([{
      id: 'webclassModifier',
      matches,
      // config.js を content.js より先にロードする
      js: ['src/shared/config.js', 'src/content/content.js'],
      runAt: 'document_start',
      allFrames: true,
    }]);

    console.log('Content scripts registered for:', allowedDomains);
  } catch (error) {
    console.error('Content script 登録エラー:', error);
  } finally {
    isRegistering = false;
  }
}

// ── ナビゲーションリスナー ────────────────────────────────────
function onCompletedListener(details) {
  try {
    if (details.frameId === 0) console.log('Page completed:', details.url);
  } catch (e) { console.error('onCompleted エラー:', e); }
}

function onBeforeNavigateListener(details) {
  try {
    getDomains(function (domains) {
      if (domains.some(d => details.url.includes(d))) {
        console.log('ナビゲーション検出:', details.url);
      }
    });
  } catch (e) { console.error('onBeforeNavigate エラー:', e); }
}

function setupListeners() {
  if (chrome.webNavigation.onCompleted.hasListener(onCompletedListener))
    chrome.webNavigation.onCompleted.removeListener(onCompletedListener);
  if (chrome.webNavigation.onBeforeNavigate.hasListener(onBeforeNavigateListener))
    chrome.webNavigation.onBeforeNavigate.removeListener(onBeforeNavigateListener);

  getDomains(function (domains) {
    try {
      chrome.webNavigation.onCompleted.addListener(onCompletedListener,
        { url: generateUrlFilters(domains) });
    } catch (e) { console.error('onCompleted リスナー設定エラー:', e); }
    try {
      chrome.webNavigation.onBeforeNavigate.addListener(onBeforeNavigateListener);
    } catch (e) { console.error('onBeforeNavigate リスナー設定エラー:', e); }
    registerContentScripts(domains);
  });
}

// ── 初期化 ───────────────────────────────────────────────────
setupListeners();

// ── メッセージ受信 ────────────────────────────────────────────
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'updatePermissions') {
    setupListeners();
    sendResponse({ success: true });
  }

  if (request.action === 'openOptionsPage') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
  }
});

// ── インストール時のデフォルト設定 ────────────────────────────
chrome.runtime.onInstalled.addListener(function () {
  var allKeys = Object.keys(WC_CONFIG.defaults.behaviors)
    .concat(Object.keys(WC_CONFIG.defaults.windowSizes).map(function (p) { return p + 'WindowSize'; }))
    .concat(['domains']);

  chrome.storage.sync.get(allKeys, function (result) {
    var updates = {};

    if (!result.domains) {
      updates.domains = WC_CONFIG.defaults.domains.slice();
    }
    Object.keys(WC_CONFIG.defaults.behaviors).forEach(function (key) {
      if (!result[key]) updates[key] = WC_CONFIG.defaults.behaviors[key];
    });
    Object.keys(WC_CONFIG.defaults.windowSizes).forEach(function (prefix) {
      var key = prefix + 'WindowSize';
      if (!result[key]) updates[key] = WC_CONFIG.defaults.windowSizes[prefix];
    });

    if (Object.keys(updates).length > 0) chrome.storage.sync.set(updates);
  });

  setupListeners();
});

// ── 権限変更の監視 ────────────────────────────────────────────
chrome.permissions.onAdded.addListener(function (p) {
  console.log('権限追加:', p);
  setupListeners();
});
chrome.permissions.onRemoved.addListener(function (p) {
  console.log('権限削除:', p);
  setupListeners();
});
