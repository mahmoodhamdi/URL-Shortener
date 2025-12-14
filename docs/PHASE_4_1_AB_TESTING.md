# Phase 4.1: A/B Testing Implementation Plan

## Overview
A/B Testing allows users to test multiple URL variants and track which performs best. Traffic is distributed based on weights, and conversions can be tracked to measure effectiveness.

## Feature Components

### 1. Database Schema

```prisma
model ABTest {
  id        String      @id @default(cuid())
  linkId    String      @unique
  link      Link        @relation(fields: [linkId], references: [id], onDelete: Cascade)

  name      String?     // Optional test name
  isActive  Boolean     @default(true)
  startedAt DateTime    @default(now())
  endedAt   DateTime?

  variants  ABVariant[]

  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  @@index([linkId])
  @@index([isActive])
}

model ABVariant {
  id          String   @id @default(cuid())
  testId      String
  test        ABTest   @relation(fields: [testId], references: [id], onDelete: Cascade)

  name        String   // "Control", "Variant A", "Variant B"
  url         String
  weight      Int      @default(50) // Percentage (1-100)

  clicks      Int      @default(0)
  conversions Int      @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([testId])
}
```

### 2. Files to Create

**Library:**
- `src/lib/ab-testing/index.ts` - Main A/B testing logic
- `src/lib/ab-testing/selector.ts` - Variant selection algorithm
- `src/lib/ab-testing/stats.ts` - Statistical analysis

**API Routes:**
- `src/app/api/links/[id]/ab-test/route.ts` - Create/Get A/B test
- `src/app/api/links/[id]/ab-test/variants/route.ts` - Manage variants
- `src/app/api/links/[id]/ab-test/stats/route.ts` - Get test statistics

### 3. Variant Selection Algorithm

```
1. Get all active variants for link
2. Generate random number 0-100
3. Iterate through variants, accumulating weights
4. When cumulative weight >= random number, select that variant
5. Track the selection in analytics
```

### 4. Statistics

- Click-through rate per variant
- Conversion rate per variant
- Statistical significance calculation
- Winner determination

### 5. Plan Limits

| Plan       | Max A/B Tests | Variants per Test |
|------------|---------------|-------------------|
| FREE       | 0             | 0                 |
| STARTER    | 1             | 2                 |
| PRO        | 5             | 4                 |
| BUSINESS   | 20            | 6                 |
| ENTERPRISE | Unlimited     | Unlimited         |

### 6. Implementation Steps

1. ✅ Create implementation plan
2. Add Prisma schema changes
3. Create A/B testing library
4. Update redirect to use A/B testing
5. Create API endpoints
6. Add translations
7. Write unit tests
8. Commit and push
