# Phase 4.3: Retargeting Pixels Implementation Plan

## Overview
Retargeting pixels allow users to track visitors through their shortened links and build audiences for retargeting campaigns on platforms like Facebook, Google, Twitter, LinkedIn, and TikTok.

## Features
1. **Pixel Management** - Users can add/manage their retargeting pixels
2. **Link-Pixel Association** - Associate pixels with specific links
3. **Pixel Firing** - Inject pixels before redirecting visitors
4. **Conversion Tracking** - Track conversions from pixel data

## Supported Pixel Types
- Facebook Pixel
- Google Analytics (GA4)
- Google Ads (gtag)
- Twitter Pixel
- LinkedIn Insight Tag
- TikTok Pixel
- Custom (user-defined script)

## Database Schema

```prisma
model RetargetingPixel {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  name        String
  type        PixelType
  pixelId     String    // Platform-specific ID (e.g., FB pixel ID)

  isActive    Boolean   @default(true)
  links       LinkPixel[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId])
}

model LinkPixel {
  id          String           @id @default(cuid())
  linkId      String
  link        Link             @relation(fields: [linkId], references: [id], onDelete: Cascade)
  pixelId     String
  pixel       RetargetingPixel @relation(fields: [pixelId], references: [id], onDelete: Cascade)

  @@unique([linkId, pixelId])
  @@index([linkId])
}

enum PixelType {
  FACEBOOK
  GOOGLE_ANALYTICS
  GOOGLE_ADS
  TWITTER
  LINKEDIN
  TIKTOK
  CUSTOM
}
```

## Plan Limits
| Plan | Pixels | Links with Pixels |
|------|--------|-------------------|
| FREE | 0 | 0 |
| STARTER | 1 | 10 |
| PRO | 5 | 50 |
| BUSINESS | 20 | Unlimited |
| ENTERPRISE | Unlimited | Unlimited |

## API Endpoints

### Pixels CRUD
- `GET /api/pixels` - List user's pixels
- `POST /api/pixels` - Create new pixel
- `GET /api/pixels/[id]` - Get pixel details
- `PUT /api/pixels/[id]` - Update pixel
- `DELETE /api/pixels/[id]` - Delete pixel

### Link-Pixel Association
- `GET /api/links/[id]/pixels` - List pixels on a link
- `POST /api/links/[id]/pixels` - Add pixel to link
- `DELETE /api/links/[id]/pixels/[pixelId]` - Remove pixel from link

## Pixel Script Generation

Each pixel type generates appropriate tracking code:

```typescript
// Facebook Pixel
`<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
</script>`

// Google Analytics GA4
`<script async src="https://www.googletagmanager.com/gtag/js?id=${pixelId}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${pixelId}');
</script>`
```

## Implementation Steps

1. Add database models
2. Create pixel generation library
3. Create API routes
4. Update redirect to inject pixels
5. Add translations (en/ar)
6. Write unit/integration/e2e tests

## Redirect Flow

```
User clicks link
    ↓
Load link + associated pixels
    ↓
[If pixels exist]
    ↓
Serve intermediate page with pixel scripts
    ↓
Wait for pixels to fire (1-2 seconds)
    ↓
Auto-redirect to destination
```

## Files Structure

```
src/
├── lib/
│   └── retargeting/
│       ├── index.ts       # Main exports
│       ├── pixels.ts      # Pixel script generation
│       └── types.ts       # TypeScript types
├── app/
│   ├── api/
│   │   ├── pixels/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── links/[id]/pixels/
│   │       └── route.ts
│   └── [locale]/redirect/[shortCode]/page.tsx  # Pixel firing page
```
