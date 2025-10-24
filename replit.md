# PixelSpot - DOOH Advertising Marketplace

## Overview
PixelSpot is a Digital Out-of-Home (DOOH) advertising marketplace for the Indian market. It connects advertisers with screen owners, streamlining the discovery, booking, and management of digital billboard advertising spaces. The platform offers AI-driven campaign creation, dual-view screen discovery, and aims to be the leading DOOH advertising solution in India.

## User Preferences
I prefer clear and concise explanations.
I value an iterative development approach.
Please ask for my approval before implementing major changes or architectural shifts.
Ensure all solutions are robust and scalable.
I prefer detailed explanations when new features or significant changes are proposed.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.

## System Architecture
PixelSpot uses a React + TypeScript + Vite frontend and an Express.js + TypeScript backend. Data is managed with PostgreSQL (Neon) and Drizzle ORM. Authentication is handled by Firebase (Google OAuth and Email/Password). Geolocation uses Google Maps, media files are stored in Replit Object Storage, and payments are processed via Stripe.

The platform supports Admin, Screen Owner, and Advertiser roles, each with a dedicated portal.

**Key Features:**
-   **Multi-Method Authentication**: Firebase-powered authentication with Google OAuth and email/password, including role selection during signup.
-   **Profile Completion System**: Mandatory profile completion flow requiring mobile number (with OTP verification), company name, industry, address (city/state), and optional GST number. Google OAuth users have email auto-verified; manual signups require email OTP verification.
-   **OTP Verification**: In-memory OTP system for email and mobile verification. Email/mobile OTPs are logged to console (production requires Twilio for SMS and SendGrid/Resend for email).
-   **AI-Driven Campaign Creation**: A 6-step workflow for advertisers to create targeted campaigns, including goal, budget, area selection (map or city), duration, optional audience/location filters, smart plan suggestions, and creative upload.
-   **Dual-View Screen Discovery**: Advertisers can switch between a list view and an interactive Google Maps view for screen selection, featuring custom SVG icons.
-   **Multi-Step Booking Approval Workflow**: Bookings require approval from both the Screen Owner and an Admin, supporting alternative date negotiation and partial approvals.
-   **Comprehensive Screen Data Model**: Detailed categorization of screens with identity, location/context, audience demographics (userIntent, userMood, age groups, gender, income levels, lifestyle tags), and commercial data for granular targeting.
-   **Role-Based Access Control**: Ensures secure and appropriate feature access for all user roles.
-   **File Uploads**: Integration with Replit Object Storage for managing screen images and campaign creatives.
-   **Payment Processing**: Stripe integration for secure transactions.

**UI/UX Decisions:**
-   **Color Scheme**: Deep teal.
-   **Typography**: Inter for body text, Space Grotesk for headings.
-   **Theme**: Default dark mode.
-   **Component Library**: Shadcn UI.
-   **Responsiveness**: Optimized for various devices.

**System Design Choices:**
-   **Database Schema**: Normalized schema for `Users`, `Screens`, `Campaigns`, `Bookings`, and `Payments`, designed for complex relationships and targeting. The `Screens` table includes extensive detail for location, audience, and commercial attributes. Users table includes profile fields: mobileNumber, companyName, industry, gstNumber, address, city, state, with verification flags (emailVerified, mobileVerified, profileCompleted).
-   **Authentication Flow**: Firebase for Google OAuth and email/password, with backend verification of ID tokens and mandatory role selection during signup. Profile completion is mandatory before dashboard access.
-   **OTP System**: Simple in-memory OTP storage with 10-minute expiration. Mobile OTP delivery via ComBirds SMS API with DLT-compliant template. Email OTP uses console logging (production integration pending for SendGrid/Resend).
-   **Design Philosophy**: Budget-first approach, primary map-based area selection with city search fallback, auto-duration optimization, optional filters hidden by default, and transparent smart plan suggestions.
-   **Campaign Filter Mappings**: 
    - Age Groups: Array intersection between `targetAgeGroups` (campaign) and `detailedAgeGroups` (screen) - values: "Children (5-12)", "Teenagers (13-17)", "Young Adults (18-25)", "Adults (26-40)", "Middle Age (41-55)", "Seniors (55+)"
    - Affluence: Single screen `incomeLevel` must be in `targetAffluence` array - values: "Budget Conscious", "Middle Income", "Premium Audience", "Luxury Buyers"
    - Gender: Logic mapping from campaign `targetGender` (male/female/all) to screen `genderOrientation` - male accepts ["Male Dominant", "Mixed Gender", "Family Oriented"], female accepts ["Female Dominant", "Mixed Gender", "Family Oriented"]
    - Time Preference: Array intersection between `timePreference` (campaign) and `timeOfDayActivity` (screen) - values: "Morning Rush", "Lunch Hours", "Evening Leisure", "Late Night"
    - Venue Type: Direct match between `venueTypeFilters` (campaign) and `venueCategory` (screen)

## External Dependencies
-   **Database**: PostgreSQL (Neon)
-   **ORM**: Drizzle ORM
-   **Authentication**: Firebase Authentication (Google OAuth, Email/Password)
-   **SMS Gateway**: ComBirds API (Indian SMS delivery with DLT template)
-   **Maps**: Google Maps API (@react-google-maps/api)
-   **Payments**: Stripe
-   **Storage**: Replit Object Storage
-   **Frontend Framework**: React
-   **Backend Framework**: Express.js
-   **Type Checking**: TypeScript
-   **Frontend Build Tool**: Vite
-   **UI Component Library**: Shadcn UI