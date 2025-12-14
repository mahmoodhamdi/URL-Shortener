// Background Service Worker for URL Shortener Extension

// Import utilities (in Manifest V3, we need to use importScripts)
// Note: In production, these would be bundled together

// Settings storage
const STORAGE_KEYS = {
  TOKEN: 'extension_token',
  SETTINGS: 'extension_settings',
};

// Default settings
const DEFAULT_SETTINGS = {
  autoCopy: true,
  darkMode: false,
  apiEndpoint: '',
};

// Initialize context menus
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for links
  chrome.contextMenus.create({
    id: 'shorten-link',
    title: chrome.i18n.getMessage('context_menu_shorten') || 'Shorten this link',
    contexts: ['link'],
  });

  // Create context menu for page
  chrome.contextMenus.create({
    id: 'shorten-page',
    title: chrome.i18n.getMessage('context_menu_shorten_page') || 'Shorten this page',
    contexts: ['page'],
  });

  console.log('URL Shortener extension installed');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let urlToShorten = '';

  if (info.menuItemId === 'shorten-link') {
    urlToShorten = info.linkUrl;
  } else if (info.menuItemId === 'shorten-page') {
    urlToShorten = tab.url;
  }

  if (urlToShorten) {
    try {
      const result = await shortenUrl(urlToShorten);
      if (result.shortUrl) {
        // Copy to clipboard
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (url) => {
            navigator.clipboard.writeText(url);
          },
          args: [result.shortUrl],
        });

        // Show notification
        showNotification('URL Shortened!', `Copied: ${result.shortUrl}`);
      } else if (result.error) {
        showNotification('Error', result.error);
      }
    } catch (error) {
      console.error('Error shortening URL:', error);
      showNotification('Error', 'Failed to shorten URL');
    }
  }
});

// Shorten URL function
async function shortenUrl(url) {
  // Get token and settings
  const data = await chrome.storage.sync.get([STORAGE_KEYS.TOKEN, STORAGE_KEYS.SETTINGS]);
  const token = data[STORAGE_KEYS.TOKEN];
  const settings = data[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;

  if (!token) {
    return { error: 'Please login first' };
  }

  const baseUrl = settings.apiEndpoint || 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/extension/shorten`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });

    return await response.json();
  } catch (error) {
    return { error: 'Network error' };
  }
}

// Show notification
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title,
    message,
  });
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'shorten') {
    shortenUrl(request.url).then(sendResponse);
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'getSettings') {
    chrome.storage.sync.get([STORAGE_KEYS.SETTINGS], (data) => {
      sendResponse(data[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS);
    });
    return true;
  }

  if (request.action === 'saveSettings') {
    chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: request.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('URL Shortener extension started');
});
