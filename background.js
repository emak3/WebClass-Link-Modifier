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
  });
}

// onCompletedリスナー
function onCompletedListener(details) {
  try {
    if (details.frameId === 0) {
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        files: ['content.js']
      }).catch(function(error) {
        console.error('スクリプト実行エラー:', error);
      });
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