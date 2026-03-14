# Admin Dashboard Deployment Guide

This guide covers deploying the SWM PRO Admin Dashboard to various platforms.

## Prerequisites

- Node.js 18+ and pnpm installed
- Supabase account with database configured
- Environment variables ready

## Local Development

### Setup

```bash
cd /home/ubuntu/swm-pro-v2/swm-pro-v2
pnpm install
pnpm dev:admin
```

Visit `http://localhost:3000`

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://db.ixpzcdrrjaqdfcbpaahe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_TWILIO_SID=REDACTED_TWILIO_SID
NEXT_PUBLIC_TWILIO_TOKEN=REDACTED_TWILIO_TOKEN
DATABASE_URL=postgresql://postgres:password@db.ixpzcdrrjaqdfcbpaahe.supabase.co:5432/postgres
```

## Production Build

### Build

```bash
pnpm build:admin
```

This creates an optimized production build in `.next/`

### Testing Production Build Locally

```bash
pnpm start
```

## Deployment Platforms

### 1. Vercel (Recommended)

Vercel is the official Next.js hosting platform.

#### Setup

```bash
npm install -g vercel
vercel login
```

#### Deploy

```bash
cd /home/ubuntu/swm-pro-v2/swm-pro-v2/apps/admin
vercel
```

#### Environment Variables in Vercel

1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add all variables from `.env.local`
3. Ensure they're available in Production

#### Configuration

Create `vercel.json`:

```json
{
  "buildCommand": "pnpm build:admin",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_key",
    "NEXT_PUBLIC_API_URL": "@api_url",
    "NEXT_PUBLIC_TWILIO_SID": "@twilio_sid",
    "NEXT_PUBLIC_TWILIO_TOKEN": "@twilio_token"
  }
}
```

### 2. Docker Deployment

#### Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin ./apps/admin
COPY packages/shared ./packages/shared

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build admin app
RUN pnpm build:admin

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
```

#### Build and Run

```bash
docker build -t swm-pro-admin:latest .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  -e NEXT_PUBLIC_API_URL=your_api_url \
  swm-pro-admin:latest
```

#### Docker Compose

```yaml
version: '3.8'

services:
  admin:
    build: .
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
      NEXT_PUBLIC_TWILIO_SID: ${NEXT_PUBLIC_TWILIO_SID}
      NEXT_PUBLIC_TWILIO_TOKEN: ${NEXT_PUBLIC_TWILIO_TOKEN}
    restart: unless-stopped
```

Run with:

```bash
docker-compose up -d
```

### 3. AWS Deployment

#### Using AWS Amplify

1. Push code to GitHub
2. Connect repository to AWS Amplify
3. Add build settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install -g pnpm
        - pnpm install
    build:
      commands:
        - pnpm build:admin
  artifacts:
    baseDirectory: apps/admin/.next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

4. Add environment variables in Amplify Console
5. Deploy

#### Using EC2

```bash
# SSH into EC2 instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Install Node.js and pnpm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pnpm

# Clone repository
git clone your-repo-url
cd swm-pro-v2

# Install and build
pnpm install
pnpm build:admin

# Run with PM2
npm install -g pm2
pm2 start "pnpm start" --name "swm-admin"
pm2 save
pm2 startup
```

### 4. Google Cloud Run

#### Create Dockerfile (as above)

#### Deploy

```bash
gcloud builds submit --tag gcr.io/your-project/swm-admin
gcloud run deploy swm-admin \
  --image gcr.io/your-project/swm-admin \
  --platform managed \
  --region us-central1 \
  --set-env-vars NEXT_PUBLIC_SUPABASE_URL=your_url,NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### 5. Railway.app

1. Push code to GitHub
2. Connect to Railway.app
3. Add environment variables
4. Railway auto-detects Next.js and deploys

### 6. Heroku

```bash
# Create app
heroku create swm-pro-admin

# Add buildpacks
heroku buildpacks:add heroku/nodejs

# Set environment variables
heroku config:set NEXT_PUBLIC_SUPABASE_URL=your_url
heroku config:set NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# Deploy
git push heroku main
```

## Performance Optimization

### Build Optimization

```bash
# Analyze bundle size
pnpm build:admin --analyze
```

### Caching Strategy

Set cache headers in `next.config.js`:

```javascript
headers: async () => [
  {
    source: '/:path*',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=3600, stale-while-revalidate=86400',
      },
    ],
  },
]
```

### CDN Configuration

Use Cloudflare or AWS CloudFront for:
- Static asset caching
- DDoS protection
- Global distribution

## Monitoring & Logging

### Vercel Analytics

Automatically enabled on Vercel. View in Vercel Dashboard.

### Custom Logging

```typescript
// src/lib/logger.ts
export const logger = {
  info: (msg: string, data?: any) => {
    console.log(`[INFO] ${msg}`, data);
  },
  error: (msg: string, error?: any) => {
    console.error(`[ERROR] ${msg}`, error);
  },
};
```

### Error Tracking

Integrate Sentry:

```bash
pnpm add @sentry/nextjs
```

Configure in `next.config.js`:

```javascript
const withSentry = require("@sentry/nextjs/withSentryConfig");

module.exports = withSentry(nextConfig, {
  org: "your-org",
  project: "swm-admin",
});
```

## Database Backups

### Supabase Backups

Supabase automatically backs up data. Configure in:
- Supabase Dashboard → Settings → Backups

### Manual Backup

```bash
pg_dump postgresql://user:password@host/db > backup.sql
```

## SSL/TLS Certificates

Most platforms (Vercel, Railway, Cloud Run) provide free SSL certificates.

For self-hosted:

```bash
# Using Let's Encrypt with Certbot
sudo certbot certonly --standalone -d yourdomain.com
```

## Rollback Strategy

### Vercel

1. Go to Deployments
2. Click on previous deployment
3. Click "Promote to Production"

### Docker

```bash
# Tag and push previous version
docker tag swm-pro-admin:latest swm-pro-admin:v1.0.0
docker push swm-pro-admin:v1.0.0

# Rollback
docker run -p 3000:3000 swm-pro-admin:v1.0.0
```

## Health Checks

Add health check endpoint in `pages/api/health.ts`:

```typescript
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ status: 'ok' });
}
```

Configure in deployment platform:
- Vercel: Automatic
- Docker: Add to health check
- AWS: Configure target group health check

## Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf .next
pnpm install
pnpm build:admin
```

### Environment Variables Not Loading

1. Verify variables are set in deployment platform
2. Restart application
3. Check `NEXT_PUBLIC_` prefix for client-side vars

### Database Connection Issues

1. Verify `DATABASE_URL` is correct
2. Check firewall rules
3. Ensure IP whitelist includes deployment server

## Monitoring Commands

```bash
# Check application logs
docker logs container-id

# Monitor resource usage
docker stats

# Check deployment status
vercel status
```

## Support

For deployment issues, contact your platform support or the SWM PRO team.
