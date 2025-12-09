# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A production-ready URL shortener built with Next.js 14 (App Router), TypeScript (strict mode), and PostgreSQL. Features bilingual support (English/Arabic with RTL), dark/light themes, and a complete REST API.

## Common Commands

```bash
# Development
npm run dev                    # Start Next.js dev server
npm run build                  # Production build
npm run lint                   # ESLint

# Testing
npm run test:unit              # Unit tests (Vitest, __tests__/unit/**)
npm run test:integration       # Integration tests (Vitest, __tests__/integration/**)
npm run test:e2e               # E2E tests (Playwright, __tests__/e2e/**)
npm run test:coverage          # Coverage report

# Run single test file
npx vitest run path/to/test.test.ts --config vitest.config.ts

# Database (Prisma + PostgreSQL)
npm run db:generate            # Generate Prisma client
npm run db:push                # Push schema to database
npm run db:migrate             # Run migrations (dev)
npm run db:migrate:deploy      # Deploy migrations (prod)
npm run db:studio              # Open Prisma Studio
```

## Architecture

### Directory Structure
- `src/app/[locale]/` - Locale-based pages (Next.js App Router with next-intl)
- `src/app/api/` - REST API routes
- `src/lib/url/` - Core URL shortening logic (validator, shortener, qr)
- `src/lib/analytics/` - Click tracking and device detection
- `src/lib/db/prisma.ts` - Database client singleton
- `src/components/` - React components (ui/, url/, stats/, layout/)
- `src/messages/` - i18n translations (en.json, ar.json)
- `src/types/index.ts` - TypeScript type definitions

### Key Patterns
- **Internationalization**: Uses `next-intl` with locale routing (`/en/...`, `/ar/...`). Translation files in `src/messages/`. When adding UI text, update both `en.json` and `ar.json`.
- **Path Alias**: Use `@/` to import from `src/` (configured in tsconfig and vitest)
- **Validation**: Zod schemas in `src/lib/url/validator.ts` for URL and alias validation
- **Short Code Generation**: Uses `nanoid` (7 chars) in `src/lib/url/shortener.ts`
- **Password Protection**: bcryptjs for hashing link passwords

### Database Schema (Prisma)
- `Link` - Main model with shortCode, customAlias, password, expiresAt
- `Click` - Analytics: ip, country, device, browser, os, referrer
- `Tag` - For link categorization

### API Routes
- `POST /api/shorten` - Create short URL
- `POST /api/shorten/bulk` - Bulk shorten (max 100)
- `GET /api/links` - List all links (supports search, filter, sort)
- `GET/PUT/DELETE /api/links/[id]` - Single link operations
- `GET /api/links/[id]/stats` - Link statistics
- `POST /api/qr` - Generate QR code
- `GET /api/r/[shortCode]` - Redirect handler

### Testing Structure
- Unit tests: `__tests__/unit/` - Test isolated utilities
- Integration tests: `__tests__/integration/` - Test with database
- E2E tests: `__tests__/e2e/` - Playwright browser tests

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string

Optional:
- `NEXT_PUBLIC_APP_URL` - Base URL (default: http://localhost:3000)

## Docker

```bash
# Development
docker-compose -f docker/docker-compose.yml up

# Production
docker-compose -f docker/docker-compose.prod.yml up -d
```
