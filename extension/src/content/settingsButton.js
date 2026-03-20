/* ================================================================
   settingsButton.js — Inject settings button into navbar
   This function is intentionally dependency-light and uses
   only DOM + runtime API to avoid coupling with content.js logic.
   ================================================================ */

function injectSettingsButton() {
  try {
    if (document.getElementById('wclm-settings-btn')) return;

    // Find the <li> containing logout link.
    const logoutLink = document.querySelector('#menu .navbar-nav.navbar-right li a[href*="logout.php"]');
    if (!logoutLink) return;
    const logoutLi = logoutLink.closest('li');
    if (!logoutLi) return;

    // Inject style once.
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
        /* Keep the wrapper <li> aligned to navbar row height */
        #wclm-settings-li {
          display: flex;
          align-items: center;
          padding: 0 4px;
        }
      `;
      document.head.appendChild(style);
    }

    // Create <li> + <button>.
    const li = document.createElement('li');
    li.id = 'wclm-settings-li';

    const btn = document.createElement('button');
    btn.id = 'wclm-settings-btn';
    btn.type = 'button';
    btn.title = 'WebClass Link Modifier — 設定';
    btn.setAttribute('aria-label', 'WebClass Link Modifier の設定を開く');

    const img = document.createElement('img');
    // runtime.getURL works in Chrome/Edge(Chromium) and Firefox.
    img.src = WC_API.runtime.getURL('icons/icon1024.png');
    img.alt = 'WebClass Link Modifier';
    btn.appendChild(img);

    // Open options page via background (avoid SmartScreen blocking).
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      WC_API.runtime.sendMessage({ action: 'openOptionsPage' }, function () {
        void WC_API.runtime.lastError; // suppress unused warning
      });
    });

    li.appendChild(btn);

    // Insert before logout <li>.
    logoutLi.parentNode.insertBefore(li, logoutLi);
  } catch (e) {
    console.error('設定ボタン注入エラー:', e);
  }
}

