// デフォルトのドメイン
const DEFAULT_DOMAINS = ['lms.salesio-sp.ac.jp'];
const DEFAULT_SETTINGS = {
    linkBehavior: 'sameTab',
    mailBehavior: 'newWindow',
    fileBehavior: 'newTab',
    webclassBehavior: 'sameTab',
    attachmentBehavior: 'newWindow',
    // ウィンドウサイズ設定
    mailWindowSize: { width: 800, height: 600, ratio: '4:3' },
    fileWindowSize: { width: 1200, height: 900, ratio: '4:3' },
    attachmentWindowSize: { width: 500, height: 500, ratio: '1:1' },
    linkWindowSize: { width: 800, height: 600, ratio: '4:3' },
    webclassWindowSize: { width: 1600, height: 898, ratio: '16:9' }
};

// ドメイン一覧を読み込む
function loadDomains() {
    chrome.storage.sync.get(['domains'], function(result) {
        const domains = result.domains || DEFAULT_DOMAINS;
        displayDomains(domains);
    });
}

// リンクの開き方設定を読み込む
function loadLinkBehavior() {
    chrome.storage.sync.get([
        'linkBehavior', 'mailBehavior', 'fileBehavior', 'webclassBehavior', 'attachmentBehavior',
        'mailWindowSize', 'fileWindowSize', 'attachmentWindowSize', 'linkWindowSize', 'webclassWindowSize'
    ], function(result) {
        const settings = {
            linkBehavior: result.linkBehavior || DEFAULT_SETTINGS.linkBehavior,
            mailBehavior: result.mailBehavior || DEFAULT_SETTINGS.mailBehavior,
            fileBehavior: result.fileBehavior || DEFAULT_SETTINGS.fileBehavior,
            webclassBehavior: result.webclassBehavior || DEFAULT_SETTINGS.webclassBehavior,
            attachmentBehavior: result.attachmentBehavior || DEFAULT_SETTINGS.attachmentBehavior,
            mailWindowSize: result.mailWindowSize || DEFAULT_SETTINGS.mailWindowSize,
            fileWindowSize: result.fileWindowSize || DEFAULT_SETTINGS.fileWindowSize,
            attachmentWindowSize: result.attachmentWindowSize || DEFAULT_SETTINGS.attachmentWindowSize,
            linkWindowSize: result.linkWindowSize || DEFAULT_SETTINGS.linkWindowSize,
            webclassWindowSize: result.webclassWindowSize || DEFAULT_SETTINGS.webclassWindowSize
        };
        
        // PDFファイルの「同じタブ」は許可しない
        if (settings.fileBehavior === 'sameTab') {
            settings.fileBehavior = 'newTab';
            chrome.storage.sync.set({ fileBehavior: 'newTab' });
        }
        
        // 添付資料の「同じタブ」も許可しない
        if (settings.attachmentBehavior === 'sameTab') {
            settings.attachmentBehavior = 'newWindow';
            chrome.storage.sync.set({ attachmentBehavior: 'newWindow' });
        }
        
        // 各ラジオボタンを設定
        ['linkBehavior', 'mailBehavior', 'fileBehavior', 'webclassBehavior', 'attachmentBehavior'].forEach(key => {
            const radios = document.getElementsByName(key);
            for (let i = 0; i < radios.length; i++) {
                if (radios[i].value === settings[key]) {
                    radios[i].checked = true;
                    break;
                }
            }
        });
        
        // ウィンドウサイズ設定を読み込む
        loadWindowSize('mail', settings.mailWindowSize);
        loadWindowSize('file', settings.fileWindowSize);
        loadWindowSize('attachment', settings.attachmentWindowSize);
        loadWindowSize('link', settings.linkWindowSize);
        loadWindowSize('webclass', settings.webclassWindowSize);
        
        // サブウィンドウが選択されている場合、サイズ設定を表示
        updateWindowSizeVisibility();
    });
}

// ドメイン一覧を表示
function displayDomains(domains) {
    const domainList = document.getElementById('domainList');
    domainList.innerHTML = '';
    
    domains.forEach((domain, index) => {
        const domainItem = document.createElement('div');
        domainItem.className = 'domain-item';
        domainItem.innerHTML = `
            <input type="text" value="${domain}" data-index="${index}" placeholder="例: lms.example.ac.jp">
            <button class="remove-btn" data-index="${index}">削除</button>
        `;
        domainList.appendChild(domainItem);
    });
    
    // 削除ボタンのイベントリスナーを追加
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            removeDomain(index);
        });
    });
}

// ドメインを追加
function addDomain() {
    chrome.storage.sync.get(['domains'], function(result) {
        const domains = result.domains || DEFAULT_DOMAINS;
        domains.push('');
        displayDomains(domains);
    });
}

// ドメインを削除
function removeDomain(index) {
    chrome.storage.sync.get(['domains'], function(result) {
        const domains = result.domains || DEFAULT_DOMAINS;
        domains.splice(index, 1);
        
        // 最低1つは残す
        if (domains.length === 0) {
            domains.push('');
        }
        
        displayDomains(domains);
    });
}

// 権限を要求する関数
async function requestPermissionsForDomains(domains) {
    const origins = domains.map(domain => `https://${domain}/*`);
    
    try {
        const granted = await chrome.permissions.request({
            origins: origins
        });
        
        return granted;
    } catch (error) {
        console.error('権限要求エラー:', error);
        return false;
    }
}

// 設定を保存
async function saveDomains() {
    const inputs = document.querySelectorAll('.domain-item input[type="text"]');
    const domains = [];
    
    inputs.forEach(input => {
        const domain = input.value.trim();
        if (domain) {
            // http:// や https:// を削除
            const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
            if (cleanDomain) {
                domains.push(cleanDomain);
            }
        }
    });
    
    // 最低1つは必要
    if (domains.length === 0) {
        showStatus('少なくとも1つのドメインを入力してください', 'error');
        return;
    }
    
    // 各リンクの開き方を取得
    const getRadioValue = (name) => {
        const radios = document.getElementsByName(name);
        for (let i = 0; i < radios.length; i++) {
            if (radios[i].checked) {
                return radios[i].value;
            }
        }
        return DEFAULT_SETTINGS[name];
    };
    
    // ウィンドウサイズを取得
    const getWindowSize = (prefix) => {
        const widthInput = document.getElementById(`${prefix}Width`);
        const heightInput = document.getElementById(`${prefix}Height`);
        const container = document.getElementById(`${prefix}WindowSize`);
        
        if (!widthInput || !heightInput) {
            return DEFAULT_SETTINGS[`${prefix}WindowSize`];
        }
        
        const width = parseInt(widthInput.value) || DEFAULT_SETTINGS[`${prefix}WindowSize`].width;
        const height = parseInt(heightInput.value) || DEFAULT_SETTINGS[`${prefix}WindowSize`].height;
        
        // アクティブな比率を取得
        let ratio = 'custom';
        if (container) {
            const activeBtn = container.querySelector('.preset-btn.active');
            if (activeBtn) {
                ratio = activeBtn.getAttribute('data-ratio');
            }
        }
        
        return { width, height, ratio };
    };
    
    const settings = {
        domains: domains,
        linkBehavior: getRadioValue('linkBehavior'),
        mailBehavior: getRadioValue('mailBehavior'),
        fileBehavior: getRadioValue('fileBehavior'),
        webclassBehavior: getRadioValue('webclassBehavior'),
        attachmentBehavior: getRadioValue('attachmentBehavior'),
        mailWindowSize: getWindowSize('mail'),
        fileWindowSize: getWindowSize('file'),
        attachmentWindowSize: getWindowSize('attachment'),
        linkWindowSize: getWindowSize('link'),
        webclassWindowSize: getWindowSize('webclass')
    };
    
    // PDFファイルの「同じタブ」は許可しない
    if (settings.fileBehavior === 'sameTab') {
        settings.fileBehavior = 'newTab';
        showStatus('PDFファイルは同じタブで開けないため、別のタブで開く設定に変更されました。', 'info');
        const radios = document.getElementsByName('fileBehavior');
        for (let i = 0; i < radios.length; i++) {
            if (radios[i].value === 'newTab') {
                radios[i].checked = true;
                break;
            }
        }
        return;
    }
    
    // 添付資料の「同じタブ」も許可しない
    if (settings.attachmentBehavior === 'sameTab') {
        settings.attachmentBehavior = 'newWindow';
        showStatus('添付資料は同じタブで開けないため、サブウィンドウで開く設定に変更されました。', 'info');
        const radios = document.getElementsByName('attachmentBehavior');
        for (let i = 0; i < radios.length; i++) {
            if (radios[i].value === 'newWindow') {
                radios[i].checked = true;
                break;
            }
        }
        return;
    }
    
    // 新しいドメインに対して権限を要求
    const newDomains = domains.filter(d => !DEFAULT_DOMAINS.includes(d));
    
    if (newDomains.length > 0) {
        showStatus('新しいドメインへのアクセス権限を要求しています...', 'info');
        
        const granted = await requestPermissionsForDomains(domains);
        
        if (!granted) {
            showStatus('権限が拒否されました。拡張機能は設定したドメインで動作しません。', 'error');
            return;
        }
    }
    
    // 保存
    chrome.storage.sync.set(settings, function() {
        showStatus('設定を保存しました。対象ページを再読み込みしてください。', 'success');
        
        // background.jsに通知
        chrome.runtime.sendMessage({ 
            action: 'updatePermissions', 
            domains: domains 
        });
    });
}

// ステータスメッセージを表示
function showStatus(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    
    if (type !== 'info') {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}

// ウィンドウサイズ設定を読み込む
function loadWindowSize(prefix, sizeData) {
    const widthInput = document.getElementById(`${prefix}Width`);
    const heightInput = document.getElementById(`${prefix}Height`);
    const maintainRatioCheckbox = document.getElementById(`${prefix}MaintainRatio`);
    
    if (widthInput && heightInput) {
        widthInput.value = sizeData.width;
        heightInput.value = sizeData.height;
    }
    
    if (maintainRatioCheckbox) {
        maintainRatioCheckbox.checked = true;
    }
    
    // プリセットボタンのアクティブ状態を更新
    updatePresetButtons(prefix, sizeData.ratio || 'custom');
}

// プリセットボタンのアクティブ状態を更新
function updatePresetButtons(prefix, activeRatio) {
    const container = document.getElementById(`${prefix}WindowSize`);
    if (!container) return;
    
    const presetButtons = container.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
        if (btn.getAttribute('data-ratio') === activeRatio) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// 比率から幅と高さを計算
function calculateSizeFromRatio(ratio, baseWidth = 1000) {
    const ratios = {
        '16:9': { width: baseWidth, height: Math.round(baseWidth * 9 / 16) },
        '4:3': { width: baseWidth, height: Math.round(baseWidth * 3 / 4) },
        '1:1': { width: baseWidth, height: baseWidth }
    };
    return ratios[ratio] || { width: baseWidth, height: baseWidth };
}

// 比率を維持して数値を調整
function maintainAspectRatio(changedField, prefix, previousWidth, previousHeight) {
    const widthInput = document.getElementById(`${prefix}Width`);
    const heightInput = document.getElementById(`${prefix}Height`);
    const maintainRatioCheckbox = document.getElementById(`${prefix}MaintainRatio`);
    
    if (!maintainRatioCheckbox || !maintainRatioCheckbox.checked) return;
    
    const currentWidth = parseInt(widthInput.value) || 800;
    const currentHeight = parseInt(heightInput.value) || 600;
    
    if (changedField === 'width' && previousHeight > 0 && previousWidth > 0) {
        const ratio = previousHeight / previousWidth;
        const newHeight = Math.round(currentWidth * ratio);
        heightInput.value = newHeight;
        return newHeight;
    } else if (changedField === 'height' && previousWidth > 0 && previousHeight > 0) {
        const ratio = previousWidth / previousHeight;
        const newWidth = Math.round(currentHeight * ratio);
        widthInput.value = newWidth;
        return newWidth;
    }
    
    // カスタムとして設定
    updatePresetButtons(prefix, 'custom');
}

// サブウィンドウサイズ設定の表示/非表示を切り替え
function updateWindowSizeVisibility() {
    const types = ['mail', 'file', 'attachment', 'link', 'webclass'];
    
    types.forEach(type => {
        const behaviorRadios = document.getElementsByName(`${type}Behavior`);
        const windowSizeDiv = document.getElementById(`${type}WindowSize`);
        
        if (!windowSizeDiv) return;
        
        let isNewWindow = false;
        behaviorRadios.forEach(radio => {
            if (radio.checked && radio.value === 'newWindow') {
                isNewWindow = true;
            }
        });
        
        windowSizeDiv.style.display = isNewWindow ? 'block' : 'none';
    });
}

// ウィンドウサイズ設定のイベントリスナーを設定
function setupWindowSizeListeners() {
    const types = ['mail', 'file', 'attachment', 'link', 'webclass'];
    
    types.forEach(type => {
        const widthInput = document.getElementById(`${type}Width`);
        const heightInput = document.getElementById(`${type}Height`);
        const container = document.getElementById(`${type}WindowSize`);
        
        if (!container || !widthInput || !heightInput) return;
        
        let previousWidth = parseInt(widthInput.value);
        let previousHeight = parseInt(heightInput.value);
        
        // プリセットボタンのイベントリスナー
        const presetButtons = container.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const ratio = this.getAttribute('data-ratio');
                
                if (ratio === 'custom') {
                    updatePresetButtons(type, 'custom');
                    return;
                }
                
                const baseWidth = parseInt(widthInput.value) || 1000;
                const size = calculateSizeFromRatio(ratio, baseWidth);
                
                widthInput.value = size.width;
                heightInput.value = size.height;
                previousWidth = size.width;
                previousHeight = size.height;
                
                updatePresetButtons(type, ratio);
            });
        });
        
        // リセットボタンのイベントリスナー
        const resetBtn = container.querySelector('.reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const defaultSize = DEFAULT_SETTINGS[`${type}WindowSize`];
                widthInput.value = defaultSize.width;
                heightInput.value = defaultSize.height;
                previousWidth = defaultSize.width;
                previousHeight = defaultSize.height;
                updatePresetButtons(type, defaultSize.ratio);
            });
        }
        
        // 幅入力のイベントリスナー
        widthInput.addEventListener('input', function() {
            const newHeight = maintainAspectRatio('width', type, previousWidth, previousHeight);
            previousWidth = parseInt(this.value) || previousWidth;
            if (newHeight) {
                previousHeight = newHeight;
            }
        });
        
        // 高さ入力のイベントリスナー
        heightInput.addEventListener('input', function() {
            const newWidth = maintainAspectRatio('height', type, previousWidth, previousHeight);
            previousHeight = parseInt(this.value) || previousHeight;
            if (newWidth) {
                previousWidth = newWidth;
            }
        });
        
        // 行動選択のイベントリスナー
        const behaviorRadios = document.getElementsByName(`${type}Behavior`);
        behaviorRadios.forEach(radio => {
            radio.addEventListener('change', updateWindowSizeVisibility);
        });
    });
}

// イベントリスナーを設定
document.addEventListener('DOMContentLoaded', function() {
    loadDomains();
    loadLinkBehavior();
    setupWindowSizeListeners();
    
    document.getElementById('addDomainBtn').addEventListener('click', addDomain);
    document.getElementById('saveBtn').addEventListener('click', saveDomains);
});