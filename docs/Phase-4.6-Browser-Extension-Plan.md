# Phase 4.6: Browser Extension Implementation Plan

## Overview

Implement a browser extension (Chrome/Edge/Firefox) that allows users to quickly shorten URLs from any webpage, view their link history, and manage settings.

## Features

### Core Features
1. **Quick URL Shortening**
   - One-click shortening of current page URL
   - Right-click context menu for shortening any link
   - Copy shortened URL to clipboard
   - Show QR code for shortened URL

2. **Customization Options**
   - Custom alias input
   - Password protection toggle
   - Expiration date picker
   - UTM parameters builder

3. **Link History**
   - View recently shortened links
   - Quick copy to clipboard
   - Open original/shortened URL
   - View basic stats

4. **Authentication**
   - Login/logout functionality
   - API key management
   - Sync with web account

5. **Settings**
   - Default domain selection
   - Auto-copy after shortening
   - Notification preferences
   - Theme (light/dark)

## Technical Architecture

### Directory Structure
```
browser-extension/
├── manifest.json              # Extension manifest (V3)
├── popup/
│   ├── popup.html            # Main popup UI
│   ├── popup.css             # Popup styles
│   └── popup.js              # Popup logic
├── background/
│   └── service-worker.js     # Background service worker
├── content/
│   └── content.js            # Content script (if needed)
├── options/
│   ├── options.html          # Settings page
│   ├── options.css           # Settings styles
│   └── options.js            # Settings logic
├── lib/
│   ├── api.js                # API client
│   ├── storage.js            # Chrome storage helpers
│   └── utils.js              # Utility functions
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── _locales/
    ├── en/
    │   └── messages.json
    └── ar/
        └── messages.json
```

### Manifest V3
```json
{
  "manifest_version": 3,
  "name": "URL Shortener",
  "description": "Quickly shorten URLs with custom aliases, QR codes, and analytics",
  "version": "1.0.0",
  "permissions": [
    "storage",
    "activeTab",
    "contextMenus",
    "clipboardWrite"
  ],
  "host_permissions": [
    "http://localhost:3000/*",
    "https://your-domain.com/*"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "options_page": "options/options.html",
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### API Integration

The extension will use the existing API endpoints:

1. **POST /api/shorten** - Create short URL
2. **GET /api/links** - Get user's links
3. **POST /api/qr** - Generate QR code
4. **GET /api/links/[id]/stats** - Get link statistics

### Authentication Flow

1. User clicks "Login" in extension
2. Opens login page in new tab
3. After successful login, redirects to callback page
4. Callback page sends API key to extension via message
5. Extension stores API key in chrome.storage.sync

### Backend API Additions

New API endpoint for extension authentication:
```
POST /api/extension/auth
  - Generate API key for extension
  - Return key with permissions

GET /api/extension/callback
  - Handle OAuth callback
  - Return API key to extension

POST /api/extension/validate
  - Validate API key
  - Return user info
```

## UI Design

### Popup Layout
```
┌─────────────────────────────────┐
│ ⚡ URL Shortener          [⚙️] │
├─────────────────────────────────┤
│ 🔗 Current URL:                 │
│ ┌─────────────────────────────┐ │
│ │ https://example.com/long... │ │
│ └─────────────────────────────┘ │
│                                 │
│ Custom Alias (optional):        │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │    [⚡ Shorten URL]         │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ 📋 Shortened:                   │
│ ┌─────────────────────────────┐ │
│ │ https://short.url/abc123 📋 │ │
│ └─────────────────────────────┘ │
│         [📱 QR Code]            │
├─────────────────────────────────┤
│ 🕐 Recent Links:                │
│ • short.url/abc123    📋 📊    │
│ • short.url/def456    📋 📊    │
│ • short.url/ghi789    📋 📊    │
└─────────────────────────────────┘
```

### Color Scheme
- Primary: #3B82F6 (blue)
- Success: #10B981 (green)
- Background: #FFFFFF / #1F2937 (dark)
- Text: #1F2937 / #F9FAFB (dark)

## Implementation Steps

### Step 1: Backend API Endpoints
1. Create `/api/extension/auth` endpoint
2. Create `/api/extension/validate` endpoint
3. Add CORS support for extension
4. Create extension-specific API key type

### Step 2: Extension Structure
1. Create manifest.json
2. Set up popup HTML/CSS/JS
3. Create background service worker
4. Implement storage helpers

### Step 3: Core Functionality
1. Implement URL shortening in popup
2. Add clipboard copy functionality
3. Add context menu integration
4. Implement QR code display

### Step 4: Authentication
1. Create login flow
2. Store API key securely
3. Add logout functionality
4. Handle token expiration

### Step 5: Settings & History
1. Create options page
2. Implement link history view
3. Add settings persistence
4. Add theme toggle

### Step 6: Localization
1. Add English translations
2. Add Arabic translations
3. Implement RTL support

### Step 7: Testing
1. Unit tests for API client
2. Integration tests for storage
3. Manual testing in browser

## Database Changes

### Add ExtensionToken model
```prisma
model ExtensionToken {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  token       String   @unique
  name        String   @default("Browser Extension")

  lastUsed    DateTime?
  expiresAt   DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([token])
}
```

### Plan Limits
| Plan | Extension Tokens |
|------|-----------------|
| FREE | 1 |
| STARTER | 3 |
| PRO | 10 |
| BUSINESS | Unlimited |
| ENTERPRISE | Unlimited |

## Testing Strategy

### Unit Tests
- API client methods
- Storage helpers
- Utility functions

### Integration Tests
- Authentication flow
- URL shortening flow
- Settings persistence

### E2E Tests
- Extension installation
- Full shortening workflow
- Settings page functionality

## Security Considerations

1. **API Key Storage**: Use chrome.storage.sync with encryption
2. **HTTPS Only**: All API calls over HTTPS
3. **Token Expiration**: Tokens expire after 30 days of inactivity
4. **Minimal Permissions**: Only request necessary permissions
5. **Content Security Policy**: Strict CSP in manifest

## Build & Distribution

### Build Script
```bash
# Build for Chrome
npm run build:extension

# Package for Chrome Web Store
npm run package:chrome

# Package for Firefox Add-ons
npm run package:firefox
```

### Distribution
1. Chrome Web Store
2. Firefox Add-ons
3. Edge Add-ons (same as Chrome)
4. Direct download (.zip)

## Timeline

1. **Backend API** - 1 hour
2. **Extension Structure** - 1 hour
3. **Core Functionality** - 2 hours
4. **Authentication** - 1 hour
5. **Settings & History** - 1 hour
6. **Localization** - 30 minutes
7. **Testing** - 1 hour

**Total: ~7.5 hours**

## Success Metrics

- Easy one-click shortening
- Consistent with web app UX
- Works offline (cached history)
- Fast performance (<500ms API response)
- Cross-browser compatibility
