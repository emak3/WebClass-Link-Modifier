// デフォルトのドメイン
const DEFAULT_DOMAINS = ['lms.salesio-sp.ac.jp'];

// 現在のページが対象ドメインかチェック
let isTargetDomain = false;
let targetDomains = []; // 設定されたドメインのリスト
let linkBehavior = 'sameTab'; // 授業リンク（course.php）専用
let mailBehavior = 'newWindow'; // メールリンク
let fileBehavior = 'newTab'; // PDFなどのファイル
let webclassBehavior = 'sameTab'; // WebClassログイン画面
let attachmentBehavior = 'newWindow'; // 添付資料リンク
let externalLinkBehavior = 'newTab'; // 外部リンク

// ウィンドウサイズ設定
let mailWindowSize = { width: 800, height: 600 };
let fileWindowSize = { width: 1200, height: 900 };
let attachmentWindowSize = { width: 500, height: 500 };
let linkWindowSize = { width: 800, height: 600 }; // 授業リンク（course.php）専用
let webclassWindowSize = { width: 1600, height: 898 };
let externalLinkWindowSize = { width: 1200, height: 900 }; // 外部リンク

chrome.storage.sync.get([
  'domains', 'linkBehavior', 'mailBehavior', 'fileBehavior', 'webclassBehavior', 'attachmentBehavior', 'externalLinkBehavior',
  'mailWindowSize', 'fileWindowSize', 'attachmentWindowSize', 'linkWindowSize', 'webclassWindowSize', 'externalLinkWindowSize'
], function(result) {
  const domains = result.domains || DEFAULT_DOMAINS;
  const currentHost = window.location.hostname;
  targetDomains = domains; // ドメインリストを保存
  linkBehavior = result.linkBehavior || 'sameTab';
  mailBehavior = result.mailBehavior || 'newWindow';
  fileBehavior = result.fileBehavior || 'newTab';
  webclassBehavior = result.webclassBehavior || 'sameTab';
  attachmentBehavior = result.attachmentBehavior || 'newWindow';
  externalLinkBehavior = result.externalLinkBehavior || 'newTab';
  
  // ウィンドウサイズ設定を読み込む
  mailWindowSize = result.mailWindowSize || { width: 800, height: 600 };
  fileWindowSize = result.fileWindowSize || { width: 1200, height: 900 };
  attachmentWindowSize = result.attachmentWindowSize || { width: 500, height: 500 };
  linkWindowSize = result.linkWindowSize || { width: 800, height: 600 };
  webclassWindowSize = result.webclassWindowSize || { width: 1600, height: 898 };
  externalLinkWindowSize = result.externalLinkWindowSize || { width: 1200, height: 900 };
  
  isTargetDomain = domains.some(domain => currentHost.includes(domain));
  
  if (isTargetDomain) {
    // 対象ドメインの場合のみ実行
    initExtension();
  }
});

function initExtension() {
  // URLが外部リンクかどうかを判定する関数
  function isExternalLink(url) {
    if (!url || url === '#' || url === 'null' || url === 'about:blank') {
      return false;
    }
    
    try {
      // 相対URLの場合は内部リンク
      if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
        return false;
      }
      
      // URLからホスト名を抽出
      let hostname;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url);
        hostname = urlObj.hostname;
      } else {
        // プロトコルがない場合は現在のドメインの相対パス
        return false;
      }
      
      // 設定されたドメインのいずれかに含まれているかチェック
      const isTargetDomain = targetDomains.some(domain => hostname.includes(domain));
      
      // 対象ドメインに含まれていなければ外部リンク
      return !isTargetDomain;
    } catch (error) {
      console.error('外部リンク判定エラー:', error);
      return false;
    }
  }

  // リンクの種類を判定
  function getLinkType(url, element) {
    // URLベースの判定を先に行う
    if (url) {
      // 授業リンク（course.php）を最優先で判定
      if (url.includes('course.php')) {
        return 'course';
      }
      
      // 添付ファイルのダウンロードURL
      if (url.includes('file_down.php') || url.includes('download') || url.includes('attach')) {
        return 'attachment';
      }
      
      // WebClassログイン画面
      if (url.includes('/webclass/login.php')) {
        return 'webclass';
      }
      
      // メールリンク判定
      if (url.includes('msg_editor.php')) {
        return 'mail';
      }
      
      // ファイルリンク
      if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)$/i.test(url)) {
        return 'file';
      }
    }
    
    // 外部リンクかどうかをチェック（特定のリンクタイプの判定の後）
    if (isExternalLink(url)) {
      return 'external';
    }
    
    // 要素ベースの判定
    if (element) {
      // target属性でメールリンクを判定
      const targetAttr = element.getAttribute('target');
      if (targetAttr === 'msgeditor') {
        return 'mail';
      }
      
      // クラスやIDでメールリンクを判定
      const idAttr = element.getAttribute('id') || '';
      const classAttr = element.getAttribute('class') || '';
      if (idAttr.includes('notification') || idAttr.includes('message') || 
          classAttr.includes('notification') || classAttr.includes('message')) {
        // 子要素にメール関連のアイコンがあるか確認
        const hasMailIcon = element.querySelector('.glyphicon-envelope') || 
                           element.querySelector('[class*="envelope"]') ||
                           element.querySelector('[class*="mail"]');
        if (hasMailIcon) {
          return 'mail';
        }
      }
      
      // 添付資料リンクの判定
      // onclick属性にfiledownloadが含まれる、またはimg.attach_fileを含む
      const onclickAttr = element.getAttribute('onclick') || '';
      if (onclickAttr.includes('filedownload')) {
        return 'attachment';
      }
      
      const hasAttachIcon = element.querySelector('img.attach_file') || 
                           element.querySelector('img[alt*="添付"]') ||
                           element.querySelector('img[src*="attach"]');
      if (hasAttachIcon) {
        return 'attachment';
      }
      
      // テキストが「添付資料」の場合
      const textContent = element.textContent || '';
      if (textContent.trim() === '添付資料' || textContent.includes('添付')) {
        return 'attachment';
      }
    }
    
    // その他の内部リンク（拡張機能が介入しない）
    return 'other';
  }

  // リンクを開く関数
  function openLink(url, linkType = 'other') {
    if (!url || url === '#' || url === 'null' || url === 'about:blank') {
      return null;
    }

    // その他の内部リンクの場合は何もせず、デフォルトの動作に任せる
    if (linkType === 'other') {
      return null;
    }

    // リンクタイプに応じた設定を使用
    let behavior;
    let windowSize;
    
    switch (linkType) {
      case 'mail':
        behavior = mailBehavior;
        windowSize = mailWindowSize;
        break;
      case 'file':
        behavior = fileBehavior;
        windowSize = fileWindowSize;
        // PDFファイルは同じタブで開けないように強制
        if (behavior === 'sameTab') {
          behavior = 'newTab';
        }
        break;
      case 'attachment':
        behavior = attachmentBehavior;
        windowSize = attachmentWindowSize;
        // 添付資料も同じタブで開けないように強制
        if (behavior === 'sameTab') {
          behavior = 'newWindow';
        }
        break;
      case 'webclass':
        behavior = webclassBehavior;
        windowSize = webclassWindowSize;
        break;
      case 'external':
        behavior = externalLinkBehavior;
        windowSize = externalLinkWindowSize;
        break;
      case 'course':  // 授業リンク（course.php）専用
        behavior = linkBehavior;
        windowSize = linkWindowSize;
        break;
      default:
        // その他は何もしない
        return null;
    }

    switch (behavior) {
      case 'newTab':
        // 新しいタブで開く
        window.open(url, '_blank');
        break;
      
      case 'newWindow':
        // 新しいウィンドウ（サブウィンドウ）で開く
        const specs = `width=${windowSize.width},height=${windowSize.height},top=0,left=0,resizable=yes,scrollbars=yes`;
        window.open(url, '_blank', specs);
        break;
      
      case 'sameTab':
        // 同じタブで開く
        window.location.href = url;
        break;
      
      default:
        // デフォルトは新しいタブ
        window.open(url, '_blank');
    }
  }

  function modifyLinks() {
    try {
      const links = document.querySelectorAll('a');

      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        
        // すでに処理済みのリンクはスキップ
        if (link.hasAttribute('data-modified')) {
          continue;
        }
        link.setAttribute('data-modified', 'true');

        if (link.classList.contains('showLoginButton')) {
          const originalOnclick = link.getAttribute('onclick');
          link.removeAttribute('onclick');
          link.removeAttribute('href');
          

          link.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            try {
              const code = originalOnclick.replace(/^javascript:\s*/, '').replace(/;\s*$/, '');
              eval(code);
            } catch (error) {
              console.error('onclick実行エラー:', error);
            }
          }, true);
          
          continue;
        }

        const href = link.href;
        const onclick = link.getAttribute('onclick');
        
        // hrefもonclickもない場合はスキップ
        if ((!href || href === window.location.href + '#') && !onclick) {
          continue;
        }

        // リンクの種類を判定
        const linkType = getLinkType(href, link);
        
        // その他の内部リンクの場合は処理をスキップ（デフォルトの動作を維持）
        if (linkType === 'other') {
          continue;
        }

        // target属性を削除（ブラウザのデフォルト動作を防ぐ）
        if (link.hasAttribute('target')) {
          link.removeAttribute('target');
        }

        // onclick属性がある場合
        if (onclick) {
          // onclick内でwindow.openを使っているかチェック
          if (onclick.includes('window.open')) {
            // window.openは既にオーバーライドされているのでそのまま
            continue;
          } else if (onclick.includes('openMessageWindow')) {
            // メールウィンドウを開く関数
            link.removeAttribute('onclick');
            link.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              
              // URLを抽出
              const match = onclick.match(/openMessageWindow\('([^']+)'\)/);
              if (match && match[1]) {
                openLink(match[1], 'mail');
              }
            }, true);
            continue;
          } else if (onclick.includes('filedownload')) {
            // ファイルダウンロード関数
            link.removeAttribute('onclick');
            link.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              
              // URLを抽出
              const match = onclick.match(/filedownload\('([^']+)'\)/);
              if (match && match[1]) {
                openLink(match[1], 'attachment');
              }
            }, true);
            continue;
          }
        }

        // 通常のhrefリンク
        if (href && href !== window.location.href + '#') {
          link.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openLink(href, linkType);
          }, true);
        }
      }
    } catch (error) {
      console.error('リンク修正エラー:', error);
    }
  }

  function modifyForms() {
    try {
      const forms = document.querySelectorAll('form');
      
      for (let i = 0; i < forms.length; i++) {
        const form = forms[i];
        const action = form.action;
        
        if (!action) {
          continue;
        }
        
        // フォームのアクションからリンクタイプを判定
        const linkType = getLinkType(action);
        
        // その他の内部リンクの場合は処理をスキップ
        if (linkType === 'other') {
          continue;
        }
        
        // リンクタイプに応じた動作を取得
        const behavior = linkType === 'mail' ? mailBehavior : 
                        linkType === 'file' ? fileBehavior :
                        linkType === 'attachment' ? attachmentBehavior :
                        linkType === 'webclass' ? webclassBehavior :
                        linkType === 'external' ? externalLinkBehavior :
                        linkType === 'course' ? linkBehavior :
                        null; // otherの場合
        
        // behaviorがnullの場合はスキップ
        if (behavior === null) {
          continue;
        }
        
        if (behavior === 'sameTab') {
          form.removeAttribute('target');
        }
      }
    } catch (error) {
      console.error('フォーム修正エラー:', error);
    }
  }
  

  function overrideGlobalFunctions() {
    try {
      const originalWindowOpen = window.open;
      

      window.open = function(url, name, specs) {
        try {
          if (!url || url === 'null' || url === 'about:blank') {
            return null;
          }
          
          // リンクタイプを判定（target名も考慮）
          let linkType = getLinkType(url);
          
          // target名が"msgeditor"の場合はメールリンクとして扱う
          if (name === 'msgeditor') {
            linkType = 'mail';
          }
          
          // その他の内部リンクの場合は元のwindow.openを呼び出す
          if (linkType === 'other') {
            return originalWindowOpen.apply(this, arguments);
          }
          
          let behavior = linkType === 'mail' ? mailBehavior : 
                        linkType === 'file' ? fileBehavior :
                        linkType === 'attachment' ? attachmentBehavior :
                        linkType === 'webclass' ? webclassBehavior :
                        linkType === 'external' ? externalLinkBehavior :
                        linkType === 'course' ? linkBehavior :
                        null;
          
          // behaviorがnullの場合は元のwindow.openを呼び出す
          if (behavior === null) {
            return originalWindowOpen.apply(this, arguments);
          }
          
          let windowSize = linkType === 'mail' ? mailWindowSize :
                          linkType === 'file' ? fileWindowSize :
                          linkType === 'attachment' ? attachmentWindowSize :
                          linkType === 'webclass' ? webclassWindowSize :
                          linkType === 'external' ? externalLinkWindowSize :
                          linkType === 'course' ? linkWindowSize :
                          null;
          
          // PDFファイルは同じタブで開けないように強制
          if (linkType === 'file' && behavior === 'sameTab') {
            behavior = 'newTab';
          }
          
          // 添付資料も同じタブで開けないように強制
          if (linkType === 'attachment' && behavior === 'sameTab') {
            behavior = 'newWindow';
          }

          // 設定に応じて開く
          switch (behavior) {
            case 'newTab':
              return originalWindowOpen.call(this, url, '_blank');
            
            case 'newWindow':
              const windowSpecs = `width=${windowSize.width},height=${windowSize.height},top=0,left=0,resizable=yes,scrollbars=yes`;
              return originalWindowOpen.call(this, url, '_blank', windowSpecs);
            
            case 'sameTab':
              window.location.href = url;
              return window;
            
            default:
              return originalWindowOpen.call(this, url, '_blank');
          }
        } catch (error) {
          console.error('window.openエラー:', error);
          return originalWindowOpen.apply(this, arguments);
        }
      };
      
      // openMessageWindow関数を上書き
      if (typeof window.openMessageWindow === 'function') {
        const originalOpenMessageWindow = window.openMessageWindow;
        
        window.openMessageWindow = function(url) {
          const linkType = getLinkType(url);
          openLink(url, linkType);
          return window;
        };
      }
      
      // filedownload関数を上書き
      if (typeof window.filedownload === 'function') {
        const originalFiledownload = window.filedownload;
        
        window.filedownload = function(url) {
          openLink(url, 'attachment');
          return false;
        };
      } else {
        // filedownload関数が存在しない場合は新規作成
        window.filedownload = function(url) {
          openLink(url, 'attachment');
          return false;
        };
      }

      if (typeof window.openWebClassWindow === 'function') {
        const originalOpenWebClassWindow = window.openWebClassWindow;
        
        window.openWebClassWindow = function(url) {
          window.location.href = url;
          return window;
        };
      }
      

      if (typeof window.callWebClass === 'function') {
        const originalCallWebClass = window.callWebClass;
        
        window.callWebClass = function(lang) {
          var url = "/webclass/login.php?auth_mode=SAML" + window.location.search;
          if(lang == 'ENGLISH') {
            url += '&language=ENGLISH';
          }
          
          // WebClassログイン画面の設定を使用
          if (webclassBehavior === 'sameTab') {
            window.location.href = url;
          } else {
            openLink(url, 'webclass');
          }
          return false;
        };
      }
      

      if (typeof window.callSmartphoneWebClass === 'function') {
        const originalCallSmartphoneWebClass = window.callSmartphoneWebClass;
        
        window.callSmartphoneWebClass = function(lang) {
          var url = "/webclass/login.php" + window.location.search;
          if(window.location.search === '') {
            url += '?';
          } else {
            url += '&';
          }
          url += 'mbl=1';
          if(lang == 'ENGLISH') {
            url += '&language=ENGLISH';
          }
          
          // WebClassログイン画面の設定を使用
          if (webclassBehavior === 'sameTab') {
            window.location.href = url;
          } else {
            openLink(url, 'webclass');
          }
          return false;
        };
      }
    } catch (error) {
      console.error('関数上書きエラー:', error);
    }
  }
  

  function init() {
    try {
      overrideGlobalFunctions();
      

      if (document.body) {
        modifyLinks();
        modifyForms();
        setupObserver();
      } else {
        setTimeout(init, 10);
      }
    } catch (error) {
      console.error('初期化エラー:', error);
      setTimeout(init, 100);
    }
  }
  

  function setupObserver() {
    try {
      const observer = new MutationObserver(function(mutations) {
        try {
          let shouldUpdate = false;
          for (let i = 0; i < mutations.length; i++) {
            if (mutations[i].addedNodes.length) {
              shouldUpdate = true;
              break;
            }
          }
          
          if (shouldUpdate) {
            modifyLinks();
            modifyForms();
          }
        } catch (error) {
          console.error('監視エラー:', error);
        }
      });
  

      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    } catch (error) {
      console.error('監視設定エラー:', error);
    }
  }
  
  init();
  

  document.onreadystatechange = function() {
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      modifyLinks();
      modifyForms();
      setupObserver();
    }
  };
  

  document.addEventListener('DOMContentLoaded', function() {
    try {
      modifyLinks();
      modifyForms();
      setupObserver();
    } catch (error) {
      console.error('DOMContentLoadedエラー:', error);
    }
  });
  

  window.addEventListener('load', function() {
    try {
      modifyLinks();
      modifyForms();
    } catch (error) {
      console.error('window.loadエラー:', error);
    }
  });
}