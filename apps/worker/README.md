# SWM PRO Worker Mobile App

A React Native Expo app for field workers to track GPS location, generate QR codes, and manage work assignments.

## Features

### 1. **Twilio OTP + PIN Authentication**
- Send OTP to mobile number via Twilio
- Verify OTP and create account
- Set secure 4-digit PIN for quick login
- Session persistence with AsyncStorage

### 2. **Background GPS Tracking**
- Real-time location updates every 30 seconds
- Continues tracking even when app is minimized
- Sends {latitude, longitude, imei, deviceId} to `/tracking/update` endpoint
- Foreground + Background tracking with expo-location

### 3. **Dynamic QR Code Generation**
- Generate JWT-signed QR codes with current GPS coordinates
- Base64 encoded payload with cryptographic signature
- QR codes include timestamp and location accuracy
- Supervisor can scan to verify worker location

### 4. **Work Assignment Management**
- View assigned wards and tasks
- Update assignment status (assigned → started → completed)
- Track work progress and completion

## Tech Stack

- **Framework**: Expo 51, React Native 0.73
- **Language**: TypeScript
- **State Management**: React Context + AsyncStorage
- **Location**: expo-location with background task
- **Database**: Supabase (PostgreSQL)
- **API**: Axios with interceptors
- **Security**: Crypto (expo-crypto) for JWT signing

## Project Structure

```
apps/worker/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx          # OTP + PIN login
│   │   └── HomeScreen.tsx           # GPS tracking & QR generation
│   ├── services/
│   │   ├── gpsTracker.ts            # Background location service
│   │   └── qrGenerator.ts           # JWT-signed QR generation
│   ├── lib/
│   │   ├── authContext.ts           # Auth state management
│   │   ├── supabase.ts              # Supabase client
│   │   └── api.ts                   # API client
│   ├── hooks/                       # Custom React hooks
│   ├── components/                  # Reusable components
│   └── types/                       # TypeScript types
├── App.tsx                          # Entry point
├── app.json                         # Expo configuration
├── .env.local                       # Environment variables
└── tsconfig.json                    # TypeScript config
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and pnpm
- Expo Go app installed on your phone (iOS/Android)
- Twilio account with SMS capability

### 1. Install Dependencies

```bash
cd /home/ubuntu/swm-pro-v2/swm-pro-v2
pnpm install
```

### 2. Configure Environment Variables

Create `.env.local` in `/apps/worker/`:

```env
EXPO_PUBLIC_API_URL=http://your-backend-ip:3001
EXPO_PUBLIC_SUPABASE_URL=https://db.ixpzcdrrjaqdfcbpaahe.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_TWILIO_SID=ACfdaaea6a75c163913959812636477e34
EXPO_PUBLIC_TWILIO_TOKEN=e63003d31703777de5499ef4f5a8b99e
EXPO_PUBLIC_JWT_SECRET=your_jwt_secret_key_here
```

### 3. Run on Expo Go

#### Option A: Local Network (Recommended for Testing)

```bash
# Start the Expo dev server
pnpm dev:worker

# Output will show:
# › Metro waiting on exp://192.168.x.x:8081
# › Scan the QR code below with Expo Go
```

1. Open **Expo Go** app on your phone
2. Tap "Scan QR code"
3. Scan the QR code from terminal
4. App will load and hot-reload on changes

#### Option B: Tunnel (Works over internet)

```bash
# Start with tunnel (no local network required)
pnpm dev:worker --tunnel

# Scan the QR code with Expo Go
```

#### Option C: Android Emulator

```bash
pnpm android
```

#### Option D: iOS Simulator

```bash
pnpm ios
```

## Authentication Flow

### Step 1: Enter Mobile Number
- User enters 10-digit mobile number
- App sends OTP request to Twilio

### Step 2: Verify OTP
- User receives OTP via SMS
- Enters 6-digit OTP in app
- OTP verified against Supabase `otp_records` table

### Step 3: Set PIN
- User creates 4-digit PIN
- PIN stored securely in device storage
- User is now authenticated

### Step 4: Login (Subsequent)
- User enters mobile + PIN
- PIN verified from device storage
- Session restored from AsyncStorage

## GPS Tracking

### Foreground Tracking
- Polls location every 30 seconds
- Sends to `/tracking/update` endpoint
- Updates UI with current coordinates

### Background Tracking
- Uses expo-task-manager for background updates
- Continues even when app is minimized
- Sends location data in background

### Location Data Sent
```json
{
  "user_id": 123,
  "latitude": 20.5937,
  "longitude": 78.9629,
  "device_id": "mobile-worker",
  "imei": "device-imei",
  "accuracy": 5.2
}
```

## QR Code Generation

### JWT-Signed QR Code

The app generates cryptographically signed QR codes:

```typescript
{
  "userId": 123,
  "timestamp": 1710000000000,
  "latitude": 20.5937,
  "longitude": 78.9629,
  "accuracy": 5.2,
  "signature": "sha256_hash_of_data_and_secret"
}
```

### Verification
- Supervisor scans QR code
- Backend verifies signature using JWT secret
- Checks timestamp (valid for 5 minutes)
- Confirms worker location

## API Endpoints Used

### Authentication
- `POST /auth/send-otp` - Send OTP to mobile
- `POST /auth/verify-otp` - Verify OTP code
- `POST /auth/set-pin` - Set user PIN
- `POST /auth/verify-pin` - Verify PIN login

### Tracking
- `POST /tracking/update` - Send GPS location update

### QR Codes
- `POST /qr/generate` - Generate QR code
- `POST /qr/scan` - Record QR scan

### Work Assignments
- `GET /assignments` - Get user assignments
- `PUT /assignments/:id` - Update assignment status

## Permissions Required

### Android
- `ACCESS_FINE_LOCATION` - Precise GPS location
- `ACCESS_COARSE_LOCATION` - Approximate location
- `CAMERA` - For QR code scanning
- `READ_EXTERNAL_STORAGE` - For photos
- `WRITE_EXTERNAL_STORAGE` - For photos

### iOS
- Location (Always & When In Use)
- Camera
- Photo Library

## Troubleshooting

### "Cannot connect to backend"
- Ensure backend is running on correct IP
- Check firewall settings
- Use `--tunnel` flag if on different network

### "GPS not updating"
- Check location permissions in phone settings
- Ensure location services are enabled
- Try stopping and restarting tracking

### "OTP not received"
- Verify Twilio credentials in `.env.local`
- Check phone number format
- Ensure SMS is enabled in Twilio account

### "App crashes on startup"
- Clear Expo cache: `expo start --clear`
- Delete node_modules and reinstall: `pnpm install`
- Check console logs for errors

## Development Tips

### Hot Reload
- Changes to code auto-reload in app
- State is preserved during reload
- Press `r` in terminal to manually reload

### Debugging
- Open developer menu: Shake phone or press `Ctrl+M` (Android) / `Cmd+D` (iOS)
- View console logs
- Use React DevTools

### Testing Location
- Use Expo's location simulator
- Or use mock location app on Android
- Or manually set coordinates in HomeScreen

## Building for Production

### Create EAS Build Account

```bash
npm install -g eas-cli
eas login
```

### Build APK (Android)

```bash
eas build --platform android --local
```

### Build IPA (iOS)

```bash
eas build --platform ios --local
```

## Performance Optimization

- Location updates are throttled to 30 seconds
- GPS points are stored in batches
- Background task is optimized for battery
- API requests have timeout of 10 seconds

## Security Considerations

- PIN stored locally (not synced)
- JWT signatures prevent QR code tampering
- OTP expires after 10 minutes
- Location data sent over HTTPS
- AsyncStorage for session persistence

## Support

For issues, check:
1. Console logs in Expo Go
2. Network tab in developer tools
3. Backend logs for API errors
4. Supabase dashboard for database issues

## License

MIT
