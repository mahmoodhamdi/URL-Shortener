# Phase 4.5: Link Cloaking Implementation Plan

## Overview
Link cloaking hides the destination URL from visitors, preventing them from seeing where the link ultimately leads. This is useful for affiliate links, tracking protection, and branding.

## Cloaking Methods

### 1. Meta Refresh Method (Simple)
- Uses a meta refresh tag with delay
- Shows an intermediate page before redirecting
- Destination URL visible in page source

### 2. JavaScript Redirect (Medium)
- Uses JavaScript to perform the redirect
- Harder to see destination without JavaScript enabled
- Still visible if JavaScript is disabled

### 3. iFrame Method (Full Cloaking)
- Loads destination in an iFrame
- Original URL stays in browser address bar
- May break some sites (X-Frame-Options)

### 4. Server-Side Proxy (Advanced)
- Fetches content from destination server
- Serves it through your domain
- Highest bandwidth usage
- Most seamless experience

## Chosen Implementation: iFrame + JavaScript Fallback

For this implementation, we'll use the iFrame method with JavaScript fallback when iFrame is blocked.

## Database Schema

```prisma
// Update Link model
model Link {
  // ... existing fields

  cloakingEnabled  Boolean  @default(false)
  cloakingType     CloakingType?
  cloakingTitle    String?  // Custom title for cloaked page
  cloakingFavicon  String?  // Custom favicon URL
}

enum CloakingType {
  IFRAME       // Load destination in iframe
  JAVASCRIPT   // JavaScript redirect with delay
  META_REFRESH // Meta refresh redirect
}
```

## Plan Limits

| Plan | Link Cloaking |
|------|--------------|
| FREE | Not available |
| STARTER | 10 cloaked links |
| PRO | 50 cloaked links |
| BUSINESS | Unlimited |
| ENTERPRISE | Unlimited |

## API Endpoints

### Update Link with Cloaking
- `PUT /api/links/[id]` - Add cloaking settings to existing update endpoint

### Fields to add:
```typescript
{
  cloakingEnabled: boolean,
  cloakingType: 'IFRAME' | 'JAVASCRIPT' | 'META_REFRESH',
  cloakingTitle?: string,
  cloakingFavicon?: string
}
```

## Cloaked Page Template

### iFrame Mode
```html
<!DOCTYPE html>
<html>
<head>
  <title>{cloakingTitle || 'Redirecting...'}</title>
  <link rel="icon" href="{cloakingFavicon || defaultFavicon}">
  <style>
    body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
    iframe { border: none; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <iframe src="{destinationUrl}" allowfullscreen></iframe>
  <script>
    // Fallback if iframe fails to load
    document.querySelector('iframe').onerror = function() {
      window.location.href = '{destinationUrl}';
    };
  </script>
</body>
</html>
```

### JavaScript Mode
```html
<!DOCTYPE html>
<html>
<head>
  <title>{cloakingTitle || 'Redirecting...'}</title>
  <meta name="robots" content="noindex">
</head>
<body>
  <p>Redirecting...</p>
  <script>
    setTimeout(function() {
      window.location.href = '{destinationUrl}';
    }, 100);
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0;url={destinationUrl}">
  </noscript>
</body>
</html>
```

### Meta Refresh Mode
```html
<!DOCTYPE html>
<html>
<head>
  <title>{cloakingTitle || 'Redirecting...'}</title>
  <meta http-equiv="refresh" content="0;url={destinationUrl}">
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>
```

## Implementation Steps

1. Update Prisma schema with cloaking fields
2. Create cloaking library (`src/lib/cloaking/`)
3. Create cloaked page template component
4. Update redirect route to handle cloaking
5. Add cloaking settings to link edit dialog
6. Add plan limits for cloaking
7. Add translations (en/ar)
8. Write tests

## Files Structure

```
src/
├── lib/
│   └── cloaking/
│       ├── index.ts        # Main exports
│       ├── templates.ts    # HTML templates
│       └── checker.ts      # Plan limits checker
├── app/
│   └── c/
│       └── [shortCode]/
│           └── page.tsx    # Cloaked page renderer
```

## Security Considerations

- Validate destination URLs to prevent XSS
- Add X-Frame-Options header check before allowing iFrame
- Sanitize custom titles and favicons
- Rate limit cloaked page requests
- Add robots noindex to prevent indexing cloaked pages

## Notes

- iFrame cloaking may not work for sites that block iFrames
- Cloaked links may be flagged by some security tools
- Document that cloaking hides destination from casual inspection only
