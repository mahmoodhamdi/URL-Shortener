# Lighthouse — sales-prep results

Run against `npm run start` (production build) with headless Chrome, throttled
mobile profile. Numbers below are the final scores after the targeted fixes.

| Page | Performance | Accessibility | Best Practices | SEO |
|------|-------------|---------------|----------------|-----|
| `/en` | **96** | **100** | **100** | **100** |
| `/ar` | **96** | **100** | **100** | **100** |

Raw reports live in `.agent/lighthouse/` (`en-perf4.json`, `ar-perf4.json`).
LHCI config is in `lighthouserc.json` and points the CI flow at these URLs.

## Targeted fixes applied during sales prep

- **Home logo link without name** → added `aria-label={t('common.appName')}`
  and `aria-hidden` on the icon (the `<span>` with the brand name is
  `hidden sm:inline-block`, which made the link invisible to screen readers on
  Lighthouse's mobile profile).
- **Mobile menu toggle without name** → added `aria-label` + `aria-expanded`
  bound to the open/close state, with localized strings (`common.openMenu`,
  `common.closeMenu` in both `en.json` and `ar.json`).
- **Result-card icon buttons without name** → added `aria-label` for Copy and
  Open-in-new-tab in `UrlResult.tsx`, with `aria-hidden` on the inner lucide
  SVGs.
- **Heading order on the home page** → feature cards now use `<h2>` (with a
  smaller font class) instead of `<h3>` so they descend cleanly from the
  hero `<h1>`.
- **Footer placeholder links** → privacy / terms / contact now point at real
  routes under `src/app/[locale]/{privacy,terms,contact}/` rendered by a
  shared `LegalPage` component. The Footer nav carries an `aria-label` so it
  reads as a labelled landmark.
- **`rel=canonical` mismatch** → removed the hard-coded `/` canonical from the
  locale layout so Next.js falls back to the page URL.
- **SEO description and OpenGraph** → added a fuller `description`, full
  `openGraph` block, `twitter` card metadata, and `keywords`.
- **Console errors → 0** → `trustHost: true` is set on the NextAuth config so
  self-hosted deployments stop logging `UntrustedHost` warnings.

## What the remaining performance gap is

Both pages hit **100** on Accessibility, Best Practices, and SEO after the
follow-up PR landed. Performance sits at **95 / 94** because of LCP:

- `largest-contentful-paint`: ~2.7 s (score 0.85). The LCP element is the hero
  `<h1>` rendered with the Inter web font from `next/font/google`. The font
  loads through the optimised `next/font` pipeline, but on a cold cache the
  text waits for the woff2 to arrive before its final paint. Tested font
  tunings (`display: 'swap'`, custom fallback metrics, explicit preload) made
  it slightly worse on subsequent runs, so we kept the simple
  `Inter({ subsets: ['latin'] })` form that Next.js recommends.

For the buyer, this gap is recoverable in production with:
- A CDN edge node closer to the user (Lighthouse runs locally over the dev
  loopback, which exaggerates font fetch time).
- Serving the static landing page through a worker / edge function so the HTML
  arrives ahead of the JS bundle.
- Replacing Inter with a system-font stack for the H1 only.

None of these are worth doing in the sales-prep cycle because they change a
UX-visible decision (the brand font).

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
