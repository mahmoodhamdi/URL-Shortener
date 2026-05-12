# Final Handover Checklist

Walk through this at the closing session with the client. Tick each item, save
a signed PDF, and the engagement is closed.

## Code & repository

- [ ] Source archive delivered as `.zip` (or pushed to client GitHub
      organization) — branch `master`, no agent / sales-prep branches.
- [ ] Build verified on the client's intended Node version (LTS 20+).
- [ ] `npm ci && npm run build` runs clean on a fresh clone.
- [ ] CI workflow in `.github/workflows/ci-cd.yml` reviewed by the client.
- [ ] Repository ownership transferred (if hosted in our org during dev).

## Documentation handed over

- [ ] `README.md` — onboarding / quick start.
- [ ] `CLAUDE.md` — architecture cheat-sheet for whoever owns the codebase.
- [ ] `FEATURES.md` — full feature inventory.
- [ ] `COVERAGE.md` — test coverage breakdown and exclusion rationale.
- [ ] `SECURITY_NOTES.md` — current security posture and known advisories.
- [ ] `LIGHTHOUSE_NOTES.md` — performance / a11y / SEO score baseline.
- [ ] `sales/DEPLOYMENT.md` — both deployment variants.
- [ ] `sales/SUPPORT-PLANS.md` — selected plan acknowledged in writing.
- [ ] `sales/CLIENT-ONBOARDING.md` — Phase-2 roadmap initialled.
- [ ] OpenAPI spec at `/api/docs` browsable on the deployed instance.

## Credentials & access

Deliver via a password manager share or encrypted vault, **never plaintext
email**:

- [ ] Server SSH (key + sudo password).
- [ ] Domain registrar / DNS console.
- [ ] Database superuser + app user passwords.
- [ ] OAuth client IDs/secrets (Google, GitHub) — if used.
- [ ] Payment gateway dashboards (Stripe, Paymob, PayTabs, Paddle) — admin
      access on the client's accounts.
- [ ] Firebase project console — if push notifications are wired.
- [ ] Admin user for the deployed app (email + initial password — must rotate).
- [ ] Container registry / Docker Hub credentials — if used.
- [ ] Backup storage credentials (S3 / R2 / Spaces).

## Live deployment verification (with client watching)

- [ ] `https://<domain>/api/health` returns 200 with `status: "healthy"` and
      database `status: "up"`.
- [ ] `https://<domain>/en` and `https://<domain>/ar` both render.
- [ ] Sample short link created and clicked end-to-end, showing analytics in
      the dashboard.
- [ ] Sample QR code generated and scanned with a mobile phone.
- [ ] One payment via the configured gateway (in sandbox or live).
- [ ] One webhook delivered and visible in the webhook log.
- [ ] Cookie consent banner appears on first visit.
- [ ] HTTPS redirect, HSTS header, and SSL grade ≥ A on
      ssllabs.com/ssltest.

## Operational dry-runs

- [ ] Stop and restart the app service — verify recovery.
- [ ] Restore the most recent database backup into a staging copy and confirm
      a sample link redirects from the restored data.
- [ ] Rotate `AUTH_SECRET` and verify all existing sessions are invalidated
      (test login again).
- [ ] Trigger a deploy from `main` and observe the CI pipeline.

## Training session

- [ ] 60-90 minute screen-share walkthrough delivered.
- [ ] Recording shared with the client.
- [ ] Q&A captured and added to `sales/CLIENT-ONBOARDING.md` (or an internal
      runbook).

## Warranty / first-month inclusion

- [ ] Bug-fix warranty for the first **30 calendar days** covering anything
      broken in features documented in `FEATURES.md`. Confirmed in writing.
- [ ] Channel for warranty reports agreed (email or Slack).
- [ ] Support-plan start date agreed (immediate vs. after warranty).

## Sign-off

| Party | Name | Date | Signature |
|-------|------|------|-----------|
| Client representative |  |  |  |
| Delivery lead |  |  |  |

Once the table above is filled and the PDF is exchanged, the project is
**handed over**.
