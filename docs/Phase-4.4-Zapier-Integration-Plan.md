# Phase 4.4: Zapier Integration Implementation Plan

## Overview
Zapier integration enables users to automate workflows by connecting their URL shortener with 5,000+ apps. This implements a Zapier-compatible API that supports triggers, actions, and searches.

## Integration Architecture

### Authentication
- API Key-based authentication (already implemented)
- OAuth 2.0 support for Zapier app (future enhancement)

### Triggers (Events that start Zaps)
1. **New Link Created** - Fires when a new short link is created
2. **Link Clicked** - Fires when a link receives a click
3. **Link Expired** - Fires when a link expires
4. **New Bio Page Created** - Fires when a bio page is created

### Actions (Things Zapier can do)
1. **Create Short Link** - Create a new shortened URL
2. **Update Link** - Update an existing link
3. **Delete Link** - Delete a link
4. **Create Bio Page** - Create a new bio page
5. **Add Bio Link** - Add a link to a bio page

### Searches (Find existing data)
1. **Find Link by Short Code** - Search for a link
2. **Find Link by URL** - Search by original URL
3. **Find Bio Page by Slug** - Search for a bio page

## Database Schema

```prisma
model ZapierSubscription {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  hookUrl     String   // Zapier webhook URL
  event       String   // Event type (link.created, link.clicked, etc.)
  isActive    Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([event])
  @@unique([userId, hookUrl, event])
}
```

## Plan Limits
| Plan | Zapier Subscriptions | Events/Day |
|------|---------------------|------------|
| FREE | 0 | 0 |
| STARTER | 2 | 100 |
| PRO | 10 | 1,000 |
| BUSINESS | 50 | 10,000 |
| ENTERPRISE | Unlimited | Unlimited |

## API Endpoints

### Zapier Subscribe/Unsubscribe (for Zapier's REST Hooks)
- `POST /api/zapier/subscribe` - Subscribe to events
- `DELETE /api/zapier/subscribe` - Unsubscribe from events

### Zapier Actions
- `POST /api/zapier/actions/create-link` - Create a short link
- `PUT /api/zapier/actions/update-link` - Update a link
- `DELETE /api/zapier/actions/delete-link` - Delete a link

### Zapier Searches
- `GET /api/zapier/search/link` - Find a link
- `GET /api/zapier/search/bio-page` - Find a bio page

### Zapier Triggers (Polling fallback)
- `GET /api/zapier/triggers/new-links` - Get recently created links
- `GET /api/zapier/triggers/link-clicks` - Get recent clicks

## Event Payload Format

```typescript
// link.created
{
  id: "clx123...",
  shortCode: "abc123",
  shortUrl: "https://yourdomain.com/abc123",
  originalUrl: "https://example.com/long-url",
  title: "My Link",
  createdAt: "2025-01-01T00:00:00Z",
  userId: "user123"
}

// link.clicked
{
  linkId: "clx123...",
  shortCode: "abc123",
  clickedAt: "2025-01-01T00:00:00Z",
  country: "US",
  device: "mobile",
  browser: "chrome",
  referrer: "https://twitter.com"
}
```

## Implementation Steps

1. Add ZapierSubscription model to Prisma
2. Create Zapier event dispatcher
3. Create subscribe/unsubscribe API
4. Create action endpoints
5. Create search endpoints
6. Create polling trigger endpoints
7. Integrate with existing webhook system
8. Add plan limits
9. Add translations
10. Write tests

## Files Structure

```
src/
├── lib/
│   └── zapier/
│       ├── index.ts       # Main exports
│       ├── events.ts      # Event types and payloads
│       └── dispatcher.ts  # Send events to Zapier
├── app/
│   └── api/
│       └── zapier/
│           ├── subscribe/route.ts
│           ├── actions/
│           │   ├── create-link/route.ts
│           │   ├── update-link/route.ts
│           │   └── delete-link/route.ts
│           ├── search/
│           │   ├── link/route.ts
│           │   └── bio-page/route.ts
│           └── triggers/
│               ├── new-links/route.ts
│               └── link-clicks/route.ts
```

## Security Considerations
- API key authentication for all endpoints
- Rate limiting per plan
- Validate webhook URLs (must be HTTPS)
- Sign payloads for verification
