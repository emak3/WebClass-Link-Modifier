/* ================================================================
   content.js — WebClass Link Modifier コンテンツスクリプト
   リンク判定ロジック・デフォルト値の編集は js/config.js で行う。
   このファイルは「ルール評価エンジン」に徹する。
   ================================================================ */
/* depends on: config.js */

// ── ストレージ読み込み ────────────────────────────────────────
let isTargetDomain = false;
let targetDomains  = WC_CONFIG.defaults.domains.slice();
const behaviors    = Object.assign({}, WC_CONFIG.defaults.behaviors);
const windowSizes  = Object.assign({}, WC_CONFIG.defaults.windowSizes);

const storageKeys = Object.keys(WC_CONFIG.defaults.behaviors)
  .concat(Object.keys(WC_CONFIG.defaults.windowSizes).map(p => p + 'WindowSize'))
  .concat(['domains']);

chrome.storage.sync.get(storageKeys, function (result) {
  targetDomains = result.domains || WC_CONFIG.defaults.domains.slice();

  Object.keys(WC_CONFIG.defaults.behaviors).forEach(function (k) {
    behaviors[k] = result[k] || WC_CONFIG.defaults.behaviors[k];
  });
  Object.keys(WC_CONFIG.defaults.windowSizes).forEach(function (prefix) {
    windowSizes[prefix] = result[prefix + 'WindowSize'] || WC_CONFIG.defaults.windowSizes[prefix];
  });

  isTargetDomain = targetDomains.some(d => window.location.hostname.includes(d));
  if (isTargetDomain) initExtension();
});

// ── メイン ────────────────────────────────────────────────────
function initExtension() {

  // window.open を上書きする前にネイティブ実装を保存する。
  // openLink はここを参照するため、上書き後に openLink → window.open →
  // openLink という無限ループが発生しない。
  const nativeOpen = window.open.bind(window);

  // ── コンテキストオブジェクト（ルール関数に渡す）──────────
  function buildCtx() {
    return {
      currentUrl:    window.location.href,
      currentHost:   window.location.hostname,
      targetDomains: targetDomains,
      isExternal:    isExternalLink,
    };
  }

  // ── 外部リンク判定ヘルパー ────────────────────────────────
  function isExternalLink(url) {
    if (!url || url === '#' || url === 'null' || url === 'about:blank') return false;
    try {
      if (/^(\/|\.\/|\.\.\/)/.test(url)) return false;
      if (!/^https?:\/\//.test(url))     return false;
      const hostname = new URL(url).hostname;
      return !targetDomains.some(d => hostname.includes(d));
    } catch (e) {
      console.error('外部リンク判定エラー:', e);
      return false;
    }
  }

  // ── リンク種別判定エンジン ────────────────────────────────
  // WC_CONFIG.linkRules を上から順に評価し、
  // 最初に test() が true を返したルールのタイプを返す。
  // いずれも一致しなければ 'other' を返す。
  function getLinkType(url, element) {
    const ctx = buildCtx();
    for (const rule of WC_CONFIG.linkRules) {
      try {
        if (rule.test(url || '', element || null, ctx)) return rule.type;
      } catch (e) {
        console.warn('リンクルール評価エラー (type=' + rule.type + '):', e);
      }
    }
    return 'other';
  }

  // ── リンクを開く ──────────────────────────────────────────
  function openLink(url, linkType) {
    if (!url || url === '#' || url === 'null' || url === 'about:blank') return;
    if (!linkType || linkType === 'other') return;

    const mapping = WC_CONFIG.typeMap[linkType];
    if (!mapping) return;

    let behavior  = behaviors[mapping.behaviorKey];
    const winSize = windowSizes[mapping.sizeKey];

    // 制限チェック
    const restriction = WC_CONFIG.restrictions[mapping.behaviorKey];
    if (restriction && restriction.forbidden.includes(behavior)) {
      behavior = restriction.fallback;
    }

    switch (behavior) {
      case 'newTab':
        nativeOpen(url, '_blank');
        break;
      case 'newWindow': {
        const specs = `width=${winSize.width},height=${winSize.height},top=0,left=0,resizable=yes,scrollbars=yes`;
        nativeOpen(url, '_blank', specs);
        break;
      }
      case 'sameTab':
        window.location.href = url;
        break;
      default:
        nativeOpen(url, '_blank');
    }
  }

  // ── onclick 安全実行 ──────────────────────────────────────
  function executeOnclickSafely(onclickStr) {
    const code = onclickStr.replace(/^javascript:\s*/, '').trim();

    const callWcMatch = code.match(/callWebClass\(([^)]*)\)/);
    if (callWcMatch) {
      const lang = callWcMatch[1].replace(/['"]/g, '').trim();
      if (typeof window.callWebClass === 'function') {
        window.callWebClass(lang || undefined);
      } else {
        let url = '/webclass/login.php?auth_mode=SAML' + window.location.search;
        if (lang === 'ENGLISH') url += '&language=ENGLISH';
        openLink(url, 'webclass');
      }
      return true;
    }

    const callSmartMatch = code.match(/callSmartphoneWebClass\(([^)]*)\)/);
    if (callSmartMatch) {
      const lang = callSmartMatch[1].replace(/['"]/g, '').trim();
      if (typeof window.callSmartphoneWebClass === 'function') {
        window.callSmartphoneWebClass(lang || undefined);
      } else {
        let url = '/webclass/login.php' + window.location.search;
        url += (window.location.search === '' ? '?' : '&') + 'mbl=1';
        if (lang === 'ENGLISH') url += '&language=ENGLISH';
        openLink(url, 'webclass');
      }
      return true;
    }

    const openWcMatch = code.match(/openWebClassWindow\(['"]([^'"]+)['"]\)/);
    if (openWcMatch) { openLink(openWcMatch[1], 'webclass'); return true; }

    openLink('/webclass/login.php?auth_mode=SAML' + window.location.search, 'webclass');
    return false;
  }

  // ── リンク修正 ────────────────────────────────────────────
  function modifyLinks() {
    try {
      document.querySelectorAll('a').forEach(function (link) {
        if (link.hasAttribute('data-modified')) return;
        link.setAttribute('data-modified', 'true');

        // WebClass ログインボタン（showLoginButton クラス）の特殊処理
        if (link.classList.contains('showLoginButton')) {
          const originalOnclick = link.getAttribute('onclick');
          link.removeAttribute('onclick');
          link.removeAttribute('href');
          link.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (originalOnclick) {
              try { executeOnclickSafely(originalOnclick); }
              catch (err) {
                console.error('onclick 処理エラー:', err);
                openLink('/webclass/login.php?auth_mode=SAML' + window.location.search, 'webclass');
              }
            } else {
              if (typeof window.callWebClass === 'function') window.callWebClass();
              else openLink('/webclass/login.php?auth_mode=SAML' + window.location.search, 'webclass');
            }
          }, true);
          return;
        }

        const href    = link.href;
        const onclick = link.getAttribute('onclick');
        if ((!href || href === window.location.href + '#') && !onclick) return;

        const linkType = getLinkType(href, link);
        if (linkType === 'other') return;

        if (link.hasAttribute('target')) link.removeAttribute('target');

        // onclick 経由のリンクを個別にハンドル
        if (onclick) {
          if (onclick.includes('window.open')) return; // overrideGlobalFunctions に委ねる
          if (onclick.includes('openMessageWindow')) {
            link.removeAttribute('onclick');
            link.addEventListener('click', function (e) {
              e.preventDefault(); e.stopPropagation();
              const m = onclick.match(/openMessageWindow\('([^']+)'\)/);
              if (m && m[1]) openLink(m[1], 'mail');
            }, true);
            return;
          }
          if (onclick.includes('filedownload')) {
            link.removeAttribute('onclick');
            link.addEventListener('click', function (e) {
              e.preventDefault(); e.stopPropagation();
              const m = onclick.match(/filedownload\('([^']+)'\)/);
              if (m && m[1]) openLink(m[1], 'attachment');
            }, true);
            return;
          }
        }

        if (href && href !== window.location.href + '#') {
          link.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            openLink(href, linkType);
          }, true);
        }
      });
    } catch (e) { console.error('リンク修正エラー:', e); }
  }

  // ── フォーム修正 ──────────────────────────────────────────
  function modifyForms() {
    try {
      document.querySelectorAll('form').forEach(function (form) {
        if (!form.action) return;
        const linkType = getLinkType(form.action, null);
        if (linkType === 'other') return;
        const mapping = WC_CONFIG.typeMap[linkType];
        if (!mapping) return;
        if (behaviors[mapping.behaviorKey] === 'sameTab') form.removeAttribute('target');
      });
    } catch (e) { console.error('フォーム修正エラー:', e); }
  }

  // ── ログインボタン（input#LoginBtn）修正 ─────────────────
  function modifyLoginButtons() {
    try {
      document.querySelectorAll('input#LoginBtn[type="submit"][name="login"]').forEach(function (btn) {
        if (btn.hasAttribute('data-modified')) return;
        btn.setAttribute('data-modified', 'true');
        btn.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          const form = btn.closest('form');
          openLink(form ? form.action : window.location.href, 'webclass');
        }, true);
      });
    } catch (e) { console.error('ログインボタン修正エラー:', e); }
  }

  // ── window.open オーバーライド ────────────────────────────
  function overrideGlobalFunctions() {
    try {
      window.open = function (url, name, _specs) {
        try {
          if (!url || url === 'null' || url === 'about:blank')
            return nativeOpen.apply(window, arguments);

          let linkType = getLinkType(url, null);
          if (name === 'msgeditor') linkType = 'mail'; // target 名でメール強制
          if (linkType === 'other') return nativeOpen.apply(window, arguments);

          openLink(url, linkType);
          return window;
        } catch (e) {
          console.error('window.open エラー:', e);
          return nativeOpen.apply(window, arguments);
        }
      };

      if (typeof window.openMessageWindow === 'function') {
        window.openMessageWindow = function (url) {
          openLink(url, getLinkType(url, null));
          return window;
        };
      }

      window.filedownload = function (url) {
        openLink(url, 'attachment');
        return false;
      };

      if (typeof window.openWebClassWindow === 'function') {
        window.openWebClassWindow = function (url) {
          window.location.href = url;
          return window;
        };
      }

      if (typeof window.callWebClass === 'function') {
        window.callWebClass = function (lang) {
          let url = '/webclass/login.php?auth_mode=SAML' + window.location.search;
          if (lang === 'ENGLISH') url += '&language=ENGLISH';
          openLink(url, 'webclass');
          return false;
        };
      }

      if (typeof window.callSmartphoneWebClass === 'function') {
        window.callSmartphoneWebClass = function (lang) {
          let url = '/webclass/login.php' + window.location.search;
          url += (window.location.search === '' ? '?' : '&') + 'mbl=1';
          if (lang === 'ENGLISH') url += '&language=ENGLISH';
          openLink(url, 'webclass');
          return false;
        };
      }
    } catch (e) { console.error('関数上書きエラー:', e); }
  }

  // ── 設定ボタン注入 ────────────────────────────────────────
  // #menu .navbar-right のログアウト <li> の直前に設定ボタン <li> を挿入する。
  // 一度だけ実行し、2回目以降は何もしない（id ガード）。
  function injectSettingsButton() {
    try {
      if (document.getElementById('wclm-settings-btn')) return;

      // ログアウトリンクを含む <li> を探す
      const logoutLink = document.querySelector('#menu .navbar-nav.navbar-right li a[href*="logout.php"]');
      if (!logoutLink) return;
      const logoutLi = logoutLink.closest('li');
      if (!logoutLi) return;

      // ── スタイル注入（一度だけ）──
      if (!document.getElementById('wclm-style')) {
        const style = document.createElement('style');
        style.id = 'wclm-style';
        style.textContent = `
          #wclm-settings-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 55px;
            height: 48px;
            padding: 0;
            background: transparent;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            opacity: 0.82;
            transition: opacity 0.15s, background 0.15s;
          }
          #wclm-settings-btn:hover {
            opacity: 1;
            background: rgba(255, 255, 255, 0.15);
          }
          #wclm-settings-btn:active { transform: scale(0.93); }
          #wclm-settings-btn img {
            width: 28px;
            height: 28px;
            display: block;
          }
          /* ボタンを包む <li> を navbar の行高に合わせる */
          #wclm-settings-li {
            display: flex;
            align-items: center;
            padding: 0 4px;
          }
        `;
        document.head.appendChild(style);
      }

      // ── <li> + <button> を生成 ──
      const li = document.createElement('li');
      li.id = 'wclm-settings-li';

      const btn = document.createElement('button');
      btn.id = 'wclm-settings-btn';
      btn.type = 'button';
      btn.title = 'WebClass Link Modifier — 設定';
      btn.setAttribute('aria-label', 'WebClass Link Modifier の設定を開く');

      const img = document.createElement('img');
      // chrome.runtime.getURL は Chrome / Edge(Chromium) どちらでも動作する。
      // Firefox のみ browser.runtime が必要なためフォールバックを用意する。
      const _rt = (typeof browser !== 'undefined' && browser && browser.runtime)
        ? browser.runtime : chrome.runtime;
      img.src = _rt.getURL('icons/icon1080.png');
      img.alt = 'WebClass Link Modifier';
      btn.appendChild(img);

      // ── クリックでバックグラウンド経由で設定ページを開く ──
      // window.open で extension:// URL を開くと Edge の SmartScreen に
      // ブロックされるため、background.js の openOptionsPage に委ねる。
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        _rt.sendMessage({ action: 'openOptionsPage' }, function () {
          void chrome.runtime.lastError; // 未参照警告を抑制
        });
      });

      li.appendChild(btn);

      // ログアウト <li> の直前（= 左側）に挿入
      logoutLi.parentNode.insertBefore(li, logoutLi);
    } catch (e) {
      console.error('設定ボタン注入エラー:', e);
    }
  }

  // ── 初期化 ────────────────────────────────────────────────
  function init() {
    try {
      overrideGlobalFunctions();
      if (document.body) {
        modifyLinks(); modifyForms(); modifyLoginButtons();
        injectSettingsButton();
        setupObserver();
      } else {
        setTimeout(init, 10);
      }
    } catch (e) { console.error('初期化エラー:', e); setTimeout(init, 100); }
  }

  function setupObserver() {
    try {
      const observer = new MutationObserver(function (mutations) {
        try {
          if (mutations.some(m => m.addedNodes.length > 0)) {
            modifyLinks(); modifyForms(); modifyLoginButtons();
            injectSettingsButton(); // navbar が動的に挿入される場合にも対応
          }
        } catch (e) { console.error('監視エラー:', e); }
      });
      if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) { console.error('監視設定エラー:', e); }
  }

  init();

  document.onreadystatechange = function () {
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      modifyLinks(); modifyForms(); modifyLoginButtons();
      injectSettingsButton();
      setupObserver();
    }
  };
  document.addEventListener('DOMContentLoaded', function () {
    try {
      modifyLinks(); modifyForms(); modifyLoginButtons();
      injectSettingsButton();
      setupObserver();
    } catch (e) { console.error('DOMContentLoaded エラー:', e); }
  });
  window.addEventListener('load', function () {
    try {
      modifyLinks(); modifyForms(); modifyLoginButtons();
      injectSettingsButton();
    } catch (e) { console.error('window.load エラー:', e); }
  });
}