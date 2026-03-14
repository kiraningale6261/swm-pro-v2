# SWM PRO v2.0 - API Documentation

Complete REST API documentation for SWM PRO v2.0 backend.

## Base URL

```
http://localhost:3001/api
```

## Authentication

All endpoints require JWT token in Authorization header:

```
Authorization: Bearer <jwt_token>
```

Obtain token via `/auth/send-otp` → `/auth/verify-otp` → `/auth/verify-pin` flow.

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message"
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

## Authentication Endpoints

### Send OTP

Send 6-digit OTP to mobile number via Twilio.

```
POST /auth/send-otp
Content-Type: application/json

{
  "mobile": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "otpId": "otp_123",
    "expiresIn": 600,
    "message": "OTP sent to +919876543210"
  }
}
```

**Errors:**
- `INVALID_MOBILE` - Mobile number format invalid
- `TWILIO_ERROR` - Failed to send OTP
- `RATE_LIMIT` - Too many OTP requests

### Verify OTP

Verify 6-digit OTP.

```
POST /auth/verify-otp
Content-Type: application/json

{
  "mobile": "+919876543210",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 1,
    "requiresPIN": true,
    "message": "OTP verified"
  }
}
```

**Errors:**
- `INVALID_OTP` - OTP incorrect
- `OTP_EXPIRED` - OTP expired (10 minutes)
- `MAX_ATTEMPTS` - Too many failed attempts

### Verify PIN

Verify 4-digit PIN.

```
POST /auth/verify-pin
Content-Type: application/json

{
  "mobile": "+919876543210",
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800,
    "user": {
      "id": 1,
      "mobile": "+919876543210",
      "name": "John Worker",
      "role": "worker"
    }
  }
}
```

**Errors:**
- `INVALID_PIN` - PIN incorrect
- `USER_NOT_FOUND` - User doesn't exist
- `ACCOUNT_INACTIVE` - Account disabled

### Logout

Invalidate current session.

```
POST /auth/logout
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Hierarchy Management Endpoints

### Get Countries

```
GET /hierarchy/countries?page=1&limit=50
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "India",
        "code": "IN",
        "createdAt": "2026-03-11T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 50
  }
}
```

### Create Country

```
POST /hierarchy/countries
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "India",
  "code": "IN"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "India",
    "code": "IN",
    "createdAt": "2026-03-11T07:30:00Z"
  }
}
```

### Get States

```
GET /hierarchy/states?countryId=1&page=1&limit=50
Authorization: Bearer <jwt_token>
```

### Create State

```
POST /hierarchy/states
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "countryId": 1,
  "name": "Maharashtra",
  "code": "MH"
}
```

### Get Districts

```
GET /hierarchy/districts?stateId=1&page=1&limit=50
Authorization: Bearer <jwt_token>
```

### Create District

```
POST /hierarchy/districts
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "stateId": 1,
  "name": "Pune",
  "code": "PUN"
}
```

### Get Talukas

```
GET /hierarchy/talukas?districtId=1&page=1&limit=50
Authorization: Bearer <jwt_token>
```

### Create Taluka

```
POST /hierarchy/talukas
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "districtId": 1,
  "name": "Pune",
  "code": "PUN"
}
```

### Get Villages

```
GET /hierarchy/villages?talukaId=1&page=1&limit=50
Authorization: Bearer <jwt_token>
```

### Create Village

```
POST /hierarchy/villages
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "talukaId": 1,
  "name": "Hadapsar",
  "code": "HAD",
  "boundary": {
    "type": "Polygon",
    "coordinates": [
      [
        [73.9, 18.5],
        [73.92, 18.5],
        [73.92, 18.52],
        [73.9, 18.52],
        [73.9, 18.5]
      ]
    ]
  }
}
```

### Get Village Wards

```
GET /hierarchy/villages/:villageId/wards
Authorization: Bearer <jwt_token>
```

### Auto-Generate Wards

Generate 10 equal-area wards from village boundary.

```
POST /hierarchy/villages/:villageId/generate-wards
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "wardCount": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "villageId": 1,
    "wardsGenerated": 10,
    "wards": [
      {
        "id": 1,
        "wardNumber": 1,
        "boundary": { /* GeoJSON polygon */ },
        "areaSqKm": 2.5
      }
    ]
  }
}
```

## User Management Endpoints

### Get Users

```
GET /users?role=worker&page=1&limit=50
Authorization: Bearer <jwt_token>
```

### Create User

```
POST /users
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "mobile": "+919876543211",
  "name": "John Worker",
  "role": "worker",
  "pin": "5678"
}
```

### Update User

```
PATCH /users/:userId
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "John Updated",
  "pin": "9012"
}
```

### Delete User

```
DELETE /users/:userId
Authorization: Bearer <jwt_token>
```

## QR Code Endpoints

### Generate QR Code

```
POST /qr/generate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "type": "ward",
  "referenceId": 1,
  "location": {
    "type": "Point",
    "coordinates": [73.9, 18.5]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "codeValue": "QR_WARD_001_SIGNED",
    "qrImage": "data:image/png;base64,...",
    "printUrl": "https://api.../qr/1/print"
  }
}
```

### Scan QR Code

```
POST /qr/scan
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "qrCodeValue": "QR_WARD_001_SIGNED",
  "location": {
    "type": "Point",
    "coordinates": [73.9, 18.5]
  },
  "accuracy": 15.5,
  "scanType": "start"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "scanId": 1,
    "qrCodeId": 1,
    "isValid": true,
    "message": "QR code scanned successfully"
  }
}
```

### Get QR Code

```
GET /qr/:qrCodeId
Authorization: Bearer <jwt_token>
```

### Print QR Code

```
GET /qr/:qrCodeId/print
Authorization: Bearer <jwt_token>
```

Returns PDF with printable QR code.

## Work Assignment Endpoints

### Get Assignments

```
GET /assignments?userId=1&status=assigned&page=1&limit=50
Authorization: Bearer <jwt_token>
```

### Create Assignment

```
POST /assignments
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "userId": 1,
  "wardId": 1,
  "moduleType": "door_to_door",
  "scheduledDate": "2026-03-12"
}
```

### Start Assignment

```
PATCH /assignments/:assignmentId/start
Authorization: Bearer <jwt_token>
```

### Complete Assignment

```
PATCH /assignments/:assignmentId/complete
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "photoIds": [1, 2],
  "notes": "Task completed successfully"
}
```

## GPS Tracking Endpoints

### Record GPS Point

```
POST /gps/points
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "gpsTrailId": 1,
  "location": {
    "type": "Point",
    "coordinates": [73.9, 18.5]
  },
  "accuracy": 10.5,
  "speed": 5.2,
  "heading": 45.0,
  "isMockLocation": false
}
```

### Create GPS Trail

```
POST /gps/trails
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "workAssignmentId": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "workAssignmentId": 1,
    "createdAt": "2026-03-11T07:30:00Z"
  }
}
```

### Get GPS Trail

```
GET /gps/trails/:trailId
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "workAssignmentId": 1,
    "trail": { /* GeoJSON LineString */ },
    "distanceMeters": 1500,
    "durationSeconds": 1800,
    "points": [
      {
        "id": 1,
        "location": { /* GeoJSON Point */ },
        "accuracy": 10.5,
        "timestamp": "2026-03-11T07:30:00Z"
      }
    ]
  }
}
```

## Door-to-Door Collection Endpoints

### Start Collection

```
POST /collections/start
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "workAssignmentId": 1
}
```

### Complete Collection

```
PATCH /collections/:collectionId/complete
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "qrScanId": 1,
  "photoId": 1
}
```

### Get Live Collections

```
GET /collections/live?wardId=1
Authorization: Bearer <jwt_token>
```

## Road Sweeping Endpoints

### Start Sweeping

```
POST /sweeping/start
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "workAssignmentId": 1,
  "qrScanId": 1
}
```

### End Sweeping

```
POST /sweeping/end
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "workAssignmentId": 1,
  "qrScanId": 1
}
```

### Get Sweeping Trail

```
GET /sweeping/:sweepingId/trail
Authorization: Bearer <jwt_token>
```

## Drainage Endpoints

### Create Drainage Line

```
POST /drainage/lines
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "wardId": 1,
  "lineGeometry": {
    "type": "LineString",
    "coordinates": [
      [73.9, 18.5],
      [73.91, 18.51],
      [73.92, 18.52]
    ]
  }
}
```

### Start Drainage Task

```
POST /drainage/start
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "workAssignmentId": 1,
  "drainageLineId": 1
}
```

### Check Overlap

```
POST /drainage/check-overlap
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "gpsTrailId": 1,
  "drainageLineId": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overlapPercentage": 92.5,
    "isAutoCompleted": true,
    "message": "90% overlap threshold reached - task auto-completed"
  }
}
```

### Get Swarm View

```
GET /drainage/swarm/:drainageLineId
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "drainageLineId": 1,
    "workers": [
      {
        "userId": 1,
        "name": "John Worker",
        "currentLocation": { /* GeoJSON Point */ },
        "trail": { /* GeoJSON LineString */ },
        "progressPercentage": 45.0,
        "status": "in_progress"
      }
    ],
    "mergedTrail": { /* Combined GeoJSON LineString */ },
    "combinedOverlapPercentage": 92.5
  }
}
```

## Depot Endpoints

### Create Depot

```
POST /depots
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "wardId": 1,
  "name": "Main Depot",
  "location": {
    "type": "Point",
    "coordinates": [73.9, 18.5]
  },
  "radiusMeters": 50
}
```

### Record Depot Event

```
POST /depots/:depotId/events
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "eventType": "entry",
  "location": {
    "type": "Point",
    "coordinates": [73.9, 18.5]
  }
}
```

### Get Depot Events

```
GET /depots/:depotId/events?page=1&limit=50
Authorization: Bearer <jwt_token>
```

### Get Depot Statistics

```
GET /depots/:depotId/stats
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "depotId": 1,
    "totalTrips": 15,
    "lastTripAt": "2026-03-11T07:30:00Z",
    "todayTrips": 3,
    "averageDuration": 300
  }
}
```

## Photo Endpoints

### Upload Photo

```
POST /photos/upload
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

{
  "workAssignmentId": 1,
  "file": <binary file data>
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "storageUrl": "https://storage.../photos/photo_1.jpg",
    "fileKey": "photos/photo_1.jpg",
    "fileSize": 2048576
  }
}
```

### Get Photos

```
GET /photos?workAssignmentId=1
Authorization: Bearer <jwt_token>
```

## Report Endpoints

### Get Summary Report

```
GET /reports/summary?startDate=2026-03-01&endDate=2026-03-31&moduleType=door_to_door
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTasks": 150,
    "completedTasks": 145,
    "completionRate": 96.67,
    "totalDistance": 25000,
    "totalTime": 45000,
    "averageTaskTime": 300,
    "byWorker": [
      {
        "userId": 1,
        "name": "John Worker",
        "tasksCompleted": 50,
        "completionRate": 100
      }
    ]
  }
}
```

### Export PDF Report

```
GET /reports/export/pdf?startDate=2026-03-01&endDate=2026-03-31&moduleType=door_to_door
Authorization: Bearer <jwt_token>
```

Returns PDF file with map snapshot and detailed report.

### Export Excel Report

```
GET /reports/export/excel?startDate=2026-03-01&endDate=2026-03-31&moduleType=door_to_door
Authorization: Bearer <jwt_token>
```

Returns Excel file with multiple sheets.

## Configuration Endpoints

### Get Configuration

```
GET /config/:key
Authorization: Bearer <jwt_token>
```

### Update Configuration

```
PATCH /config/:key
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "value": "true"
}
```

**Common Configuration Keys:**
- `photo_mandatory` - Require photo for task completion
- `mock_location_detection` - Enable mock location detection
- `depot_stop_duration` - Minutes required for depot trip increment (default: 5)

## Audit Log Endpoints

### Get Audit Logs

```
GET /audit-logs?userId=1&action=create&page=1&limit=50
Authorization: Bearer <jwt_token>
```

## Health Check

### API Health

```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-11T07:30:00Z",
  "database": "connected",
  "version": "2.0.0"
}
```

## Rate Limiting

- Authentication endpoints: 5 requests/minute per IP
- General endpoints: 100 requests/minute per user
- Report export: 10 requests/hour per user

## Pagination

All list endpoints support pagination:

```
GET /endpoint?page=1&limit=50
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 500)

**Response:**
```json
{
  "items": [],
  "total": 100,
  "page": 1,
  "limit": 50,
  "pages": 2
}
```

## Filtering

Most list endpoints support filtering:

```
GET /assignments?userId=1&status=completed&wardId=5
```

## Sorting

```
GET /assignments?sort=-createdAt
```

Use `-` prefix for descending order.

## Error Codes

| Code | Meaning |
|------|---------|
| INVALID_INPUT | Input validation failed |
| UNAUTHORIZED | Missing or invalid token |
| FORBIDDEN | Insufficient permissions |
| NOT_FOUND | Resource not found |
| CONFLICT | Resource already exists |
| RATE_LIMIT | Too many requests |
| INTERNAL_ERROR | Server error |
| DATABASE_ERROR | Database operation failed |
| EXTERNAL_SERVICE_ERROR | Twilio or other external service error |

---

**API Version**: 2.0.0  
**Last Updated**: March 2026
