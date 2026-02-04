// デフォルトのドメイン
const DEFAULT_DOMAINS = ['lms.salesio-sp.ac.jp'];

// 現在のページが対象ドメインかチェック
let isTargetDomain = false;

chrome.storage.sync.get(['domains'], function(result) {
  const domains = result.domains || DEFAULT_DOMAINS;
  const currentHost = window.location.hostname;
  
  isTargetDomain = domains.some(domain => currentHost.includes(domain));
  
  if (isTargetDomain) {
    // 対象ドメインの場合のみ実行
    initExtension();
  }
});

function initExtension() {
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

            window.location.href = url;
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
              window.open(url, '_blank');
            }
            return false;
          }, true);
          continue;
        }
        
        // target属性の処理（onclick属性がない場合）
        const targetAttr = link.getAttribute('target');
        if (targetAttr && targetAttr !== '_self') {
          // PDFやファイルの場合、または特定のターゲット名の場合は _blank に統一
          if (isPdfOrFile || (targetAttr !== '_blank' && targetAttr !== '_new')) {
            link.setAttribute('target', '_blank');
          } else if (!isPdfOrFile) {
            // それ以外は削除
            link.removeAttribute('target');
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
          
          // PDFやファイルの場合は新しいタブで開く
          const isPdfOrFile = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)$/i.test(url);
          if (isPdfOrFile) {
            return originalWindowOpen.call(this, url, '_blank');
          }

          // 新しいタブで開く
          return originalWindowOpen.call(this, url, '_blank');
        } catch (error) {
          console.error('window.openエラー:', error);
          return originalWindowOpen.apply(this, arguments);
        }
      };
      
      // openMessageWindow関数を上書き
      if (typeof window.openMessageWindow === 'function') {
        const originalOpenMessageWindow = window.openMessageWindow;
        
        window.openMessageWindow = function(url) {
          return window.open(url, '_blank');
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
          
          window.location.href = url;
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
          
          window.location.href = url;
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
  

  try {
    const originalWindowOpen = window.open;
    window.open = function(url, name, specs) {
      try {
        // PDFやファイルの場合は新しいタブで開く
        const isPdfOrFile = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)$/i.test(url);
        if (isPdfOrFile) {
          return originalWindowOpen.call(this, url, '_blank');
        }
        // 新しいタブで開く
        return originalWindowOpen.call(this, url, '_blank');
      } catch (error) {
        console.error('window.openエラー:', error);
        return originalWindowOpen.apply(this, arguments);
      }
    };
  } catch (error) {
    console.error('window.open上書きエラー:', error);
  }
}