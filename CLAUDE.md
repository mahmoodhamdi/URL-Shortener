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

# Run single E2E test file (requires dev server running)
npx playwright test path/to/test.spec.ts

# Run E2E tests with specific browser
npx playwright test --project=chromium

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
- `src/components/` - React components (ui/, url/, stats/, layout/)
- `src/messages/` - i18n translations (en.json, ar.json)
- `src/types/index.ts` - TypeScript type definitions

### Library Modules (`src/lib/`)
| Module | Purpose |
|--------|---------|
| `url/` | URL shortening, validation (Zod), QR generation, UTM params |
| `auth/` | NextAuth.js v5 config with Google, GitHub, Credentials providers |
| `analytics/` | Click tracking and device detection (ua-parser-js) |
| `stripe/` | Stripe subscriptions, checkout, webhooks |
| `limits/` | Plan-based feature limit checking |
| `rate-limit/` | API rate limiting per user/plan |
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

### Key Patterns
- **Internationalization**: Uses `next-intl` with locale routing (`/en/...`, `/ar/...`). Translation files in `src/messages/`. When adding UI text, update both `en.json` and `ar.json`. Use navigation exports from `src/i18n/routing.ts` (`Link`, `redirect`, `usePathname`, `useRouter`) instead of next/navigation.
- **Firebase Client**: In React components, import Firebase client directly from `@/lib/firebase/client` to avoid importing server-side code.
- **Path Alias**: Use `@/` to import from `src/` (configured in tsconfig and vitest)
- **Authentication**: NextAuth.js v5 with JWT strategy. Import `auth`, `signIn`, `signOut` from `@/lib/auth`. Get session via `auth()` in server components/API routes. User ID available in `session.user.id`.
- **Plan Limits**: Feature availability is gated by subscription plan (FREE, STARTER, PRO, BUSINESS, ENTERPRISE). Each module has a `*_LIMITS` constant (e.g., `WEBHOOK_LIMITS`, `TARGETING_LIMITS`). Use `checkLinkLimit()`, `checkWebhookLimits()`, etc. before creating resources.
- **Validation**: Zod schemas in `src/lib/url/validator.ts` for URL and alias validation
- **Short Code Generation**: Uses `nanoid` (7 chars) in `src/lib/url/shortener.ts`
- **Password Protection**: bcryptjs for hashing link passwords

### Database Schema (Prisma)
Key models (see `prisma/schema.prisma` for full schema):
- `User`, `Account`, `Session` - NextAuth.js authentication
- `Subscription` - Stripe subscription with plan, usage tracking
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
- Unit tests: `__tests__/unit/` - Test isolated utilities (`vitest.config.ts`)
- Integration tests: `__tests__/integration/` - Test with database (`vitest.integration.config.ts`, 30s timeout)
- E2E tests: `__tests__/e2e/` - Playwright browser tests (Chromium + Mobile Chrome)
- Test setup: `src/test/setup.ts` - Testing Library and DOM matchers

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth.js secret

OAuth (optional):
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

Stripe (optional):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Redis (optional):
- `REDIS_URL` - Redis connection URL (falls back to in-memory rate limiting)

Firebase (optional):
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` - Admin SDK
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, etc. - Client SDK

Other:
- `NEXT_PUBLIC_APP_URL` - Base URL (default: http://localhost:3000)

## Docker

```bash
# Development
docker-compose -f docker/docker-compose.yml up

# Production
docker-compose -f docker/docker-compose.prod.yml up -d
```
