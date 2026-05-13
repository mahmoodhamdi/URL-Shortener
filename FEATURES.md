# Sales-Prep Feature Audit

Snapshot of the feature audit performed during sales-readiness preparation.

## Already present (verified)

| Area | Status |
|------|--------|
| URL shortening (custom alias, expiration, password) | ✅ Working |
| QR code generation | ✅ Working |
| Bulk shortening | ✅ Working |
| Click analytics (device, country, browser, referrer) | ✅ Working |
| Authentication (NextAuth.js v5, Google, GitHub, credentials) | ✅ Working |
| Bilingual EN/AR with full RTL layout | ✅ Working |
| Dark/light theme with FOUC prevention | ✅ Working |
| Multi-tenant workspaces with invitations | ✅ Working |
| Subscription-based plans (FREE → ENTERPRISE) | ✅ Working |
| Multi-gateway payments (Stripe, Paymob, PayTabs, Paddle) | ✅ Working |
| Webhooks (HMAC-signed, retry-able) | ✅ Working |
| Zapier integration (triggers + actions) | ✅ Working |
| Browser extension token surface | ✅ Working |
| Link targeting (device, geo, browser) | ✅ Working |
| A/B testing | ✅ Working |
| Retargeting pixels (Facebook, GA, TikTok, etc.) | ✅ Working |
| Bio pages (Linktree-style) | ✅ Working |
| Custom domains with verification | ✅ Working |
| Standalone Docker output | ✅ Working |
| Rate limiting (Redis with in-memory fallback) | ✅ Working |
| OpenAPI spec at `/api/docs` | ✅ Working |

## Added during sales prep

| Feature | Files | Notes |
|---------|-------|-------|
| Dynamic `robots.txt` | `src/app/robots.ts` | Disallows `/api/`, `/dashboard`, `/settings`, `/login`, `/register`. Allows pricing, api-docs, status. |
| Dynamic `sitemap.xml` | `src/app/sitemap.ts` | All public pages × both locales, with hreflang alternates. |
| Enhanced OpenGraph + Twitter cards | `src/app/[locale]/layout.tsx` | Full `openGraph`, `twitter`, `alternates.languages`, `robots`, canonical, `metadataBase`. |
| Enhanced `/api/health` | `src/app/api/health/route.ts` | Now reports version, uptime, DB latency, and Redis status (or `not_configured`). |
| Public `/status` page | `src/app/[locale]/status/page.tsx`, `src/components/status/StatusBoard.tsx` | Auto-refreshing client board that polls `/api/health` every 30 s. |
| GDPR cookie consent banner | `src/components/consent/CookieConsent.tsx` | Persists choice in localStorage + cookie, hidden once a choice is made. Wired into the locale layout. |
| Abstract error reporter | `src/lib/errors/reporter.ts` | `ErrorReporter` interface with a console default. Swap in Sentry/Datadog/etc. by calling `setErrorReporter()` at boot — no SDK assumption baked into the codebase. |
| GDPR data export (`/api/me/export`) | `src/app/api/me/export/route.ts` | Returns the requester's user record, links, recent clicks, subscriptions, and webhooks. JSON by default, `?format=csv` available. |
| API key management endpoints | `src/app/api/api-keys/route.ts`, `src/app/api/api-keys/[id]/route.ts` | `GET` lists, `POST` creates and returns the plaintext key exactly once, `DELETE` revokes. Backed by the existing `ApiKey` model. |
| `next-intl` locale return fix | `src/i18n/request.ts` | Returns `locale` explicitly to satisfy the next-major next-intl API. |
| Forced-dynamic markers on header-using routes | 11 API routes under `src/app/api/...` | Eliminates the "Dynamic server usage" warnings that the build was emitting. |

## Shipped in PR #4 (previously deferred)

| Feature | Status | Notes |
|---------|--------|-------|
| API key management **UI** | ✅ Shipped | `src/components/settings/ApiKeysCard.tsx` — create / list / revoke against the existing `/api/api-keys` endpoints. Plaintext key shown once. |
| Admin panel (read-only v1) | ✅ Shipped | `src/app/[locale]/admin/page.tsx` — gated by `ADMIN_EMAILS`. Stats tiles + plan breakdown + recent users + recent links. Mutations are still Phase-2. |
| Long-form walkthrough video | ✅ Shipped | `marketing/videos/walkthrough.mp4`, 68 s. Recorder is `marketing/scripts/walkthrough-video.ts`. |

## Deliberately deferred (still not in sales-prep scope)

| Feature | Reason for deferral |
|---------|---------------------|
| Admin panel — **mutations** (user role changes, link removal, refund actions) | Needs the buyer's role model and audit log decisions. The current read-only panel is the safe v1; CLIENT-ONBOARDING.md lists this as Phase-2. |
| 2FA TOTP with backup codes | Needs UX, recovery flow, and audit trail — too large to drop in without a dedicated discovery cycle. The auth layer (NextAuth.js v5) supports adding a second-factor provider when needed. |
| Real-time analytics dashboards (WebSocket / SSE) | Performance tuning under load. The existing dashboard polls. |

## How to verify the additions

```bash
# robots / sitemap
curl http://localhost:3001/robots.txt
curl http://localhost:3001/sitemap.xml

# health
curl http://localhost:3001/api/health | jq

# status page
open http://localhost:3001/en/status
```
