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
let isRegistering = false; // 同時実行を防ぐフラグ

async function registerContentScripts(domains) {
  // 既に登録処理中の場合は処理をスキップ
  if (isRegistering) {
    console.log('既に登録処理中です');
    return;
  }
  
  isRegistering = true;
  
  try {
    // すべての動的content scriptを削除
    try {
      const scripts = await chrome.scripting.getRegisteredContentScripts();
      const ids = scripts.map(script => script.id);
      if (ids.length > 0) {
        await chrome.scripting.unregisterContentScripts({ ids: ids });
        console.log('削除されたスクリプト:', ids);
      }
    } catch (e) {
      console.log('既存のcontent scriptはありません:', e.message);
    }
    
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
      isRegistering = false;
      return;
    }
    
    // 新しいcontent scriptを登録
    const matches = allowedDomains.map(domain => `https://${domain}/*`);
    
    await chrome.scripting.registerContentScripts([{
      id: 'webclassModifier',
      matches: matches,
      js: ['js/content.js'],
      runAt: 'document_start',
      allFrames: true
    }]);
    
    console.log('Content scripts registered for:', allowedDomains);
  } catch (error) {
    console.error('Content script登録エラー:', error);
  } finally {
    isRegistering = false;
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
  chrome.storage.sync.get([
    'domains', 'linkBehavior', 'mailBehavior', 'fileBehavior', 'webclassBehavior', 'attachmentBehavior', 'externalLinkBehavior',
    'mailWindowSize', 'fileWindowSize', 'attachmentWindowSize', 'linkWindowSize', 'webclassWindowSize', 'externalLinkWindowSize'
  ], function(result) {
    const updates = {};
    if (!result.domains) {
      updates.domains = DEFAULT_DOMAINS;
    }
    if (!result.linkBehavior) {
      updates.linkBehavior = 'sameTab'; // その他のリンク
    }
    if (!result.mailBehavior) {
      updates.mailBehavior = 'newWindow'; // メールリンク
    }
    if (!result.fileBehavior) {
      updates.fileBehavior = 'newTab'; // PDFなどのファイル
    }
    if (!result.webclassBehavior) {
      updates.webclassBehavior = 'sameTab'; // WebClassログイン画面
    }
    if (!result.attachmentBehavior) {
      updates.attachmentBehavior = 'newWindow'; // 添付資料リンク
    }
    if (!result.externalLinkBehavior) {
      updates.externalLinkBehavior = 'newTab'; // 外部リンク
    }
    if (!result.mailWindowSize) {
      updates.mailWindowSize = { width: 800, height: 600, ratio: '4:3' };
    }
    if (!result.fileWindowSize) {
      updates.fileWindowSize = { width: 1200, height: 900, ratio: '4:3' };
    }
    if (!result.attachmentWindowSize) {
      updates.attachmentWindowSize = { width: 500, height: 500, ratio: '1:1' };
    }
    if (!result.linkWindowSize) {
      updates.linkWindowSize = { width: 800, height: 600, ratio: '4:3' };
    }
    if (!result.webclassWindowSize) {
      updates.webclassWindowSize = { width: 1600, height: 898, ratio: '16:9' };
    }
    if (!result.externalLinkWindowSize) {
      updates.externalLinkWindowSize = { width: 1200, height: 900, ratio: '4:3' };
    }
    if (Object.keys(updates).length > 0) {
      chrome.storage.sync.set(updates);
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