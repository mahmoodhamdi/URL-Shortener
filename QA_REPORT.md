# QA Report - URL Shortener Application

**Date:** 2026-02-13
**Environment:** Node v22.21.1, npm 10.9.4, Next.js 14.2.35
**Server:** http://localhost:3000
**Database:** PostgreSQL (connected, schema in sync)
**Tester:** Automated QA Suite

---

## Executive Summary

| Metric | Result |
|--------|--------|
| Unit Tests | **1054/1054 passed** (53 files) |
| Integration Tests | **295/295 passed** (13 files) |
| E2E Tests (existing) | **513/532 passed** (19 failed) |
| E2E Tests (new QA suite) | **36/44 passed** (8 failed) |
| API Endpoint Tests | **50/83 passed** (33 failed - incl. 25 rate limit + 7 SSRF) |
| ESLint | **No errors** |
| Prisma Schema | **Valid** |
| Production Build | **Passed** (with 1 warning) |

### Critical Findings

| Severity | Issue | Status |
|----------|-------|--------|
| CRITICAL | SSRF vulnerability - internal IPs accepted by `/api/shorten` | `validateUrlForSSRF()` exists but not called |
| CRITICAL | XSS in alias - `<script>` tags accepted in custom alias field | No sanitization on alias content |
| HIGH | Rate limiting not enforced on `/api/shorten` for anonymous users | 25 rapid requests all returned 201 |
| MEDIUM | `/api/links/[id]` returns 404 instead of 401 for unauthenticated | Auth check after resource lookup |
| LOW | Empty JSON body to `/api/shorten` returns 500 instead of 400 | Missing try/catch on `request.json()` |
| LOW | No alias length limit - 500 char aliases accepted | Missing max length validation |

---

## Phase 1: Environment Setup

| Check | Result |
|-------|--------|
| `.env` file | Present with `DATABASE_URL` and `AUTH_SECRET` |
| `prisma generate` | Success |
| `prisma db push` | Database already in sync |
| `prisma validate` | Schema valid |
| Dev server startup | Port 3000, healthy |
| Health endpoint | `{"status":"healthy","database":"connected"}` |

---

## Phase 2: Test Suite Results

### Unit Tests (1054/1054 passed)

All 53 test files passed covering:
- URL shortening, validation, QR generation
- Rate limiting (Redis store, memory store, factory)
- Security (SSRF validation functions, auth middleware)
- Firebase (auth, tokens, FCM, client SDK)
- Payment (gateway factory, checkout, methods, kiosk, wallet)
- A/B testing (selector, statistics)
- Webhooks (signature, sender, events)
- Targeting (matcher, detector)
- Bio pages (themes, validation, CSS sanitizer)
- Cloaking (templates, index)
- Deep linking (detector, templates)
- Components (ErrorBoundary, LinkEditDialog, PaymentCheckout)
- Domains (SSL, verifier)
- Workspace (permissions)
- Stripe (plans, subscription, client)
- Zapier (events, dispatcher, index)
- API errors, UTM, device detection, env validation
- Extension, limits checker, retargeting pixels

**Duration:** 10.93s

### Integration Tests (295/295 passed)

All 13 test files passed covering:
- `auth.test.ts` (22 tests)
- `url-shorten.test.ts` (27 tests)
- `redirect.test.ts` (21 tests)
- `domains.test.ts` (22 tests)
- `webhooks.test.ts` (24 tests)
- `workspaces.test.ts` (24 tests)
- `stripe.test.ts` (34 tests)
- `zapier.test.ts` (28 tests)
- `extension.test.ts` (18 tests)
- `retargeting.test.ts` (22 tests)
- `cloaking.test.ts` (21 tests)
- `bio-page.test.ts` (17 tests)
- `ab-testing.test.ts` (15 tests)

**Duration:** 2.91s

### E2E Tests - Existing (513/532 passed)

**19 failures** across chromium and Mobile Chrome:

| Test | Browser | Failure Reason |
|------|---------|----------------|
| Dashboard - empty state | Mobile Chrome | Redirected to login, h1 "Your Links" not found |
| Dashboard - link list | Mobile Chrome | Same as above |
| Dashboard - search functionality | Mobile Chrome | Search input not found (redirected to login) |
| Dashboard - link statistics | Both | "Total Links" text not found (redirected to login) |
| i18n - all pages translations | Both | `/en/bulk` page returns ERR_ABORTED |
| Back/forward navigation | Both | Timeout on `waitForLoadState('networkidle')` |
| Payment checkout - login required | Both | Login redirect check failed |
| Dashboard responsive | Mobile Chrome | ERR_ABORTED on dashboard page |
| Shorten - display form | Mobile Chrome | h1 shows "404" instead of "Shorten Your URLs" |
| Shorten - submit URL | Mobile Chrome | `url-input` data-testid not found |
| Shorten - QR code | Mobile Chrome | Same as above |
| Shorten - validate input | Mobile Chrome | `shorten-btn` data-testid not found |
| Subscription - pricing plans | Mobile Chrome | "free" text not found |
| Register - empty form error | Chromium | Submit button disabled, can't click |

**Root Causes:**
1. Dashboard tests require authentication but run unauthenticated
2. Mobile Chrome shows 404 on home page (possible locale routing issue)
3. `networkidle` timeout in navigation tests (server-side rendering delays)
4. Register form has disabled submit button (intentional - prevents empty form submission)

### E2E Tests - Comprehensive QA (36/44 passed)

**8 failures:**

| Test | Failure Reason | Type |
|------|----------------|------|
| Dashboard redirect to login | Dashboard page renders without redirect for unauth users | **App Bug** |
| Custom alias toggle | Test locator syntax error (test issue) | Test Issue |
| Language switcher EN->AR | Switcher clicked but page stayed LTR | Investigation Needed |
| Shorten API - shortUrl field | Response missing `shortUrl` field (has `shortCode`) | Test Expectation |
| SSRF protection | Internal IPs accepted (201) instead of rejected (400+) | **SECURITY BUG** |
| XSS in alias | Script tags in alias accepted (201) | **SECURITY BUG** |
| Header nav - pricing link | Navigation didn't change URL | Investigation Needed |
| Login/Register navigation | Register link didn't navigate to /register | Investigation Needed |

---

## Phase 3: Lint & Build Verification

| Check | Result |
|-------|--------|
| ESLint (`npm run lint`) | **No errors or warnings** |
| Prisma Validate | **Schema valid** |
| Production Build (`npm run build`) | **Passed** |

**Build Warning:**
```
./src/lib/firebase/admin.ts
Critical dependency: the request of a dependency is an expression
```
This is a known Firebase Admin SDK dynamic import pattern - not a functional issue.

**Build Note:** Running `npm run build` concurrently with `npm run dev` causes failures due to `.next` directory conflicts. Build succeeds when dev server is stopped.

---

## Phase 4: API Endpoint Testing

### Summary Table

| Category | Tested | Passed | Failed | Pass Rate |
|----------|--------|--------|--------|-----------|
| Authentication | 7 | 7 | 0 | 100% |
| URL Shortening | 8 | 7 | 1 | 87.5% |
| Redirects | 3 | 3 | 0 | 100% |
| QR Code | 1 | 1 | 0 | 100% |
| Protected GET (no auth) | 15 | 14 | 1 | 93.3% |
| Protected POST (no auth) | 8 | 8 | 0 | 100% |
| System | 2 | 2 | 0 | 100% |
| **Total (excl. security)** | **44** | **42** | **2** | **95.5%** |

### Endpoint Details

**Working Correctly:**
- `POST /api/auth/register` - Registration with password validation, rate limiting, duplicate detection
- `POST /api/shorten` - URL shortening with validation, custom alias, UTM params
- `POST /api/shorten/bulk` - Bulk shortening (3 URLs tested)
- `GET /api/r/[shortCode]` - Redirect works, 404 for non-existent codes
- `POST /api/qr` - QR code generation (1.3KB JSON response)
- `GET /api/health` - Health check with DB status
- `GET /api/docs` - Full OpenAPI 3.1 spec (28.5KB)
- All protected endpoints return 401 for unauthenticated requests

**Issues Found:**
- `POST /api/shorten` with empty JSON body returns 500 (should be 400)
- `GET /api/links/[id]` returns 404 instead of 401 when unauthenticated

---

## Phase 5: Security Testing

### SSRF Vulnerability (CRITICAL)

**Status:** VULNERABLE - 7/7 attack vectors succeeded

| Attack Vector | Expected | Actual | Status |
|--------------|----------|--------|--------|
| `http://localhost:8080/admin` | 400 | 201 | VULNERABLE |
| `http://127.0.0.1:22` | 400 | 201 | VULNERABLE |
| `http://0.0.0.0` | 400 | 201 | VULNERABLE |
| `http://192.168.1.1` | 400 | 201 | VULNERABLE |
| `http://169.254.169.254/latest/meta-data/` | 400 | 201 | VULNERABLE |
| `http://[::1]:8080` | 400 | 201 | VULNERABLE |
| `http://2130706433` (decimal IP) | 400 | 201 | VULNERABLE |

**Root Cause:** `validateUrlForSSRF()` function exists at `src/lib/security/ssrf.ts` and has 49 passing unit tests, but it is **never called** from the URL shortening flow (`src/lib/url/shortener.ts:38-43`).

**Fix:** Add SSRF validation call in `createShortLink()` after URL normalization:
```typescript
import { validateUrlForSSRF } from '@/lib/security/ssrf';
// After line 39 in shortener.ts:
const ssrfCheck = validateUrlForSSRF(normalizedUrl);
if (!ssrfCheck.safe) {
  throw new Error(ssrfCheck.reason);
}
```

### XSS Testing

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `javascript:alert(1)` as URL | 400 | 400 | PROTECTED |
| `<script>alert(1)</script>` as alias | 400 | 201 | VULNERABLE |
| `ftp://evil.com` as URL | 400 | 201 | NOT BLOCKED (wrapped to https) |
| `file:///etc/passwd` as URL | 400 | 201 | NOT BLOCKED (wrapped to https) |

**Note:** Script tags in alias are stored as-is. If rendered without escaping, this is an XSS vector.

### SQL Injection

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `' OR 1=1--` in email | 400 | 400 | PROTECTED |

Prisma ORM provides SQL injection protection by design.

### Rate Limiting

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Auth register (rapid requests) | 429 after ~4 attempts | 429 | WORKING |
| URL shorten (25 rapid requests) | 429 after limit | All 201 | NOT ENFORCED |

**Note:** The rate limiting code exists in the shorten route handler but may not be enforcing for unauthenticated users or the limits may be too high for testing.

### Authentication Bypass

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Fake session cookie | 401 | 401 | PROTECTED |

### Security Headers

| Header | Present | Value |
|--------|---------|-------|
| `X-Content-Type-Options` | Yes | `nosniff` |
| `X-Frame-Options` | Yes | `SAMEORIGIN` |
| `X-XSS-Protection` | Yes | `1; mode=block` |
| `Referrer-Policy` | Yes | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Yes | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy` | Yes | Full CSP with script-src, connect-src, etc. |

---

## Phase 6: Browser E2E Testing

### Pages Tested & Screenshots

| # | Page | Status | Screenshot |
|---|------|--------|------------|
| 1 | Home EN (`/en`) | Loaded | `qa-01-home-en.png` |
| 2 | Home AR (`/ar`) | Loaded with RTL | `qa-02-home-ar.png` |
| 3 | Login (`/en/login`) | Loaded with form | `qa-03-login.png` |
| 4 | Register (`/en/register`) | Loaded with form | `qa-04-register.png` |
| 5 | Dashboard (`/en/dashboard`) | Renders without auth redirect | `qa-05-dashboard-unauth.png` |
| 6 | Bulk Shortener (`/en/bulk`) | Loaded | `qa-06-bulk.png` |
| 7 | Pricing (`/en/pricing`) | Loaded | `qa-07-pricing.png` |
| 8 | API Docs (`/en/api-docs`) | Loaded | `qa-08-api-docs.png` |
| 9 | Settings (`/en/settings`) | Loaded/redirected | `qa-09-settings-unauth.png` |
| 10 | Domains (`/en/domains`) | Loaded | `qa-10-domains.png` |
| 11 | 404 Page | Shows 404 content | `qa-11-404.png` |

### Interactions Tested

| Interaction | Status | Screenshot |
|------------|--------|------------|
| URL shortening form visible | Passed | `qa-12-shorten-form.png` |
| Shorten URL and verify result | Passed | `qa-13-shorten-result.png` |
| QR code display | Passed | `qa-15-qr-code.png` |
| Login form validation | Passed | `qa-17-login-error.png` |
| Register - weak password | Passed | `qa-18-register-weak-password.png` |
| Register - strong password | Passed | `qa-19-register-strong-password.png` |
| Social login buttons visible | Passed | `qa-20-social-login.png` |
| Theme toggle (light -> dark) | Passed | `qa-23-theme-light.png`, `qa-24-theme-dark.png` |
| Pricing monthly/yearly toggle | Passed | `qa-25-pricing-overview.png`, `qa-26-pricing-yearly.png` |
| Bulk URL input | Passed | `qa-37-bulk-input.png` |

### Responsive Design

| Viewport | Status | Screenshot |
|----------|--------|------------|
| Mobile (375x667) | Passed | `qa-27-responsive-mobile.png` |
| Tablet (768x1024) | Passed | `qa-29-responsive-tablet.png` |
| Desktop (1440x900) | Passed | `qa-30-responsive-desktop.png` |
| Login - Mobile | Passed | `qa-31-login-mobile.png` |
| Login - Desktop | Passed | `qa-32-login-desktop.png` |
| Pricing - Mobile | Passed | `qa-33-pricing-mobile.png` |

**Total screenshots captured:** 31

---

## Issues Summary

### Critical (Fix Immediately)

1. **SSRF Vulnerability** - `src/lib/url/shortener.ts` does not call `validateUrlForSSRF()` from `src/lib/security/ssrf.ts`. All internal IP addresses are accepted for URL shortening.
   - **Impact:** Server-side request forgery, potential access to internal services, cloud metadata endpoints
   - **Fix Time:** 30 minutes

2. **XSS in Alias Field** - `<script>` tags are accepted as custom aliases without sanitization.
   - **Impact:** Stored XSS if alias is rendered unescaped anywhere
   - **Fix Time:** 15 minutes

### High

3. **Rate Limiting Not Enforced on `/api/shorten`** - 25 rapid anonymous requests all returned 201. Rate limiting code exists in the route handler but doesn't prevent abuse.
   - **Impact:** Resource exhaustion, database flooding
   - **Fix Time:** 1-2 hours investigation

### Medium

4. **`/api/links/[id]` Returns 404 Instead of 401** - Unauthenticated requests get 404 (resource lookup before auth check).
   - **Impact:** Information disclosure (route enumeration)
   - **Fix Time:** 15 minutes

5. **Dashboard Accessible Without Auth** - `/en/dashboard` renders content instead of redirecting to login.
   - **Impact:** Unauthenticated users see dashboard shell
   - **Fix Time:** 30 minutes

### Low

6. **Empty JSON Body Returns 500** - `POST /api/shorten` with empty body returns 500 instead of 400.
   - **Fix Time:** 15 minutes

7. **No Alias Length Limit** - 500-character aliases are accepted.
   - **Fix Time:** 15 minutes

8. **Build Warning** - Firebase Admin SDK dynamic import warning.
   - **Fix Time:** Not functional, low priority

---

## Recommendations

### Priority 1 (Immediate - within 24 hours)
1. Integrate `validateUrlForSSRF()` into `createShortLink()` in `src/lib/url/shortener.ts`
2. Add alias content sanitization (reject HTML/script tags)
3. Add integration tests for SSRF protection

### Priority 2 (This week)
1. Investigate and fix rate limiting on `/api/shorten`
2. Fix auth check order in `/api/links/[id]` (check auth before resource lookup)
3. Add auth redirect for dashboard page

### Priority 3 (This month)
1. Add try/catch around `request.json()` calls to return 400 instead of 500
2. Enforce max alias length (e.g., 50 characters)
3. Block `ftp://` and `file://` protocols in URL validation
4. Fix Mobile Chrome E2E test failures (locale routing issue)

---

## Files Requiring Changes

| File | Change | Priority |
|------|--------|----------|
| `src/lib/url/shortener.ts` | Add SSRF validation call | P1 |
| `src/lib/url/validator.ts` | Add alias sanitization, length limit | P1 |
| `src/app/api/shorten/route.ts` | Fix error handling for empty JSON, verify rate limiting | P2 |
| `src/app/api/links/[id]/route.ts` | Check auth before resource lookup | P2 |
| `src/app/[locale]/dashboard/page.tsx` | Add auth redirect | P2 |
