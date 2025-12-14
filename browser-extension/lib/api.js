// API Client for URL Shortener Extension

const API = {
  /**
   * Get the API base URL from settings or use default
   */
  async getBaseUrl() {
    const settings = await Storage.getSettings();
    return settings.apiEndpoint || 'http://localhost:3000';
  },

  /**
   * Make an API request
   */
  async request(endpoint, options = {}) {
    const baseUrl = await this.getBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed', status: response.status };
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      return { error: 'Network error', status: 0 };
    }
  },

  /**
   * Validate an extension token
   */
  async validateToken(token) {
    const result = await this.request('/api/extension/validate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return result.valid ? result : null;
  },

  /**
   * Shorten a URL
   */
  async shortenUrl(token, data) {
    return this.request('/api/extension/shorten', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Get link history
   */
  async getHistory(token, limit = 10) {
    return this.request(`/api/extension/history?limit=${limit}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Get QR code for a URL
   */
  async getQRCode(token, url) {
    const baseUrl = await this.getBaseUrl();
    return `${baseUrl}/api/qr?url=${encodeURIComponent(url)}`;
  },
};
