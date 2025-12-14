# Phase 3.3: Webhooks Implementation Plan

## Overview
Webhooks allow users to receive real-time notifications when events occur in their account. This enables integrations with external systems like CRMs, analytics platforms, and automation tools.

## Feature Components

### 1. Database Schema

```prisma
model Webhook {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  name        String      // User-friendly name
  url         String      // Webhook endpoint URL
  secret      String      // HMAC secret for signature verification
  events      String[]    // Events to trigger webhook

  isActive    Boolean     @default(true)
  failCount   Int         @default(0)   // Consecutive failures
  lastError   String?     // Last error message

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  logs        WebhookLog[]

  @@index([userId])
  @@index([isActive])
}

model WebhookLog {
  id          String   @id @default(cuid())
  webhookId   String
  webhook     Webhook  @relation(fields: [webhookId], references: [id], onDelete: Cascade)

  event       String
  payload     Json
  statusCode  Int?
  response    String?  @db.Text
  duration    Int?     // Response time in ms
  success     Boolean

  createdAt   DateTime @default(now())

  @@index([webhookId])
  @@index([createdAt])
}
```

### 2. Supported Events

| Event           | Description                    | Payload                    |
|-----------------|--------------------------------|----------------------------|
| link.created    | New link created               | link object                |
| link.updated    | Link settings changed          | link object, changes       |
| link.deleted    | Link deleted                   | link id, shortCode         |
| link.clicked    | Link was clicked               | link, click details        |
| link.expired    | Link reached expiration        | link object                |

### 3. Files to Create

**Library:**
- `src/lib/webhooks/index.ts` - Main webhook logic
- `src/lib/webhooks/events.ts` - Event definitions
- `src/lib/webhooks/sender.ts` - HTTP sender with retry
- `src/lib/webhooks/signature.ts` - HMAC signature

**API Routes:**
- `src/app/api/webhooks/route.ts` - List/Create webhooks
- `src/app/api/webhooks/[id]/route.ts` - Get/Update/Delete
- `src/app/api/webhooks/[id]/logs/route.ts` - Get webhook logs
- `src/app/api/webhooks/[id]/test/route.ts` - Send test event

### 4. Webhook Payload Format

```json
{
  "id": "evt_xxxxx",
  "event": "link.clicked",
  "timestamp": "2024-01-15T12:00:00Z",
  "data": {
    "link": { ... },
    "click": { ... }
  }
}
```

### 5. Security

- HMAC-SHA256 signature in `X-Webhook-Signature` header
- Secret generated per webhook (32 chars)
- Signature format: `sha256=<hex_digest>`
- Verification: `HMAC(secret, timestamp + '.' + payload)`

### 6. Plan Limits

| Plan       | Max Webhooks |
|------------|--------------|
| FREE       | 0            |
| STARTER    | 1            |
| PRO        | 5            |
| BUSINESS   | 20           |
| ENTERPRISE | Unlimited    |

### 7. Implementation Steps

1. ✅ Create implementation plan
2. Add Prisma schema changes
3. Create webhook library (signature, sender)
4. Create event trigger system
5. Create API endpoints
6. Add translations
7. Write unit tests
8. Commit and push
