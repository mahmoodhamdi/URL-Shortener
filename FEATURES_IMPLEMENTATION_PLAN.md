# خطة تنفيذ المميزات - URL Shortener

> تحليل الفجوة بين مميزاتنا ومميزات المنافسين + خطة التنفيذ

---

## الوضع الحالي

### المميزات الموجودة بالفعل ✅

| الميزة | الحالة | ملاحظات |
|--------|--------|---------|
| اختصار الروابط | ✅ كامل | nanoid 7 أحرف |
| Custom Alias | ✅ كامل | 3-50 حرف |
| Bulk Shortening | ✅ كامل | حتى 100 رابط |
| QR Codes | ✅ كامل | ألوان + أحجام مخصصة |
| Password Protection | ✅ كامل | bcrypt hashing |
| Link Expiration | ✅ كامل | تاريخ انتهاء |
| Analytics | ✅ كامل | clicks, devices, browsers, OS, countries, referrers |
| Export (CSV/JSON) | ✅ كامل | تصدير الإحصائيات |
| Link Preview | ✅ كامل | معاينة قبل التحويل |
| Arabic/RTL | ✅ كامل | دعم كامل |
| Dark/Light Mode | ✅ كامل | toggle + persistence |
| REST API | ✅ كامل | 8 endpoints موثقة |
| Responsive Design | ✅ كامل | mobile-first |

---

## المميزات الناقصة (مقارنة بالمنافسين)

### أولوية قصوى (Critical للربح) 🔴

| الميزة | المنافسين | الأهمية | التعقيد |
|--------|-----------|---------|---------|
| User Authentication | الكل | 🔴 حرجة | متوسط |
| Subscription System | الكل | 🔴 حرجة | عالي |
| Usage Limits/Quotas | الكل | 🔴 حرجة | متوسط |
| API Rate Limiting | الكل | 🔴 حرجة | منخفض |

### أولوية عالية (تنافسية) 🟠

| الميزة | المنافسين | الأهمية | التعقيد |
|--------|-----------|---------|---------|
| Custom Domains | Bitly, Rebrandly, Dub.co, Short.io | 🟠 عالية | عالي |
| UTM Builder | Bitly, Rebrandly | 🟠 عالية | منخفض |
| Tags/Folders | Dub.co, Short.io, Rebrandly | 🟠 عالية | منخفض |
| Link Edit (change destination) | الكل | 🟠 عالية | منخفض |

### أولوية متوسطة (قيمة مضافة) 🟡

| الميزة | المنافسين | الأهمية | التعقيد |
|--------|-----------|---------|---------|
| Device Targeting | Dub.co, Short.io, T.ly | 🟡 متوسطة | متوسط |
| Geo Targeting | Dub.co, Short.io, Bitly Premium | 🟡 متوسطة | متوسط |
| Team/Workspace | Rebrandly, Short.io, Dub.co | 🟡 متوسطة | عالي |
| Webhooks | Dub.co, Short.io | 🟡 متوسطة | متوسط |

### أولوية منخفضة (Nice to Have) 🟢

| الميزة | المنافسين | الأهمية | التعقيد |
|--------|-----------|---------|---------|
| A/B Testing | Dub.co, Cuttly | 🟢 منخفضة | عالي |
| Link Cloaking | Short.io | 🟢 منخفضة | منخفض |
| Deep Links | Bitly, Dub.co | 🟢 منخفضة | عالي |
| Retargeting Pixels | T.ly, Rebrandly | 🟢 منخفضة | متوسط |
| Bio Link Pages | Cuttly, Bitly | 🟢 منخفضة | عالي |
| Zapier Integration | الكل تقريباً | 🟢 منخفضة | متوسط |
| Browser Extension | T.ly, Bitly | 🟢 منخفضة | متوسط |
| Mobile App | Bitly | 🟢 منخفضة | عالي جداً |

---

## خطة التنفيذ التفصيلية

---

## المرحلة 1: الأساسيات للربح (أسبوع 1-2)

### 1.1 User Authentication (NextAuth.js)

**الملفات المطلوبة:**
```
src/
├── app/
│   ├── api/auth/[...nextauth]/route.ts
│   ├── [locale]/login/page.tsx
│   ├── [locale]/register/page.tsx
│   └── [locale]/profile/page.tsx
├── lib/
│   └── auth/
│       ├── config.ts
│       └── providers.ts
└── components/
    └── auth/
        ├── LoginForm.tsx
        ├── RegisterForm.tsx
        └── UserMenu.tsx
```

**Database Schema إضافات:**
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String?   // للتسجيل العادي
  image         String?
  emailVerified DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  links         Link[]
  subscription  Subscription?
  apiKeys       ApiKey[]
}

model Account {
  // NextAuth.js OAuth accounts
}

model Session {
  // NextAuth.js sessions
}
```

**المميزات:**
- [ ] تسجيل بالإيميل/كلمة السر
- [ ] تسجيل بـ Google OAuth
- [ ] تسجيل بـ GitHub OAuth
- [ ] نسيت كلمة السر
- [ ] تأكيد الإيميل
- [ ] صفحة Profile

---

### 1.2 Subscription System (Stripe)

**الملفات المطلوبة:**
```
src/
├── app/
│   ├── api/
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts
│   │   │   ├── webhook/route.ts
│   │   │   └── portal/route.ts
│   └── [locale]/pricing/page.tsx
├── lib/
│   └── stripe/
│       ├── client.ts
│       ├── plans.ts
│       └── subscription.ts
└── components/
    └── pricing/
        ├── PricingTable.tsx
        ├── PlanCard.tsx
        └── UpgradeButton.tsx
```

**Database Schema:**
```prisma
model Subscription {
  id                 String   @id @default(cuid())
  userId             String   @unique
  user               User     @relation(fields: [userId], references: [id])

  stripeCustomerId   String?  @unique
  stripeSubscriptionId String? @unique
  stripePriceId      String?

  plan               Plan     @default(FREE)
  status             SubscriptionStatus @default(ACTIVE)

  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  cancelAtPeriodEnd  Boolean  @default(false)

  // Usage tracking
  linksUsed          Int      @default(0)
  linksLimit         Int      @default(100)

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

enum Plan {
  FREE
  STARTER
  PRO
  BUSINESS
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  TRIALING
}
```

**الخطط:**
```typescript
export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    limits: {
      linksPerMonth: 100,
      clicksTracked: 10000,
      customDomains: 0,
      teamMembers: 1,
      apiRequests: 1000,
      analyticsRetention: 30, // days
    },
    features: ['Basic Analytics', 'QR Codes', 'Custom Alias'],
  },
  STARTER: {
    name: 'Starter',
    price: 5,
    stripePriceId: 'price_xxx',
    limits: {
      linksPerMonth: 1000,
      clicksTracked: 50000,
      customDomains: 1,
      teamMembers: 1,
      apiRequests: 10000,
      analyticsRetention: 90,
    },
    features: ['Everything in Free', 'Advanced Analytics', 'API Access', 'No Ads'],
  },
  // ... PRO, BUSINESS, ENTERPRISE
};
```

---

### 1.3 Usage Limits & Quotas

**الملفات:**
```
src/lib/
├── limits/
│   ├── checker.ts      // التحقق من الحدود
│   ├── counter.ts      // عداد الاستخدام
│   └── middleware.ts   // Middleware للتحقق
```

**Implementation:**
```typescript
// src/lib/limits/checker.ts
export async function checkLinkLimit(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const subscription = await getSubscription(userId);
  const linksThisMonth = await countLinksThisMonth(userId);

  return {
    allowed: linksThisMonth < subscription.linksLimit,
    used: linksThisMonth,
    limit: subscription.linksLimit,
    remaining: subscription.linksLimit - linksThisMonth,
  };
}
```

---

### 1.4 API Rate Limiting

**الملفات:**
```
src/lib/
├── rate-limit/
│   ├── limiter.ts
│   └── store.ts    // Redis or in-memory
```

**Implementation:**
```typescript
// Simple in-memory rate limiter
const rateLimit = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  identifier: string, // API key or IP
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const record = rateLimit.get(identifier);

  if (!record || record.resetAt < now) {
    rateLimit.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}
```

---

## المرحلة 2: مميزات تنافسية (أسبوع 3-4)

### 2.1 UTM Builder

**UI Component:**
```
src/components/url/
└── UtmBuilder.tsx
```

**Features:**
- [ ] UTM Source
- [ ] UTM Medium
- [ ] UTM Campaign
- [ ] UTM Term
- [ ] UTM Content
- [ ] Preview URL مع UTM
- [ ] حفظ templates

**Implementation بسيط جداً:**
```typescript
interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export function buildUtmUrl(baseUrl: string, utm: UtmParams): string {
  const url = new URL(baseUrl);
  if (utm.source) url.searchParams.set('utm_source', utm.source);
  if (utm.medium) url.searchParams.set('utm_medium', utm.medium);
  if (utm.campaign) url.searchParams.set('utm_campaign', utm.campaign);
  if (utm.term) url.searchParams.set('utm_term', utm.term);
  if (utm.content) url.searchParams.set('utm_content', utm.content);
  return url.toString();
}
```

---

### 2.2 Tags & Folders

**Database Schema إضافة:**
```prisma
model Folder {
  id        String   @id @default(cuid())
  name      String
  color     String?  // hex color
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  links     Link[]
  createdAt DateTime @default(now())

  @@unique([userId, name])
}

// Update Link model
model Link {
  // ... existing fields
  folderId  String?
  folder    Folder?  @relation(fields: [folderId], references: [id])
  tags      Tag[]
}
```

**UI:**
- [ ] Folder sidebar في Dashboard
- [ ] Drag & drop للروابط
- [ ] Tags badges على Link Cards
- [ ] Filter by folder/tag

---

### 2.3 Link Editing (Change Destination)

**حالياً:** يمكن تعديل الرابط من API لكن مفيش UI

**المطلوب:**
```
src/components/url/
└── LinkEditDialog.tsx
```

**Features:**
- [ ] Edit original URL
- [ ] Edit custom alias
- [ ] Edit title/description
- [ ] Edit expiration
- [ ] Edit password
- [ ] Edit tags/folder

---

### 2.4 Custom Domains

**Database Schema:**
```prisma
model CustomDomain {
  id          String   @id @default(cuid())
  domain      String   @unique
  userId      String
  user        User     @relation(fields: [userId], references: [id])

  verified    Boolean  @default(false)
  verifyToken String?

  sslStatus   SslStatus @default(PENDING)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum SslStatus {
  PENDING
  ACTIVE
  FAILED
}
```

**الملفات:**
```
src/
├── app/
│   ├── api/domains/
│   │   ├── route.ts           // CRUD
│   │   ├── [id]/verify/route.ts
│   │   └── [id]/ssl/route.ts
│   └── [locale]/domains/page.tsx
├── lib/
│   └── domains/
│       ├── verifier.ts
│       └── ssl.ts
```

**Verification Process:**
1. User يضيف domain
2. نولد verification token
3. User يضيف DNS TXT record
4. نتحقق من DNS
5. نفعل SSL (Let's Encrypt أو Cloudflare)

**ملاحظة:** هذه الميزة تحتاج infrastructure (Vercel/Cloudflare) للتعامل مع wildcard domains.

---

## المرحلة 3: مميزات متقدمة (أسبوع 5-6)

### 3.1 Device Targeting

**Database Schema:**
```prisma
model LinkTarget {
  id        String   @id @default(cuid())
  linkId    String
  link      Link     @relation(fields: [linkId], references: [id])

  type      TargetType
  value     String    // e.g., "ios", "android", "US", "EG"
  targetUrl String

  priority  Int       @default(0)

  @@index([linkId])
}

enum TargetType {
  DEVICE      // mobile, desktop, tablet
  OS          // ios, android, windows, macos
  BROWSER     // chrome, safari, firefox
  COUNTRY     // country code
  LANGUAGE    // language code
}
```

**Redirect Logic:**
```typescript
async function getTargetUrl(link: Link, request: Request): Promise<string> {
  const targets = await getTargets(link.id);

  if (targets.length === 0) return link.originalUrl;

  const userAgent = request.headers.get('user-agent');
  const device = parseDevice(userAgent);
  const country = getCountryFromIP(request);

  // Sort by priority
  const sortedTargets = targets.sort((a, b) => b.priority - a.priority);

  for (const target of sortedTargets) {
    if (matchesTarget(target, { device, country })) {
      return target.targetUrl;
    }
  }

  return link.originalUrl;
}
```

---

### 3.2 Team/Workspace Features

**Database Schema:**
```prisma
model Workspace {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  ownerId   String
  owner     User     @relation("WorkspaceOwner", fields: [ownerId], references: [id])

  members   WorkspaceMember[]
  links     Link[]

  createdAt DateTime @default(now())
}

model WorkspaceMember {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  userId      String
  user        User      @relation(fields: [userId], references: [id])

  role        WorkspaceRole @default(MEMBER)

  joinedAt    DateTime @default(now())

  @@unique([workspaceId, userId])
}

enum WorkspaceRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}
```

---

### 3.3 Webhooks

**Database Schema:**
```prisma
model Webhook {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])

  url         String
  secret      String   // for signature verification
  events      String[] // ["link.created", "link.clicked", etc.]

  isActive    Boolean  @default(true)

  createdAt   DateTime @default(now())
}

model WebhookLog {
  id          String   @id @default(cuid())
  webhookId   String
  webhook     Webhook  @relation(fields: [webhookId], references: [id])

  event       String
  payload     Json
  statusCode  Int?
  response    String?

  createdAt   DateTime @default(now())
}
```

**Events:**
- `link.created`
- `link.updated`
- `link.deleted`
- `link.clicked`
- `link.expired`

---

## المرحلة 4: مميزات إضافية (أسبوع 7+)

### 4.1 A/B Testing

```prisma
model ABTest {
  id        String   @id @default(cuid())
  linkId    String
  link      Link     @relation(fields: [linkId], references: [id])

  variants  ABVariant[]

  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

model ABVariant {
  id        String   @id @default(cuid())
  testId    String
  test      ABTest   @relation(fields: [testId], references: [id])

  name      String   // "A", "B", "C"
  url       String
  weight    Int      @default(50) // percentage

  clicks    Int      @default(0)
  conversions Int    @default(0)
}
```

### 4.2 Link Cloaking

```typescript
// في الـ redirect، بدل redirect عادي:
// Option 1: iframe
// Option 2: server-side proxy (يحتاج bandwidth)
```

### 4.3 Retargeting Pixels

```prisma
model RetargetingPixel {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])

  name      String
  type      PixelType // FACEBOOK, GOOGLE, TWITTER, LINKEDIN, CUSTOM
  pixelId   String

  createdAt DateTime @default(now())
}

// في الـ preview/redirect page، inject the pixel
```

### 4.4 Bio Link Pages

```prisma
model BioPage {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])

  slug        String   @unique
  title       String
  bio         String?
  avatar      String?
  theme       String   @default("default")

  links       BioLink[]

  createdAt   DateTime @default(now())
}

model BioLink {
  id        String   @id @default(cuid())
  pageId    String
  page      BioPage  @relation(fields: [pageId], references: [id])

  title     String
  url       String
  icon      String?
  order     Int      @default(0)

  clicks    Int      @default(0)
}
```

---

## جدول التنفيذ المقترح

| الأسبوع | المميزات | الأولوية |
|---------|----------|----------|
| 1 | User Authentication | 🔴 |
| 2 | Subscription System + Stripe | 🔴 |
| 3 | Usage Limits + Rate Limiting | 🔴 |
| 3 | UTM Builder | 🟠 |
| 4 | Tags & Folders | 🟠 |
| 4 | Link Edit Dialog | 🟠 |
| 5 | Custom Domains | 🟠 |
| 6 | Device/Geo Targeting | 🟡 |
| 7 | Team/Workspace | 🟡 |
| 8 | Webhooks | 🟡 |
| 9+ | A/B Testing, Bio Pages, etc. | 🟢 |

---

## ملخص الأولويات

### يجب تنفيذها أولاً (للربح):
1. ✅ **User Authentication** - بدونها مفيش اشتراكات
2. ✅ **Subscription System** - لتحصيل الفلوس
3. ✅ **Usage Limits** - للتفريق بين الخطط
4. ✅ **API Rate Limiting** - لحماية الخدمة

### يجب تنفيذها ثانياً (للتنافس):
5. ✅ **UTM Builder** - سهل وقيمة عالية
6. ✅ **Tags & Folders** - تنظيم أفضل
7. ✅ **Link Edit Dialog** - UX أساسي
8. ✅ **Custom Domains** - ميزة مدفوعة مهمة

### يمكن تأجيلها:
- Device/Geo Targeting
- Team Features
- Webhooks
- A/B Testing
- Bio Pages

---

## الخطوة التالية

**ابدأ بـ:**
1. User Authentication (NextAuth.js)
2. ثم Subscription System (Stripe)

هل نبدأ بالتنفيذ؟
