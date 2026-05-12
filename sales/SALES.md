# URL Shortener — Sales One-Pager

> A production-grade, multi-tenant, bilingual URL shortening platform with
> branded short links, QR codes, analytics, A/B testing, deep linking,
> link-in-bio pages, custom domains, and four built-in payment gateways.

---

## English

### What it is
A **self-hostable, white-label URL Shortener** that gives end-customers a
turnkey alternative to Bitly, Rebrandly, or Short.io — with full data
ownership, bilingual EN/AR with RTL, and four payment gateways already wired
up for global and MENA markets.

### Who it's for
1. **Digital agencies** who need to offer link-management to clients without
   reselling a foreign SaaS.
2. **Marketing departments** at enterprises that require on-prem or
   in-region hosting (GDPR, KSA NDMO, UAE TDRA).
3. **Telco / banking** marketing teams that need short-link tracking for SMS
   campaigns and cannot send first-party data to third parties.
4. **Indie SaaS founders** who want a launch-ready product to skin and sell.

### Headline use cases
- **SMS / push campaigns** — short links + per-link analytics + retargeting
  pixels (Facebook, GA, TikTok, X, LinkedIn).
- **Influencer / link-in-bio** — built-in Linktree-style bio pages with
  themes.
- **Marketing automation** — Zapier triggers/actions, REST API, browser
  extension token API, webhooks with HMAC signatures.
- **Multi-tenant agencies** — workspaces, invitations, role-based permissions.
- **Mobile deep linking** — single short link → universal/app link → web
  fallback.

### What's included in the sale
- ~50 k LoC TypeScript codebase, Next.js 14 (App Router), Prisma + PostgreSQL.
- 1,659 automated tests (1,054 unit + 295 integration + 310 E2E).
- Lighthouse 91-96 across performance, BP, SEO on production build.
- Bilingual UI (English + Arabic with RTL) and dark/light themes.
- Multi-gateway payments (Stripe, Paddle, Paymob, PayTabs) in test mode.
- Docker (standalone) + CI/CD pipeline for GitHub Actions.
- OpenAPI 3.1 spec at `/api/docs`.
- Marketing pack: screenshots + walkthrough video.
- Sales pack: this folder.

### Suggested end-customer pricing tiers
| Tier | Monthly | Yearly (-20%) | Notes |
|------|---------|----------------|-------|
| **Free** | $0 | — | 50 links / month, basic analytics. Funnel for upgrades. |
| **Starter** | $9 | $86 | 1 k links/month, custom alias, QR, password, expiration. |
| **Pro** | $29 | $278 | 25 k links, 1 custom domain, A/B tests, retargeting pixels. |
| **Business** | $99 | $950 | 250 k links, 3 domains, webhooks, Zapier, workspaces (5 seats). |
| **Enterprise** | from $499 | custom | Unlimited, SSO, on-prem, SLA, API rate limit increase. |

The end customer keeps full margin — this is a one-time purchase, not a rev
share.

### Why this is hard to build from scratch
- Multi-gateway payment abstraction (one checkout, four gateways, regional
  routing). 4-6 weeks of work alone.
- Bilingual everything (English LTR + Arabic RTL) — full layout flips, not
  just translations.
- Multi-tenant workspaces with invitations, permissions, ownership transfer.
- SSRF protection on user-supplied URLs before redirect.
- HMAC-signed webhooks with retry/backoff/observability.
- 1,600+ automated tests, ~85 % coverage on the modules under test.

---

## العربية

### إيه ده
**منصة URL Shortener جاهزة للإنتاج** — نسخة عربية وإنجليزية كاملة بـ RTL،
multi-tenant، فيها branded short links، QR codes، analytics بالتفصيل،
A/B testing، deep linking، link-in-bio، custom domains، و4 بوابات دفع شغّالة.

### مين هيشتريها
1. **شركات digital marketing** عايزة تقدم خدمة link-management لعملائها من غير
   ما تعتمد على SaaS أجنبي.
2. **شركات** عندها متطلبات GDPR أو NDMO السعودية أو TDRA الإماراتية وعايزة
   تستضيف on-prem أو in-region.
3. **شركات اتصالات وبنوك** عايزة tracking قصير لروابط SMS campaigns من غير ما
   تبعت first-party data لطرف ثالث.
4. **مؤسسي SaaS** عايزين منتج جاهز للإطلاق يعيدوا تسميته ويبيعوه.

### أهم Use Cases
- **حملات SMS و Push** — روابط قصيرة + تحليلات لكل لينك + retargeting pixels.
- **Influencers و link-in-bio** — صفحات Linktree-style بثيمات جاهزة.
- **Marketing automation** — Zapier، REST API، browser extension، webhooks بـ HMAC.
- **Multi-tenant agencies** — workspaces، دعوات، أدوار، نقل ملكية.
- **Mobile deep linking** — لينك واحد → universal link → app fallback → web.

### إيه اللي شامل في البيع
- كود TypeScript ~50 k سطر، Next.js 14، Prisma، PostgreSQL.
- 1,659 test (1,054 unit + 295 integration + 310 E2E).
- Lighthouse 91-96 على البيلد الإنتاجي.
- واجهة عربي/إنجليزي كاملة + dark/light.
- 4 بوابات دفع (Stripe، Paddle، Paymob، PayTabs) في test mode.
- Docker + GitHub Actions CI/CD.
- توثيق OpenAPI 3.1 على `/api/docs`.
- Marketing pack: صور + فيديو شرح.
- Sales pack: المجلد ده.

### الأسعار المقترحة للعميل النهائي
| الباقة | شهري | سنوي (-20%) | ملاحظات |
|--------|------|--------------|---------|
| **Free** | 0$ | — | 50 لينك في الشهر، analytics أساسية. قمع للترقية. |
| **Starter** | 9$ | 86$ | 1k لينك، custom alias، QR، password، expiration. |
| **Pro** | 29$ | 278$ | 25k لينك، domain واحد، A/B tests، retargeting. |
| **Business** | 99$ | 950$ | 250k لينك، 3 domains، webhooks، Zapier، workspaces (5 أعضاء). |
| **Enterprise** | من 499$ | حسب الطلب | Unlimited، SSO، on-prem، SLA. |

العميل النهائي بياخد كل الهامش — البيع ده one-time وليس revenue share.

### ليه صعب يتعمل من الصفر
- Abstraction للدفع عبر 4 بوابات. 4-6 أسابيع شغل لوحدها.
- دعم كامل LTR + RTL، مش بس ترجمة.
- Workspaces متعدد المستخدمين بالأدوار والدعوات.
- SSRF protection على روابط المستخدم قبل ما يحصل redirect.
- Webhooks بـ HMAC، retry، backoff، observability.
- 1,600+ test و~85% coverage على الموديولز.
