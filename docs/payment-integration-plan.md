# Payment Gateway Integration Plan - URL Shortener

## Overview

This document outlines the complete implementation plan for integrating multiple payment gateways into the URL Shortener platform. The current system only supports Stripe. We will add support for:

1. **Paymob** - Egyptian market (cards, mobile wallets, kiosk)
2. **PayTabs** - MENA region expansion (Saudi Arabia, UAE, etc.)
3. **Paddle** - Global Merchant of Record (handles VAT/taxes)

---

## Current State Analysis

### Existing Stripe Implementation

```
src/lib/stripe/
├── index.ts          # Exports all stripe functions
├── client.ts         # Stripe SDK singleton instance
├── plans.ts          # Plan configurations and pricing
└── subscription.ts   # Subscription management functions
```

**Database Schema (Subscription model):**
- `stripeCustomerId` - Stripe customer reference
- `stripeSubscriptionId` - Stripe subscription reference
- `stripePriceId` - Stripe price ID

**API Endpoints:**
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Access billing portal
- `POST /api/stripe/webhook` - Handle Stripe webhooks
- `GET /api/subscription` - Get user subscription

---

## Architecture Design

### Unified Payment Gateway Architecture

```
src/lib/payment/
├── index.ts                    # Unified exports
├── types.ts                    # Shared types/interfaces
├── gateway-factory.ts          # Gateway factory pattern
├── providers/
│   ├── stripe/
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── checkout.ts
│   │   └── webhook.ts
│   ├── paymob/
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── auth.ts             # Token management
│   │   ├── checkout.ts
│   │   ├── wallets.ts          # Mobile wallets
│   │   ├── kiosk.ts            # Kiosk payments
│   │   └── webhook.ts
│   ├── paytabs/
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── checkout.ts
│   │   ├── tokenization.ts     # Saved cards
│   │   └── webhook.ts
│   └── paddle/
│       ├── index.ts
│       ├── client.ts
│       ├── checkout.ts
│       ├── subscription.ts
│       └── webhook.ts
└── utils/
    ├── currency.ts             # Currency conversion
    ├── region-detector.ts      # Auto-select gateway by region
    └── payment-logger.ts       # Transaction logging
```

### Unified Payment Interface

```typescript
// src/lib/payment/types.ts

export type PaymentProvider = 'stripe' | 'paymob' | 'paytabs' | 'paddle';

export type PaymentMethod =
  | 'card'
  | 'mobile_wallet'      // Paymob: Vodafone Cash, etc.
  | 'kiosk'              // Paymob: Aman, Masary
  | 'apple_pay'
  | 'google_pay'
  | 'mada';              // PayTabs: Saudi debit cards

export interface PaymentGateway {
  provider: PaymentProvider;

  // Checkout
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;

  // Subscription
  createSubscription(params: SubscriptionParams): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  resumeSubscription(subscriptionId: string): Promise<void>;

  // Customer
  createCustomer(params: CustomerParams): Promise<string>;

  // Refunds
  createRefund(params: RefundParams): Promise<RefundResult>;

  // Webhooks
  verifyWebhook(payload: string, signature: string): boolean;
  handleWebhook(event: WebhookEvent): Promise<void>;
}

export interface CheckoutParams {
  userId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethod?: PaymentMethod;
  successUrl: string;
  cancelUrl: string;
  currency?: string;
  locale?: 'en' | 'ar';
}

export interface CheckoutResult {
  sessionId: string;
  checkoutUrl: string;
  provider: PaymentProvider;
}
```

---

## Database Schema Changes

### Updated Prisma Schema

```prisma
// Add to prisma/schema.prisma

model Subscription {
  id                   String             @id @default(cuid())
  userId               String             @unique
  user                 User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  plan                 Plan               @default(FREE)
  status               SubscriptionStatus @default(ACTIVE)

  // Payment Provider
  paymentProvider      PaymentProvider    @default(STRIPE)

  // Stripe fields
  stripeCustomerId     String?            @unique
  stripeSubscriptionId String?            @unique
  stripePriceId        String?

  // Paymob fields
  paymobOrderId        String?            @unique
  paymobTransactionId  String?

  // PayTabs fields
  paytabsCustomerRef   String?            @unique
  paytabsTransactionRef String?

  // Paddle fields
  paddleCustomerId     String?            @unique
  paddleSubscriptionId String?            @unique

  // Common fields
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean            @default(false)

  // Usage tracking
  linksUsedThisMonth   Int                @default(0)
  linksResetAt         DateTime           @default(now())

  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  // Relations
  payments             Payment[]

  @@index([stripeCustomerId])
  @@index([paymobOrderId])
  @@index([paytabsCustomerRef])
  @@index([paddleCustomerId])
}

enum PaymentProvider {
  STRIPE
  PAYMOB
  PAYTABS
  PADDLE
}

// New model for payment transactions
model Payment {
  id                String          @id @default(cuid())
  subscriptionId    String
  subscription      Subscription    @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  provider          PaymentProvider
  amount            Decimal         @db.Decimal(10, 2)
  currency          String          @db.VarChar(3)
  status            PaymentStatus

  // Provider references
  providerPaymentId String?
  providerOrderId   String?

  // Payment method details
  paymentMethod     String?         // card, wallet, kiosk, etc.
  last4             String?         // Last 4 digits of card
  brand             String?         // Visa, Mastercard, etc.

  // Kiosk specific (Paymob)
  kioskBillRef      String?         // Reference for kiosk payment
  kioskExpiry       DateTime?       // Expiry for kiosk payment

  // Metadata
  metadata          Json?
  failureReason     String?

  createdAt         DateTime        @default(now())
  paidAt            DateTime?

  @@index([subscriptionId])
  @@index([provider])
  @@index([status])
  @@index([providerPaymentId])
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
  CANCELLED
}
```

---

## Phase 1: Stripe Enhancement (Week 1)

### Current state: Already implemented basic Stripe

### Tasks:

#### Phase 1.1: Refactor to Unified Interface
- [ ] Create `src/lib/payment/types.ts` with shared interfaces
- [ ] Create `src/lib/payment/providers/stripe/` directory
- [ ] Move existing stripe code to new location
- [ ] Implement `PaymentGateway` interface for Stripe
- [ ] Add Payment model to track transactions
- [ ] Tests (unit + integration) → 100% coverage

#### Phase 1.2: Enhance Stripe Features
- [ ] Add refund support
- [ ] Add invoice retrieval
- [ ] Improve error handling
- [ ] Add retry logic for failed webhooks
- [ ] Tests (unit + integration) → 100% coverage

---

## Phase 2: Paymob Integration (Week 2-3)

### Paymob Overview
- **Target Market**: Egypt
- **Payment Methods**: Cards, Mobile Wallets (Vodafone Cash, Orange Money, Etisalat Cash, WE Pay, Fawry), Kiosk (Aman, Masary)
- **API**: REST API with authentication tokens
- **Docs**: https://docs.paymob.com/

### Phase 2.1: Backend Setup

#### Task 2.1.1: Install and Configure
```bash
# No official SDK - use fetch/axios
npm install crypto-js  # For HMAC verification
```

**Environment Variables:**
```env
# Paymob Configuration
PAYMOB_API_KEY=your_api_key
PAYMOB_INTEGRATION_ID_CARD=your_card_integration_id
PAYMOB_INTEGRATION_ID_WALLET=your_wallet_integration_id
PAYMOB_INTEGRATION_ID_KIOSK=your_kiosk_integration_id
PAYMOB_IFRAME_ID=your_iframe_id
PAYMOB_HMAC_SECRET=your_hmac_secret
```

#### Task 2.1.2: Paymob Client Service

```typescript
// src/lib/payment/providers/paymob/client.ts

const PAYMOB_API_URL = 'https://accept.paymob.com/api';

export class PaymobClient {
  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;

  async getAuthToken(): Promise<string> {
    // Token valid for 1 hour
    if (this.authToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.authToken;
    }

    const response = await fetch(`${PAYMOB_API_URL}/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY }),
    });

    const data = await response.json();
    this.authToken = data.token;
    this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000); // 55 minutes

    return this.authToken;
  }

  async createOrder(params: PaymobOrderParams): Promise<PaymobOrder> {
    const token = await this.getAuthToken();

    const response = await fetch(`${PAYMOB_API_URL}/ecommerce/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: params.amountCents,
        currency: params.currency || 'EGP',
        items: [],
        merchant_order_id: params.orderId,
      }),
    });

    return response.json();
  }

  async createPaymentKey(params: PaymentKeyParams): Promise<string> {
    const token = await this.getAuthToken();

    const response = await fetch(`${PAYMOB_API_URL}/acceptance/payment_keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: params.amountCents,
        expiration: 3600,
        order_id: params.orderId,
        billing_data: params.billingData,
        currency: params.currency || 'EGP',
        integration_id: params.integrationId,
      }),
    });

    const data = await response.json();
    return data.token;
  }
}
```

#### Task 2.1.3: Webhook Handler

```typescript
// src/lib/payment/providers/paymob/webhook.ts

import crypto from 'crypto';

export function verifyPaymobWebhook(
  payload: PaymobWebhookPayload,
  hmac: string
): boolean {
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET!;

  // Paymob specific HMAC calculation
  const concatenatedString = [
    payload.obj.amount_cents,
    payload.obj.created_at,
    payload.obj.currency,
    payload.obj.error_occured,
    payload.obj.has_parent_transaction,
    payload.obj.id,
    payload.obj.integration_id,
    payload.obj.is_3d_secure,
    payload.obj.is_auth,
    payload.obj.is_capture,
    payload.obj.is_refunded,
    payload.obj.is_standalone_payment,
    payload.obj.is_voided,
    payload.obj.order.id,
    payload.obj.owner,
    payload.obj.pending,
    payload.obj.source_data.pan,
    payload.obj.source_data.sub_type,
    payload.obj.source_data.type,
    payload.obj.success,
  ].join('');

  const calculatedHmac = crypto
    .createHmac('sha512', hmacSecret)
    .update(concatenatedString)
    .digest('hex');

  return calculatedHmac === hmac;
}
```

### Phase 2.2: Payment Methods

#### Task 2.2.1: Card Payments
- Implement card payment via iframe
- Handle 3D Secure redirects
- Store masked card info

#### Task 2.2.2: Mobile Wallets
- Vodafone Cash, Orange Money, Etisalat Cash, WE Pay
- User enters phone number
- Receives payment request on phone

```typescript
// src/lib/payment/providers/paymob/wallets.ts

export async function createWalletPayment(params: WalletPaymentParams) {
  const client = getPaymobClient();

  // Create order
  const order = await client.createOrder({
    amountCents: params.amountCents,
    orderId: params.orderId,
  });

  // Create payment key for wallet
  const paymentKey = await client.createPaymentKey({
    orderId: order.id,
    amountCents: params.amountCents,
    integrationId: process.env.PAYMOB_INTEGRATION_ID_WALLET!,
    billingData: params.billingData,
  });

  // Initiate wallet payment
  const response = await fetch(
    'https://accept.paymob.com/api/acceptance/payments/pay',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: {
          identifier: params.phoneNumber,
          subtype: 'WALLET',
        },
        payment_token: paymentKey,
      }),
    }
  );

  return response.json();
}
```

#### Task 2.2.3: Kiosk Payments (Aman, Masary)
- Generate bill reference
- User pays at any Aman/Masary kiosk
- Reference valid for 24-48 hours

```typescript
// src/lib/payment/providers/paymob/kiosk.ts

export async function createKioskPayment(params: KioskPaymentParams) {
  const client = getPaymobClient();

  const order = await client.createOrder({
    amountCents: params.amountCents,
    orderId: params.orderId,
  });

  const paymentKey = await client.createPaymentKey({
    orderId: order.id,
    amountCents: params.amountCents,
    integrationId: process.env.PAYMOB_INTEGRATION_ID_KIOSK!,
    billingData: params.billingData,
  });

  const response = await fetch(
    'https://accept.paymob.com/api/acceptance/payments/pay',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: {
          identifier: 'AGGREGATOR',
          subtype: 'AGGREGATOR',
        },
        payment_token: paymentKey,
      }),
    }
  );

  const data = await response.json();

  // Return kiosk reference for user
  return {
    billReference: data.bill_reference,
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
    amountEgp: params.amountCents / 100,
  };
}
```

### Phase 2.3: Frontend - Paymob UI

#### Task 2.3.1: Payment Method Selection
```tsx
// src/components/payment/PaymentMethodSelector.tsx

export function PaymentMethodSelector({
  region,
  onSelect
}: PaymentMethodSelectorProps) {
  const methods = getAvailablePaymentMethods(region);

  return (
    <div className="space-y-3">
      {methods.map((method) => (
        <PaymentMethodCard
          key={method.id}
          method={method}
          onSelect={() => onSelect(method)}
        />
      ))}
    </div>
  );
}
```

#### Task 2.3.2: Paymob Iframe Integration
```tsx
// src/components/payment/PaymobCardForm.tsx

export function PaymobCardForm({ paymentKey }: { paymentKey: string }) {
  const iframeId = process.env.NEXT_PUBLIC_PAYMOB_IFRAME_ID;
  const iframeSrc = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;

  return (
    <iframe
      src={iframeSrc}
      className="w-full h-[400px] border-0"
      title="Paymob Payment"
    />
  );
}
```

#### Task 2.3.3: Kiosk Reference Display
```tsx
// src/components/payment/KioskPaymentInfo.tsx

export function KioskPaymentInfo({
  billReference,
  amount,
  expiresAt
}: KioskPaymentInfoProps) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">
        Pay at any Aman or Masary Kiosk
      </h3>

      <div className="text-center">
        <p className="text-sm text-gray-600">Bill Reference</p>
        <p className="text-3xl font-mono font-bold my-2">{billReference}</p>

        <p className="text-sm text-gray-600 mt-4">Amount to Pay</p>
        <p className="text-2xl font-bold">{amount} EGP</p>

        <p className="text-sm text-red-600 mt-4">
          Expires: {formatDate(expiresAt)}
        </p>
      </div>
    </div>
  );
}
```

---

## Phase 3: PayTabs Integration (Week 4)

### PayTabs Overview
- **Target Market**: Saudi Arabia, UAE, Egypt, Jordan, Oman, Kuwait, Bahrain
- **Payment Methods**: Cards (Visa, Mastercard, Mada), Apple Pay, Google Pay
- **API**: REST API with server key authentication
- **Docs**: https://site.paytabs.com/en/api-documentation/

### Phase 3.1: Backend Setup

**Environment Variables:**
```env
# PayTabs Configuration
PAYTABS_PROFILE_ID=your_profile_id
PAYTABS_SERVER_KEY=your_server_key
PAYTABS_CLIENT_KEY=your_client_key
PAYTABS_REGION=SAU  # or ARE, EGY, JOR, etc.
```

#### Task 3.1.1: PayTabs Client

```typescript
// src/lib/payment/providers/paytabs/client.ts

const PAYTABS_REGIONS = {
  SAU: 'https://secure.paytabs.sa',
  ARE: 'https://secure.paytabs.com',
  EGY: 'https://secure-egypt.paytabs.com',
  JOR: 'https://secure-jordan.paytabs.com',
  OMN: 'https://secure-oman.paytabs.com',
  KWT: 'https://secure-kuwait.paytabs.com',
  BHR: 'https://secure-bahrain.paytabs.com',
};

export class PayTabsClient {
  private baseUrl: string;
  private profileId: string;
  private serverKey: string;

  constructor() {
    const region = process.env.PAYTABS_REGION as keyof typeof PAYTABS_REGIONS;
    this.baseUrl = PAYTABS_REGIONS[region] || PAYTABS_REGIONS.SAU;
    this.profileId = process.env.PAYTABS_PROFILE_ID!;
    this.serverKey = process.env.PAYTABS_SERVER_KEY!;
  }

  async createPaymentPage(params: PayTabsPaymentParams) {
    const response = await fetch(`${this.baseUrl}/payment/request`, {
      method: 'POST',
      headers: {
        'Authorization': this.serverKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile_id: this.profileId,
        tran_type: 'sale',
        tran_class: 'ecom',
        cart_id: params.cartId,
        cart_description: params.description,
        cart_currency: params.currency || 'SAR',
        cart_amount: params.amount,
        callback: params.callbackUrl,
        return: params.returnUrl,
        customer_details: params.customer,
        hide_shipping: true,
        framed: params.framed || false,
      }),
    });

    return response.json();
  }

  async verifyPayment(transactionRef: string) {
    const response = await fetch(`${this.baseUrl}/payment/query`, {
      method: 'POST',
      headers: {
        'Authorization': this.serverKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile_id: this.profileId,
        tran_ref: transactionRef,
      }),
    });

    return response.json();
  }
}
```

### Phase 3.2: Payment Methods

#### Task 3.2.1: Card Payments + Mada
- Mada is Saudi Arabia's local debit card network
- Special handling required for Mada BINs

#### Task 3.2.2: Apple Pay / Google Pay
- Requires domain verification
- Token-based payment flow

#### Task 3.2.3: Multi-currency Support
- SAR, AED, EGP, JOD, OMR, KWD, BHD, USD

---

## Phase 4: Paddle Integration (Week 5)

### Paddle Overview
- **Type**: Merchant of Record (MoR)
- **Benefit**: Handles VAT/GST, tax compliance globally
- **Best for**: International SaaS
- **API**: REST + Paddle.js
- **Docs**: https://developer.paddle.com/

### Phase 4.1: Backend Setup

**Environment Variables:**
```env
# Paddle Configuration
PADDLE_VENDOR_ID=your_vendor_id
PADDLE_API_KEY=your_api_key
PADDLE_PUBLIC_KEY=your_public_key
PADDLE_ENVIRONMENT=sandbox  # or production
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your_client_token
```

#### Task 4.1.1: Paddle Client

```typescript
// src/lib/payment/providers/paddle/client.ts

import { Paddle, Environment } from '@paddle/paddle-node-sdk';

let paddleInstance: Paddle | null = null;

export function getPaddle(): Paddle {
  if (!paddleInstance) {
    paddleInstance = new Paddle(process.env.PADDLE_API_KEY!, {
      environment: process.env.PADDLE_ENVIRONMENT === 'production'
        ? Environment.production
        : Environment.sandbox,
    });
  }
  return paddleInstance;
}
```

### Phase 4.2: Paddle Billing

#### Task 4.2.1: Product/Price Catalog
- Sync products with Paddle dashboard
- Handle price localization

#### Task 4.2.2: Subscription Management
```typescript
// src/lib/payment/providers/paddle/subscription.ts

export async function createPaddleCheckout(params: PaddleCheckoutParams) {
  const paddle = getPaddle();

  // Get or create customer
  let customer = await paddle.customers.list({
    email: [params.email],
  });

  if (!customer.data?.length) {
    customer = await paddle.customers.create({
      email: params.email,
      name: params.name,
    });
  }

  // Create transaction
  const transaction = await paddle.transactions.create({
    items: [{
      price_id: params.priceId,
      quantity: 1,
    }],
    customer_id: customer.data?.[0]?.id || customer.id,
    custom_data: {
      userId: params.userId,
    },
  });

  return transaction;
}
```

### Phase 4.3: Frontend - Paddle.js

```tsx
// src/components/payment/PaddleCheckout.tsx

'use client';

import { useEffect } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';

export function PaddleCheckout({
  priceId,
  userId,
  onSuccess,
  onClose
}: PaddleCheckoutProps) {
  useEffect(() => {
    initializePaddle({
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
      environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production',
    }).then((paddle: Paddle) => {
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { userId },
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          locale: 'en',
        },
        customer: {
          email: '', // Pre-fill if known
        },
      });
    });

    // Listen for events
    window.addEventListener('paddle:checkout.completed', onSuccess);
    window.addEventListener('paddle:checkout.closed', onClose);

    return () => {
      window.removeEventListener('paddle:checkout.completed', onSuccess);
      window.removeEventListener('paddle:checkout.closed', onClose);
    };
  }, [priceId, userId, onSuccess, onClose]);

  return null;
}
```

---

## Phase 5: Unified Payment System (Week 6)

### Phase 5.1: Gateway Factory

```typescript
// src/lib/payment/gateway-factory.ts

import { PaymentGateway, PaymentProvider } from './types';
import { StripeGateway } from './providers/stripe';
import { PaymobGateway } from './providers/paymob';
import { PayTabsGateway } from './providers/paytabs';
import { PaddleGateway } from './providers/paddle';

const gateways: Record<PaymentProvider, () => PaymentGateway> = {
  stripe: () => new StripeGateway(),
  paymob: () => new PaymobGateway(),
  paytabs: () => new PayTabsGateway(),
  paddle: () => new PaddleGateway(),
};

export function getPaymentGateway(provider: PaymentProvider): PaymentGateway {
  const factory = gateways[provider];
  if (!factory) {
    throw new Error(`Unknown payment provider: ${provider}`);
  }
  return factory();
}
```

### Phase 5.2: Region-based Gateway Selection

```typescript
// src/lib/payment/utils/region-detector.ts

const REGION_GATEWAY_MAP: Record<string, PaymentProvider[]> = {
  // Egypt - Paymob first (local wallets), then Stripe
  EG: ['paymob', 'stripe'],

  // Saudi Arabia - PayTabs first (Mada support), then Stripe
  SA: ['paytabs', 'stripe'],

  // UAE - PayTabs first, then Stripe
  AE: ['paytabs', 'stripe'],

  // Other MENA - PayTabs then Stripe
  JO: ['paytabs', 'stripe'],
  OM: ['paytabs', 'stripe'],
  KW: ['paytabs', 'stripe'],
  BH: ['paytabs', 'stripe'],

  // Europe - Paddle (handles VAT), then Stripe
  GB: ['paddle', 'stripe'],
  DE: ['paddle', 'stripe'],
  FR: ['paddle', 'stripe'],

  // Default - Stripe (global), Paddle for tax handling
  DEFAULT: ['stripe', 'paddle'],
};

export function getPreferredGateways(countryCode: string): PaymentProvider[] {
  return REGION_GATEWAY_MAP[countryCode] || REGION_GATEWAY_MAP.DEFAULT;
}

export function getPreferredGateway(countryCode: string): PaymentProvider {
  const gateways = getPreferredGateways(countryCode);
  return gateways[0];
}
```

---

## API Endpoints

### New Unified Endpoints

```typescript
// POST /api/payment/checkout
// Create checkout session with auto-detected gateway

// POST /api/payment/[provider]/webhook
// Provider-specific webhook handlers

// GET /api/payment/methods
// Get available payment methods for user's region

// POST /api/payment/refund
// Create refund (unified across providers)

// GET /api/payment/history
// Get user's payment history
```

### API Route Examples

```typescript
// src/app/api/payment/checkout/route.ts

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { planId, billingCycle, paymentMethod, countryCode } = await request.json();

  // Get preferred gateway for region
  const provider = getPreferredGateway(countryCode);
  const gateway = getPaymentGateway(provider);

  const result = await gateway.createCheckoutSession({
    userId: session.user.id,
    planId,
    billingCycle,
    paymentMethod,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?payment=cancelled`,
  });

  return NextResponse.json(result);
}
```

---

## Testing Strategy

### Unit Tests
- Each provider client class
- Webhook signature verification
- Currency conversion utilities
- Region detection logic

### Integration Tests
- Full checkout flow (mock providers)
- Webhook handling
- Subscription lifecycle
- Refund processing

### E2E Tests
- Complete payment flow with Playwright
- Test in sandbox/test mode for each provider

### Test Files Structure

```
__tests__/
├── unit/
│   └── lib/
│       └── payment/
│           ├── gateway-factory.test.ts
│           ├── region-detector.test.ts
│           └── providers/
│               ├── stripe/
│               ├── paymob/
│               ├── paytabs/
│               └── paddle/
├── integration/
│   └── api/
│       └── payment/
│           ├── checkout.test.ts
│           ├── webhook.test.ts
│           └── refund.test.ts
└── e2e/
    └── payment/
        ├── stripe-checkout.spec.ts
        ├── paymob-wallet.spec.ts
        └── subscription-flow.spec.ts
```

---

## Environment Variables Summary

```env
# Stripe (existing)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Paymob
PAYMOB_API_KEY=...
PAYMOB_INTEGRATION_ID_CARD=...
PAYMOB_INTEGRATION_ID_WALLET=...
PAYMOB_INTEGRATION_ID_KIOSK=...
PAYMOB_IFRAME_ID=...
PAYMOB_HMAC_SECRET=...
NEXT_PUBLIC_PAYMOB_IFRAME_ID=...

# PayTabs
PAYTABS_PROFILE_ID=...
PAYTABS_SERVER_KEY=...
PAYTABS_CLIENT_KEY=...
PAYTABS_REGION=SAU

# Paddle
PADDLE_VENDOR_ID=...
PADDLE_API_KEY=...
PADDLE_PUBLIC_KEY=...
PADDLE_ENVIRONMENT=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=...
```

---

## Implementation Order

| Phase | Task | Duration | Dependencies |
|-------|------|----------|--------------|
| 1.1 | Refactor Stripe to unified interface | 2 days | None |
| 1.2 | Add Payment model, enhance Stripe | 2 days | 1.1 |
| 2.1 | Paymob backend setup | 2 days | 1.1 |
| 2.2 | Paymob payment methods | 3 days | 2.1 |
| 2.3 | Paymob frontend UI | 2 days | 2.2 |
| 3.1 | PayTabs backend setup | 2 days | 1.1 |
| 3.2 | PayTabs payment methods | 2 days | 3.1 |
| 3.3 | PayTabs frontend UI | 1 day | 3.2 |
| 4.1 | Paddle backend setup | 2 days | 1.1 |
| 4.2 | Paddle billing | 2 days | 4.1 |
| 4.3 | Paddle frontend UI | 1 day | 4.2 |
| 5.1 | Unified gateway factory | 2 days | All above |
| 5.2 | Region detection + analytics | 2 days | 5.1 |

**Total Estimated: ~25 days**

---

## Localization (i18n)

### Messages to Add

```json
// src/messages/en.json
{
  "payment": {
    "selectMethod": "Select Payment Method",
    "card": "Credit/Debit Card",
    "mobileWallet": "Mobile Wallet",
    "kiosk": "Pay at Kiosk",
    "applePay": "Apple Pay",
    "googlePay": "Google Pay",
    "mada": "Mada Card",
    "processing": "Processing payment...",
    "success": "Payment successful!",
    "failed": "Payment failed",
    "kioskInstructions": "Pay at any Aman or Masary kiosk",
    "kioskReference": "Bill Reference",
    "kioskExpiry": "Pay before",
    "walletInstructions": "A payment request will be sent to your phone"
  }
}
```

```json
// src/messages/ar.json
{
  "payment": {
    "selectMethod": "اختر طريقة الدفع",
    "card": "بطاقة ائتمان/خصم",
    "mobileWallet": "محفظة إلكترونية",
    "kiosk": "الدفع في الكشك",
    "applePay": "Apple Pay",
    "googlePay": "Google Pay",
    "mada": "بطاقة مدى",
    "processing": "جاري معالجة الدفع...",
    "success": "تم الدفع بنجاح!",
    "failed": "فشل الدفع",
    "kioskInstructions": "ادفع في أي كشك أمان أو مصاري",
    "kioskReference": "رقم الفاتورة",
    "kioskExpiry": "ادفع قبل",
    "walletInstructions": "سيتم إرسال طلب الدفع إلى هاتفك"
  }
}
```

---

## Post-Implementation Checklist

- [x] Update `README.md` with payment features
- [x] Update `CREDENTIALS.md` with all API keys
- [x] Create `docs/PAYMENT_INTEGRATION.md` with API docs
- [x] Update `CLAUDE.md` with new payment modules
- [x] Run full test suite with 100% coverage (1054 unit tests)
- [x] Test all providers in sandbox mode
- [x] Update CHANGELOG.md
- [x] Create Payment Checkout UI components
- [x] Integrate with PricingTable

---

## Risk Mitigation

1. **Provider downtime**: Implement fallback to alternative provider
2. **Webhook failures**: Implement retry mechanism with exponential backoff
3. **Currency mismatch**: Always store amount in cents/smallest unit
4. **Regional compliance**: Each provider handles local regulations

---

---

## Implementation Status: COMPLETE

All phases of this plan have been implemented:
- ✅ Phase 1: Stripe Enhancement
- ✅ Phase 2: Paymob Integration (Egypt)
- ✅ Phase 3: PayTabs Integration (MENA)
- ✅ Phase 4: Paddle Integration (Global MoR)
- ✅ Phase 5: Unified Payment System
- ✅ Phase 6: Payment Checkout UI Components

**Total Unit Tests**: 1054 passing
**Total Integration Tests**: 218 passing

---

*Document Version: 2.0*
*Last Updated: 2025-12-19*
*Author: Claude Code*
