// Storage Helper for URL Shortener Extension

const Storage = {
  // Keys
  TOKEN_KEY: 'extension_token',
  SETTINGS_KEY: 'extension_settings',
  CACHE_KEY: 'extension_cache',

  /**
   * Get the extension token
   */
  async getToken() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([this.TOKEN_KEY], (result) => {
        resolve(result[this.TOKEN_KEY] || null);
      });
    });
  },

  /**
   * Save the extension token
   */
  async saveToken(token) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [this.TOKEN_KEY]: token }, resolve);
    });
  },

  /**
   * Clear the extension token
   */
  async clearToken() {
    return new Promise((resolve) => {
      chrome.storage.sync.remove([this.TOKEN_KEY], resolve);
    });
  },

  /**
   * Get settings
   */
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([this.SETTINGS_KEY], (result) => {
        resolve(result[this.SETTINGS_KEY] || this.getDefaultSettings());
      });
    });
  },

  /**
   * Get settings synchronously (for event handlers)
   */
  getSettingsSync() {
    // Return cached settings or defaults
    return this._cachedSettings || this.getDefaultSettings();
  },

  /**
   * Save settings
   */
  async saveSettings(settings) {
    this._cachedSettings = settings;
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [this.SETTINGS_KEY]: settings }, resolve);
    });
  },

  /**
   * Get default settings
   */
  getDefaultSettings() {
    return {
      autoCopy: true,
      darkMode: false,
      apiEndpoint: '',
    };
  },

  /**
   * Cache data locally
   */
  async setCache(key, data, ttl = 300000) {
    const cacheEntry = {
      data,
      expires: Date.now() + ttl,
    };

    return new Promise((resolve) => {
      chrome.storage.local.get([this.CACHE_KEY], (result) => {
        const cache = result[this.CACHE_KEY] || {};
        cache[key] = cacheEntry;
        chrome.storage.local.set({ [this.CACHE_KEY]: cache }, resolve);
      });
    });
  },

  /**
   * Get cached data
   */
  async getCache(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.CACHE_KEY], (result) => {
        const cache = result[this.CACHE_KEY] || {};
        const entry = cache[key];

        if (!entry) {
          resolve(null);
          return;
        }

        if (Date.now() > entry.expires) {
          // Cache expired, remove it
          delete cache[key];
          chrome.storage.local.set({ [this.CACHE_KEY]: cache }, () => {
            resolve(null);
          });
          return;
        }

        resolve(entry.data);
      });
    });
  },

  /**
   * Clear all cached data
   */
  async clearCache() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([this.CACHE_KEY], resolve);
    });
  },

  /**
   * Initialize settings cache
   */
  async initCache() {
    this._cachedSettings = await this.getSettings();
  },
};

// Initialize cache on load
Storage.initCache();
