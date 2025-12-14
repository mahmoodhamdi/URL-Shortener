// Options Page JavaScript

const STORAGE_KEYS = {
  TOKEN: 'extension_token',
  SETTINGS: 'extension_settings',
};

const DEFAULT_SETTINGS = {
  autoCopy: true,
  darkMode: false,
  apiEndpoint: '',
};

document.addEventListener('DOMContentLoaded', async () => {
  // Load and apply settings
  await loadSettings();

  // Translate UI
  translateUI();

  // Setup event listeners
  setupEventListeners();

  // Check token status
  await checkTokenStatus();
});

function translateUI() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      el.textContent = message;
    }
  });
}

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEYS.SETTINGS], (data) => {
      const settings = data[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;

      // Apply settings to UI
      document.getElementById('autoCopy').checked = settings.autoCopy;
      document.getElementById('darkMode').checked = settings.darkMode;
      document.getElementById('apiEndpoint').value = settings.apiEndpoint || '';

      // Apply dark mode
      if (settings.darkMode) {
        document.body.classList.add('dark');
      }

      // Apply RTL if Arabic
      const lang = chrome.i18n.getUILanguage();
      if (lang.startsWith('ar')) {
        document.dir = 'rtl';
      }

      resolve(settings);
    });
  });
}

function setupEventListeners() {
  // Save button
  document.getElementById('saveBtn').addEventListener('click', saveSettings);

  // Dark mode toggle (apply immediately)
  document.getElementById('darkMode').addEventListener('change', (e) => {
    if (e.target.checked) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  });

  // Disconnect button
  document.getElementById('disconnectBtn').addEventListener('click', disconnect);
}

async function saveSettings() {
  const settings = {
    autoCopy: document.getElementById('autoCopy').checked,
    darkMode: document.getElementById('darkMode').checked,
    apiEndpoint: document.getElementById('apiEndpoint').value.trim(),
  };

  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings }, () => {
      // Show success message
      const message = document.getElementById('saveMessage');
      message.classList.remove('hidden');

      setTimeout(() => {
        message.classList.add('hidden');
      }, 3000);

      resolve();
    });
  });
}

async function checkTokenStatus() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEYS.TOKEN], (data) => {
      const token = data[STORAGE_KEYS.TOKEN];
      const statusEl = document.getElementById('tokenStatus');
      const disconnectBtn = document.getElementById('disconnectBtn');

      if (token) {
        statusEl.textContent = 'Connected';
        statusEl.classList.add('connected');
        disconnectBtn.classList.remove('hidden');
      } else {
        statusEl.textContent = 'Not connected';
        statusEl.classList.remove('connected');
        disconnectBtn.classList.add('hidden');
      }

      resolve();
    });
  });
}

async function disconnect() {
  return new Promise((resolve) => {
    chrome.storage.sync.remove([STORAGE_KEYS.TOKEN], () => {
      checkTokenStatus();
      resolve();
    });
  });
}
