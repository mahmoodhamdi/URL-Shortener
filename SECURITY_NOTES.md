# Security Audit — sales-readiness snapshot

`npm audit --omit=dev` after `npm audit fix` and a targeted `uuid` bump:

```
11 vulnerabilities (8 low, 2 moderate, 1 high)
```

## What was fixed during sales prep

| Before | After |
|--------|-------|
| 36 vulnerabilities (2 critical, 12 high) | 11 vulnerabilities (0 critical, 1 high) |

All **critical** advisories — including the `protobufjs` chain and `qs` arrayLimit
issue — were eliminated via `npm audit fix` and a clean reinstall against the
fresh lock file. The remaining advisories cluster around three packages:

## Remaining advisories

### `next@14.2.35` (1 high, prod)
Eight upstream advisories in Next.js's HTTP handling, image optimizer, and RSC
caching. Affected range is `9.3.4-canary.0 — 16.3.0-canary.5`; the fix lands in
**Next.js 16.x**. The project is intentionally pinned to the latest stable 14.x
because:

1. Next.js 15 and 16 introduced breaking changes in the App Router API
   (`params` is now a Promise) and `next-intl`'s integration. A blind major
   upgrade mid-sale risks regressions across 1,600+ tests.
2. The exposed paths require an internet-facing deployment with image
   optimization enabled and untrusted upstream URLs allowlisted under
   `remotePatterns` — most self-hosted deployments do not match this shape.
3. The buyer can plan the Next 14 → 16 migration deliberately. The
   `sales/CLIENT-ONBOARDING.md` deliverable lists this as a known Phase-2 item.

**Mitigations already in place:**
- `src/lib/security/ssrf.ts` blocks internal-network URLs before they reach the
  redirect handler.
- `image.remotePatterns` is left unconfigured in `next.config.js`, so the
  Image Optimizer cannot fetch arbitrary remote URLs by default.
- All untrusted user input flows through Zod validation (`src/lib/url/validator.ts`).

### `next-intl <= 4.9.1` (2 moderate, prod)
Open-redirect and `experimental.messages.precompile` prototype pollution.
The fix is in `next-intl@4.11.2`, which is a **breaking** change in the locale
routing helpers. Holding for the buyer's migration cycle alongside the Next.js
bump.

### `postcss <8.5.10` (1 moderate, transitive via Next.js)
XSS via unescaped `</style>` in stringify. Reachable only if user-controlled
content is passed through `postcss.stringify` — this codebase does not do that.
The fix ships with Next.js 16; tracked alongside the Next.js upgrade.

### Low-severity (8)
Mixed dev-tooling chain (`tar`, `inflight`, etc.). No production exposure.

## Defensive controls verified by the test suite

- **SSRF protection** (`src/lib/security/ssrf.ts`) — covered by
  `__tests__/unit/lib/validator.test.ts` and `__tests__/e2e/comprehensive-qa.spec.ts`.
- **XSS in shortened URLs** — covered by `__tests__/e2e/comprehensive-qa.spec.ts`.
- **HMAC signatures on webhooks** — covered by
  `__tests__/unit/webhooks/sender.test.ts` and
  `__tests__/unit/webhooks/events.test.ts`.
- **Rate limiting** — covered by `__tests__/integration/auth.test.ts` plus the
  rate-limit-specific unit tests.
- **Password hashing** — `bcryptjs` via NextAuth credentials provider.
- **Cookie consent (GDPR)** — `src/components/consent/CookieConsent.tsx`.

## Recommended Phase-2 follow-ups for the buyer

1. Upgrade `next` 14 → 16 alongside `next-intl` 3 → 4.
2. Wire a real error reporter via `setErrorReporter()` (the abstract interface
   is at `src/lib/errors/reporter.ts`).
3. Enable Subresource Integrity on the small set of external scripts (currently
   none in the bundle).
