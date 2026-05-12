# Support & Maintenance Plans

Three tiers, all billed monthly with annual discount available. The codebase
is yours after purchase regardless of plan — these plans cover **post-sale
maintenance and incident response**, not licensing.

| | Standard | Priority | Enterprise |
|---|---|---|---|
| **Monthly** | $399 | $1,499 | $4,999 |
| **Annual (-15%)** | $4,070 | $15,290 | $50,990 |
| **Support hours** | Business hours, Sun-Thu, 09:00-17:00 GMT+2 | Extended, 7 days/week 08:00-22:00 GMT+2 | 24×7 |
| **Channel** | Email, ticket | Email, ticket, Slack channel | Email, ticket, Slack, scheduled calls |
| **Response time** | | | |
| - P1 (production down) | 8 business hours | 2 hours | 30 minutes |
| - P2 (degraded) | 1 business day | 8 hours | 2 hours |
| - P3 (workaround exists) | 3 business days | 1 business day | 8 hours |
| - P4 (cosmetic / question) | 5 business days | 3 business days | 1 business day |
| **Resolution target** | Best effort | P1: same day, P2: 3 days | P1: 4 hours, P2: same day |
| **Patch releases** | Monthly, opt-in | Bi-weekly, opt-in | Weekly + emergency hotfixes |
| **Dependency security patches** | Monthly digest | 7-day SLA on high+ CVEs | 48-hour SLA on high+ CVEs |
| **Feature additions** | Quoted per change | 10 dev-hours / month included | 40 dev-hours / month included |
| **Hours rollover** | n/a | One month | One quarter |
| **Code review on client PRs** | — | Up to 5 PRs / month | Unlimited |
| **Migration assistance** | Quoted per migration | One Next.js minor / year | One Next.js major / year |
| **Custom training session** | Not included | One 90-min / quarter | One 90-min / month |
| **Status report** | Quarterly | Monthly | Bi-weekly |
| **Uptime advisory** | — | Yes | Yes, with paging integration |

## What's covered everywhere

- Bug fixes in shipped code (regression in features already documented in
  `FEATURES.md`).
- Triage and root-cause analysis on production incidents.
- Compatibility advice on dependency upgrades.
- Help reading logs, interpreting analytics, and using the admin tools.

## What's not covered (under any plan)

- New feature development beyond included dev-hours — quoted separately.
- Third-party integration custom code (Salesforce sync, ERP connectors,
  proprietary SSO) — quoted per project.
- Client-side data restoration when no backups exist.
- Customer-facing support for the client's end-users — that stays the client's
  responsibility.
- Penetration testing or third-party security audits — we can refer partners.

## Definitions

- **P1** — Site is down, or core flows (shorten, redirect, login) are broken
  for all users.
- **P2** — A feature is degraded but most users can work around it (e.g.
  Stripe webhooks lagging, analytics dashboard slow).
- **P3** — Bug with a known workaround, no user impact at scale.
- **P4** — Cosmetic issue, documentation question, advisory request.

## Switching plans

You can upgrade or downgrade at any monthly anniversary with 7 days' notice.
Annual plans are pro-rated on cancellation minus the discount taken.

## Out-of-scope work

Hourly rate for work outside the support plan: $80/h (Standard), $70/h
(Priority), $60/h (Enterprise). Minimum charge: 1 hour.
