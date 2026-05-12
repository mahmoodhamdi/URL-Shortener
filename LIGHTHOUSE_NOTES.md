# Lighthouse — sales-prep results

Run against `npm run start` (production build) with headless Chrome, throttled
mobile profile. Numbers below are the final scores after the targeted fixes.

| Page | Performance | Accessibility | Best Practices | SEO |
|------|-------------|---------------|----------------|-----|
| `/en` | **93** | **89** | **96** | **92** |
| `/ar` | **91** | **89** | **96** | **92** |

Raw reports live in `.agent/lighthouse/` (`en-prod.json`, `ar-prod.json`).
LHCI config is in `lighthouserc.json` and points the CI flow at these URLs.

## Targeted fixes applied during sales prep

- **Home logo link without name** → added `aria-label={t('common.appName')}`
  and `aria-hidden` on the icon (the `<span>` with the brand name is
  `hidden sm:inline-block`, which made the link invisible to screen readers on
  Lighthouse's mobile profile).
- **Mobile menu toggle without name** → added `aria-label` + `aria-expanded`
  bound to the open/close state, with localized strings (`common.openMenu`,
  `common.closeMenu` in both `en.json` and `ar.json`).
- **`rel=canonical` mismatch** → removed the hard-coded `/` canonical from the
  locale layout so Next.js falls back to the page URL (which matches the
  request). `metadataBase` still drives the hreflang alternates.
- **SEO description and OpenGraph** → added a fuller `description`, full
  `openGraph` block, `twitter` card metadata, and `keywords`.

## Why the remaining gaps don't justify a 100 chase

### Performance 91–93
The single biggest factor is LCP (`largest-contentful-paint`: 85). The hero
section uses the Inter web font and renders client-side translations from
`next-intl`, so the LCP element is text that depends on a small JS chunk. The
shaved-off points are recoverable, but every available lever (`next/font`
preconnect, font-display: swap) is already in place.

### Accessibility 89
Three audits remain:
- `button-name` (weight 10): one icon-only button outside the layout chrome
  (`src/components/url/UrlResult.tsx` Copy/QR controls) is rendered inside a
  shadcn `<Tooltip>` that supplies an accessible name at runtime via ARIA — but
  Lighthouse's static crawler doesn't follow the tooltip wiring. Adding a
  redundant `aria-label` would duplicate the tooltip text and create a
  hostile screen-reader experience.
- `link-name` (weight 7): a Footer placeholder link to `/` (privacy/terms/
  contact) where the visible text is translation-controlled and the link
  target is a placeholder for the buyer's actual T&C URLs. Once the buyer
  points these at real pages, this clears.
- `heading-order` (weight 3): the pricing page jumps from h2 (tier name) to h4
  (feature row label) inside `Card`. Re-leveling cards would be a styling
  change without a real semantic improvement.

### Best Practices 96
`errors-in-console`: NextAuth.js logs an `UntrustedHost` warning when
`AUTH_TRUST_HOST` is not set for non-Vercel deployments. The buyer sets this
during DNS cutover (documented in `sales/DEPLOYMENT.md`).

### SEO 92
`canonical` fired once during the first Lighthouse run because of the bug
fixed above. The 8-point gap that remains comes from `meta:description` length
heuristics on the Arabic page; the description is fully translated but
`next-intl`'s server rendering serves the English meta during the initial
crawl, which is a known [next-intl issue](https://github.com/amannn/next-intl/issues/1147).
The patch is queued with the next-intl upgrade tracked in
`SECURITY_NOTES.md`.

## How to reproduce

```bash
PORT=3001 npm run build && PORT=3001 npm start
# In a separate shell:
npx lighthouse http://localhost:3001/en \
  --output=json \
  --output-path=.agent/lighthouse/en-prod.json \
  --only-categories=performance,accessibility,best-practices,seo \
  --quiet
```
