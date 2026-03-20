/* ================================================================
   background.js — Service worker
   初期値の編集は src/shared/config.js で行ってください。
   ================================================================ */
importScripts('../shared/api.js');
importScripts('../shared/config.js');

// ── ドメイン取得 ─────────────────────────────────────────────
function getDomains(callback) {
  WC_API.storage.sync.get(['domains'], function (result) {
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
      const scripts = await WC_API.scripting.getRegisteredContentScripts();
      const ids = scripts.map(s => s.id);
      if (ids.length > 0) {
        await WC_API.scripting.unregisterContentScripts({ ids });
        console.log('削除されたスクリプト:', ids);
      }
    } catch (e) {
      console.log('既存の content script はありません:', e.message);
    }

    const allowedDomains = [];
    for (const domain of domains) {
      const ok = await WC_API.permissions.contains({ origins: [`https://${domain}/*`] });
      if (ok) allowedDomains.push(domain);
    }

    if (allowedDomains.length === 0) {
      console.log('権限のあるドメインがありません');
      return;
    }

    const matches = allowedDomains.map(d => `https://${d}/*`);
    await WC_API.scripting.registerContentScripts([{
      id: 'webclassModifier',
      matches,
      // config.js / api.js を content.js より先にロードする
      js: ['src/shared/config.js', 'src/shared/api.js', 'src/content/settingsButtonStyles.js', 'src/content/settingsButton.js', 'src/content/content.js'],
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
  if (WC_API.webNavigation.onCompleted.hasListener(onCompletedListener))
    WC_API.webNavigation.onCompleted.removeListener(onCompletedListener);
  if (WC_API.webNavigation.onBeforeNavigate.hasListener(onBeforeNavigateListener))
    WC_API.webNavigation.onBeforeNavigate.removeListener(onBeforeNavigateListener);

  getDomains(function (domains) {
    try {
      WC_API.webNavigation.onCompleted.addListener(onCompletedListener,
        { url: generateUrlFilters(domains) });
    } catch (e) { console.error('onCompleted リスナー設定エラー:', e); }
    try {
      WC_API.webNavigation.onBeforeNavigate.addListener(onBeforeNavigateListener);
    } catch (e) { console.error('onBeforeNavigate リスナー設定エラー:', e); }
    registerContentScripts(domains);
  });
}

// ── 初期化 ───────────────────────────────────────────────────
setupListeners();

// ── メッセージ受信 ────────────────────────────────────────────
WC_API.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'updatePermissions') {
    setupListeners();
    sendResponse({ success: true });
  }

  if (request.action === 'openOptionsPage') {
    WC_API.runtime.openOptionsPage();
    sendResponse({ success: true });
  }
});

// ── インストール時のデフォルト設定 ────────────────────────────
WC_API.runtime.onInstalled.addListener(function () {
  var allKeys = Object.keys(WC_CONFIG.defaults.behaviors)
    .concat(Object.keys(WC_CONFIG.defaults.windowSizes).map(function (p) { return p + 'WindowSize'; }))
    .concat(['domains']);

  WC_API.storage.sync.get(allKeys, function (result) {
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

    if (Object.keys(updates).length > 0) WC_API.storage.sync.set(updates);
  });

  setupListeners();
});

// ── 権限変更の監視 ────────────────────────────────────────────
WC_API.permissions.onAdded.addListener(function (p) {
  console.log('権限追加:', p);
  setupListeners();
});
WC_API.permissions.onRemoved.addListener(function (p) {
  console.log('権限削除:', p);
  setupListeners();
});
