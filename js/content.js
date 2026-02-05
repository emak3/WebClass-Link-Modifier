// デフォルトのドメイン
const DEFAULT_DOMAINS = ['lms.salesio-sp.ac.jp'];

// 現在のページが対象ドメインかチェック
let isTargetDomain = false;
let linkBehavior = 'newTab'; // その他のリンク
let mailBehavior = 'newTab'; // メールリンク
let fileBehavior = 'newTab'; // PDFなどのファイル
let webclassBehavior = 'sameTab'; // WebClassログイン画面
let attachmentBehavior = 'newWindow'; // 添付資料リンク

// ウィンドウサイズ設定
let mailWindowSize = { width: 800, height: 600 };
let fileWindowSize = { width: 1200, height: 900 };
let attachmentWindowSize = { width: 500, height: 500 };
let linkWindowSize = { width: 800, height: 600 };
let webclassWindowSize = { width: 1600, height: 898 };

chrome.storage.sync.get([
  'domains', 'linkBehavior', 'mailBehavior', 'fileBehavior', 'webclassBehavior', 'attachmentBehavior',
  'mailWindowSize', 'fileWindowSize', 'attachmentWindowSize', 'linkWindowSize', 'webclassWindowSize'
], function(result) {
  const domains = result.domains || DEFAULT_DOMAINS;
  const currentHost = window.location.hostname;
  linkBehavior = result.linkBehavior || 'newTab';
  mailBehavior = result.mailBehavior || 'newTab';
  fileBehavior = result.fileBehavior || 'newTab';
  webclassBehavior = result.webclassBehavior || 'sameTab';
  attachmentBehavior = result.attachmentBehavior || 'newWindow';
  
  // ウィンドウサイズ設定を読み込む
  mailWindowSize = result.mailWindowSize || { width: 800, height: 600 };
  fileWindowSize = result.fileWindowSize || { width: 1200, height: 900 };
  attachmentWindowSize = result.attachmentWindowSize || { width: 500, height: 500 };
  linkWindowSize = result.linkWindowSize || { width: 800, height: 600 };
  webclassWindowSize = result.webclassWindowSize || { width: 1600, height: 898 };
  
  isTargetDomain = domains.some(domain => currentHost.includes(domain));
  
  if (isTargetDomain) {
    // 対象ドメインの場合のみ実行
    initExtension();
  }
});

function initExtension() {
  // リンクの種類を判定
  function getLinkType(url, element) {
    // 要素ベースの判定（URLより優先）
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
    
    // URLベースの判定
    if (!url) return 'other';
    
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
    
    return 'other';
  }

  // リンクを開く関数
  function openLink(url, linkType = 'other') {
    if (!url || url === '#' || url === 'null' || url === 'about:blank') {
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
      default:
        behavior = linkBehavior;
        windowSize = linkWindowSize;
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
            e.stopImmediatePropagation();

            let url = "/webclass/login.php?auth_mode=SAML" + window.location.search;
            if (originalOnclick && originalOnclick.includes('ENGLISH')) {
              url += '&language=ENGLISH';
            }

            // WebClassログイン画面の設定を使用
            const linkType = getLinkType(url, link);
            if (webclassBehavior === 'sameTab') {
              window.location.href = url;
            } else {
              openLink(url, linkType);
            }
            return false;
          }, true);
          continue;
        }

        // PDFやその他のファイルへのリンクかチェック
        const href = link.getAttribute('href') || '';
        const isPdfOrFile = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)$/i.test(href);
        
        // リンクタイプを事前に判定
        const linkType = getLinkType(href, link);
        
        // 添付資料リンクの特別処理
        if (linkType === 'attachment') {
          const originalOnclick = link.getAttribute('onclick');
          const originalHref = href;
          
          // onclick属性とhref属性を削除
          link.removeAttribute('onclick');
          link.removeAttribute('href');
          link.style.cursor = 'pointer';
          // リンク色を保持
          link.style.color = '#0066cc';
          link.style.textDecoration = 'underline';
          
          // ホバー時の色変更
          link.addEventListener('mouseenter', function() {
            this.style.color = '#003d7a';
          });
          link.addEventListener('mouseleave', function() {
            this.style.color = '#0066cc';
          });
          
          link.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            let url = originalHref;
            
            // onclickからURLを抽出
            if (originalOnclick) {
              const urlMatch = originalOnclick.match(/filedownload\(['"]([^'"]+)['"]\)/);
              if (urlMatch && urlMatch[1]) {
                url = urlMatch[1];
              }
            }
            
            if (url && url !== '#') {
              openLink(url, 'attachment');
            }
            return false;
          }, true);
          continue;
        }
        
        // onclick属性を持つリンクの処理
        const onclickAttr = link.getAttribute('onclick');
        if (onclickAttr && 
            (onclickAttr.includes('window.open') || 
             onclickAttr.includes('open(') ||
             onclickAttr.includes('MessageWindow') ||
             onclickAttr.includes('_blank'))) {
          
          const originalOnclick = onclickAttr;
          const originalHref = href;
          
          // onclick属性とhref属性を削除
          link.removeAttribute('onclick');
          link.removeAttribute('href');
          link.style.cursor = 'pointer';
          // リンク色を保持
          if (!link.style.color || link.style.color === '') {
            link.style.color = '#0066cc';
            link.style.textDecoration = 'underline';
            
            // ホバー時の色変更
            link.addEventListener('mouseenter', function() {
              this.style.color = '#003d7a';
            });
            link.addEventListener('mouseleave', function() {
              this.style.color = '#0066cc';
            });
          }
          

          link.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            

            let url = originalHref;

            if (originalOnclick) {
              // openMessageWindow、window.open、openなどから関数名とURLを抽出
              const functionMatch = originalOnclick.match(/return\s+(\w+)\(['"]([^'"]+)['"]\)/);
              if (functionMatch) {
                url = functionMatch[2];
              } else {
                const urlMatch = originalOnclick.match(/(?:window\.open|open)\(['"]([^'"]+)['"]/);
                if (urlMatch && urlMatch[1]) {
                  url = urlMatch[1];
                }
              }
            }
            

            if (url && url !== '#') {
              // リンクタイプを判定（要素と URLの両方を使用）
              const linkType = getLinkType(url, link);
              openLink(url, linkType);
            }
            return false;
          }, true);
          continue;
        }
        
        // target属性の処理（onclick属性がない場合）
        const targetAttr = link.getAttribute('target');
        if (targetAttr && targetAttr !== '_self') {
          // リンクタイプを判定（要素とURLの両方を使用）
          const linkType = getLinkType(href, link);
          const behavior = linkType === 'mail' ? mailBehavior : 
                          linkType === 'file' ? fileBehavior :
                          linkType === 'attachment' ? attachmentBehavior :
                          linkType === 'webclass' ? webclassBehavior :
                          linkBehavior;
          
          if (behavior === 'sameTab') {
            link.removeAttribute('target');
          } else if (behavior === 'newTab') {
            link.setAttribute('target', '_blank');
          } else if (behavior === 'newWindow') {
            // 新しいウィンドウの場合はイベントリスナーで処理
            const originalHref = link.getAttribute('href');
            if (originalHref) {
              link.removeAttribute('href');
              link.removeAttribute('target');
              link.style.cursor = 'pointer';
              // リンク色を保持
              if (!link.style.color || link.style.color === '') {
                link.style.color = '#0066cc';
                link.style.textDecoration = 'underline';
                
                // ホバー時の色変更
                link.addEventListener('mouseenter', function() {
                  this.style.color = '#003d7a';
                });
                link.addEventListener('mouseleave', function() {
                  this.style.color = '#0066cc';
                });
              }
              
              link.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                openLink(originalHref, linkType);
                return false;
              }, true);
            }
          }
        }
        
        // href属性がないがtarget属性がある場合（メールアイコンなど）
        if (!href && targetAttr && targetAttr !== '_self') {
          const linkType = getLinkType('', link);
          if (linkType === 'mail') {
            // メールリンクとして判定された場合、クリックイベントを追加
            link.addEventListener('click', function(e) {
              // このリンクがどこに飛ぶかはJavaScript側で処理されるため
              // 設定に応じた動作のみ変更する必要がある
              // 元のイベントはそのまま実行させる
              if (mailBehavior === 'newWindow') {
                e.preventDefault();
                e.stopPropagation();
                // JavaScriptで開かれるURLを取得する方法がないため、
                // window.openのオーバーライドに任せる
              }
            }, false);
          }
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

        if (form.getAttribute('target') === '_blank') {
          // フォームのアクションURLからlinkTypeを判定
          const action = form.getAttribute('action') || '';
          const linkType = getLinkType(action, form);
          const behavior = linkType === 'mail' ? mailBehavior : 
                          linkType === 'file' ? fileBehavior :
                          linkType === 'attachment' ? attachmentBehavior :
                          linkType === 'webclass' ? webclassBehavior :
                          linkBehavior;
          
          if (behavior === 'sameTab') {
            form.removeAttribute('target');
          }
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
          
          let behavior = linkType === 'mail' ? mailBehavior : 
                          linkType === 'file' ? fileBehavior :
                          linkType === 'attachment' ? attachmentBehavior :
                          linkType === 'webclass' ? webclassBehavior :
                          linkBehavior;
          
          let windowSize = linkType === 'mail' ? mailWindowSize :
                          linkType === 'file' ? fileWindowSize :
                          linkType === 'attachment' ? attachmentWindowSize :
                          linkType === 'webclass' ? webclassWindowSize :
                          linkWindowSize;
          
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