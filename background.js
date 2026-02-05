// デフォルトのドメイン
const DEFAULT_DOMAINS = ['lms.salesio-sp.ac.jp'];

// ドメインリストを取得
function getDomains(callback) {
  chrome.storage.sync.get(['domains'], function(result) {
    const domains = result.domains || DEFAULT_DOMAINS;
    callback(domains);
  });
}

// URLフィルターを生成
function generateUrlFilters(domains) {
  const filters = [];
  domains.forEach(domain => {
    filters.push({ hostContains: domain });
  });
  return filters;
}

// content scriptを動的に登録
async function registerContentScripts(domains) {
  try {
    // 既存の動的content scriptを削除
    await chrome.scripting.unregisterContentScripts();
    
    // 権限があるドメインのみフィルタリング
    const allowedDomains = [];
    
    for (const domain of domains) {
      const hasPermission = await chrome.permissions.contains({
        origins: [`https://${domain}/*`]
      });
      
      if (hasPermission) {
        allowedDomains.push(domain);
      }
    }
    
    if (allowedDomains.length === 0) {
      console.log('権限のあるドメインがありません');
      return;
    }
    
    // 新しいcontent scriptを登録
    const matches = allowedDomains.map(domain => `https://${domain}/*`);
    
    await chrome.scripting.registerContentScripts([{
      id: 'webclass-modifier',
      matches: matches,
      js: ['content.js'],
      runAt: 'document_start',
      allFrames: true
    }]);
    
    console.log('Content scripts registered for:', allowedDomains);
  } catch (error) {
    console.error('Content script登録エラー:', error);
  }
}

// リスナーを設定
function setupListeners() {
  // 既存のリスナーを削除
  if (chrome.webNavigation.onCompleted.hasListener(onCompletedListener)) {
    chrome.webNavigation.onCompleted.removeListener(onCompletedListener);
  }
  if (chrome.webNavigation.onBeforeNavigate.hasListener(onBeforeNavigateListener)) {
    chrome.webNavigation.onBeforeNavigate.removeListener(onBeforeNavigateListener);
  }

  // ドメインを取得してリスナーを追加
  getDomains(function(domains) {
    const urlFilters = generateUrlFilters(domains);
    
    try {
      chrome.webNavigation.onCompleted.addListener(
        onCompletedListener,
        { url: urlFilters }
      );
    } catch (error) {
      console.error('onCompletedリスナー設定エラー:', error);
    }
    
    try {
      chrome.webNavigation.onBeforeNavigate.addListener(onBeforeNavigateListener);
    } catch (error) {
      console.error('onBeforeNavigateリスナー設定エラー:', error);
    }
    
    // content scriptも再登録
    registerContentScripts(domains);
  });
}

// onCompletedリスナー
function onCompletedListener(details) {
  try {
    if (details.frameId === 0) {
      // content scriptが既に登録されているので、
      // 必要に応じて追加の処理を行う
      console.log('Page completed:', details.url);
    }
  } catch (error) {
    console.error('onCompletedエラー:', error);
  }
}

// onBeforeNavigateリスナー
function onBeforeNavigateListener(details) {
  try {
    getDomains(function(domains) {
      const matchesDomain = domains.some(domain => details.url.includes(domain));
      if (matchesDomain) {
        console.log('ナビゲーション検出: ' + details.url);
      }
    });
  } catch (error) {
    console.error('onBeforeNavigateエラー:', error);
  }
}

// 初期化
setupListeners();

// オプション画面からのメッセージを受信
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'updatePermissions') {
    // リスナーを再設定
    setupListeners();
    sendResponse({ success: true });
  }
});

// 拡張機能インストール時にデフォルト値を設定
chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.sync.get(['domains'], function(result) {
    if (!result.domains) {
      chrome.storage.sync.set({ domains: DEFAULT_DOMAINS });
    }
  });
  setupListeners();
});

// 権限変更を監視
chrome.permissions.onAdded.addListener(function(permissions) {
  console.log('権限が追加されました:', permissions);
  setupListeners();
});

chrome.permissions.onRemoved.addListener(function(permissions) {
  console.log('権限が削除されました:', permissions);
  setupListeners();
});