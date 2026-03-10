# APPLICATION_FLOW.md — Pixelspot DOOH Platform

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Authentication & Registration Flows](#2-authentication--registration-flows)
3. [Screen & Device Management Flows](#3-screen--device-management-flows)
4. [Campaign & Content Management Flows](#4-campaign--content-management-flows)
5. [Booking & Scheduling Flows](#5-booking--scheduling-flows)
6. [Payment Processing Flows](#6-payment-processing-flows)
7. [Payout & Earnings Flows](#7-payout--earnings-flows)
8. [Creative Upload & Approval Flows](#8-creative-upload--approval-flows)
9. [Proof of Play & Verification Flows](#9-proof-of-play--verification-flows)
10. [Notification Center](#10-notification-center)
11. [Authorization & Security](#11-authorization--security)
12. [Public Discovery & Nearby Screens](#12-public-discovery--nearby-screens)

---

## 1. System Overview

### Actors
| Actor | Role Key | Description |
|-------|----------|-------------|
| **Admin** | `admin` | Platform admin — manages users, screens, bookings, payments, payouts |
| **Screen Owner** | `screen_owner` | Owns DOOH screens, approves bookings, receives payouts |
| **Advertiser** | `advertiser` | Creates campaigns, selects screens, pays for bookings |

### Core Entities
- **Screen** — physical DOOH display registered by an owner
- **Campaign** — advertising campaign created by an advertiser
- **Booking** — reservation of a screen for a campaign's date range
- **Payment** — advertiser's payment via Razorpay
- **Invoice** — GST-compliant invoice generated on payment/payout
- **Owner Payout** — admin → owner payout with 5-min accept window (advance or final type)
- **Proof of Play** — owner-uploaded evidence of ad display (photos/videos/PDFs), verified by admin, confirmed by advertiser
- **Notification** — in-app notification for any user

### Technology Stack
- **Frontend**: React 18 + Vite + TypeScript, wouter router, TanStack React Query, shadcn/ui
- **Backend**: Express.js + TypeScript (ESM)
- **Database**: PostgreSQL on Neon (Drizzle ORM)
- **Auth**: Firebase Authentication (email/password + Google)
- **Payment**: Razorpay (orders, verify signature, webhooks)
- **File Upload**: multer → Google Cloud Storage
- **Email**: AWS SES
- **Real-time**: WebSocket (ws) with user-targeted messaging
- **Deployment**: Hetzner VPS, PM2 fork mode, nginx + Let's Encrypt SSL

---

## 2. Authentication & Registration Flows

### Registration
1. User visits `/register`, enters email/password or uses Google Sign-In
2. Firebase creates auth user ← returns Firebase UID
3. Client calls `POST /api/auth/register` with Firebase token + role selection
4. Server verifies token, creates user in PostgreSQL
5. Verification email sent if email not verified

### Login
1. User visits `/login`, authenticates via Firebase
2. Client sends `Authorization: Bearer <firebase_token>` on all API calls
3. Server `authenticate` middleware verifies token, attaches `req.user`

### Profile Completion
- After registration, users complete profile with business details
- Screen owners can add bank details via `PATCH /api/owner/bank-details`

---

## 3. Screen & Device Management Flows

### Screen Registration (Owner)
**Endpoint**: `POST /api/owner/screens`
- Owner fills `ScreenForm` with all details (identity, location, audience, commercial)
- `loopDuration` (seconds) + `durationPerSlot` → server auto-calculates `maxBrandsPerLoop`
- Screen created with `status: "pending"` → admin must approve
- Auto-tag generation triggered asynchronously (Google Places API)

### Screen Approval (Admin)
**Endpoint**: `PATCH /api/admin/screens/:id/approve`
- Admin reviews pending screens → approves or rejects
- On approve: status → `"active"` and appears in advertiser discover

### Screen Fields (Key)
| Field | Description |
|-------|-------------|
| `loopDuration` | Total advertising loop cycle in seconds |
| `maxBrandsPerLoop` | Auto-calculated: `loopDuration / durationPerSlot` |
| `pricePerDay` | Daily rate in INR (integer) |
| `locationTags` | Nearby facilities (School, Hospital, Mall, etc.) |
| `lifestyleTags` | Audience lifestyle (Working Pros, Students, etc.) |

### Screen Availability Check
**Endpoint**: `GET /api/screens/:id/slots`  
**Response**:
```json
{
  "screenId": "...",
  "maxBrandsPerLoop": 6,
  "currentBookings": 2,
  "availableSlots": 4
}
```

---

## 4. Campaign & Content Management Flows

### Campaign Creation (Advertiser)
**Endpoint**: `POST /api/advertiser/campaigns`  
**Flow**: 6-step wizard
1. **Goal & Budget** — name, objective, budget
2. **Choose Area** — map circle or city selection
3. **Set Duration** — auto or custom days, start/end dates
4. **Filters** — venue type, age, gender, affluence
5. **Smart Plan** — AI-recommended screen selection
6. **Creative & Review** — `creativeUrl`, optional `summary` notes

**Request Body** (key fields):
```json
{
  "name": "Summer Sale 2025",
  "objective": "brand_awareness",
  "budget": 50000,
  "startDate": "2025-07-01T00:00:00.000Z",
  "endDate": "2025-07-15T00:00:00.000Z",
  "creativeUrl": "https://example.com/ad.jpg",
  "summary": "Summer sale promotion for clothing brand"
}
```

### After Campaign Creation
- Bookings auto-created for each selected screen
- Each booking: `status: "pending_owner"` → awaits owner approval
- Server validates brand slot availability before creating booking

---

## 5. Booking & Scheduling Flows

### Booking Lifecycle
```
pending_owner → owner_approved → approved → active → completed
                ↘ owner_rejected
                                  ↘ rejected
                ↗ expired (payment deadline missed)
```

### Booking Creation
**Endpoint**: `POST /api/advertiser/bookings`  
- Server checks `getScreenBrandAvailability()` — rejects if no slots available
- Server calculates `price = screen.pricePerDay × days` (server-side validation)
- Status starts as `"pending_owner"`

### Owner Approval
**Endpoint**: `PATCH /api/owner/bookings/:id/approve`  
- **Bank Details Gate**: Owner must have `bankAccountNumber`, `bankIfscCode`, and `bankAccountName` on file — returns error code `BANK_DETAILS_REQUIRED` if missing
- Owner approves → status: `"owner_approved"` → awaits admin final approval
- **Payment Deadline**: Sets `paymentDeadline = now + owner.paymentDeadlineHours` (default 24h)
- Sends `payment_required` notification + email to advertiser with deadline

### Payment Deadline Scheduler
- Runs every **5 minutes** on server startup
- Queries `owner_approved` bookings where `paymentDeadline ≤ now()` and payment not yet completed
- Expires booking (`status: "expired"`), notifies advertiser, owner, and all admins

### Owner Rejection
**Endpoint**: `PATCH /api/owner/bookings/:id/reject`  
- Can include `reason` and optional `alternativeDates`

### Status Sync (Scheduler)
- Runs on server startup interval
- `approved` → `active` when `startDate ≤ now`
- `active` → `completed` when `endDate ≤ now`

---

## 6. Payment Processing Flows

### Payment Gateway: Razorpay

### Flow
1. Advertiser clicks "Pay Now" on campaign details
2. Client loads Razorpay checkout script
3. Client calls `POST /api/payments/create-order`
4. Server creates Razorpay order + Payment record (`status: "pending"`)
5. Razorpay checkout modal opens
6. On success, client calls `POST /api/payments/verify`
7. Server verifies HMAC-SHA256 signature
8. Payment marked `"completed"`, campaign `paymentStatus: "paid"`
9. Invoice auto-generated (sequential numbering: `INV-00001`)
10. Notifications sent to advertiser + admins

### Create Order
**Endpoint**: `POST /api/payments/create-order`  
**Auth**: Advertiser  
**Request**:
```json
{
  "campaignId": "uuid",
  "amount": 5000000
}
```
**Response**:
```json
{
  "orderId": "order_xxx",
  "amount": 5000000,
  "currency": "INR"
}
```

### Verify Payment
**Endpoint**: `POST /api/payments/verify`  
**Request**:
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "hex_signature"
}
```

### Get Config
**Endpoint**: `GET /api/payments/config`  
**Response**: `{ "key": "rzp_live_xxx" }`

### Advertiser Payment History
**Endpoint**: `GET /api/advertiser/payments`  
**Endpoint**: `GET /api/advertiser/invoices`

### Admin Payment Management
**Endpoint**: `GET /api/admin/payments`  
**Endpoint**: `GET /api/admin/invoices`

---

## 7. Payout & Earnings Flows

### Payout Model
- 100% advance from advertiser → Pixelspot holds funds
- Admin sets **advance** and **final** amounts per booking
- **Advance payout**: Initiated by admin after booking approval (minus platform commission)
- **Final payout**: Initiated by admin after proof of play is confirmed by advertiser
- Owner has **5-minute window** to accept each payout
- Admin marks processed with UTR/transaction reference

### Payout Lifecycle
```
initiated → pending_owner_accept → accepted → processed
                                 ↘ expired (auto after 5 min)
                                                ↘ failed
Expired/Failed → regenerated (new 5-min window)
```

### Booking Payout Management (Admin)

#### Get Booking Payout Data
**Endpoint**: `GET /api/admin/booking-payouts`  
**Auth**: Admin  
**Response**: Array of enriched booking objects with:
- `booking` — full booking with screen, campaign, owner, advertiser info
- `payouts` — all payouts for this booking
- `proofs` — all proof of play submissions
- `advanceAmount` / `finalAmount` — configured amounts
- `totalPaidOut` — sum of completed payout amounts

#### Set Payout Amounts
**Endpoint**: `PATCH /api/admin/bookings/:id/payout-amounts`  
**Auth**: Admin  
**Request**:
```json
{
  "ownerAdvanceAmount": 4500000,
  "ownerFinalAmount": 2000000
}
```

#### Initiate Booking Payout
**Endpoint**: `POST /api/admin/bookings/:id/payout`  
**Auth**: Admin  
**Request**:
```json
{
  "payoutType": "advance",
  "amount": 4500000,
  "commission": 500000,
  "notes": "Advance for campaign XYZ"
}
```
- Validates `payoutType` is "advance" or "final"
- For **final** payouts: requires at least one proof with `status: "confirmed"`
- Creates payout with `expiresAt = now + 5 min`
- Sends notification to owner

### Initiate Payout (Admin)
**Endpoint**: `POST /api/admin/payouts/initiate`  
**Request**:
```json
{
  "bookingId": "uuid",
  "ownerId": "uuid",
  "campaignId": "uuid",
  "screenId": "uuid",
  "payoutAmount": 4500000,
  "platformCommission": 500000,
  "adminNotes": "Payout for June campaign"
}
```
- Creates payout with `expiresAt = now + 5 min`
- Sends notification to owner via WebSocket + in-app

### Accept Payout (Owner)
**Endpoint**: `POST /api/owner/payouts/:id/accept`  
- Checks `expiresAt` — rejects if expired
- Status → `"accepted"`, notifies admins

### Mark Processed (Admin)
**Endpoint**: `POST /api/admin/payouts/:id/mark-processed`  
**Request**: `{ "transactionRef": "UTR123456" }`  
- Generates payout invoice for owner
- Sends notification to owner

### Regenerate Expired Payout (Admin)
**Endpoint**: `POST /api/admin/payouts/:id/regenerate`  
- Creates new payout from expired/failed one (new 5-min window)

### Owner Earnings Dashboard
**Endpoint**: `GET /api/owner/earnings`  
**Response**:
```json
{
  "totalEarned": 15000000,
  "totalPending": 5000000,
  "totalProcessed": 10000000
}
```

**Endpoint**: `GET /api/owner/payouts` — paginated payout list

### Payout Expiry Checker (Scheduler)
- Runs every 60 seconds
- Finds payouts where `status = "pending_owner_accept"` AND `expiresAt < now`
- Auto-marks as `"expired"`, sends notifications

---

## 8. Creative Upload & Approval Flows

### Creative Upload (Advertiser)
**Endpoint**: `POST /api/advertiser/campaigns/:id/upload-creative`  
**Content-Type**: `multipart/form-data`  
**Max Size**: 50MB (image/video MIME types)  
- Uploads file to Google Cloud Storage
- Updates campaign: `creativeFileUrl`, `creativeStatus: "pending"`
- Sends notification to relevant screen owners

### Creative Approval (Owner)
**Endpoint**: `PATCH /api/owner/campaigns/:campaignId/creative/approve`  
- Sets `creativeStatus: "approved"`, `creativeApprovedAt: now`
- If payment done, sends creative URL email to owner

### Creative Rejection (Owner)
**Endpoint**: `PATCH /api/owner/campaigns/:campaignId/creative/reject`  
**Request**: `{ "reason": "Image resolution too low" }`  
- Sets `creativeStatus: "rejected"`, `creativeRejectionReason: reason`
- Notifies advertiser to re-upload

---

## 9. Proof of Play & Verification Flows

### Overview
After a booking runs, the screen owner uploads proof (photos, videos, PDFs) showing the ad was displayed. Admin verifies, then the advertiser confirms or disputes. Final payout to owner is gated on advertiser confirmation.

### Proof of Play Lifecycle
```
pending → admin_verified → confirmed
                         → disputed
```

### Upload Proof (Owner)
**Endpoint**: `POST /api/owner/bookings/:id/proof`  
**Content-Type**: `multipart/form-data`  
**Max Files**: 10 (100MB each)  
**Accepted Types**: image/*, video/*, PDF, CSV, text  
- Owner uploads proof files + optional notes
- Files stored in Google Cloud Storage
- Creates `proofOfPlay` record with `status: "pending"`
- Sends `proof_uploaded` notification to all admins

### List Owner Proofs
**Endpoint**: `GET /api/owner/proof-of-play`  
**Auth**: screen_owner  
**Response**: All proofs submitted by this owner

### Get Proofs for Booking
**Endpoint**: `GET /api/bookings/:id/proof-of-play`  
**Auth**: Any authenticated user  
**Response**: All proofs for the specified booking

### Verify Proof (Admin)
**Endpoint**: `PATCH /api/admin/proof/:id/verify`  
**Auth**: Admin  
- Sets `adminVerified: true`, `adminVerifiedAt: now`, `adminVerifiedBy: adminId`
- Status → `"admin_verified"`
- Sends notification to advertiser (to review/confirm)
- Sends `sendProofVerifiedEmail` to advertiser
- Sends notification to owner (proof verified by admin)

### List All Proofs (Admin)
**Endpoint**: `GET /api/admin/proof-of-play`  
**Auth**: Admin  
**Response**: All proofs across all owners

### Confirm Proof (Advertiser)
**Endpoint**: `PATCH /api/advertiser/proof/:id/confirm`  
**Auth**: Advertiser  
- Only allowed when `status === "admin_verified"`
- Sets `advertiserConfirmed: true`, `advertiserConfirmedAt: now`
- Status → `"confirmed"`
- Sends notifications to admin (trigger final payout) and owner (confirmed)

### Dispute Proof (Advertiser)
**Endpoint**: `PATCH /api/advertiser/proof/:id/dispute`  
**Auth**: Advertiser  
**Request**: `{ "reason": "Ad was not displayed during peak hours" }`  
- Only allowed when `status === "admin_verified"`
- Status → `"disputed"`, saves reason in `advertiserNotes`
- Sends notifications to admin and owner

### Frontend: Owner Proof Upload
- Located on **BookingRequests.tsx** Active and Completed tabs
- Each booking card includes a "Proof of Play" section with:
  - View existing proofs with status badges
  - File upload button (photos/videos/PDFs)
  - Notes textarea
  - Upload button calling `POST /api/owner/bookings/:id/proof`

### Frontend: Advertiser Proof Review
- Located on **CampaignDetails.tsx** per-booking cards
- Shows proof section when proofs exist for a booking
- File links with preview capability
- **Confirm** and **Dispute** buttons (when status = `admin_verified`)
- Dispute dialog with reason textarea

### Frontend: Admin Proof Management
- Located on **AdminPayments.tsx** "Proof of Play" tab
- Lists all proofs with status badges
- Verify button for pending proofs
- File links and notes display

---

## 10. Notification Center

### Architecture
- WebSocket: user-targeted messaging via `{type: 'auth', userId}` handshake
- Polling fallback: 30-second interval for unread count
- Stored in `notifications` table

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get all notifications for current user |
| GET | `/api/notifications/unread-count` | Get unread count |
| PATCH | `/api/notifications/:id/read` | Mark single notification as read |
| PATCH | `/api/notifications/read-all` | Mark all as read |

### Notification Types
- `payment_received` — payment completed
- `payment_required` — advertiser must pay before deadline (after owner approval)
- `booking_expired` — booking expired due to missed payment deadline
- `payout_initiated` — payout available to accept
- `payout_accepted` — owner accepted
- `payout_processed` — payout completed
- `payout_expired` — payout window expired
- `proof_uploaded` — owner uploaded proof of play (admin notification)
- `proof_verified` — admin verified proof (advertiser notification)
- `proof_confirmed` — advertiser confirmed proof (admin + owner notification)
- `proof_disputed` — advertiser disputed proof (admin + owner notification)
- `creative_uploaded` — new creative to review
- `creative_approved` — creative approved
- `creative_rejected` — creative rejected
- `booking_approved` — booking approved
- `booking_rejected` — booking rejected

### WebSocket Message Format
```json
{
  "event": "notification:new",
  "data": { "id": "...", "type": "...", "title": "...", "message": "..." }
}
```

---

## 11. Authorization & Security

### Middleware
- `authenticate`: Verifies Firebase JWT, attaches `req.user`
- `requireRole(role)`: Checks `req.user.role` matches allowed role

### Route Protection
| Role | Route Prefix | Examples |
|------|-------------|----------|
| Admin | `/api/admin/*` | Users, screens, bookings, payments, payouts, proof verify, booking-payouts |
| Owner | `/api/owner/*` | Screens, bookings, earnings, payouts, creative approve, proof upload |
| Advertiser | `/api/advertiser/*` | Campaigns, bookings, payments, creative upload, proof confirm/dispute |
| Public | `/api/screens/:id/slots` | Screen availability (no auth) |
| Public | `/api/public/nearby-screens` | IP-based nearby screen discovery (no auth) |
| Any Auth | `/api/bookings/:id/proof-of-play` | Get proofs for a booking |
| Any Auth | `/api/notifications/*` | Notification center |
| Any Auth | `/api/payments/config` | Razorpay public key |

### Payment Security
- Razorpay signature verification via HMAC-SHA256
- Server-side price calculation (never trust client-sent price)
- Webhook signature verification for async events

### Data Isolation
- Owners can only see/manage their own screens and payouts
- Advertisers can only see their own campaigns and payments
- Admin has access to all data

---

## 12. Public Discovery & Nearby Screens

### Overview
The landing page displays screens relevant to each visitor by detecting their location via IP geolocation (no browser permission required). This keeps the homepage focused and personalized instead of loading every screen in the database.

### Architecture
- **IP Geolocation Provider**: `ip-api.com` (free tier, HTTP, 45 requests/min, no API key)
- **Server-side only**: The IP lookup happens on the backend — no client-side geolocation or third-party scripts
- **Caching**: In-memory LRU cache (5 000 entries, 1-hour TTL) prevents redundant lookups
- **Distance Calculation**: Haversine formula with bounding-box pre-filter in PostgreSQL for performance
- **Service File**: `server/services/geolocation.ts` — `GeolocationService` class (singleton export)

### Get Nearby Screens
**Endpoint**: `GET /api/public/nearby-screens`  
**Auth**: None (public)  
**Request**: No parameters — IP is extracted server-side from `x-real-ip` / `x-forwarded-for` / `req.ip`

**Response** (geolocation successful):
```json
{
  "detectedCity": "Mumbai",
  "detectedState": "Maharashtra",
  "lat": 19.0760,
  "lng": 72.8777,
  "screens": [
    {
      "id": "uuid",
      "name": "Marine Drive Billboard",
      "screenType": "billboard",
      "latitude": "19.0359",
      "longitude": "72.8254",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pricePerDay": 5000,
      "avgDailyFootfall": 50000,
      "distanceKm": 5.2,
      "imageUrl": "https://...",
      "...": "other screen fields (ownerId stripped)"
    }
  ],
  "totalNearby": 15,
  "radiusKm": 50,
  "fallback": false
}
```

**Response** (geolocation failed — fallback):
```json
{
  "detectedCity": null,
  "detectedState": null,
  "lat": null,
  "lng": null,
  "screens": [ "...top 10 screens nationally by footfall..." ],
  "totalNearby": 10,
  "radiusKm": 0,
  "fallback": true
}
```

### Flow
1. Visitor loads the landing page (`/`)
2. React frontend fires `GET /api/public/nearby-screens` (TanStack Query, 5-min stale time)
3. Server extracts client IP from reverse-proxy headers (`x-real-ip` → `x-forwarded-for` → `req.ip`)
4. Server checks LRU cache for this IP; if miss, calls `http://ip-api.com/json/{ip}` (2-sec timeout)
5. If IP is private (localhost, 10.x, 192.168.x, 172.16-31.x) or API fails → **fallback**: return top 10 screens by `avgDailyFootfall DESC`
6. If geo detected → **progressive radius expansion**:
   - Try 25 km → if ≥ 10 screens, return
   - Try 50 km → if ≥ 10 screens, return
   - Try 100 km → if ≥ 10 screens, return
   - Try 200 km → return whatever is found
7. If still < 10 screens after 200 km, fill remaining slots with top national screens (by footfall)
8. Strip `ownerId` from all screens before returning

### Frontend: "Screens Near You" Section
- Displayed on `PublicHome.tsx` between "How It Works" and "Explore Premium Screens"
- **Loading state**: Animated gradient heading + 4 skeleton cards
- **City detected**: Green badge showing city name, total available count, and search radius
- **Map**: Google Maps centered on detected coordinates (zoom 11), green markers for each screen
- **Grid**: Responsive 1–5 columns with `ScreenCard` component; distance badge shown when city detected
- **Fallback heading**: "Top Screens for You" when no city detected
- **CTA**: "Explore All X Screens" button linking to full catalogue

### Storage Method
**Method**: `storage.getNearbyScreens({ lat, lng, radiusKm, limit })`  
- Bounding-box pre-filter on `latitude`/`longitude` columns (fast index scan)
- Precise Haversine formula: `6371 × acos(LEAST(1.0, GREATEST(-1.0, sin·sin + cos·cos·cos)))` with float safety clamping
- Returns `{ screens: Screen[], total: number }` ordered by distance ASC

### Key Design Decisions
| Decision | Rationale |
|----------|-----------|
| ip-api.com (free, no key) | Zero setup, sufficient for landing page traffic under 45 req/min |
| Server-side IP detection | No browser permission prompts, works for all visitors |
| LRU cache (5 000 / 1 hr) | Avoids hitting rate limit; same visitor gets instant response |
| Progressive radius | Rural areas with few screens still get results; urban areas get most relevant |
| National fallback | Every visitor sees content — no empty states |
| Distance badge on cards | Helps visitors gauge proximity without reading addresses |
