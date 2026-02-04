// デフォルトのドメイン
const DEFAULT_DOMAINS = ['lms.salesio-sp.ac.jp'];

// ドメイン一覧を読み込む
function loadDomains() {
    chrome.storage.sync.get(['domains'], function(result) {
        const domains = result.domains || DEFAULT_DOMAINS;
        displayDomains(domains);
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

// 設定を保存
function saveDomains() {
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
    
    // 保存
    chrome.storage.sync.set({ domains: domains }, function() {
        showStatus('設定を保存しました', 'success');
        
        // background.jsに通知して権限を更新
        chrome.runtime.sendMessage({ action: 'updatePermissions', domains: domains });
    });
}

// ステータスメッセージを表示
function showStatus(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
}

// イベントリスナーを設定
document.addEventListener('DOMContentLoaded', function() {
    loadDomains();
    
    document.getElementById('addDomainBtn').addEventListener('click', addDomain);
    document.getElementById('saveBtn').addEventListener('click', saveDomains);
});
