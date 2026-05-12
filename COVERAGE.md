# Test Coverage Report

## Summary

| Metric     | Coverage |
|------------|----------|
| Statements | 52.04%   |
| Branches   | 85.10%   |
| Functions  | 66.66%   |
| Lines      | 52.04%   |

Test counts:
- Unit tests: **1,067** (Vitest, jsdom)
- Integration tests: **295** (Vitest, 30s timeout)
- E2E tests: **310** (Playwright, system Chrome) — **100% pass rate**
- **Total: 1,672 tests, all passing**

## Coverage Configuration

Coverage is collected via Vitest v8 provider. The full configuration lives in
`vitest.config.ts`. The following paths are intentionally excluded from
coverage measurement:

| Pattern | Reason |
|---------|--------|
| `node_modules/` | Third-party code |
| `.next/**` | Next.js build artifacts (generated) |
| `src/test/**` | Test fixtures and setup |
| `**/*.d.ts` | Type-only declarations |
| `**/*.config.*` | Build/tool configs |
| `**/types/**`, `src/types/**` | Type definitions |
| `src/messages/**` | i18n message catalogs (data) |
| `src/i18n/**` | next-intl routing wiring |
| `src/middleware.ts` | Next.js middleware (exercised via E2E) |
| `src/lib/**/index.ts` | Barrel re-exports (no logic) |
| `src/app/**` | Pages and route handlers (exercised via E2E + integration) |
| `src/components/ui/**` | shadcn/ui primitives (vendored, unit-tested upstream) |
| `browser-extension/**` | Separate sub-project with its own QA flow |
| `docker/**`, `prisma/**`, `public/**` | Infrastructure / data / assets |
| `src/lib/firebase/client.ts`, `src/lib/firebase/messaging.ts` | Client-side Firebase wiring (validated via integration tests against the real SDK) |
| `src/lib/payment/providers/**/handlers.ts` | Webhook handler shims (covered by integration tests against gateway sandboxes) |

## Modules with the largest remaining uncovered surface

| Module | Statements | Notes |
|--------|------------|-------|
| `lib/stripe/subscription.ts` | 7.26 % | Heavy use of Stripe SDK calls; integration tests cover the happy paths, but error branches around webhook idempotency are not unit-tested. |
| `lib/url/shortener.ts` (`shortener.ts` overload) | 9.97 % | A single very long file that mixes DB writes, rate-limit checks, and analytics fan-out. Worth refactoring into smaller pure functions before pushing coverage higher. |
| `lib/workspace/invitations.ts` | 0 % | Database-bound flow; reachable end-to-end but lacks isolated unit tests. |
| `lib/payment/providers/{stripe,paymob,paytabs,paddle}/index.ts` | 13–24 % | Each provider wraps an external SDK. Sandbox keys would be required to extend unit coverage; integration tests already exercise the public surface. |
| `lib/webhooks/sender.ts` | 42.91 % | HTTP fan-out with retry/backoff. The retry path needs fake-timer tests. |
| `lib/zapier/index.ts` | 34.1 % | Trigger fan-out — same shape as the webhook sender. |

## Path to higher coverage

The largest gap is in modules that talk to **external SDKs** (Stripe, Paymob,
PayTabs, Paddle, Zapier). They are already covered by:
- Integration tests against the gateway sandboxes (`__tests__/integration/`).
- E2E checkout flow tests (`__tests__/e2e/payment-flow.spec.ts`).

Raising unit-test coverage on those modules requires comprehensive mocking of
each SDK's API surface, which gives limited additional confidence beyond what
the existing integration suite already provides.

## How to run

```bash
npm run test:unit            # 1,054 unit tests (Vitest)
npm run test:integration     # 295 integration tests (Vitest)
npm run test:e2e             # 310 E2E tests (Playwright)
npm run test:coverage        # Coverage report (HTML in coverage/index.html)
```
