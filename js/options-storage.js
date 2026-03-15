/* ================================================================
   options-storage.js — Chrome storage read/write operations
   ================================================================ */
/* depends on: options-constants.js, options-ui.js, options-domains.js,
               options-window-size.js */

/** Load all behavior settings from storage and apply to the form. */
function loadLinkBehavior() {
  var allKeys = BEHAVIOR_KEYS.concat(
    WS_PREFIXES.map(function (p) { return WS_KEY_MAP[p]; })
  );

  chrome.storage.sync.get(allKeys, function (result) {
    var s = {};
    allKeys.forEach(function (k) { s[k] = result[k] || DEFAULT_SETTINGS[k]; });

    /* Sanitize impossible states */
    if (s.fileBehavior === 'sameTab')       s.fileBehavior = 'newTab';
    if (s.attachmentBehavior === 'sameTab') s.attachmentBehavior = 'newWindow';

    /* Apply radio buttons */
    BEHAVIOR_KEYS.forEach(function (key) {
      var radios = document.getElementsByName(key);
      Array.prototype.forEach.call(radios, function (r) {
        if (r.value === s[key]) r.checked = true;
      });
    });

    /* Apply window sizes */
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
  var inputs  = document.querySelectorAll('.domain-item .domain-input');
  var domains = [];
  inputs.forEach(function (input) {
    var raw = input.value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (raw) domains.push(raw);
  });

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

  var fileBehavior   = getRadio('fileBehavior');
  var attachBehavior = getRadio('attachmentBehavior');

  if (fileBehavior === 'sameTab') {
    fileBehavior = 'newTab';
    showStatus('PDFファイルは同じタブで開けないため、別のタブに変更されました。', 'info');
  }
  if (attachBehavior === 'sameTab') {
    attachBehavior = 'newWindow';
    showStatus('添付資料は同じタブで開けないため、サブウィンドウに変更されました。', 'info');
  }

  var settings = {
    domains:              domains,
    linkBehavior:         getRadio('linkBehavior'),
    mailBehavior:         getRadio('mailBehavior'),
    fileBehavior:         fileBehavior,
    webclassBehavior:     getRadio('webclassBehavior'),
    attachmentBehavior:   attachBehavior,
    externalLinkBehavior: getRadio('externalLinkBehavior'),
  };

  WS_PREFIXES.forEach(function (prefix) {
    settings[WS_KEY_MAP[prefix]] = getWindowSizeData(prefix);
  });

  /* Request permissions for new domains */
  var newDomains = domains.filter(function (d) { return !DEFAULT_DOMAINS.includes(d); });
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
