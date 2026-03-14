# SWM PRO v2.0 - Municipal Solid Waste Management Platform

A comprehensive, production-ready waste management system featuring an admin web dashboard, worker mobile app, and backend API with geospatial capabilities.

## Overview

SWM PRO v2.0 is a complete municipal solid waste management solution that enables:

- **Admin Dashboard**: Manage hierarchy, wards, workers, track collections, monitor sweeping, manage drainage tasks, and view reports
- **Worker Mobile App**: Receive assignments, scan QR codes, capture GPS trails, upload photos, and complete tasks
- **Backend API**: Real-time tracking, geospatial operations, QR validation, and report generation
- **Geospatial Features**: Automatic ward division, GPS overlap detection, geofencing, and swarm view aggregation
- **Security**: OTP-based authentication via Twilio, PIN verification, role-based access control, mock location detection

## Project Structure

```
swm-pro-v2/
├── apps/
│   ├── admin/              # Next.js admin dashboard
│   ├── api/                # NestJS backend API
│   └── worker/             # Expo React Native mobile app
├── packages/
│   ├── shared/             # Shared types and constants
│   └── db/                 # Database schema and migrations
├── pnpm-workspace.yaml     # Monorepo configuration
└── README.md
```

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Admin Dashboard | Next.js | 14.0+ |
| Worker Mobile App | Expo React Native | 51.0+ |
| Backend API | NestJS | 10.3+ |
| Database | PostgreSQL with PostGIS | 14+ |
| Storage | Supabase Storage | - |
| Authentication | JWT + OTP (Twilio) | - |
| Real-time | WebSocket (Socket.io) | 4.7+ |
| Maps | Leaflet | 1.9+ |
| UI Framework | Radix UI + Tailwind CSS | - |

## Prerequisites

- Node.js 18+ and pnpm 10+
- PostgreSQL 14+ with PostGIS extension
- Supabase account (for database and storage)
- Twilio account (for OTP)
- Git

## Installation

### 1. Clone and Install Dependencies

```bash
cd swm-pro-v2
pnpm install
```

### 2. Database Setup

#### Create Supabase Project

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Enable PostGIS extension in SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS postgis_topology;
   ```

#### Run Migrations

```bash
# Copy database migration
psql -h <SUPABASE_HOST> -U postgres -d <DATABASE_NAME> -f packages/db/migrations/001_init.sql

# Or use the seed script
pnpm db:seed
```

### 3. Environment Configuration

Create `.env.local` files in each app:

#### `apps/api/.env.local`

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/swm_pro
DATABASE_SSL=true

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Twilio
TWILIO_ACCOUNT_SID=xxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRATION=7d

# Server
PORT=3001
NODE_ENV=development
API_URL=http://localhost:3001
```

#### `apps/admin/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=xxxxx
```

#### `apps/worker/.env.local`

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=xxxxx
```

## Development

### Start All Services

```bash
pnpm dev
```

This starts:
- Admin Dashboard: http://localhost:3000
- Backend API: http://localhost:3001
- Worker App: Expo dev server

### Start Individual Services

```bash
# Admin Dashboard
pnpm dev:admin

# Backend API
pnpm dev:api

# Worker App
pnpm dev:worker
```

## Core Features

### Module 0: Admin Dashboard

**Pages (20+):**
1. Login & OTP Verification
2. Dashboard Home
3. Hierarchy Management (Country, State, District, Taluka, Village)
4. Village Boundary Management
5. Ward Auto-Generation
6. Ward Visualization
7. User & Staff Management
8. QR Code Management
9. Door-to-Door Live Tracking
10. Road Sweeping Monitor
11. Drainage Monitor
12. Swarm View
13. Depot Management
14. Reports Center
15. Global Settings
16. Audit Logs
17. Profile/Account
18. Custom 404 Page
19. Error Page
20. Help & Documentation

### Module 1: Door-to-Door Collection

**Features:**
- Worker receives collection assignments
- Scans QR code at collection point
- Task status changes to "Collected" only after QR scan
- Tracks location, timestamp, and device
- Optional photo upload based on global setting
- Live tracking on admin dashboard

**API Endpoints:**
- `POST /api/collections/assign` - Assign collection task
- `POST /api/collections/start` - Start collection
- `POST /api/qr/scan` - Scan QR code
- `PATCH /api/collections/:id/complete` - Mark as collected
- `GET /api/collections/live` - Live tracking data

### Module 2: Road Sweeping

**Features:**
- Worker scans QR at start point
- GPS breadcrumb trail captured during task
- Worker scans QR at end point
- Task cannot complete without both QR scans
- Route trail stored and visualized on map
- Time and distance tracking

**API Endpoints:**
- `POST /api/sweeping/start` - Start sweeping task
- `POST /api/gps/trail` - Record GPS points
- `POST /api/sweeping/end` - End sweeping task
- `GET /api/sweeping/:id/trail` - Get trail data
- `GET /api/sweeping/report` - Generate report

### Module 3: Drainage - Zero Action

**Features:**
- Predefined drainage lines as LineString geometry
- Worker GPS trail captured during task
- Auto-completion when 90%+ overlap with drainage line
- Geospatial overlap calculation using PostGIS
- Swarm view shows multiple workers on same drainage
- Merged progress visualization

**API Endpoints:**
- `POST /api/drainage/lines` - Create drainage line
- `POST /api/drainage/start` - Start drainage task
- `POST /api/drainage/check-overlap` - Check overlap percentage
- `GET /api/drainage/swarm/:lineId` - Get swarm view
- `PATCH /api/drainage/:id/complete` - Mark as completed

### Module 4: Depot Management

**Features:**
- Depot geofence with configurable radius (default 50m)
- Auto-increment trip count after 5-minute stop
- Event history tracking
- Prevents duplicate increments during continuous stop
- Admin can configure radius

**API Endpoints:**
- `POST /api/depots` - Create depot
- `POST /api/depots/:id/events` - Record entry/exit
- `PATCH /api/depots/:id/trip` - Increment trip count
- `GET /api/depots/:id/events` - Get event history
- `GET /api/depots/:id/stats` - Get depot statistics

## Geospatial Operations

### Ward Auto-Generation

The system automatically divides a village into 10 equal-area wards using a grid-based algorithm:

```typescript
// Algorithm: Create 10 equal-area polygons from village boundary
// Uses PostGIS ST_Subdivide or custom grid generation
// Each ward gets unique number and boundary geometry
POST /api/hierarchy/villages/:id/generate-wards
```

### GPS Overlap Detection

For drainage tasks, the system calculates overlap percentage between GPS trail and drainage line:

```sql
-- PostGIS calculation
SELECT 
  ST_Length(ST_Intersection(gps_trail, drainage_line)) / 
  ST_Length(drainage_line) * 100 as overlap_percentage
FROM gps_trails
JOIN drainage_lines ON ...
```

### Geofence Detection

Depot geofence uses point-in-radius check:

```sql
-- Check if GPS point is within depot radius
SELECT ST_DWithin(
  location::geography,
  depot_location::geography,
  radius_meters
) as is_within_geofence
```

## QR Code System

### Generation

```typescript
// Secure QR code generation with server-side signing
const qrData = {
  id: qrCode.id,
  type: qrCode.code_type,
  timestamp: Date.now(),
  signature: sign(qrCode.id + timestamp, JWT_SECRET)
};

const qrCode = await qrcode.toDataURL(JSON.stringify(qrData));
```

### Validation

```typescript
// Validate QR scan
const scannedData = JSON.parse(qrString);
const isValid = verify(scannedData.signature, JWT_SECRET);
const isExpired = Date.now() - scannedData.timestamp > 24 * 60 * 60 * 1000;
```

## Authentication Flow

### Mobile OTP Login

1. Worker enters mobile number
2. System sends 6-digit OTP via Twilio
3. Worker enters OTP (max 3 attempts, 10-minute expiry)
4. System sends 4-digit PIN
5. Worker enters PIN
6. JWT token issued with 7-day expiry
7. Session stored in database

### Admin Login

1. Admin enters mobile number
2. OTP sent via Twilio
3. OTP verification
4. PIN verification (if configured)
5. JWT token issued
6. Admin role verified for dashboard access

## Photo Upload

### Workflow

1. Check global `photo_mandatory` setting
2. If mandatory, enforce photo upload before task completion
3. Upload to Supabase Storage with worker ID + timestamp
4. Store URL and metadata in database
5. Display on admin dashboard

**API Endpoint:**
```
POST /api/photos/upload
Content-Type: multipart/form-data

{
  workAssignmentId: number,
  file: File
}
```

## Reports Generation

### PDF Export

- Includes map snapshot using Leaflet canvas export
- Task details, worker info, timestamps
- Summary statistics
- Filters: date range, location, worker, module, status

**API Endpoint:**
```
GET /api/reports/export/pdf?startDate=...&endDate=...&moduleType=...
```

### Excel Export

- Detailed task logs
- GPS trail data
- Photo references
- Audit trail
- Multiple sheets per module

**API Endpoint:**
```
GET /api/reports/export/excel?startDate=...&endDate=...&moduleType=...
```

## Real-time Tracking

### WebSocket Events

```typescript
// Worker location update
socket.on('worker:location-update', {
  workerId: number,
  location: { lat, lng },
  accuracy: number,
  timestamp: Date
});

// Task status change
socket.on('task:status-changed', {
  taskId: number,
  status: 'started' | 'completed' | 'cancelled',
  timestamp: Date
});

// Depot trip increment
socket.on('depot:trip-incremented', {
  depotId: number,
  tripCount: number,
  timestamp: Date
});
```

## Deployment

### Railway Deployment

#### 1. Create Railway Project

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create project
railway init
```

#### 2. Configure Services

Create `railway.json`:

```json
{
  "services": {
    "api": {
      "buildCommand": "pnpm build",
      "startCommand": "pnpm start",
      "environmentVariables": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### 3. Deploy

```bash
railway up
```

### Supabase Setup

1. Create project at supabase.com
2. Enable PostGIS in SQL Editor
3. Run migrations
4. Configure storage buckets
5. Set up Row Level Security (RLS) policies

### Environment Variables

Set in Railway dashboard or `.env`:

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
JWT_SECRET=...
```

## Seed Data

Run seed script to populate test data:

```bash
pnpm db:seed
```

**Test Credentials:**

| Role | Mobile | PIN | Password |
|------|--------|-----|----------|
| Admin | +919876543210 | 1234 | admin@123 |
| Worker 1 | +919876543211 | 5678 | worker1@123 |
| Worker 2 | +919876543212 | 9012 | worker2@123 |

**Test Data Includes:**

- 1 Country (India)
- 1 State (Maharashtra)
- 1 District (Pune)
- 1 Taluka (Pune)
- 2 Villages with boundaries
- 10 Wards per village (auto-generated)
- 3 Users (1 admin, 2 workers)
- 5 Depots
- 10 Drainage lines
- Sample work assignments
- Sample QR codes

## API Documentation

### Authentication

All API endpoints require JWT token in Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Base URL

```
http://localhost:3001/api
```

### Endpoints

#### Hierarchy Management

```
GET    /hierarchy/countries
POST   /hierarchy/countries
GET    /hierarchy/countries/:id
PATCH  /hierarchy/countries/:id

GET    /hierarchy/villages
POST   /hierarchy/villages
GET    /hierarchy/villages/:id
PATCH  /hierarchy/villages/:id

GET    /hierarchy/villages/:id/wards
POST   /hierarchy/villages/:id/generate-wards
```

#### Users & Staff

```
GET    /users
POST   /users
GET    /users/:id
PATCH  /users/:id
DELETE /users/:id
```

#### Work Assignments

```
GET    /assignments
POST   /assignments
GET    /assignments/:id
PATCH  /assignments/:id/status
```

#### QR Codes

```
GET    /qr
POST   /qr/generate
POST   /qr/scan
GET    /qr/:id
```

#### GPS Tracking

```
POST   /gps/points
POST   /gps/trails
GET    /gps/trails/:id
```

#### Reports

```
GET    /reports/summary
GET    /reports/export/pdf
GET    /reports/export/excel
```

## Mock Location Detection

The system implements practical mock location detection:

1. **Speed Check**: Flags locations with impossible speeds (>300 km/h)
2. **Accuracy Check**: Flags locations with suspiciously perfect accuracy
3. **Consistency Check**: Detects sudden teleportation between points
4. **Provider Check**: Identifies mock location providers on Android
5. **Logging**: All suspicious locations logged for audit

**Response:**
```json
{
  "isMockLocation": true,
  "reason": "speed_anomaly",
  "flaggedAt": "2026-03-11T07:30:00Z"
}
```

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql -h <host> -U <user> -d <database> -c "SELECT 1"

# Check PostGIS
psql -d <database> -c "SELECT PostGIS_Version();"
```

### OTP Not Received

1. Verify Twilio credentials
2. Check phone number format (+country code)
3. Verify Twilio account has credits
4. Check logs: `tail -f logs/twilio.log`

### GPS Trail Not Recording

1. Verify location permissions on mobile app
2. Check GPS accuracy > 50m
3. Verify WebSocket connection
4. Check database for GPS points

### Ward Generation Fails

1. Verify village boundary is valid polygon
2. Check PostGIS installation
3. Verify SRID is 4326
4. Check database logs

## Known Limitations

1. **Ward Division**: Equal-area division uses grid algorithm; perfect equal division may not be achievable for irregular polygons
2. **GPS Accuracy**: Depends on device and environment; indoor locations may have poor accuracy
3. **Mock Location Detection**: OS-level restrictions may limit detection on some devices
4. **Real-time Updates**: WebSocket connection requires stable internet; falls back to polling if unavailable
5. **PDF Export**: Map snapshots use Leaflet canvas export; complex maps may have rendering issues

## Performance Optimization

### Database

- Spatial indexes on geometry columns
- Composite indexes on frequently filtered columns
- Connection pooling (max 20 connections)
- Query optimization for large GPS trails

### API

- Response caching (Redis recommended for production)
- Pagination for list endpoints (default 50 items)
- Compression for large responses
- Rate limiting: 100 requests/minute per IP

### Frontend

- Code splitting and lazy loading
- Image optimization
- Map tile caching
- Service workers for offline support

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **JWT Secret**: Use strong, random 32+ character secret
3. **HTTPS**: Always use HTTPS in production
4. **Database**: Enable SSL connections
5. **CORS**: Configure appropriate CORS policies
6. **Rate Limiting**: Implement rate limiting on auth endpoints
7. **Audit Logs**: Enable comprehensive audit logging
8. **Data Encryption**: Encrypt sensitive data at rest

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Create Pull Request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
1. Check existing issues on GitHub
2. Review documentation and troubleshooting guide
3. Contact support team

## Roadmap

- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Machine learning for route optimization
- [ ] Integration with municipal systems
- [ ] Mobile app for iOS (currently Android-focused)
- [ ] Offline mode with sync
- [ ] Advanced reporting with custom filters
- [ ] Integration with payment systems

---

**Version**: 2.0.0  
**Last Updated**: March 2026  
**Maintained By**: SWM PRO Team
