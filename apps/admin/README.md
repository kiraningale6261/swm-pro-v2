# SWM PRO Admin Dashboard

The Admin Dashboard is a Next.js 14 application built with React 19, TailwindCSS, and Leaflet.js for managing workers, vehicles, and monitoring live GPS trails with QR code management.

## Features

### 1. **Management Page** (`/management`)
- **Worker Management**: Add, edit, and delete workers
- **Worker Details**: Name, Mobile, Role (Admin/Worker), Device ID (IMEI)
- **Ward Assignment**: Assign workers to specific wards
- **Vehicle Management**: (Coming Soon) Add and manage vehicles

### 2. **Live Dashboard** (`/dashboard`)
- **10 Mini-Maps Grid**: Real-time visualization of 10 wards with Leaflet.js
- **Live GPS Trails**: Display GPS breadcrumb trails for active workers
- **Detailed Ward View**: Click on any ward to see detailed map and GPS data
- **Live Updates**: Automatic polling every 5 seconds for real-time data

### 3. **QR Code Manager** (`/qr-manager`)
- **Create QR Codes**: Generate task points, checkpoints, and ward QR codes
- **Red-to-Green Status**: Visual indicator of QR scan progress
  - **Red**: No scans yet
  - **Yellow**: Partial scans (< 5)
  - **Green**: Fully scanned (≥ 5)
- **Map View**: Visualize all QR codes on an interactive map
- **Status Tracking**: Monitor active/inactive QR codes

### 4. **Reports & Analytics** (`/reports`)
- **Key Statistics**: Total users, active workers, assignments, completion rate
- **Assignment Status Chart**: Pie chart showing distribution of assignment statuses
- **User Role Distribution**: Bar chart of admin vs worker counts
- **Activity Summary**: Detailed table of user activity and last login times

## Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript
- **Styling**: TailwindCSS 4, Glassmorphism UI
- **Maps**: Leaflet.js, React-Leaflet
- **Database**: Supabase (PostgreSQL with PostGIS)
- **State Management**: TanStack React Query
- **Forms**: React Hook Form, Zod validation
- **UI Components**: Radix UI, Lucide Icons
- **Charts**: Recharts

## Project Structure

```
apps/admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Home page
│   │   ├── globals.css             # Global styles & Glassmorphism
│   │   ├── management/
│   │   │   └── page.tsx            # Worker & Vehicle Management
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Live Dashboard with 10 Mini-Maps
│   │   ├── qr-manager/
│   │   │   └── page.tsx            # QR Code Manager
│   │   └── reports/
│   │       └── page.tsx            # Reports & Analytics
│   ├── components/                 # Reusable components
│   ├── lib/
│   │   └── supabase.ts             # Supabase client & helpers
│   ├── hooks/                      # Custom React hooks
│   └── types/                      # TypeScript types
├── .env.local                      # Environment variables
├── .env.example                    # Example environment file
├── next.config.js                  # Next.js configuration
├── tailwind.config.ts              # TailwindCSS configuration
├── postcss.config.js               # PostCSS configuration
└── tsconfig.json                   # TypeScript configuration
```

## Environment Setup

### 1. Install Dependencies

```bash
cd /home/ubuntu/swm-pro-v2/swm-pro-v2
pnpm install
```

### 2. Configure Environment Variables

Create `.env.local` in `/apps/admin/`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://db.ixpzcdrrjaqdfcbpaahe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Twilio Configuration
NEXT_PUBLIC_TWILIO_SID=ACfdaaea6a75c163913959812636477e34
NEXT_PUBLIC_TWILIO_TOKEN=e63003d31703777de5499ef4f5a8b99e

# Database (for server-side operations)
DATABASE_URL=postgresql://postgres:your-password@db.ixpzcdrrjaqdfcbpaahe.supabase.co:5432/postgres
```

### 3. Database Setup

The admin dashboard connects to the existing Supabase database. Ensure the following tables are created:

- `users` - Worker and admin accounts
- `wards` - Ward information with boundaries
- `work_assignments` - Worker-to-ward assignments
- `qr_codes` - QR code records
- `qr_scans` - QR scan history
- `gps_trails` - GPS trail records
- `gps_points` - Individual GPS points

Run migrations:

```bash
pnpm db:push
```

## Running the Application

### Development Mode

```bash
# Run only admin dashboard
pnpm dev:admin

# Or run all services
pnpm dev
```

The admin dashboard will be available at `http://localhost:3000`

### Production Build

```bash
pnpm build:admin
pnpm start
```

## Key Components

### Glassmorphism UI

The dashboard features a modern Glassmorphism design with:
- Translucent cards with backdrop blur
- White/Blue color theme
- Smooth animations and transitions
- Responsive grid layouts

### Supabase Integration

The `supabaseAdmin` helper provides easy access to:
- User management (CRUD operations)
- Ward queries
- Work assignment creation
- QR code operations
- GPS trail and point retrieval

### Real-time Updates

- **Dashboard**: Polls GPS data every 5 seconds
- **QR Manager**: Updates QR code status in real-time
- **Management**: Instant worker/vehicle updates via React Query

## API Integration

The admin dashboard connects to the backend API at `NEXT_PUBLIC_API_URL`. Key endpoints:

- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/wards` - List wards
- `GET /api/work-assignments` - List assignments
- `POST /api/qr-codes` - Create QR code
- `GET /api/gps-trails` - Get GPS trails

## Deployment

### Vercel Deployment

```bash
# Build for production
pnpm build:admin

# Deploy to Vercel
vercel deploy
```

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY . .

RUN pnpm install
RUN pnpm build:admin

EXPOSE 3000

CMD ["pnpm", "start"]
```

### Environment Variables for Production

Set these in your hosting platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_TWILIO_SID`
- `NEXT_PUBLIC_TWILIO_TOKEN`
- `DATABASE_URL`

## Performance Optimization

- **Code Splitting**: Dynamic imports for Leaflet components
- **Image Optimization**: Next.js Image component
- **Caching**: React Query with stale-while-revalidate strategy
- **CSS**: TailwindCSS with PurgeCSS for minimal bundle

## Troubleshooting

### Supabase Connection Issues

1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Check database connectivity
3. Ensure PostGIS extension is enabled

### Map Not Displaying

1. Verify Leaflet CSS is loaded in layout
2. Check browser console for errors
3. Ensure `isMapReady` state is true

### QR Code Generation

1. Verify `qrcode` package is installed
2. Check browser permissions for canvas
3. Ensure location data is valid

## Contributing

1. Create a feature branch
2. Make changes following the code style
3. Test thoroughly
4. Submit a pull request

## License

MIT

## Support

For issues and support, contact the SWM PRO team or submit an issue on GitHub.
