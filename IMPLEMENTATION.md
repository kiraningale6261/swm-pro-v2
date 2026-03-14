# SWM PRO v2.0 - Implementation Notes

Comprehensive documentation of implementation decisions, architecture, and technical details.

## Architecture Overview

### Monorepo Structure

The project uses pnpm workspaces for a monorepo architecture:

```
apps/
  ├── admin/        # Next.js admin dashboard (port 3000)
  ├── api/          # NestJS backend API (port 3001)
  └── worker/       # Expo React Native mobile app

packages/
  ├── shared/       # Shared types, constants, utilities
  └── db/           # Database schema, migrations, seed data
```

**Rationale:**
- Single source of truth for types and constants
- Shared database schema across all apps
- Easier dependency management
- Simplified deployment

### Technology Choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend | NestJS | Type-safe, modular, excellent for microservices |
| Database | PostgreSQL + PostGIS | Native geospatial support, proven reliability |
| Admin UI | Next.js | Server-side rendering, excellent performance |
| Mobile | Expo React Native | Cross-platform, rapid development |
| Maps | Leaflet | Lightweight, open-source, PostGIS-friendly |
| Auth | JWT + OTP | Stateless, scalable, mobile-friendly |
| Real-time | WebSocket | Low latency, bi-directional communication |
| Storage | Supabase | Managed PostgreSQL + S3-compatible storage |

## Database Design

### Geospatial Schema

All location data uses PostGIS geometry types with SRID 4326 (WGS84):

```sql
-- Village boundary as polygon
boundary GEOMETRY(Polygon, 4326)

-- GPS trail as linestring
trail GEOMETRY(LineString, 4326)

-- Depot location as point
location GEOMETRY(Point, 4326)
```

**Indexes:**
- GIST indexes on all geometry columns for spatial queries
- B-tree indexes on frequently filtered columns
- Composite indexes on (user_id, created_at) for time-series queries

### Normalization

The schema follows 3NF principles:

- Location hierarchy properly normalized (Country → State → District → Taluka → Village)
- Work assignments reference users and wards separately
- GPS trails and points in separate tables for efficient querying
- Configuration stored in separate table for flexibility

### Performance Considerations

1. **Connection Pooling**: Max 20 connections per app instance
2. **Query Optimization**: Indexes on all foreign keys and frequently filtered columns
3. **Partitioning**: GPS points table can be partitioned by date for very large datasets
4. **Archiving**: Old GPS points (>1 year) can be archived to separate table

## Backend API Architecture

### NestJS Modules

```
src/
├── auth/              # Authentication & authorization
├── hierarchy/         # Location hierarchy management
├── users/             # User management
├── qr/                # QR code generation & validation
├── assignments/       # Work assignment management
├── collections/       # Door-to-door collection
├── sweeping/          # Road sweeping
├── drainage/          # Drainage management
├── depots/            # Depot management
├── gps/               # GPS tracking
├── photos/            # Photo upload
├── reports/           # Report generation
├── config/            # Configuration management
├── audit/             # Audit logging
├── websocket/         # Real-time updates
└── common/            # Shared utilities, guards, pipes
```

### Authentication Flow

```
1. POST /auth/send-otp
   ↓
2. POST /auth/verify-otp
   ↓
3. POST /auth/verify-pin
   ↓
4. Return JWT token
   ↓
5. Use token in Authorization header for all requests
```

**JWT Structure:**
```json
{
  "sub": 1,
  "mobile": "+919876543210",
  "role": "worker",
  "iat": 1678500000,
  "exp": 1679104800
}
```

### Geospatial Operations

#### Ward Auto-Generation

Algorithm: Grid-based equal-area division

```typescript
// 1. Get village boundary
const boundary = await getVillageBoundary(villageId);

// 2. Calculate bounding box
const bbox = getBoundingBox(boundary);

// 3. Create 10 equal-area grids
const grids = createEqualAreaGrids(bbox, 10);

// 4. Intersect grids with village boundary
const wards = grids.map(grid => 
  intersectWithBoundary(grid, boundary)
);

// 5. Store in database
await saveWards(villageId, wards);
```

**PostGIS Implementation:**
```sql
-- Create wards using ST_Subdivide
WITH subdivided AS (
  SELECT 
    ST_Subdivide(boundary, 256) as geom
  FROM villages
  WHERE id = $1
)
INSERT INTO wards (village_id, ward_number, boundary)
SELECT 
  $1,
  ROW_NUMBER() OVER () as ward_number,
  geom
FROM subdivided
LIMIT 10;
```

#### Drainage Overlap Detection

Calculate overlap percentage between GPS trail and drainage line:

```sql
-- Calculate overlap percentage
SELECT 
  ST_Length(
    ST_Intersection(
      gps_trail,
      drainage_line
    )::geography
  ) / ST_Length(drainage_line::geography) * 100 
  as overlap_percentage
FROM gps_trails
JOIN drainage_lines ON ...
WHERE overlap_percentage >= 90;
```

**Auto-Completion Logic:**
```typescript
if (overlapPercentage >= 90) {
  // Auto-complete task
  await completeTask(taskId, {
    isAutoCompleted: true,
    overlapPercentage,
    completionTimestamp: new Date()
  });
  
  // Emit WebSocket event
  socket.emit('task:auto-completed', {
    taskId,
    overlapPercentage
  });
}
```

#### Depot Geofence Detection

Check if GPS point is within depot radius:

```sql
-- Point-in-radius check
SELECT 
  ST_DWithin(
    gps_point::geography,
    depot_location::geography,
    radius_meters
  ) as is_within_geofence
FROM gps_points
JOIN depots ON ...;
```

**Trip Increment Logic:**
```typescript
// 1. Detect entry into geofence
if (isWithinGeofence && !wasWithinGeofence) {
  entryTime = now();
  entryLocation = gpsPoint;
}

// 2. Detect exit from geofence
if (!isWithinGeofence && wasWithinGeofence) {
  exitTime = now();
  exitLocation = gpsPoint;
  
  // 3. Check if stop duration >= 5 minutes
  const duration = (exitTime - entryTime) / 1000 / 60;
  if (duration >= 5) {
    // 4. Increment trip count
    await incrementTripCount(depotId);
    
    // 5. Record event
    await recordDepotEvent({
      depotId,
      entryTime,
      exitTime,
      duration,
      tripIncremented: true
    });
  }
}
```

### QR Code System

#### Generation

```typescript
// 1. Create secure payload
const payload = {
  id: qrCode.id,
  type: qrCode.type,
  timestamp: Date.now(),
  nonce: generateRandomNonce()
};

// 2. Sign payload with JWT secret
const signature = jwt.sign(payload, JWT_SECRET);

// 3. Create QR data
const qrData = JSON.stringify({
  ...payload,
  signature
});

// 4. Generate QR code
const qrImage = await qrcode.toDataURL(qrData);

// 5. Store in database
await saveQRCode({
  codeValue: qrData,
  qrImage
});
```

#### Validation

```typescript
// 1. Parse QR data
const scannedData = JSON.parse(qrString);

// 2. Verify signature
try {
  const verified = jwt.verify(scannedData.signature, JWT_SECRET);
} catch (error) {
  throw new Error('Invalid QR code signature');
}

// 3. Check timestamp (24-hour expiry)
const age = Date.now() - scannedData.timestamp;
if (age > 24 * 60 * 60 * 1000) {
  throw new Error('QR code expired');
}

// 4. Check if already scanned (prevent duplicate scans)
const existingScan = await findQRScan(scannedData.id);
if (existingScan && existingScan.createdAt > Date.now() - 60000) {
  throw new Error('QR code already scanned within last minute');
}

// 5. Record scan
await recordQRScan({
  qrCodeId: scannedData.id,
  userId,
  location,
  timestamp: new Date()
});
```

### Mock Location Detection

Practical detection methods implemented:

```typescript
// 1. Speed anomaly detection
const speed = calculateSpeed(previousPoint, currentPoint);
if (speed > 300) { // km/h
  flagAsMockLocation('speed_anomaly');
}

// 2. Accuracy anomaly detection
if (accuracy < 1) { // Too perfect
  flagAsMockLocation('accuracy_anomaly');
}

// 3. Teleportation detection
const distance = calculateDistance(previousPoint, currentPoint);
const timeElapsed = currentPoint.timestamp - previousPoint.timestamp;
const expectedMaxDistance = (timeElapsed / 1000) * 100; // 100 m/s max
if (distance > expectedMaxDistance) {
  flagAsMockLocation('teleportation');
}

// 4. Provider detection (Android)
if (location.provider === 'mock') {
  flagAsMockLocation('mock_provider');
}

// 5. Consistency check
const recentPoints = await getRecentGPSPoints(userId, 5);
const variance = calculateVariance(recentPoints);
if (variance < 0.001) { // Too consistent
  flagAsMockLocation('consistency_anomaly');
}
```

### Real-time Updates with WebSocket

```typescript
// 1. Connect to WebSocket
socket.on('connect', () => {
  socket.emit('user:subscribe', { userId });
});

// 2. Emit location updates
socket.emit('location:update', {
  userId,
  location: { lat, lng },
  accuracy,
  timestamp
});

// 3. Broadcast to admin dashboard
io.to(`admin:${wardId}`).emit('worker:location-update', {
  workerId: userId,
  location,
  accuracy,
  timestamp
});

// 4. Task status changes
socket.emit('task:status-changed', {
  taskId,
  status: 'completed',
  timestamp
});

// 5. Disconnect handling
socket.on('disconnect', () => {
  // Mark worker as offline
  await updateWorkerStatus(userId, 'offline');
});
```

## Admin Dashboard Architecture

### Page Structure

```
pages/
├── auth/
│   ├── login.tsx
│   ├── otp-verify.tsx
│   └── pin-verify.tsx
├── dashboard/
│   ├── index.tsx
│   ├── hierarchy/
│   │   ├── countries.tsx
│   │   ├── states.tsx
│   │   ├── districts.tsx
│   │   ├── talukas.tsx
│   │   ├── villages.tsx
│   │   └── wards.tsx
│   ├── users/
│   │   ├── index.tsx
│   │   ├── [id].tsx
│   │   └── create.tsx
│   ├── qr/
│   │   ├── index.tsx
│   │   └── generate.tsx
│   ├── collections/
│   │   ├── index.tsx
│   │   └── live.tsx
│   ├── sweeping/
│   │   ├── index.tsx
│   │   └── monitor.tsx
│   ├── drainage/
│   │   ├── index.tsx
│   │   ├── monitor.tsx
│   │   └── swarm.tsx
│   ├── depots/
│   │   ├── index.tsx
│   │   ├── [id].tsx
│   │   └── events.tsx
│   ├── reports/
│   │   ├── index.tsx
│   │   ├── pdf.tsx
│   │   └── excel.tsx
│   ├── settings/
│   │   ├── index.tsx
│   │   ├── config.tsx
│   │   └── audit-logs.tsx
│   ├── profile.tsx
│   └── 404.tsx
└── error.tsx
```

### UI Design System

**Glassmorphism Style:**
- Background blur effect (backdrop-filter: blur(10px))
- Semi-transparent backgrounds (rgba with 0.8 opacity)
- Rounded corners exactly 20px
- Soft shadows for depth
- Blue/gray color palette
- High contrast text

**Component Library:**
- Radix UI for unstyled, accessible components
- Tailwind CSS for styling
- Lucide React for icons
- Recharts for data visualization

### State Management

```typescript
// API calls via axios
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    Authorization: `Bearer ${token}`
  }
});

// React Query for caching
const { data, isLoading, error } = useQuery({
  queryKey: ['assignments', wardId],
  queryFn: () => api.get(`/assignments?wardId=${wardId}`),
  staleTime: 5 * 60 * 1000 // 5 minutes
});
```

### Map Integration

```typescript
// Leaflet map with PostGIS data
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet';

<MapContainer center={[18.5, 73.9]} zoom={13}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  
  {/* Village boundaries */}
  <GeoJSON data={villageGeoJSON} />
  
  {/* Ward boundaries */}
  <GeoJSON data={wardGeoJSON} />
  
  {/* Worker locations */}
  {workers.map(worker => (
    <Marker key={worker.id} position={[worker.lat, worker.lng]}>
      <Popup>{worker.name}</Popup>
    </Marker>
  ))}
</MapContainer>
```

## Worker Mobile App Architecture

### Navigation Structure

```
Navigation/
├── Auth Stack
│   ├── LoginScreen
│   ├── OTPScreen
│   └── PINScreen
└── App Stack
    ├── Tasks Tab
    │   ├── TaskListScreen
    │   ├── TaskDetailScreen
    │   └── TaskMapScreen
    ├── QR Tab
    │   └── QRScannerScreen
    ├── GPS Tab
    │   └── GPSTrackingScreen
    ├── Photos Tab
    │   └── PhotoUploadScreen
    └── Profile Tab
        ├── ProfileScreen
        └── LogoutScreen
```

### GPS Tracking Implementation

```typescript
// Foreground location tracking
import * as Location from 'expo-location';

// Start tracking
const subscription = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 5000, // 5 seconds
    distanceInterval: 10 // 10 meters
  },
  (location) => {
    // Send to backend
    api.post('/gps/points', {
      gpsTrailId,
      location: {
        type: 'Point',
        coordinates: [location.coords.longitude, location.coords.latitude]
      },
      accuracy: location.coords.accuracy,
      speed: location.coords.speed,
      heading: location.coords.heading,
      isMockLocation: location.mocked
    });
  }
);

// Stop tracking
subscription.remove();
```

### QR Scanner Implementation

```typescript
import { CameraView } from 'expo-camera';

<CameraView
  onBarcodeScanned={handleBarcodeScanned}
  barcodeScannerSettings={{
    barcodeTypes: ['qr']
  }}
/>

// Handle scan
const handleBarcodeScanned = async (scanningResult) => {
  const { data } = scanningResult;
  
  // Validate QR
  const response = await api.post('/qr/scan', {
    qrCodeValue: data,
    location: currentLocation,
    accuracy: locationAccuracy,
    scanType: 'start'
  });
  
  if (response.data.isValid) {
    // Proceed with task
    completeQRScan(response.data.scanId);
  } else {
    // Show error
    showAlert('Invalid QR Code');
  }
};
```

### Photo Upload Implementation

```typescript
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const pickAndUploadPhoto = async () => {
  // Pick image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8
  });
  
  if (!result.canceled) {
    // Read file
    const fileInfo = await FileSystem.getInfoAsync(result.assets[0].uri);
    const fileContent = await FileSystem.readAsStringAsync(
      result.assets[0].uri,
      { encoding: FileSystem.EncodingType.Base64 }
    );
    
    // Upload
    const formData = new FormData();
    formData.append('workAssignmentId', workAssignmentId);
    formData.append('file', {
      uri: result.assets[0].uri,
      name: 'photo.jpg',
      type: 'image/jpeg'
    });
    
    const response = await api.post('/photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    setPhotoUrl(response.data.storageUrl);
  }
};
```

## Report Generation

### PDF Export

```typescript
import PDFDocument from 'pdfkit';

// Create PDF
const doc = new PDFDocument();

// Add title
doc.fontSize(20).text('SWM PRO Report', 100, 100);

// Add map snapshot
const mapSnapshot = await captureMapSnapshot();
doc.image(mapSnapshot, 100, 150, { width: 400 });

// Add data table
const table = generateTable(reportData);
doc.fontSize(12).text(table, 100, 400);

// Add summary
doc.fontSize(14).text('Summary', 100, 600);
doc.fontSize(10).text(JSON.stringify(summary), 100, 620);

// Save
doc.pipe(fs.createWriteStream('report.pdf'));
doc.end();
```

### Excel Export

```typescript
import XLSX from 'xlsx';

// Create workbook
const workbook = XLSX.utils.book_new();

// Sheet 1: Summary
const summarySheet = XLSX.utils.json_to_sheet([summary]);
XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

// Sheet 2: Detailed logs
const logsSheet = XLSX.utils.json_to_sheet(reportData);
XLSX.utils.book_append_sheet(workbook, logsSheet, 'Logs');

// Sheet 3: GPS trails
const trailsSheet = XLSX.utils.json_to_sheet(gpsTrails);
XLSX.utils.book_append_sheet(workbook, trailsSheet, 'GPS Trails');

// Save
XLSX.writeFile(workbook, 'report.xlsx');
```

## Deployment Considerations

### Environment-Specific Configuration

```env
# Development
NODE_ENV=development
API_URL=http://localhost:3001
LOG_LEVEL=debug

# Production
NODE_ENV=production
API_URL=https://api.swmpro.railway.app
LOG_LEVEL=info
```

### Database Migrations

```bash
# Development
psql -h localhost -U postgres -d swm_pro_dev -f migrations/001_init.sql

# Production
psql -h db.xxxxx.supabase.co -U postgres -d postgres -f migrations/001_init.sql
```

### Performance Optimization

1. **Database**: Connection pooling, query optimization, indexing
2. **API**: Response caching, compression, rate limiting
3. **Frontend**: Code splitting, lazy loading, image optimization
4. **Mobile**: Offline support, background sync, efficient GPS tracking

## Testing Strategy

### Unit Tests

```typescript
// Example: Ward generation test
describe('Ward Generation', () => {
  it('should generate 10 equal-area wards', async () => {
    const wards = await generateWards(villageId, 10);
    expect(wards).toHaveLength(10);
    
    // Verify equal area
    const areas = wards.map(w => w.area);
    const avgArea = areas.reduce((a, b) => a + b) / areas.length;
    areas.forEach(area => {
      expect(Math.abs(area - avgArea)).toBeLessThan(avgArea * 0.1); // 10% tolerance
    });
  });
});
```

### Integration Tests

```typescript
// Example: Full collection flow
describe('Door-to-Door Collection Flow', () => {
  it('should complete collection with QR scan', async () => {
    // 1. Create assignment
    const assignment = await createAssignment(workerId, wardId);
    
    // 2. Start collection
    await startCollection(assignment.id);
    
    // 3. Scan QR
    const qrScan = await scanQR(qrCodeId, location);
    
    // 4. Complete collection
    const result = await completeCollection(assignment.id, qrScan.id);
    
    expect(result.status).toBe('collected');
  });
});
```

### E2E Tests

```typescript
// Example: Admin dashboard workflow
describe('Admin Dashboard', () => {
  it('should create village and generate wards', async () => {
    // 1. Login
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[name="mobile"]', '+919876543210');
    await page.click('button[type="submit"]');
    
    // 2. Navigate to hierarchy
    await page.click('a[href="/dashboard/hierarchy/villages"]');
    
    // 3. Create village
    await page.click('button:has-text("Create Village")');
    await page.fill('input[name="name"]', 'Test Village');
    
    // 4. Generate wards
    await page.click('button:has-text("Generate Wards")');
    
    // 5. Verify wards created
    const wards = await page.locator('[data-testid="ward-item"]');
    expect(await wards.count()).toBe(10);
  });
});
```

## Known Limitations & Workarounds

| Limitation | Impact | Workaround |
|-----------|--------|-----------|
| Perfect equal-area ward division | Some wards may vary by 10% | Document algorithm and tolerance |
| GPS accuracy indoors | Poor location tracking | Recommend outdoor use, provide manual entry |
| Mock location detection limits | OS restrictions on detection | Log suspicious patterns, admin review |
| WebSocket fallback | May not work on some networks | Implement polling as fallback |
| PDF map snapshots | Complex maps may render poorly | Use simplified map for export |

## Future Enhancements

1. **Machine Learning**: Route optimization using historical data
2. **Advanced Analytics**: Predictive analytics for resource allocation
3. **Mobile Offline**: Full offline support with sync
4. **Multi-language**: Support for regional languages
5. **Integration**: APIs for municipal systems integration
6. **Blockchain**: Immutable audit trail for compliance
7. **IoT**: Integration with waste collection vehicles

---

**Last Updated**: March 2026  
**Version**: 2.0.0
