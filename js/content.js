// デフォルトのドメイン
const DEFAULT_DOMAINS = ['lms.salesio-sp.ac.jp'];

// 現在のページが対象ドメインかチェック
let isTargetDomain = false;
let linkBehavior = 'newTab'; // その他のリンク
let mailBehavior = 'newTab'; // メールリンク
let fileBehavior = 'newTab'; // PDFなどのファイル
let webclassBehavior = 'sameTab'; // WebClassログイン画面

chrome.storage.sync.get(['domains', 'linkBehavior', 'mailBehavior', 'fileBehavior', 'webclassBehavior'], function(result) {
  const domains = result.domains || DEFAULT_DOMAINS;
  const currentHost = window.location.hostname;
  linkBehavior = result.linkBehavior || 'newTab';
  mailBehavior = result.mailBehavior || 'newTab';
  fileBehavior = result.fileBehavior || 'newTab';
  webclassBehavior = result.webclassBehavior || 'sameTab';
  
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
    }
    
    // URLベースの判定
    if (!url) return 'other';
    
    // WebClassログイン画面
    if (url.includes('/webclass/login.php')) {
      return 'webclass';
    }
    
    // メールリンク（MessageWindowを含む）
    if (url.includes('MessageWindow') || url.includes('message') || url.includes('mail')) {
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
    switch (linkType) {
      case 'mail':
        behavior = mailBehavior;
        break;
      case 'file':
        behavior = fileBehavior;
        break;
      case 'webclass':
        behavior = webclassBehavior;
        break;
      default:
        behavior = linkBehavior;
    }

    switch (behavior) {
      case 'newTab':
        // 新しいタブで開く
        window.open(url, '_blank');
        break;
      
      case 'newWindow':
        // 新しいウィンドウ（サブウィンドウ）で開く
        window.open(url, '_blank', 'width=800,height=600,resizable=yes,scrollbars=yes');
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
          
          const behavior = linkType === 'mail' ? mailBehavior : 
                          linkType === 'file' ? fileBehavior :
                          linkType === 'webclass' ? webclassBehavior :
                          linkBehavior;

          // 設定に応じて開く
          switch (behavior) {
            case 'newTab':
              return originalWindowOpen.call(this, url, '_blank');
            
            case 'newWindow':
              return originalWindowOpen.call(this, url, '_blank', 'width=800,height=600,resizable=yes,scrollbars=yes');
            
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