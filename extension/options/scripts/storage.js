/* ================================================================
   options-storage.js — Chrome storage read/write operations
   ================================================================ */
/* depends on: options-constants.js, options-ui.js, options-domains.js,
               options-windowSize.js */

/** Load all behavior settings from storage and apply to the form. */
function loadLinkBehavior() {
  var allKeys = BEHAVIOR_KEYS.concat(
    WS_PREFIXES.map(function (p) { return WS_KEY_MAP[p]; })
  );

  chrome.storage.sync.get(allKeys, function (result) {
    var s = {};
    allKeys.forEach(function (k) { s[k] = result[k] || DEFAULT_SETTINGS[k]; });

    /* 制限チェック（WC_CONFIG.restrictions に従って禁止値を差し替える） */
    Object.keys(WC_CONFIG.restrictions).forEach(function (behaviorKey) {
      var r = WC_CONFIG.restrictions[behaviorKey];
      if (r.forbidden.indexOf(s[behaviorKey]) !== -1) {
        s[behaviorKey] = r.fallback;
      }
    });

    /* ラジオボタンに反映 */
    BEHAVIOR_KEYS.forEach(function (key) {
      var radios = document.getElementsByName(key);
      Array.prototype.forEach.call(radios, function (r) {
        if (r.value === s[key]) r.checked = true;
      });
    });

    /* ウィンドウサイズに反映 */
    WS_PREFIXES.forEach(function (prefix) {
      loadWindowSize(prefix, s[WS_KEY_MAP[prefix]]);
    });

    updateWindowSizeVisibility();
  });
}

/** Request host permissions for the given domains. */
async function requestPermissionsForDomains(domains) {
  var origins = domains.map(function (d) { return 'https://' + d + '/*'; });
  try {
    return await chrome.permissions.request({ origins: origins });
  } catch (e) {
    console.error('Permission request error:', e);
    return false;
  }
}

/** Collect form values and write to storage. */
async function saveDomains() {
  var domains = getDomainsFromDOM();

  if (domains.length === 0) {
    showStatus('少なくとも1つのドメインを入力してください', 'error');
    return;
  }

  function getRadio(name) {
    var radios = document.getElementsByName(name);
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) return radios[i].value;
    }
    return DEFAULT_SETTINGS[name];
  }

  /* BEHAVIOR_KEYS からすべての behavior を収集（キーの漏れが起きない） */
  var settings = { domains: domains };
  BEHAVIOR_KEYS.forEach(function (key) {
    settings[key] = getRadio(key);
  });

  /* 制限チェック（WC_CONFIG.restrictions に従って禁止値を差し替え、ユーザーに通知） */
  Object.keys(WC_CONFIG.restrictions).forEach(function (behaviorKey) {
    var r = WC_CONFIG.restrictions[behaviorKey];
    if (r.forbidden.indexOf(settings[behaviorKey]) !== -1) {
      settings[behaviorKey] = r.fallback;
      /* 差し替えが発生したときだけ通知 */
      showStatus(behaviorKey + ' の設定が利用できないため、自動的に変更されました。', 'info');
    }
  });

  /* ウィンドウサイズを収集 */
  WS_PREFIXES.forEach(function (prefix) {
    settings[WS_KEY_MAP[prefix]] = getWindowSizeData(prefix);
  });

  /* 新規ドメインの権限リクエスト */
  var newDomains = domains.filter(function (d) {
    return DEFAULT_DOMAINS.indexOf(d) === -1;
  });
  if (newDomains.length > 0) {
    showStatus('新しいドメインへのアクセス権限を要求しています...', 'info');
    var granted = await requestPermissionsForDomains(domains);
    if (!granted) {
      showStatus('権限が拒否されました。拡張機能は設定したドメインで動作しません。', 'error');
      return;
    }
  }

  chrome.storage.sync.set(settings, function () {
    showStatus('設定を保存しました。対象ページを再読み込みしてください。', 'success');
    chrome.runtime.sendMessage({ action: 'updatePermissions', domains: domains });
  });
}