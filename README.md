# URL Shortener

A production-ready URL shortener built with Next.js 14, TypeScript, and PostgreSQL. Features include custom aliases, QR codes, click analytics, link expiration, password protection, bulk shortening, and a complete REST API.

## Features

- **URL Shortening** - Generate short, memorable URLs instantly
- **Custom Aliases** - Create your own custom short links
- **QR Code Generation** - Generate QR codes for any shortened URL
- **Click Analytics** - Track clicks, locations, devices, and referrers
- **Link Expiration** - Set expiry dates for temporary links
- **Password Protection** - Secure your links with passwords
- **Bulk Shortening** - Shorten multiple URLs at once
- **Link Preview** - Preview destination before redirecting
- **Bilingual Support** - English and Arabic with RTL support
- **Responsive Design** - Works on all devices
- **Dark/Light Mode** - Theme toggle support
- **REST API** - Full API for integration

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **QR Generation**: qrcode
- **State Management**: Zustand
- **Internationalization**: next-intl
- **Validation**: Zod
- **Testing**: Vitest + Playwright
- **CI/CD**: GitHub Actions
- **Containerization**: Docker

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mahmoodhamdi/URL-Shortener.git
cd URL-Shortener
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Using Docker

### Development
```bash
docker-compose -f docker/docker-compose.yml up
```

### Production
```bash
docker pull mwmsoftware/url-shortener:latest
docker-compose -f docker/docker-compose.prod.yml up -d
```

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## API Documentation

### Base URL
```
https://your-domain.com/api
```

### Endpoints

#### Create Short URL
```http
POST /api/shorten
Content-Type: application/json

{
  "url": "https://example.com/very-long-url",
  "customAlias": "my-link",
  "password": "secret",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

#### Bulk Shorten
```http
POST /api/shorten/bulk
Content-Type: application/json

{
  "urls": [
    "https://example1.com",
    "https://example2.com"
  ]
}
```

#### Get All Links
```http
GET /api/links?search=query&filter=active&sort=date
```

#### Get Link Statistics
```http
GET /api/links/{id}/stats?period=30d
```

#### Generate QR Code
```http
POST /api/qr
Content-Type: application/json

{
  "url": "https://example.com",
  "width": 256
}
```

## Project Structure

```
url-shortener/
├── src/
│   ├── app/
│   │   ├── [locale]/          # Localized pages
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── ui/                # shadcn components
│   │   ├── url/               # URL-related components
│   │   ├── stats/             # Statistics components
│   │   └── layout/            # Layout components
│   ├── lib/
│   │   ├── url/               # URL utilities
│   │   ├── analytics/         # Analytics utilities
│   │   └── db/                # Database client
│   ├── messages/              # i18n translations
│   └── types/                 # TypeScript types
├── prisma/                    # Database schema
├── __tests__/                 # Test files
├── docker/                    # Docker configuration
└── .github/                   # GitHub Actions
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Make sure all tests pass (`npm run test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License.

## Author

**Mahmood Hamdi**
- GitHub: [@mahmoodhamdi](https://github.com/mahmoodhamdi)
- Email: hmdy7486@gmail.com

---

Built with Next.js and deployed with Docker
