# SWM PRO v2.0 - Deployment Guide

Complete step-by-step guide for deploying SWM PRO v2.0 to production using Railway and Supabase.

## Prerequisites

- Railway account (railway.app)
- Supabase account (supabase.com)
- GitHub repository
- Twilio account with API credentials
- Domain name (optional, Railway provides subdomain)

## Phase 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Enter project details:
   - **Name**: swm-pro-prod
   - **Database Password**: Generate strong password (save securely)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Pro or higher (for PostGIS)

4. Wait for project creation (5-10 minutes)

### 1.2 Enable PostGIS Extension

1. Go to SQL Editor
2. Create new query
3. Run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS postgis_topology;
   ```

4. Verify:
   ```sql
   SELECT PostGIS_Version();
   ```

### 1.3 Run Database Migrations

1. In SQL Editor, create new query
2. Copy content from `packages/db/migrations/001_init.sql`
3. Execute the entire migration script
4. Verify tables created:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

### 1.4 Create Storage Buckets

1. Go to Storage section
2. Create new bucket: `photos`
   - Make public
   - Set file size limit: 10 MB
3. Create new bucket: `reports`
   - Make public
   - Set file size limit: 50 MB

### 1.5 Get Connection Details

1. Go to Project Settings > Database
2. Note:
   - **Host**: `db.xxxxx.supabase.co`
   - **Port**: `5432`
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: Your database password

3. Go to Project Settings > API
4. Note:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: Public key for frontend
   - **Service Role Key**: Secret key for backend

## Phase 2: Twilio Setup

### 2.1 Create Twilio Account

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Create account or sign in
3. Verify phone number

### 2.2 Get Credentials

1. Go to Account > API Keys & Tokens
2. Note:
   - **Account SID**: `ACxxxxx`
   - **Auth Token**: Your secret token

3. Go to Phone Numbers > Manage Numbers
4. Get or purchase a phone number
5. Note the phone number (e.g., `+1234567890`)

### 2.3 Configure Messaging

1. Go to Messaging > Services
2. Create new service: "SWM PRO OTP"
3. Add phone number as sender
4. Note the Service SID

## Phase 3: GitHub Repository Setup

### 3.1 Create GitHub Repository

```bash
# Initialize git
cd swm-pro-v2
git init

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
build/
.env
.env.local
.env.*.local
.DS_Store
*.log
.next/
out/
.expo/
EOF

# Add files
git add .
git commit -m "Initial commit: SWM PRO v2.0"

# Create repository on GitHub
# Then push
git remote add origin https://github.com/your-username/swm-pro-v2.git
git branch -M main
git push -u origin main
```

### 3.2 Create Environment File Template

Create `.env.example`:

```env
# Database
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
DATABASE_SSL=true

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRATION=7d

# Server
PORT=3001
NODE_ENV=production
API_URL=https://your-railway-domain.railway.app
ADMIN_URL=https://your-admin-domain.railway.app

# Logging
LOG_LEVEL=info
```

## Phase 4: Railway Deployment

### 4.1 Connect GitHub Repository

1. Go to [Railway Dashboard](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Connect GitHub account
5. Select `swm-pro-v2` repository

### 4.2 Create Services

#### Backend API Service

1. In Railway project, click "Add Service"
2. Select "GitHub Repo"
3. Configure:
   - **Root Directory**: `apps/api`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Port**: `3001`

4. Add environment variables:
   ```
   DATABASE_URL=<from Supabase>
   SUPABASE_URL=<from Supabase>
   SUPABASE_KEY=<from Supabase>
   SUPABASE_SERVICE_ROLE_KEY=<from Supabase>
   TWILIO_ACCOUNT_SID=<from Twilio>
   TWILIO_AUTH_TOKEN=<from Twilio>
   TWILIO_PHONE_NUMBER=<from Twilio>
   JWT_SECRET=<generate strong secret>
   JWT_EXPIRATION=7d
   NODE_ENV=production
   PORT=3001
   ```

5. Deploy

#### Admin Dashboard Service

1. Click "Add Service"
2. Select "GitHub Repo"
3. Configure:
   - **Root Directory**: `apps/admin`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Port**: `3000`

4. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=<Railway API service URL>
   NEXT_PUBLIC_SUPABASE_URL=<from Supabase>
   NEXT_PUBLIC_SUPABASE_KEY=<from Supabase>
   NODE_ENV=production
   ```

5. Deploy

### 4.3 Configure Domains

#### For Backend API

1. In Railway, go to Backend service
2. Click "Settings" > "Domain"
3. Generate domain or connect custom domain
4. Note the domain (e.g., `api.swmpro.railway.app`)

#### For Admin Dashboard

1. In Railway, go to Admin service
2. Click "Settings" > "Domain"
3. Generate domain or connect custom domain
4. Note the domain (e.g., `admin.swmpro.railway.app`)

### 4.4 Run Database Migrations

1. In Railway, go to Backend service
2. Click "Settings" > "Deploy Hooks"
3. Create new hook:
   - **Command**: `psql $DATABASE_URL -f packages/db/migrations/001_init.sql`
   - **Run on**: Every deployment

4. Or manually run in Railway shell:
   ```bash
   railway shell
   psql $DATABASE_URL -f packages/db/migrations/001_init.sql
   ```

## Phase 5: Post-Deployment Configuration

### 5.1 Update Environment Variables

Update in Railway dashboard:

**Backend API:**
```
API_URL=https://api.swmpro.railway.app
ADMIN_URL=https://admin.swmpro.railway.app
```

**Admin Dashboard:**
```
NEXT_PUBLIC_API_URL=https://api.swmpro.railway.app
```

### 5.2 Seed Initial Data

1. Connect to Railway backend shell:
   ```bash
   railway shell
   ```

2. Run seed script:
   ```bash
   pnpm db:seed
   ```

3. Verify data:
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   ```

### 5.3 Test Endpoints

```bash
# Test API health
curl https://api.swmpro.railway.app/api/health

# Test authentication
curl -X POST https://api.swmpro.railway.app/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile": "+919876543210"}'
```

### 5.4 Configure CORS

Update backend API CORS settings:

```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: [
    'https://admin.swmpro.railway.app',
    'http://localhost:3000'
  ],
  credentials: true
});
```

## Phase 6: Custom Domain Setup (Optional)

### 6.1 For Backend API

1. In Railway, go to Backend service > Settings > Domain
2. Click "Add Custom Domain"
3. Enter domain: `api.swmpro.com`
4. Update DNS records at your domain registrar:
   - **Type**: CNAME
   - **Name**: `api`
   - **Value**: Railway-provided CNAME

5. Wait for DNS propagation (5-30 minutes)

### 6.2 For Admin Dashboard

1. In Railway, go to Admin service > Settings > Domain
2. Click "Add Custom Domain"
3. Enter domain: `admin.swmpro.com`
4. Update DNS records:
   - **Type**: CNAME
   - **Name**: `admin`
   - **Value**: Railway-provided CNAME

5. Wait for DNS propagation

## Phase 7: Monitoring and Maintenance

### 7.1 Enable Logging

In Railway dashboard:

1. Go to Backend service > Logs
2. Monitor for errors
3. Set up alerts for critical errors

### 7.2 Database Backups

In Supabase dashboard:

1. Go to Settings > Backups
2. Enable automatic backups (daily recommended)
3. Configure retention (30 days minimum)

### 7.3 Performance Monitoring

1. Monitor Railway resource usage
2. Check database connection pool
3. Monitor API response times
4. Set up alerts for high latency

### 7.4 Security Updates

1. Keep dependencies updated: `pnpm update`
2. Review security advisories: `pnpm audit`
3. Update environment secrets regularly
4. Rotate JWT secret every 90 days

## Troubleshooting

### Deployment Fails

**Check logs:**
```bash
railway logs
```

**Common issues:**
- Missing environment variables
- Database connection failed
- Build command failed

**Solution:**
1. Verify all environment variables set
2. Test database connection
3. Check build logs for errors
4. Rebuild service

### Database Connection Timeout

**Cause:** Firewall or connection pool exhausted

**Solution:**
1. Verify DATABASE_URL is correct
2. Check Supabase firewall settings
3. Increase connection pool size
4. Restart service

### OTP Not Sending

**Cause:** Twilio credentials incorrect or account suspended

**Solution:**
1. Verify Twilio credentials in Railway
2. Check Twilio account status
3. Verify phone number format
4. Check Twilio logs

### High Latency

**Cause:** Database queries slow or resource constraints

**Solution:**
1. Optimize database queries
2. Add indexes to frequently queried columns
3. Increase Railway resource allocation
4. Enable caching

## Rollback Procedure

If deployment causes issues:

```bash
# In Railway dashboard
1. Go to Backend service > Deployments
2. Select previous stable deployment
3. Click "Redeploy"
4. Verify service is running
5. Test endpoints
```

## Performance Checklist

- [ ] Database indexes created
- [ ] Connection pooling configured
- [ ] Caching enabled
- [ ] CDN configured for static assets
- [ ] Compression enabled
- [ ] Rate limiting configured
- [ ] Monitoring alerts set up
- [ ] Backups configured
- [ ] SSL/TLS certificates valid
- [ ] CORS properly configured

## Security Checklist

- [ ] All environment variables secured
- [ ] Database SSL enabled
- [ ] HTTPS enforced
- [ ] JWT secret strong (32+ chars)
- [ ] Rate limiting on auth endpoints
- [ ] CORS restricted to known domains
- [ ] Audit logging enabled
- [ ] Sensitive data encrypted
- [ ] Dependencies up to date
- [ ] Security headers configured

## Scaling Considerations

### Horizontal Scaling

1. Railway automatically scales based on traffic
2. Configure max replicas in Railway settings
3. Load balancing handled by Railway

### Vertical Scaling

1. Increase Railway resource allocation
2. Upgrade Supabase plan for higher connections
3. Monitor resource usage

### Database Scaling

1. Use read replicas for read-heavy operations
2. Archive old data to reduce table size
3. Optimize indexes regularly

## Cost Optimization

1. Use Railway's free tier for development
2. Supabase Pro plan: $25/month
3. Twilio: Pay-as-you-go OTP costs
4. Optimize database queries to reduce compute
5. Use CDN for static assets

## Support and Documentation

- Railway Docs: https://docs.railway.app
- Supabase Docs: https://supabase.com/docs
- Twilio Docs: https://www.twilio.com/docs
- NestJS Docs: https://docs.nestjs.com
- Next.js Docs: https://nextjs.org/docs

---

**Last Updated**: March 2026  
**Version**: 2.0.0
