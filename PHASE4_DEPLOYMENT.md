# SWM PRO v2.0 - Phase 4: Smart Proximity & City Command Center

## Deployment Guide

### Overview
Phase 4 implements smart QR logic with 5m proximity checks, duplicate prevention within 15m radius, automatic 14-hour status resets, and a full-screen City Command Center for real-time GPS tracking and QR management.

---

## 1. Backend API Setup

### 1.1 Install Dependencies
```bash
cd /home/ubuntu/swm-pro-v2/swm-pro-v2/apps/api
npm install
# or
pnpm install
```

### 1.2 Deploy QR Service Files
The following files have been created:
- `src/qr.service.ts` - Core QR logic with proximity checks
- `src/qr.controller.ts` - API endpoint handlers

### 1.3 Update Environment Variables
Add to your `.env` file:
```env
SUPABASE_URL=https://db.ixpzcdrrjaqdfcbpaahe.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 1.4 Register API Routes
Add the following routes to your Express app:

```typescript
import { qrController } from './qr.controller';

// QR Code endpoints
app.post('/qr/scan', qrController.scanQRCode);
app.post('/qr/generate', qrController.createQRCode);
app.post('/qr/reset', qrController.resetOldQRCodes);
```

### 1.5 Setup Supabase Functions
Run the SQL script in your Supabase dashboard:

1. Go to **SQL Editor** in Supabase Dashboard
2. Create a new query
3. Copy and paste the contents of `scripts/supabase_functions.sql`
4. Click **Run**

This creates:
- `get_distance_sphere()` - Calculate distance between two GPS points
- `get_nearby_qr_codes()` - Find QR codes within a radius
- `reset_old_qr_codes()` - Reset 14+ hour old codes to pending
- `get_active_workers()` - Get workers with latest GPS location
- `get_active_vehicles()` - Get vehicles with latest GPS location
- `get_qr_statistics()` - Get QR code statistics

### 1.6 Setup Cron Job for QR Reset
To automatically reset old QR codes every 14 hours, use Supabase's cron extension or a scheduled function:

**Option A: Using Supabase Cron**
```sql
SELECT cron.schedule('reset-qr-codes', '0 */14 * * *', 'SELECT reset_old_qr_codes()');
```

**Option B: Using a Scheduled API Call**
Create a cron job that calls:
```
POST /qr/reset
```

---

## 2. Admin Dashboard Updates

### 2.1 Install Dependencies
```bash
cd /home/ubuntu/swm-pro-v2/swm-pro-v2/apps/admin
pnpm install
# Install Leaflet for maps
pnpm add leaflet react-leaflet
```

### 2.2 Deploy New Components
The following files have been created:
- `src/app/city-map/page.tsx` - Full-screen City Map with real-time updates
- `src/components/Sidebar.tsx` - Navigation sidebar with City Map link
- `src/app/layout-with-sidebar.tsx` - Layout wrapper with sidebar
- `src/components/LiveAuthMonitor.tsx` - Live authentication monitor (already created in Phase 3)

### 2.3 Update Main Layout
Update `src/app/layout.tsx` to include the sidebar:

```typescript
'use client';

import Sidebar from '@/components/Sidebar';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-64">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
```

### 2.4 Configure Leaflet CSS
Add to your `src/app/globals.css`:

```css
@import 'leaflet/dist/leaflet.css';

.leaflet-container {
  height: 100%;
  width: 100%;
}
```

### 2.5 Test City Map
Navigate to `http://localhost:3000/city-map` to view the full-screen map with:
- Worker locations (blue markers)
- Vehicle locations (blue markers)
- QR points (red = pending, green = scanned)
- 5m proximity circles around each QR point
- Real-time updates every 5-10 seconds

---

## 3. Worker App Updates

### 3.1 Update Home Screen
Replace `src/screens/HomeScreen.tsx` with `src/screens/HomeScreenUpdated.tsx`:

```bash
cp src/screens/HomeScreenUpdated.tsx src/screens/HomeScreen.tsx
```

### 3.2 Key Features Added
1. **Mode Toggle**: Switch between "Create Point" and "Scan Point"
2. **Proximity Messages**: Real-time feedback on 5m proximity check
3. **Error Handling**: Display "Too Far! Move within 5m" error
4. **QR Point Creation**: Automatic duplicate prevention within 15m

### 3.3 Test the Worker App
1. Start Expo: `pnpm dev:worker`
2. Scan QR code with Expo Go
3. Login with OTP + PIN
4. Toggle GPS tracking
5. Test Create Point and Scan Point modes

---

## 4. Database Schema Updates

### 4.1 Verify QR Codes Table Structure
Ensure your `qr_codes` table has:
```sql
CREATE TABLE qr_codes (
  id BIGSERIAL PRIMARY KEY,
  code_value TEXT UNIQUE NOT NULL,
  code_type TEXT NOT NULL,
  location JSONB NOT NULL, -- GeoJSON Point
  status TEXT DEFAULT 'pending', -- pending, scanned
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  scanned_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);
```

### 4.2 Verify GPS Points Table Structure
```sql
CREATE TABLE gps_points (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  vehicle_id BIGINT REFERENCES vehicles(id),
  location JSONB NOT NULL, -- GeoJSON Point
  accuracy FLOAT,
  speed FLOAT,
  heading FLOAT,
  is_mock_location BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.3 Verify QR Scans Table Structure
```sql
CREATE TABLE qr_scans (
  id BIGSERIAL PRIMARY KEY,
  qr_code_id BIGINT REFERENCES qr_codes(id),
  user_id BIGINT REFERENCES users(id),
  location JSONB NOT NULL, -- GeoJSON Point
  device_id TEXT,
  scan_type TEXT,
  accuracy FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. API Endpoints Reference

### QR Code Endpoints

#### POST /qr/generate
Create a new QR code with duplicate prevention.

**Request:**
```json
{
  "user_id": 123,
  "location": {
    "latitude": 20.5937,
    "longitude": 78.9629
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "QR code created or reused successfully",
  "data": {
    "id": 1,
    "code_value": "QR-123-1710000000000",
    "status": "pending",
    "location": {"type": "Point", "coordinates": [78.9629, 20.5937]}
  }
}
```

**Response (Error - Duplicate within 15m):**
```json
{
  "success": true,
  "message": "QR code created or reused successfully",
  "data": {
    "id": 1,
    "code_value": "QR-456-1709999999999",
    "status": "pending"
  }
}
```

#### POST /qr/scan
Scan a QR code with 5m proximity check.

**Request:**
```json
{
  "user_id": 123,
  "qr_code": "QR-123-1710000000000",
  "location": {
    "latitude": 20.5937,
    "longitude": 78.9629
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "QR code scanned successfully",
  "data": {
    "id": 1,
    "qr_code_id": 1,
    "user_id": 123,
    "scan_type": "checkpoint"
  }
}
```

**Response (Error - Too Far):**
```json
{
  "success": false,
  "error": "Too Far! Move within 5m."
}
```

#### POST /qr/reset
Reset old QR codes (14+ hours) to pending status.

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "message": "Old QR codes reset to pending status",
  "data": [
    {
      "id": 1,
      "code_value": "QR-123-1709999999999",
      "status": "pending"
    }
  ]
}
```

---

## 6. Testing Checklist

### Backend Testing
- [ ] QR generation with duplicate prevention
- [ ] 5m proximity check on scan
- [ ] Error message "Too Far! Move within 5m"
- [ ] 14-hour reset functionality
- [ ] Supabase functions working correctly

### Admin Dashboard Testing
- [ ] City Map loads with markers
- [ ] Worker locations update in real-time
- [ ] Vehicle locations update in real-time
- [ ] QR points show red (pending) and green (scanned)
- [ ] 5m proximity circles visible
- [ ] Sidebar navigation works
- [ ] Live Auth Monitor displays OTP records

### Worker App Testing
- [ ] GPS tracking starts and stops
- [ ] Create Point mode works
- [ ] Scan Point mode works
- [ ] Proximity error message displays
- [ ] Success message displays after scan
- [ ] Background tracking continues when app minimized

---

## 7. Performance Optimization

### Database Indexes
All necessary indexes have been created in `supabase_functions.sql`:
- `idx_qr_codes_status` - For filtering by status
- `idx_qr_codes_scanned_at` - For 14-hour reset query
- `idx_gps_points_user_id` - For user location queries
- `idx_gps_points_created_at` - For latest location queries
- GiST indexes for spatial queries

### API Optimization
- Location updates are throttled to 30 seconds
- QR scans are validated before database writes
- Proximity checks use efficient ST_DistanceSphere queries

### Frontend Optimization
- City Map refetches every 5-10 seconds (configurable)
- Worker App updates every 30 seconds
- Lazy loading of map tiles

---

## 8. Troubleshooting

### "Too Far! Move within 5m" Error
- Check GPS accuracy (should be < 10m)
- Ensure worker is actually within 5m of QR point
- Verify location coordinates are correct

### QR Codes Not Resetting
- Check if cron job is running
- Verify `reset_old_qr_codes()` function exists
- Check database logs for errors

### City Map Not Loading
- Ensure Leaflet CSS is imported
- Check browser console for errors
- Verify Supabase queries are returning data

### Worker App GPS Not Updating
- Check location permissions
- Ensure background location service is enabled
- Verify API endpoint is accessible

---

## 9. Deployment Steps

### Step 1: Backend Deployment
```bash
cd apps/api
pnpm install
pnpm build
# Deploy to your server (Heroku, AWS, etc.)
```

### Step 2: Supabase Setup
```bash
# Run SQL functions in Supabase dashboard
# scripts/supabase_functions.sql
```

### Step 3: Admin Dashboard Deployment
```bash
cd apps/admin
pnpm install
pnpm build
# Deploy to Vercel or your hosting
```

### Step 4: Worker App Deployment
```bash
cd apps/worker
pnpm install
# Build for iOS/Android using EAS
eas build --platform ios
eas build --platform android
```

---

## 10. Files Summary

### Created Files
1. **Backend**
   - `apps/api/src/qr.service.ts` - QR logic with proximity checks
   - `apps/api/src/qr.controller.ts` - API endpoints
   - `scripts/supabase_functions.sql` - Database functions

2. **Admin Dashboard**
   - `apps/admin/src/app/city-map/page.tsx` - City Map page
   - `apps/admin/src/components/Sidebar.tsx` - Navigation sidebar
   - `apps/admin/src/app/layout-with-sidebar.tsx` - Layout wrapper

3. **Worker App**
   - `apps/worker/src/screens/HomeScreenUpdated.tsx` - Updated home screen

4. **Database**
   - `scripts/reset_qr_status.sql` - QR reset script
   - `scripts/supabase_functions.sql` - All SQL functions

---

## 11. Support & Documentation

For issues or questions:
1. Check the troubleshooting section above
2. Review API endpoint documentation
3. Check Supabase logs for database errors
4. Review browser console for frontend errors

---

## 12. Next Steps

After Phase 4 deployment:
1. Monitor QR scanning accuracy and proximity checks
2. Optimize refresh rates based on performance
3. Add analytics dashboard for QR scan statistics
4. Implement push notifications for workers
5. Add worker performance metrics

---

**Deployment Date**: March 14, 2026
**Version**: SWM PRO v2.0 - Phase 4
**Status**: Ready for Production
