# PixelSpot - DOOH Advertising Marketplace

## Overview
PixelSpot is a comprehensive Digital Out-of-Home (DOOH) advertising marketplace platform for India that connects advertisers with screen owners. The platform facilitates discovery, booking, and management of digital billboard advertising spaces.

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Authentication**: Firebase Google OAuth
- **Maps**: Mapbox GL for geolocation and discovery
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
- Screen discovery with interactive Mapbox map
  - Filter by type, location, budget
  - View screen details and pricing
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
- `id` (serial, primary key)
- `ownerId` (foreign key to users)
- `name`, `location`, `city`, `state`
- `latitude`, `longitude` (for map display)
- `type` (billboard | led_screen | digital_kiosk | transit_display)
- `width`, `height` (dimensions in feet)
- `pricePerDay` (in INR)
- `imageUrl` (screen photo)
- `status` (pending | active | inactive)

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
- `VITE_MAPBOX_TOKEN` - Mapbox API token for maps
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `SESSION_SECRET` - Express session secret

## Key Features
- **Firebase Google OAuth**: Secure authentication with role-based access
- **Interactive Map Discovery**: Mapbox-powered screen location visualization
- **Multi-Screen Booking**: Create campaigns across multiple screens
- **Approval Workflow**: Owner and admin approval required for bookings
- **File Uploads**: Object storage for screen images and campaign creatives
- **Payment Processing**: Stripe integration for secure payments
- **Real-time Stats**: Dashboards for all user roles

## Design System
- Primary color: Deep teal (hsl(258, 85%, 45%))
- Font: Inter (body), Space Grotesk (headings)
- Dark mode as default
- Shadcn UI component library
- Responsive design with mobile support

## Recent Changes (October 5, 2025)
- Implemented complete database schema with all tables
- Built all three role-based portals (Admin, Owner, Advertiser)
- Integrated Firebase Google OAuth for authentication
- Created comprehensive API routes with role-based access control
- Set up Mapbox integration for screen discovery
- Fixed critical query client bug that prevented data fetching
- Configured Object Storage and Stripe integrations
