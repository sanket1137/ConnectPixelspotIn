# PixelSpot - DOOH Advertising Marketplace

## Overview
PixelSpot is a comprehensive Digital Out-of-Home (DOOH) advertising marketplace platform for India that connects advertisers with screen owners. The platform facilitates discovery, booking, and management of digital billboard advertising spaces.

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Authentication**: Firebase Google OAuth
- **Maps**: Google Maps for geolocation and discovery
- **Payments**: Stripe integration
- **Storage**: Replit Object Storage for media files

## Project Structure
- `/client` - React frontend application
- `/server` - Express.js backend API
- `/shared` - Shared TypeScript types and database schema

## User Roles & Features

### Admin Portal (`/admin`)
- Dashboard with platform statistics
- User management (view all users, assign roles)
- Screen management (approve/reject screen submissions)
- Booking oversight
- Platform analytics

### Screen Owner Portal (`/owner`)
- Dashboard with earnings and screen statistics
- Screen management (CRUD operations)
  - Add new screens with location, pricing, specifications
  - Upload screen images
  - Set availability and pricing
- Booking request management
  - View pending requests
  - Approve/reject bookings
- Earnings tracking

### Advertiser Portal (`/advertiser`)
- Dashboard with campaign statistics
- **Screen Discovery with List + Map View Toggle**
  - **List View (Default)**: Card-based layout with pagination
  - **Map View**: Interactive Google Maps with markers
  - Seamless toggle between views with state persistence
  - Filter by type, location, budget (works across both views)
  - View screen details and pricing
  - Add screens to campaign selection
- Campaign management
  - Create multi-screen campaigns
  - Upload campaign creatives
  - Set campaign duration and budget
- Booking management

## Database Schema

### Users
- `id` (serial, primary key)
- `firebaseUid` (unique identifier from Firebase)
- `email`, `name`, `phone`
- `role` (admin | screen_owner | advertiser)
- `status` (active | inactive)

### Screens
Comprehensive screen data organized into 4 sections for better targeting:

**Section 1 - Screen Identity**
- `id` (varchar UUID, primary key)
- `ownerId` (foreign key to users, nullable for admin-owned)
- `name` - Unique screen identifier
- `category` - Digital Display | LED Video Wall | Kiosk | Mall LED | Lift Display | Transit Display
- `displayFormat` - Portrait | Landscape | Square
- `resolution` - Technical specs (e.g., "1920x1080")
- `durationPerSlot` - Ad slot duration in seconds

**Section 2 - Location & Context**
- `venueName` - Venue identifier (e.g., "Phoenix Mall – Food Court")
- `location`, `city`, `pincode` - Address details
- `latitude`, `longitude` - GPS coordinates for map display
- `venueCategory` - Café | Mall | Apartment | Gym | Co-working | Airport | Metro | Salon | Cinema | Hospital | College | Corporate Park
- `avgDailyFootfall` - Estimated daily audience exposure
- `trafficType` - Pedestrian | Seated Audience | Transit | Mixed
- `timeOfDayActivity` - Array: Morning Rush | Lunch Hours | Evening Leisure | Late Night
- `environmentType` - Indoor | Semi-Outdoor | Outdoor Digital
- `nearbyLandmarks` - Array of landmark tags for proximity targeting

**Section 3 - Audience Demographics**
- `primaryAgeGroups` - Array: 18-25 | 25-40 | 40-60 | 60+
- `genderSplit` - JSON: {male: %, female: %}
- `affluenceLevel` - Premium | Mid | Budget
- `occupationMix` - Array: Students | Working Professionals | Business Owners | Homemakers
- `avgDwellTime` - Average viewing time in minutes
- `interestSegments` - Array of audience interest tags (Fitness, Coffee, Tech, etc.)

**Commercial & Campaign Data**
- `isMultiScreen` - Boolean indicating if listing has multiple screens
- `numberOfScreens` - Number of screens (required if isMultiScreen is true)
- `pricePerDay` - Base rate in INR
- `minBookingDays` - Minimum campaign duration
- `playbackSlotsPerHour` - For impression estimation
- `contentTypesSupported` - Array: Static Image | Video | Interactive | HTML5

**Legacy/Support Fields**
- `type` - Backward compatibility (maps to category)
- `size` - Display dimensions (derived from resolution)
- `operationalHours` - JSON operating schedule
- `images` - Array of screen photo URLs from object storage
- `status` - pending | active | inactive
- `ownedByAdmin` - Boolean flag for admin-created screens

### Campaigns
- `id` (serial, primary key)
- `advertiserId` (foreign key to users)
- `name`, `description`
- `startDate`, `endDate`
- `budget` (total in INR)
- `creativeUrl` (campaign media file)
- `status` (pending | live | completed | cancelled)

### Bookings
- `id` (serial, primary key)
- `campaignId`, `screenId` (foreign keys)
- `startDate`, `endDate`
- `price` (booking cost)
- `status` (pending | approved | rejected | completed)
- `ownerApproved`, `approvedByAdmin` (boolean flags)

### Payments
- `id` (serial, primary key)
- `bookingId` (foreign key)
- `amount`, `currency`
- `stripePaymentId`
- `status` (pending | completed | failed | refunded)

## Authentication Flow
1. User signs in with Google via Firebase Auth
2. Frontend receives Firebase ID token
3. Token sent to backend in Authorization header
4. Backend verifies token with Firebase Admin SDK
5. User record created/retrieved from database
6. User redirected to role-appropriate dashboard

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in/up with Firebase token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/signout` - Sign out

### Admin Routes (require admin role)
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/role` - Update user role
- `GET /api/admin/screens` - List all screens
- `PATCH /api/admin/screens/:id/approve` - Approve screen

### Owner Routes (require screen_owner role)
- `GET /api/owner/stats` - Dashboard statistics
- `GET /api/owner/screens` - List owner's screens
- `POST /api/owner/screens` - Create new screen
- `PATCH /api/owner/screens/:id` - Update screen
- `DELETE /api/owner/screens/:id` - Delete screen
- `GET /api/owner/requests` - Get pending booking requests
- `PATCH /api/owner/bookings/:id/approve` - Approve booking

### Advertiser Routes (require advertiser role)
- `GET /api/advertiser/stats` - Dashboard statistics
- `GET /api/screens` - List all active screens (for discovery)
- `GET /api/advertiser/campaigns` - List advertiser's campaigns
- `POST /api/advertiser/campaigns` - Create new campaign
- `POST /api/advertiser/bookings` - Create booking request

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID (pixelspot-f4010)
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key for maps
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `SESSION_SECRET` - Express session secret

## Key Features
- **Firebase Google OAuth**: Secure authentication with role-based access
- **Dual-View Screen Discovery**: List + Map view toggle with state persistence
- **Interactive Map**: Google Maps-powered screen location visualization
- **Multi-Screen Booking**: Create campaigns across multiple screens
- **Multi-Step Approval Workflow**: Owner → Admin approval chain for bookings
- **File Uploads**: Object storage for screen images and campaign creatives
- **Payment Processing**: Stripe integration for secure payments
- **Real-time Stats**: Dashboards for all user roles
- **Admin Screen Management**: Admins can add screens on behalf of owners

## Design System
- Primary color: Deep teal (hsl(258, 85%, 45%))
- Font: Inter (body), Space Grotesk (headings)
- Dark mode as default
- Shadcn UI component library
- Responsive design with mobile support

## Recent Changes (October 8, 2025)
- Implemented complete database schema with all tables
- Built all three role-based portals (Admin, Owner, Advertiser)
- Integrated Firebase Google OAuth for authentication
- Created comprehensive API routes with role-based access control
- Set up Mapbox integration for screen discovery
- Fixed critical query client bug that prevented data fetching
- Configured Object Storage and Stripe integrations
- **NEW: Implemented complete file upload system using Object Storage**
  - Created ObjectUploader component with Uppy integration
  - Added server-side object storage routes with ACL policies
  - Integrated file uploads in AddScreen and CreateCampaign forms
  - Screen images and campaign creatives now upload to cloud storage
- **NEW: Implemented server-side filtering for screen discovery**
  - Added query parameter support (city, type, minPrice, maxPrice, pincode)
  - Backend filters screens based on advertiser search criteria
  - Combined server-side and client-side filtering for optimal performance
- **NEW: Switched from Mapbox to Google Maps** (October 8, 2025)
  - Replaced Mapbox GL with Google Maps API (@react-google-maps/api)
  - Updated all map-based screen discovery to use Google Maps
  - Configured VITE_GOOGLE_MAPS_API_KEY for map visualization
- **NEW: Implemented List + Map View Toggle** (October 8, 2025)
  - **List View (Default)**: Card-based screen layout with pagination (12 per page)
  - **Map View**: Interactive Google Maps with clickable markers
  - View preference persisted in localStorage
  - Seamless filter synchronization across both views
  - Screen count display showing total results
  - Same "Add to Campaign" functionality in both views
- **NEW: Multi-Step Booking Approval Workflow** (October 8, 2025)
  - Screen selection system with localStorage persistence
  - Individual booking creation per selected screen
  - Owner approval/rejection with alternate date suggestions
  - Admin final approval after owner approval
  - Complete booking management for advertisers and owners
  - Status flow: pending_owner → owner_approved → approved
- **NEW: Admin Screen Management** (October 8, 2025)
  - Admins can add screens on behalf of screen owners
  - Screen owner selection from dropdown
  - Admin-created screens automatically set to "active" status
  - Route: `/admin/screens/new`
- **NEW: Enhanced Screen Data Model** (October 8, 2025)
  - Comprehensive screen form with 4 organized sections
  - **Section 1 - Screen Identity**: Technical specs (category, format, resolution, slot duration)
  - **Section 2 - Location & Context**: Venue details, footfall, traffic type, time-of-day activity, environment type
  - **Section 3 - Audience Demographics**: Age groups, gender split, affluence level, occupation mix, dwell time, interest segments
  - **Commercial Data**: Multi-screen support with screen count, playback slots, content types supported
  - Multi-screen listing feature: Toggle to indicate if listing has multiple screens with number input
  - Applied to both owner and admin screen creation forms
  - Enhanced targeting capabilities for advertisers
  - Schema updated with all new fields for campaign optimization

## Known Limitations
- Stripe payment integration pending (API routes ready, frontend integration needed)
- Availability calendar not yet implemented (date overlap detection needs to be added)
