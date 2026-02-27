# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A production-ready URL shortener built with Next.js 14 (App Router), TypeScript (strict mode), and PostgreSQL. Features bilingual support (English/Arabic with RTL), dark/light themes, multi-tenant workspaces, subscription-based plans, and a complete REST API.

## Common Commands

```bash
# Development
npm run dev                    # Start Next.js dev server
npm run build                  # Production build
npm run lint                   # ESLint

# Testing
npm run test:unit              # Unit tests (Vitest, __tests__/unit/**)
npm run test:integration       # Integration tests (Vitest, __tests__/integration/**)
npm run test:e2e               # E2E tests (Playwright, __tests__/e2e/**)
npm run test:coverage          # Coverage report

# Run single test file
npx vitest run path/to/test.test.ts --config vitest.config.ts

# Run single integration test file (uses 30s timeout)
npx vitest run path/to/test.test.ts --config vitest.integration.config.ts

# Run single E2E test file (auto-starts dev server or reuses existing)
npx playwright test path/to/test.spec.ts

# Run E2E tests with specific browser
npx playwright test --project=chromium
# Available projects: chromium, "Mobile Chrome"

# Database (Prisma + PostgreSQL)
npm run db:generate            # Generate Prisma client
npm run db:push                # Push schema to database
npm run db:migrate             # Run migrations (dev)
npm run db:migrate:deploy      # Deploy migrations (prod)
npm run db:studio              # Open Prisma Studio
```

## Architecture

### Directory Structure
- `src/app/[locale]/` - Locale-based pages (Next.js App Router with next-intl)
- `src/app/api/` - REST API routes
- `src/lib/` - Core business logic modules (see Library Modules below)
- `src/components/` - React components (ui/, url/, stats/, pricing/, payment/, layout/)
- `src/messages/` - i18n translations (en.json, ar.json)
- `src/types/index.ts` - TypeScript type definitions

### UI Component Directories (`src/components/`)
| Directory | Purpose |
|-----------|---------|
| `ui/` | shadcn/ui base components (Button, Card, Dialog, etc.) |
| `url/` | URL shortening form, result display, QR code |
| `stats/` | Analytics charts and statistics |
| `pricing/` | Pricing table, plan cards, upgrade buttons |
| `payment/` | Payment checkout dialog, method selector, kiosk/wallet components |
| `layout/` | Header, footer, navigation, sidebar |

### Library Modules (`src/lib/`)
| Module | Purpose |
|--------|---------|
| `url/` | URL shortening, validation (Zod), QR generation, UTM params |
| `auth/` | NextAuth.js v5 config with Google, GitHub, Credentials providers |
| `db/prisma.ts` | Prisma client singleton (import as `import { prisma } from '@/lib/db/prisma'`) |
| `analytics/` | Click tracking and device detection (ua-parser-js) |
| `stripe/` | Stripe subscriptions, checkout, webhooks |
| `payment/` | Multi-gateway payments (Stripe, Paymob, PayTabs, Paddle) |
| `limits/` | Plan-based feature limit checking |
| `rate-limit/` | API rate limiting per user/plan (Redis with in-memory fallback) |
| `targeting/` | Device/geo/browser-based URL targeting |
| `webhooks/` | Webhook CRUD, HMAC signatures, event dispatching |
| `workspace/` | Multi-tenant workspace permissions, invitations |
| `ab-testing/` | A/B test variant selection and statistics |
| `bio-page/` | Link-in-bio page themes and management |
| `retargeting/` | Facebook, Google Analytics, TikTok pixel integration |
| `cloaking/` | Link cloaking (iframe, JS redirect, meta refresh) |
| `deeplink/` | Mobile app deep linking with fallbacks |
| `zapier/` | Zapier trigger/action event dispatching |
| `extension/` | Browser extension token management |
| `domains/` | Custom domain verification and SSL |
| `security/` | SSRF protection for URL validation |
| `firebase/` | Firebase Admin SDK, FCM push notifications, token management |
| `api/` | Shared API utilities, `ApiError` factory, response helpers |
| `utils.ts` | `cn()` utility (clsx + tailwind-merge) for className composition |

### Key Patterns

- **Internationalization**: Uses `next-intl` with locale routing (`/en/...`, `/ar/...`). Translation files in `src/messages/`. When adding UI text, update both `en.json` and `ar.json`. Use navigation exports from `src/i18n/routing.ts` (`Link`, `redirect`, `usePathname`, `useRouter`) instead of next/navigation.
- **Middleware**: Only `next-intl` middleware is configured (`src/middleware.ts`). Authentication is NOT handled in middleware — it's checked per-route via `auth()`.
- **Authentication**: NextAuth.js v5 with JWT strategy. Import `auth`, `signIn`, `signOut` from `@/lib/auth`. Get session via `auth()` in server components/API routes. User ID available in `session.user.id`.
- **Database**: Import `{ prisma }` from `@/lib/db/prisma`. Uses singleton pattern with global caching. Dev mode enables query logging.
- **State Management**: Zustand for client-side state.
- **Firebase Client**: In React components, import from `@/lib/firebase/client` to avoid importing server-side code.
- **Path Alias**: Use `@/` to import from `src/` (configured in tsconfig and vitest).
- **Plan Limits**: Feature availability is gated by subscription plan (FREE, STARTER, PRO, BUSINESS, ENTERPRISE). Each module has a `*_LIMITS` constant (e.g., `WEBHOOK_LIMITS`, `TARGETING_LIMITS`). Use `checkLinkLimit()`, `checkWebhookLimits()`, etc. before creating resources.
- **Validation**: Zod schemas in `src/lib/url/validator.ts` for URL and alias validation.
- **Short Code Generation**: Uses `nanoid` (7 chars) in `src/lib/url/shortener.ts`.
- **Password Protection**: bcryptjs for hashing link passwords.
- **Standalone Output**: `next.config.js` uses `output: 'standalone'` for Docker deployment.

### Standard API Route Pattern

API routes follow a consistent pattern (see `src/app/api/shorten/route.ts` as reference):

1. Get session: `const session = await auth()`
2. Rate limit: `checkRateLimit(identifier, RATE_LIMIT_PRESETS.api.shorten)`
3. Validate input: `schema.parse(body)` with Zod
4. Check plan limits: `checkLinkLimit(userId)` (if authenticated)
5. Execute business logic
6. Return `NextResponse.json()` with rate limit headers
7. Error handling: `ZodError` → `handleZodError()`, others → `ApiError.internal()`

Key imports for API routes:
```typescript
import { auth } from '@/lib/auth';
import { ApiError, handleZodError } from '@/lib/api/errors';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
```

### Locale Layout Pattern

`src/app/[locale]/layout.tsx` sets `<html lang={locale} dir={dir}>` where `dir` is `'ltr'` or `'rtl'` based on locale. Wraps children in `SessionProvider` → `NextIntlClientProvider`. Uses `unstable_setRequestLocale(locale)` for static generation and `suppressHydrationWarning` for theme flash prevention.

### Database Schema (Prisma)
Key models (see `prisma/schema.prisma` for full schema):
- `User`, `Account`, `Session` - NextAuth.js authentication
- `Subscription` - Multi-gateway subscription with plan, usage tracking
- `Payment` - Payment transaction history across all gateways
- `Link` - Core model with shortCode, targeting, cloaking, deep linking
- `Click` - Analytics with IP, country, device, browser, referrer
- `LinkTarget` - Device/geo/browser targeting rules
- `ABTest`, `ABVariant` - A/B testing configuration
- `Workspace`, `WorkspaceMember`, `WorkspaceInvitation` - Multi-tenant teams
- `Webhook`, `WebhookLog` - Webhook subscriptions and delivery logs
- `RetargetingPixel`, `LinkPixel` - Tracking pixel assignments
- `BioPage`, `BioLink` - Link-in-bio pages
- `ZapierSubscription` - Zapier webhook subscriptions
- `ExtensionToken` - Browser extension authentication
- `CustomDomain` - Custom domain verification and SSL status
- `FCMToken` - Firebase Cloud Messaging device tokens

### API Routes
Core:
- `POST /api/shorten` - Create short URL
- `POST /api/shorten/bulk` - Bulk shorten (max 100)
- `GET/PUT/DELETE /api/links/[id]` - Single link operations
- `GET /api/links/[id]/stats` - Link statistics
- `GET /api/r/[shortCode]` - Redirect handler with targeting

Payment (Multi-Gateway):
- `POST /api/payment/checkout` - Unified checkout with auto gateway selection
- `GET /api/payment/methods` - Get available payment methods for region
- `POST /api/payment/webhooks/{paymob,paytabs,paddle}` - Gateway webhook handlers

Advanced Features:
- `/api/links/[id]/targets` - Link targeting rules
- `/api/links/[id]/ab-test` - A/B test configuration
- `/api/links/[id]/pixels` - Retargeting pixel assignment
- `/api/workspaces/` - Workspace CRUD, members, invitations
- `/api/webhooks/` - Webhook CRUD, logs, testing
- `/api/bio/` - Bio page management
- `/api/zapier/` - Zapier triggers and actions
- `/api/extension/` - Browser extension endpoints

### Testing Structure
- Unit tests: `__tests__/unit/` - `*.test.ts` files (`vitest.config.ts`)
- Integration tests: `__tests__/integration/` - `*.test.ts` files (`vitest.integration.config.ts`, 30s timeout)
- E2E tests: `__tests__/e2e/` - `*.spec.ts` files (Playwright, Chromium + Mobile Chrome)
- Test setup: `src/test/setup.ts` - Testing Library, DOM matchers, mocks for next/navigation, next-intl, clipboard

## Environment Variables

Required: `DATABASE_URL` (PostgreSQL), `AUTH_SECRET` (NextAuth.js secret).

Optional groups (see `.env.example` for full list):
- **OAuth**: `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Paymob** (Egypt): `PAYMOB_API_KEY`, `PAYMOB_INTEGRATION_ID_CARD`, `PAYMOB_HMAC_SECRET`, `PAYMOB_IFRAME_ID`, `PAYMOB_INTEGRATION_ID_WALLET`
- **PayTabs** (MENA): `PAYTABS_PROFILE_ID`, `PAYTABS_SERVER_KEY`, `PAYTABS_REGION`
- **Paddle** (Global): `PADDLE_API_KEY`, `PADDLE_VENDOR_ID`, `PADDLE_PUBLIC_KEY`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `PADDLE_ENVIRONMENT`
- **Redis**: `REDIS_URL` (falls back to in-memory rate limiting)
- **Firebase**: Admin SDK vars + `NEXT_PUBLIC_FIREBASE_*` client vars
- **App**: `NEXT_PUBLIC_APP_URL` (default: http://localhost:3000)

## Docker

```bash
# Development
docker-compose -f docker/docker-compose.yml up

# Production
docker-compose -f docker/docker-compose.prod.yml up -d
```
