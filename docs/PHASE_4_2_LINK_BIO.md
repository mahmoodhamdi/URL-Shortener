# Phase 4.2: Link-in-Bio Pages Implementation Plan

## Overview
Link-in-Bio pages (similar to Linktree) allow users to create a single landing page with multiple links. This is essential for social media profiles that only allow one link (Instagram, TikTok, etc.).

## Feature Components

### 1. Database Schema

```prisma
model BioPage {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  slug        String        @unique  // username or custom slug
  title       String                 // Display name
  bio         String?                // Short bio/description
  avatar      String?                // Profile image URL

  theme       BioPageTheme  @default(DEFAULT)
  customCss   String?       @db.Text  // Pro feature

  socialLinks Json?         // { twitter, instagram, youtube, etc. }

  isActive    Boolean       @default(true)
  views       Int           @default(0)

  links       BioLink[]

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([userId])
  @@index([slug])
}

model BioLink {
  id          String   @id @default(cuid())
  bioPageId   String
  bioPage     BioPage  @relation(fields: [bioPageId], references: [id], onDelete: Cascade)

  title       String
  url         String
  icon        String?      // Icon name or emoji
  thumbnail   String?      // Image thumbnail

  position    Int          // Order on the page
  isActive    Boolean      @default(true)
  clicks      Int          @default(0)

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([bioPageId])
}

enum BioPageTheme {
  DEFAULT
  DARK
  LIGHT
  GRADIENT
  MINIMAL
  COLORFUL
}
```

### 2. Files to Create

**Library:**
- `src/lib/bio-page/index.ts` - Main bio page logic
- `src/lib/bio-page/themes.ts` - Theme configurations

**API Routes:**
- `src/app/api/bio/route.ts` - Create/List bio pages
- `src/app/api/bio/[slug]/route.ts` - Get/Update/Delete bio page
- `src/app/api/bio/[slug]/links/route.ts` - Manage bio links

**Pages:**
- `src/app/[locale]/bio/page.tsx` - Bio pages dashboard
- `src/app/[locale]/bio/new/page.tsx` - Create bio page
- `src/app/[locale]/bio/[slug]/edit/page.tsx` - Edit bio page
- `src/app/b/[slug]/page.tsx` - Public bio page view

### 3. Features

**Core Features:**
- Create and manage bio pages
- Add/edit/remove/reorder links
- View analytics (views, clicks)
- Custom slug/username
- Profile image and bio

**Themes:**
- 6 built-in themes (Default, Dark, Light, Gradient, Minimal, Colorful)
- Custom CSS for Pro+ plans

**Social Links:**
- Twitter/X, Instagram, TikTok, YouTube, Facebook, LinkedIn, GitHub, Email

### 4. Plan Limits

| Plan       | Bio Pages | Links per Page | Custom Themes | Analytics |
|------------|-----------|----------------|---------------|-----------|
| FREE       | 1         | 5              | No            | Basic     |
| STARTER    | 2         | 10             | No            | 30 days   |
| PRO        | 5         | 20             | Yes           | 90 days   |
| BUSINESS   | 20        | Unlimited      | Yes + Custom  | 1 year    |
| ENTERPRISE | Unlimited | Unlimited      | Yes + Custom  | Unlimited |

### 5. Implementation Steps

1. ✅ Create implementation plan
2. Add Prisma schema changes
3. Create bio page library
4. Create API endpoints
5. Create public bio page view
6. Create bio page editor UI
7. Add translations
8. Write unit tests
9. Commit and push
