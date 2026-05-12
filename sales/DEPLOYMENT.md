# Deployment Guide

Two delivery variants. Pick the one that matches who's doing the ops.

---

## Variant A — Client deploys to their own infrastructure

Target: a fresh Ubuntu 22.04+ server, single host, accessible domain.

### 1. Prerequisites

```bash
# Minimum hardware
# 2 vCPU, 4 GB RAM, 40 GB SSD (Starter)
# 4 vCPU, 8 GB RAM, 100 GB SSD (Pro)

# System packages
sudo apt update
sudo apt install -y \
  nginx \
  postgresql-15 \
  redis-server \
  certbot python3-certbot-nginx \
  curl git build-essential

# Node.js 20 LTS via nvm
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 20 && nvm use 20

# pnpm or npm — npm 10+ ships with Node 20
npm i -g pm2
```

### 2. PostgreSQL setup

```bash
sudo -u postgres psql <<EOF
CREATE DATABASE url_shortener;
CREATE USER url_shortener_app WITH PASSWORD '<STRONG_PASSWORD>';
GRANT ALL PRIVILEGES ON DATABASE url_shortener TO url_shortener_app;
\c url_shortener
GRANT ALL ON SCHEMA public TO url_shortener_app;
EOF
```

Confirm: `psql -h localhost -U url_shortener_app -d url_shortener -c '\dt'`

### 3. Application install

```bash
# Pick a deploy user
sudo adduser --system --group --home /opt/url-shortener urlshort
sudo -u urlshort -i

cd /opt/url-shortener
git clone <repo-url> app
cd app
npm ci --omit=dev

# Production environment file
cp .env.example .env
# Edit .env — see "Environment variables" below.

# Prisma + first build
npx prisma generate
npx prisma migrate deploy
npm run build
```

### 4. Environment variables

The bare minimum to boot:

```env
NODE_ENV=production
NEXTAUTH_URL=https://short.example.com
NEXT_PUBLIC_APP_URL=https://short.example.com
AUTH_TRUST_HOST=true
AUTH_SECRET=<openssl rand -hex 32>
DATABASE_URL=postgresql://url_shortener_app:<STRONG_PASSWORD>@localhost:5432/url_shortener
REDIS_URL=redis://localhost:6379
```

Optional groups, enabled only when needed (see `.env.example` for full list):
- OAuth: `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`
- Payments: Stripe, Paymob, PayTabs, Paddle keys — one or more.
- Firebase: push notifications.

### 5. Process supervision with PM2

```bash
# Inside /opt/url-shortener/app
pm2 start npm --name url-shortener -- start
pm2 startup systemd -u urlshort --hp /opt/url-shortener
pm2 save
```

Alternative: systemd unit at `/etc/systemd/system/url-shortener.service`:

```ini
[Unit]
Description=URL Shortener
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=urlshort
WorkingDirectory=/opt/url-shortener/app
EnvironmentFile=/opt/url-shortener/app/.env
ExecStart=/home/urlshort/.nvm/versions/node/v20/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now url-shortener
sudo systemctl status url-shortener
```

### 6. Nginx reverse proxy + TLS

`/etc/nginx/sites-available/url-shortener.conf`:

```nginx
server {
    listen 80;
    server_name short.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name short.example.com;

    # ssl_certificate / ssl_certificate_key filled in by certbot

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/url-shortener.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

sudo certbot --nginx -d short.example.com -m ops@example.com --agree-tos
```

### 7. Daily database backup

`/etc/cron.daily/url-shortener-backup`:

```bash
#!/bin/bash
set -euo pipefail
TS=$(date +%F)
DEST=/var/backups/url-shortener
mkdir -p "$DEST"
PGPASSWORD='<STRONG_PASSWORD>' pg_dump -h localhost -U url_shortener_app url_shortener \
  | gzip -9 > "$DEST/url-shortener-$TS.sql.gz"
find "$DEST" -name '*.sql.gz' -mtime +14 -delete
```

`sudo chmod 755 /etc/cron.daily/url-shortener-backup`

### 8. Post-deploy verification

```bash
curl -s https://short.example.com/api/health | jq
# expected: {"status":"healthy", ..., "components": {"database":{"status":"up"}, ...}}

curl -s https://short.example.com/robots.txt
curl -s https://short.example.com/sitemap.xml
```

Optional but recommended:
- Add UptimeRobot / Better Stack monitor on `/api/health`.
- Configure log shipping (Loki / CloudWatch / Vector) for `journalctl -u url-shortener`.

---

## Variant B — We provision and hand over keys

If the client doesn't want to operate Linux, we set up everything on their
behalf. Pre-engagement checklist:

### Client provides
- [ ] **Domain name** + DNS console access (or willingness to delegate
      `short.example.com` to our nameservers).
- [ ] **VPS / cloud account** (DigitalOcean, AWS Lightsail, Hetzner, Linode,
      Vultr) sized at 2 vCPU / 4 GB minimum, or root SSH on an existing host.
- [ ] **Billing email** for SSL certificate notifications.
- [ ] **OAuth credentials** for Google / GitHub login (optional).
- [ ] **Payment gateway accounts** they want enabled — Stripe / Paymob /
      PayTabs / Paddle — with their respective keys.
- [ ] **Branding assets**: logo (SVG), favicon, primary brand color hex,
      preferred typography (defaults to Inter).

### We deliver
- [ ] Provisioned server with hardened SSH (key-only, fail2ban, ufw).
- [ ] Working URL Shortener at the client's domain, HTTPS, redirected www.
- [ ] Admin user created and password handed over via secure channel.
- [ ] Daily database backup configured + 14-day retention.
- [ ] Status page at `/status` and `/api/health` endpoint live.
- [ ] One sample short link, one sample bio page, one sample QR.
- [ ] Brief screen-share walkthrough (30 min) of the dashboard.

### Estimated timeline
- DNS propagation + provisioning: 4 hours.
- Branding swap + first deploy: 1 business day.
- Hand-over session: 30 minutes.

---

## Docker / Kubernetes path

`docker/docker-compose.prod.yml` ships a multi-container stack (app + Postgres
+ Redis). Suitable if the client already runs a container orchestrator. The
`output: 'standalone'` Next.js build keeps the image under 200 MB.
