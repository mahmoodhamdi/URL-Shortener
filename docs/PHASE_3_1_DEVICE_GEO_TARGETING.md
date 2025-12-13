# Phase 3.1: Device/Geo Targeting Implementation Plan

## Overview
Device and geographic targeting allows users to redirect visitors to different URLs based on their device type, operating system, browser, country, or language. This is a premium feature for marketing campaigns and app deep linking.

## Feature Components

### 1. Database Schema

**New Model: LinkTarget**
```prisma
model LinkTarget {
  id        String     @id @default(cuid())
  linkId    String
  link      Link       @relation(fields: [linkId], references: [id], onDelete: Cascade)

  type      TargetType
  value     String     // e.g., "ios", "android", "US", "EG", "mobile"
  targetUrl String

  priority  Int        @default(0)  // Higher priority = checked first
  isActive  Boolean    @default(true)

  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@index([linkId])
  @@unique([linkId, type, value])  // Prevent duplicate rules
}

enum TargetType {
  DEVICE     // mobile, desktop, tablet
  OS         // ios, android, windows, macos, linux
  BROWSER    // chrome, safari, firefox, edge
  COUNTRY    // ISO country codes (US, EG, SA, etc.)
  LANGUAGE   // ISO language codes (en, ar, etc.)
}
```

### 2. Files to Create/Modify

**New Files:**
- `src/lib/targeting/index.ts` - Main targeting logic
- `src/lib/targeting/matcher.ts` - Target matching utilities
- `src/lib/targeting/detector.ts` - Device/geo detection
- `src/app/api/links/[id]/targets/route.ts` - CRUD API for targets
- `src/components/targeting/TargetingRules.tsx` - UI component
- `src/components/targeting/TargetRuleRow.tsx` - Individual rule row
- `__tests__/unit/targeting/matcher.test.ts` - Unit tests
- `__tests__/unit/targeting/detector.test.ts` - Unit tests
- `__tests__/integration/api/targets.test.ts` - API tests

**Modified Files:**
- `prisma/schema.prisma` - Add LinkTarget model
- `src/app/api/r/[shortCode]/route.ts` - Add targeting to redirect
- `src/components/url/LinkEditDialog.tsx` - Add targeting section
- `src/messages/en.json` - Add translations
- `src/messages/ar.json` - Add Arabic translations
- `src/types/index.ts` - Add TypeScript types

### 3. Targeting Logic Flow

```
User clicks short URL
       ↓
Fetch link from database
       ↓
Fetch link targets (sorted by priority DESC)
       ↓
For each target:
  - Detect user's device/OS/browser/country/language
  - Check if target matches
  - If match → redirect to target URL
       ↓
No match → redirect to original URL
```

### 4. Detection Methods

**Device Detection:**
- Parse User-Agent header
- Categories: mobile, desktop, tablet

**OS Detection:**
- Parse User-Agent for: ios, android, windows, macos, linux

**Browser Detection:**
- Parse User-Agent for: chrome, safari, firefox, edge, opera

**Country Detection:**
- Use Vercel's `x-vercel-ip-country` header (production)
- Use `cf-ipcountry` header (Cloudflare)
- Fallback: MaxMind GeoIP or similar service

**Language Detection:**
- Parse `Accept-Language` header
- Return primary language code

### 5. API Endpoints

**GET /api/links/[id]/targets**
- Returns all targets for a link
- Requires authentication
- User must own the link

**POST /api/links/[id]/targets**
- Create new target rule
- Body: `{ type, value, targetUrl, priority?, isActive? }`
- Validates target type and value

**PUT /api/links/[id]/targets/[targetId]**
- Update existing target
- Body: `{ targetUrl?, priority?, isActive? }`

**DELETE /api/links/[id]/targets/[targetId]**
- Delete target rule

### 6. UI Components

**TargetingRules Component:**
- Collapsible section in LinkEditDialog
- "Add Rule" button
- List of existing rules with edit/delete
- Drag-and-drop for priority ordering (optional)

**TargetRuleRow Component:**
- Type selector (Device, OS, Browser, Country, Language)
- Value selector (dynamic based on type)
- Target URL input
- Toggle for active/inactive
- Delete button

### 7. Predefined Values

**Device Types:**
- mobile, desktop, tablet

**Operating Systems:**
- ios, android, windows, macos, linux, chromeos

**Browsers:**
- chrome, safari, firefox, edge, opera, samsung

**Countries (Common):**
- All ISO 3166-1 alpha-2 codes
- Focus on Arabic-speaking countries: EG, SA, AE, KW, QA, BH, OM, JO, LB, IQ, SY, YE, LY, TN, DZ, MA, SD

**Languages:**
- ar, en, fr, de, es, zh, ja, ko, etc.

### 8. Plan Limits

| Plan       | Max Rules per Link |
|------------|-------------------|
| FREE       | 0                 |
| STARTER    | 2                 |
| PRO        | 5                 |
| BUSINESS   | 20                |
| ENTERPRISE | Unlimited         |

### 9. Test Scenarios

**Unit Tests:**
1. Device detection from User-Agent
2. OS detection from User-Agent
3. Browser detection from User-Agent
4. Target matching logic
5. Priority sorting

**Integration Tests:**
1. Create target rule via API
2. Update target rule
3. Delete target rule
4. Redirect with device targeting
5. Redirect with country targeting
6. Plan limit enforcement

**E2E Tests:**
1. Add targeting rule via UI
2. Edit targeting rule
3. Delete targeting rule
4. Verify redirect behavior

### 10. Implementation Steps

1. ✅ Create implementation plan
2. Add Prisma schema changes
3. Create detection utilities
4. Create matching logic
5. Create API endpoints
6. Update redirect route
7. Create UI components
8. Add translations
9. Write unit tests
10. Write integration tests
11. Write E2E tests
12. Commit and push
