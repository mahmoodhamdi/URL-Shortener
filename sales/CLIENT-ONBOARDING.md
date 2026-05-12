# Client Onboarding — First 30 Days

A working plan for the buyer to follow week by week. Items marked **[us]** are
typically handled by the delivery / support team. **[client]** items are the
buyer's responsibility.

---

## Week 1 — Stabilize

| Day | Owner | Action |
|-----|-------|--------|
| 1 | [us] + [client] | Live handover session (`HANDOVER-CHECKLIST.md`) — credentials transfer, walkthrough, recording. |
| 1 | [client] | Rotate the admin password, the `AUTH_SECRET`, and every gateway test key shipped with the project. |
| 2 | [client] | Add the production domain to OAuth providers (Google, GitHub) and to the payment gateways' allowed origins. |
| 2 | [us] | Verify backups are running and a fresh `pg_dump` restores cleanly into a staging database. |
| 3 | [client] | Wire `/api/health` into the client's monitoring (UptimeRobot, Better Stack, Pingdom) and set on-call paging. |
| 4 | [client] | Replace placeholder T&C, privacy, and contact links in the footer with real legal pages. |
| 5 | [us] | Open an issue tracker (GitHub Projects, Linear, Jira) for the buyer to file feedback against. |

**End-of-week 1 success criteria** — production is live on the buyer's
domain, monitored, backed up, and reachable through their own auth providers.

## Week 2 — Verify the business surface

| Day | Owner | Action |
|-----|-------|--------|
| 6  | [client] | Run a real-money checkout on the chosen payment gateway. Refund it. Verify the subscription record and webhook log. |
| 7  | [client] | Configure pricing tiers and Stripe / Paddle / Paymob / PayTabs Price IDs in `.env`. Re-deploy. |
| 8  | [us] | Walk the client through plan-limit enforcement (`src/lib/limits/`) so they understand FREE vs paid behaviour. |
| 9  | [client] | Set up Zapier connection (if used) — point a test Zap at a sample link create / link click trigger. |
| 10 | [client] | Sample SMS / email campaign with a short link and a QR. Confirm the dashboard captures clicks by country, device, browser. |

**End-of-week 2 success criteria** — every revenue-bearing flow has been
exercised at least once.

## Week 3 — Branding & content

| Day | Owner | Action |
|-----|-------|--------|
| 11 | [client] | Replace `public/og-image.png` and `public/favicon.ico` with branded assets. |
| 12 | [us] + [client] | Apply the buyer's primary brand color via Tailwind theme (`tailwind.config.ts`). |
| 13 | [client] | Translate or refine `src/messages/en.json` and `src/messages/ar.json` for their tone. |
| 14 | [client] | Add support email / WhatsApp / phone to the footer. |
| 15 | [us] | Re-run `marketing/scripts/screenshots.ts` against the rebranded build to refresh decks. |

## Week 4 — Phase-2 planning

The following features were intentionally **not** included in v1 to keep the
sale-ready scope tight. Pick the ones the buyer wants in v1.1 and schedule
them.

| Phase-2 feature | Why it was deferred | Rough effort |
|-----------------|---------------------|--------------|
| Admin panel (users / links / subscriptions) | Buyer-specific role model | 2-3 weeks |
| 2FA TOTP with backup codes | Needs UX + recovery flow | 1-2 weeks |
| API-key management **UI** (endpoints already shipped) | Settings page + flow | 3-5 days |
| Custom error-reporter wired to Sentry / Datadog | Buyer's preferred vendor | 1-2 days |
| Email transactional via Resend / Postmark / SES | Vendor & template choice | 3-5 days |
| Detailed audit logging | Needs schema + UI | 1 week |
| Real-time analytics dashboards (WebSocket / SSE) | Performance tuning under load | 1-2 weeks |
| Next.js 14 → 16 migration | Coordinated with next-intl 4 | 1 week |
| SOC 2 / ISO 27001 evidence collection | Process, not feature | Ongoing |

By the end of week 4 the buyer should have:
- A signed-off support plan (`sales/SUPPORT-PLANS.md`).
- A ranked Phase-2 backlog.
- A first quarterly status review on the calendar.

---

## Common first-month "gotchas"

- **`AUTH_TRUST_HOST` not set** → NextAuth refuses to issue cookies. The
  `.env.example` ships with it set to `true`; preserve that in production.
- **`NEXTAUTH_URL` mismatched with the actual public URL** → OAuth callbacks
  fail with a 400. Always match the *exact* origin including the protocol.
- **Self-signed cert during DNS cutover** → Browsers will warn; use
  Let's Encrypt staging endpoint first, then the production endpoint.
- **Paymob / PayTabs sandbox cards** → They reject after 30 days; rotate the
  test card numbers monthly until you switch to live.
- **Custom domains feature** → Requires the buyer to expose a wildcard
  `CNAME` record they can update programmatically (or rely on manual setup).
  The flow at `/dashboard/domains` walks through both options.

## Communication preferences

Tell us, in the first handover meeting, how the buyer wants to be reached:
- Slack shared channel (preferred).
- Email tickets via a shared inbox.
- Phone / WhatsApp for P1 only.

Anything important happens on whatever they choose; nothing important happens
anywhere else.
