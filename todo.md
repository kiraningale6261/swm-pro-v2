# SWM PRO v2.0 - Project TODO

## Phase 1: Architecture & Setup
- [ ] Set up monorepo structure with pnpm workspaces
- [ ] Configure TypeScript, ESLint, Prettier across all packages
- [ ] Create shared types and constants package
- [ ] Set up environment templates (.env.example files)

## Phase 2: Database Schema & Migrations
- [ ] Design PostgreSQL + PostGIS schema
- [ ] Create Drizzle ORM schema definitions
- [ ] Implement location hierarchy tables (Country, State, District, Taluka, Village)
- [ ] Implement ward tables with geometry
- [ ] Implement user and authentication tables
- [ ] Implement QR code and scan tracking tables
- [ ] Implement work logs and GPS trail tables
- [ ] Implement depot and geofence tables
- [ ] Implement drainage line tables
- [ ] Implement photo and audit log tables
- [ ] Create and test all migrations
- [ ] Create seed data script with test hierarchy

## Phase 3: NestJS Backend API
- [ ] Set up NestJS project with TypeScript
- [ ] Implement authentication module (OTP, PIN, JWT)
- [ ] Implement Twilio OTP integration
- [ ] Implement role-based access control (Admin, Worker)
- [ ] Implement hierarchy management endpoints
- [ ] Implement ward auto-generation with PostGIS
- [ ] Implement QR generation and validation
- [ ] Implement Door-to-Door collection module
- [ ] Implement Road Sweeping module with GPS trail
- [ ] Implement Drainage module with 90% overlap detection
- [ ] Implement Depot module with geofence and trip counting
- [ ] Implement live tracking endpoints
- [ ] Implement WebSocket for real-time updates
- [ ] Implement reports generation endpoints (PDF, Excel)
- [ ] Implement photo upload endpoints
- [ ] Implement audit logging
- [ ] Implement error handling and validation
- [ ] Create API documentation

## Phase 4: Next.js Admin Dashboard
- [ ] Set up Next.js project with TypeScript
- [ ] Implement glassmorphism UI design system
- [ ] Create authentication pages (Login, OTP, PIN verification)
- [ ] Create dashboard home page with metrics
- [ ] Create hierarchy management pages (Country, State, District, Taluka, Village)
- [ ] Create village boundary drawing/upload page
- [ ] Create ward auto-generation page
- [ ] Create ward visualization page
- [ ] Create user and staff management pages
- [ ] Create QR code management and download page
- [ ] Create Door-to-Door live tracking page
- [ ] Create Road Sweeping monitor page
- [ ] Create Drainage monitor page
- [ ] Create Swarm view page
- [ ] Create Depot management page
- [ ] Create Reports center page
- [ ] Create Global settings page (photo toggle, etc.)
- [ ] Create Audit logs page
- [ ] Create Profile/Account page
- [ ] Create custom 404 page
- [ ] Create error boundary and error page
- [ ] Implement responsive design for mobile
- [ ] Integrate Leaflet maps with geospatial data

## Phase 5: Expo React Native Worker Mobile App
- [ ] Set up Expo project with TypeScript
- [ ] Implement authentication screens (Mobile login, OTP, PIN)
- [ ] Create dashboard/assigned tasks screen
- [ ] Create task start screen
- [ ] Create QR scanner screen
- [ ] Create GPS tracking active screen
- [ ] Create photo upload screen
- [ ] Create task completion screen
- [ ] Create task history screen
- [ ] Create profile/logout screen
- [ ] Implement mock location detection warning
- [ ] Implement GPS breadcrumb trail capture
- [ ] Implement real-time location updates
- [ ] Implement offline support

## Phase 6: Geospatial & Advanced Features
- [ ] Implement ward auto-division algorithm (equal-area polygons)
- [ ] Implement GPS trail validation and storage
- [ ] Implement 90% overlap detection for drainage
- [ ] Implement geofence point-in-polygon checks
- [ ] Implement depot 5-minute stop detection
- [ ] Implement swarm view aggregation
- [ ] Implement map layer rendering

## Phase 7: QR, Photos, Reports & Integration
- [ ] Implement QR code generation with encryption
- [ ] Implement QR code scanning validation
- [ ] Implement photo upload to Supabase Storage
- [ ] Implement mandatory photo toggle enforcement
- [ ] Implement PDF report generation with map snapshots
- [ ] Implement Excel report generation
- [ ] Implement report filtering and download

## Phase 8: Deployment & Documentation
- [ ] Create Railway deployment configuration
- [ ] Create Supabase setup instructions
- [ ] Create environment variable templates
- [ ] Create migration and seed scripts
- [ ] Create comprehensive README
- [ ] Create API endpoint documentation
- [ ] Create deployment troubleshooting guide
- [ ] Create test user credentials documentation

## Phase 9: Testing & Validation
- [ ] Test all authentication flows
- [ ] Test hierarchy management
- [ ] Test ward auto-generation
- [ ] Test QR generation and scanning
- [ ] Test Door-to-Door collection flow
- [ ] Test Road Sweeping GPS tracking
- [ ] Test Drainage 90% overlap detection
- [ ] Test Depot geofence and trip counting
- [ ] Test photo upload and mandatory toggle
- [ ] Test reports export
- [ ] Test live tracking
- [ ] Test mobile app on real device
- [ ] Test admin dashboard responsiveness
- [ ] Verify no 404 pages
- [ ] Verify no placeholder/example pages
- [ ] Verify all navigation links work
- [ ] Test Railway deployment
- [ ] Performance testing and optimization

## Acceptance Criteria Checklist
- [ ] Admin can log in and access dashboard
- [ ] Worker can log in on mobile app
- [ ] Admin can create hierarchy and village boundaries
- [ ] Admin can auto-generate 10 wards from village boundary
- [ ] Admin can see generated wards on map
- [ ] QR codes are generated and can be scanned
- [ ] Door-to-door task changes to Collected only after QR scan
- [ ] Road sweeping captures breadcrumb trail and requires start/end QR
- [ ] Drainage task auto-completes when 90% overlap is achieved
- [ ] Swarm view shows merged progress from multiple workers
- [ ] Depot geofence increments trip after 5-minute stop
- [ ] Photo mandatory toggle works
- [ ] Reports export works in PDF and Excel
- [ ] Data persists in Supabase
- [ ] Admin UI and worker app are polished and usable
- [ ] Railway deployment is documented and runnable
- [ ] No unexpected 404 pages
- [ ] No fake UI-only modules
- [ ] No core button without backend logic
- [ ] App is testable immediately using seeded data
