# Test Coverage Report

## Summary

| Metric     | Coverage |
|------------|----------|
| Statements | 54.36%   |
| Branches   | 84.55%   |
| Functions  | 71.76%   |
| Lines      | 54.36%   |

Test counts:
- Unit tests: **1,162** (Vitest, jsdom)
- Integration tests: **295** (Vitest, 30s timeout)
- E2E tests: **620** (Playwright, system Chrome — chromium + Mobile Chrome) — **100% pass rate**
- **Total: 2,077 tests, all passing**

> The statements headline dipped marginally from 55.04 % → 54.36 % because
> PR #4 added new UI surface (admin dashboard, API keys settings card) whose
> Prisma-bound branches are exercised by e2e, not unit tests. Branches and
> functions both moved up (84.55 % / 71.76 %).

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

| Module | Before sales prep | After PR #3 | Notes |
|--------|-------------------|-------------|-------|
| `lib/workspace/invitations.ts` | 0 % | **100 %** | Full state machine covered. |
| `lib/workspace/index.ts` | 0 % | **~80 %** | Slug + role + member CRUD covered. |
| `lib/stripe/subscription.ts` | 7.26 % | **34.94 %** | getUserSubscription / cancel / resume / usage tracking now under test; Stripe-SDK-bound webhook handlers remain integration-only. |
| `lib/zapier/index.ts` | 34.1 % | **~70 %** | Subscription CRUD + limit checks covered. |
| `lib/url/shortener.ts` | 9.97 % | **40.12 %** | Anonymous create-link path, lookups, update + delete contracts covered. The signed-in transactional path still leans on integration tests. |
| `lib/payment/providers/{stripe,paymob,paytabs,paddle}/index.ts` | 13–24 % | unchanged | Each provider wraps an external SDK. Sandbox keys would be required to extend unit coverage; integration tests already exercise the public surface. |
| `lib/webhooks/sender.ts` | 42.91 % | unchanged | HTTP fan-out with retry/backoff. The retry path needs fake-timer tests. |

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
