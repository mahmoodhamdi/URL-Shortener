// Popup JavaScript

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize
  await initializePopup();
});

async function initializePopup() {
  // Apply theme
  const settings = await Storage.getSettings();
  if (settings.darkMode) {
    document.body.classList.add('dark');
  }

  // Apply RTL if Arabic
  const lang = chrome.i18n.getUILanguage();
  if (lang.startsWith('ar')) {
    document.dir = 'rtl';
  }

  // Translate UI
  translateUI();

  // Check authentication
  const token = await Storage.getToken();
  if (token) {
    const valid = await API.validateToken(token);
    if (valid) {
      showMainView(valid.user);
      await loadRecentLinks();
    } else {
      await Storage.clearToken();
      showLoginView();
    }
  } else {
    showLoginView();
  }

  // Setup event listeners
  setupEventListeners();
}

function translateUI() {
  // Translate data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      el.textContent = message;
    }
  });

  // Translate placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      el.placeholder = message;
    }
  });
}

function showLoginView() {
  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('mainView').classList.add('hidden');
}

function showMainView(user) {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('mainView').classList.remove('hidden');

  if (user) {
    document.getElementById('userName').textContent = user.name || user.email;
  }

  // Get current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.url) {
      document.getElementById('currentUrl').textContent = tabs[0].url;
      document.getElementById('currentUrl').title = tabs[0].url;
    }
  });
}

function setupEventListeners() {
  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Connect button (login)
  document.getElementById('connectBtn').addEventListener('click', handleConnect);

  // Get token link
  document.getElementById('getTokenLink').addEventListener('click', (e) => {
    e.preventDefault();
    const settings = Storage.getSettingsSync();
    const baseUrl = settings.apiEndpoint || 'http://localhost:3000';
    chrome.tabs.create({ url: `${baseUrl}/settings/extensions` });
  });

  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  // Shorten button
  document.getElementById('shortenBtn').addEventListener('click', handleShorten);

  // Copy button
  document.getElementById('copyBtn').addEventListener('click', handleCopy);

  // QR button
  document.getElementById('qrBtn').addEventListener('click', handleShowQR);

  // Close QR modal
  document.getElementById('closeQrModal').addEventListener('click', () => {
    document.getElementById('qrModal').classList.add('hidden');
  });

  // Token input enter key
  document.getElementById('tokenInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleConnect();
    }
  });

  // Alias input enter key
  document.getElementById('aliasInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleShorten();
    }
  });
}

async function handleConnect() {
  const tokenInput = document.getElementById('tokenInput');
  const token = tokenInput.value.trim();
  const errorEl = document.getElementById('loginError');

  if (!token) {
    errorEl.textContent = chrome.i18n.getMessage('invalid_token');
    errorEl.classList.remove('hidden');
    return;
  }

  showLoading(true);
  errorEl.classList.add('hidden');

  try {
    const result = await API.validateToken(token);

    if (result && result.valid) {
      await Storage.saveToken(token);
      showMainView(result.user);
      await loadRecentLinks();
      tokenInput.value = '';
    } else {
      errorEl.textContent = chrome.i18n.getMessage('invalid_token');
      errorEl.classList.remove('hidden');
    }
  } catch (error) {
    errorEl.textContent = chrome.i18n.getMessage('invalid_token');
    errorEl.classList.remove('hidden');
  } finally {
    showLoading(false);
  }
}

async function handleLogout() {
  await Storage.clearToken();
  showLoginView();
  showToast('Logged out');
}

async function handleShorten() {
  const currentUrl = document.getElementById('currentUrl').textContent;
  const alias = document.getElementById('aliasInput').value.trim();
  const btn = document.getElementById('shortenBtn');

  if (!currentUrl) return;

  btn.disabled = true;
  btn.textContent = chrome.i18n.getMessage('shortening');
  showLoading(true);

  try {
    const token = await Storage.getToken();
    const result = await API.shortenUrl(token, {
      url: currentUrl,
      customAlias: alias || undefined,
    });

    if (result.error) {
      showToast(result.error, true);
      return;
    }

    // Show result
    const resultSection = document.getElementById('resultSection');
    const shortUrlInput = document.getElementById('shortUrl');

    shortUrlInput.value = result.shortUrl;
    resultSection.classList.remove('hidden');

    // Update usage
    if (result.usage) {
      document.getElementById('usageCount').textContent = result.usage.used;
      document.getElementById('usageLimit').textContent = result.usage.limit;
    }

    // Auto-copy if enabled
    const settings = await Storage.getSettings();
    if (settings.autoCopy) {
      await navigator.clipboard.writeText(result.shortUrl);
      showToast(chrome.i18n.getMessage('copied'));
    } else {
      showToast('URL shortened!');
    }

    // Clear alias input
    document.getElementById('aliasInput').value = '';

    // Reload recent links
    await loadRecentLinks();
  } catch (error) {
    showToast(chrome.i18n.getMessage('error_shortening'), true);
  } finally {
    btn.disabled = false;
    btn.textContent = chrome.i18n.getMessage('shorten_button');
    showLoading(false);
  }
}

async function handleCopy() {
  const shortUrl = document.getElementById('shortUrl').value;
  if (shortUrl) {
    await navigator.clipboard.writeText(shortUrl);
    const copyBtn = document.getElementById('copyBtn');
    copyBtn.textContent = chrome.i18n.getMessage('copied');
    setTimeout(() => {
      copyBtn.textContent = chrome.i18n.getMessage('copy');
    }, 2000);
  }
}

async function handleShowQR() {
  const shortUrl = document.getElementById('shortUrl').value;
  if (!shortUrl) return;

  const modal = document.getElementById('qrModal');
  const qrContainer = document.getElementById('qrCode');

  // Clear previous QR
  qrContainer.innerHTML = '';

  // Generate QR code using API
  try {
    showLoading(true);
    const token = await Storage.getToken();
    const settings = await Storage.getSettings();
    const baseUrl = settings.apiEndpoint || 'http://localhost:3000';

    // Create QR code using canvas (simple implementation)
    const img = document.createElement('img');
    img.src = `${baseUrl}/api/qr?url=${encodeURIComponent(shortUrl)}`;
    img.alt = 'QR Code';
    img.style.maxWidth = '200px';
    qrContainer.appendChild(img);

    modal.classList.remove('hidden');
  } catch (error) {
    showToast('Failed to generate QR code', true);
  } finally {
    showLoading(false);
  }
}

async function loadRecentLinks() {
  const container = document.getElementById('recentLinks');

  try {
    const token = await Storage.getToken();
    const result = await API.getHistory(token, 5);

    if (!result.links || result.links.length === 0) {
      container.innerHTML = `<p class="empty-state">${chrome.i18n.getMessage('no_recent_links')}</p>`;
      return;
    }

    container.innerHTML = result.links.map(link => `
      <div class="link-item">
        <div class="link-item-info">
          <div class="link-item-short">${Utils.truncate(link.shortUrl, 35)}</div>
          <div class="link-item-original">${Utils.truncate(link.originalUrl, 40)}</div>
        </div>
        <div class="link-item-stats">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="10 17 15 12 10 7" />
          </svg>
          ${link.clicks}
        </div>
        <div class="link-item-actions">
          <button onclick="copyToClipboard('${link.shortUrl}')" title="${chrome.i18n.getMessage('copy')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button onclick="openUrl('${link.shortUrl}')" title="${chrome.i18n.getMessage('open_short')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = `<p class="empty-state">${chrome.i18n.getMessage('error_loading')}</p>`;
  }
}

function showLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  if (show) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.background = isError ? 'var(--error)' : 'var(--text-primary)';
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// Global functions for inline handlers
window.copyToClipboard = async (text) => {
  await navigator.clipboard.writeText(text);
  showToast(chrome.i18n.getMessage('copied'));
};

window.openUrl = (url) => {
  chrome.tabs.create({ url });
};
