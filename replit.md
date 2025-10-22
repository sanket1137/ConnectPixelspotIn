# PixelSpot - DOOH Advertising Marketplace

## Overview
PixelSpot is a Digital Out-of-Home (DOOH) advertising marketplace platform for India, connecting advertisers with screen owners. The platform streamlines the discovery, booking, and management of digital billboard advertising spaces, facilitating AI-driven campaign creation and offering dual-view screen discovery. PixelSpot aims to be the leading DOOH advertising solution in the Indian market.

## User Preferences
I prefer clear and concise explanations.
I value an iterative development approach.
Please ask for my approval before implementing major changes or architectural shifts.
Ensure all solutions are robust and scalable.
I prefer detailed explanations when new features or significant changes are proposed.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.

## System Architecture
PixelSpot utilizes a modern web stack with a React + TypeScript + Vite frontend and an Express.js + TypeScript backend. Data persistence is managed by PostgreSQL (Neon) with Drizzle ORM. Authentication is handled via Firebase Google OAuth, and Google Maps is integrated for geolocation services. Replit Object Storage is used for media file management, and Stripe is integrated for payment processing.

The platform supports three distinct user roles: Admin, Screen Owner, and Advertiser, each with a dedicated portal.

**Key Features:**
-   **Multi-Method Authentication**: Firebase-powered authentication supporting both Google OAuth and email/password login/signup with role selection during account creation.
-   **AI-Driven Campaign Creation**: A 5-step workflow for advertisers to create highly targeted campaigns based on objectives, location, demographics, intent, duration, and venue types, culminating in AI-recommended screens and budget estimation.
-   **Dual-View Screen Discovery**: Advertisers can seamlessly toggle between a list view (card-based, paginated) and an interactive Google Maps view with custom monitor/screen SVG icons (purple for unselected, green for selected) for screen selection.
-   **Multi-Step Booking Approval Workflow**: Bookings require approval from both the Screen Owner and an Admin, with support for:
    -   Alternative dates negotiation between owner and advertiser
    -   Admin override capabilities to edit booking dates
    -   Partial approval tracking (e.g., "Partially Approved 3/5 screens")
    -   Campaign details page showing individual booking statuses, rejection reasons, and alternative dates
-   **Comprehensive Screen Data Model**: Screens are categorized with detailed identity, location/context, audience demographics (including userIntent and userMood), and commercial data to support granular targeting. Screens can have multiple user intents (Shopping, Commuting, Dining, etc.) and moods (Relaxed, Rushed, Social, etc.) for precise campaign matching.
-   **Role-Based Access Control**: Ensures secure and appropriate access to features for Admin, Screen Owner, and Advertiser roles.
-   **File Uploads**: Integration with Replit Object Storage for managing screen images and campaign creatives.
-   **Payment Processing**: Stripe integration for secure transactions (frontend integration pending).

**UI/UX Decisions:**
-   **Color Scheme**: Deep teal as the primary color.
-   **Typography**: Inter for body text and Space Grotesk for headings.
-   **Theme**: Default dark mode.
-   **Component Library**: Shadcn UI for consistent and modern components.
-   **Responsiveness**: Designed for optimal performance across various devices, including mobile.

**System Design Choices:**
-   **Database Schema**: Normalized schema with `Users`, `Screens`, `Campaigns`, `Bookings`, and `Payments` tables, designed to support complex relationships and targeting requirements. The `Screens` table is particularly detailed, with fields covering identity, location, audience, and commercial aspects.
-   **Authentication Flow**: Firebase authentication with multiple sign-in methods:
    -   **Google OAuth**: Users can sign in with their Google account (for both login and signup with role selection)
    -   **Email/Password**: Users can create accounts and login using email and password
    -   ID tokens are verified by the backend to establish user sessions and roles
    -   Role selection is required during signup (Screen Owner or Advertiser)
    -   The login page uses tabs to organize Login and Sign Up flows

## External Dependencies
-   **Database**: PostgreSQL (Neon)
-   **ORM**: Drizzle ORM
-   **Authentication**: Firebase Authentication (Google OAuth + Email/Password)
-   **Maps**: Google Maps API (@react-google-maps/api)
-   **Payments**: Stripe
-   **Storage**: Replit Object Storage
-   **Frontend Framework**: React
-   **Backend Framework**: Express.js
-   **TypeScript**: Used across both frontend and backend for type safety.
-   **Vite**: Frontend build tool.
-   **Shadcn UI**: Component library.

## Recent Changes (October 22, 2025)
-   **Schema Cleanup & Bug Fixes**:
    -   **Removed Duplicate Fields**: Cleaned up database schema by removing 4 legacy/duplicate fields:
        - Removed `primaryAgeGroups` (replaced by `detailedAgeGroups` with more granular age ranges)
        - Removed `affluenceLevel` (replaced by `incomeLevel` with better descriptive targeting)
        - Removed `nearbyLandmarks` (replaced by organized `locationTags` + `customLocationTags`)
        - Removed `genderSplit` (replaced by `genderOrientation` for better targeting)
    -   **Fixed Dwell Time Input Issue**: Changed `avgDwellTime` validation from `z.string()` to `z.coerce.number()` to properly handle numeric input in both owner and admin forms
    -   Updated both AddScreen.tsx and AddScreenForOwner.tsx forms to remove legacy UI sections
    -   Database schema pushed successfully with cleaner, non-redundant structure

-   **Expanded Venue Types**: Added new venue categories for more targeted screen selection:
    -   New venue types: Bus Stop, Retail Store, Office Building, Stadium
    -   Complete list now includes 22 venue categories sorted alphabetically
    -   Updated in both screen onboarding and campaign creation forms
    -   Enhanced targeting capabilities for advertisers to reach specific audience segments

-   **Comprehensive Screen Enhancement System**: Major upgrade to screen onboarding with granular targeting attributes:
    
    **Enhanced Location Context:**
    -   Visibility Level (High/Medium/Low) based on footfall and screen positioning
    -   Description field for screen surroundings and pricing justification
    -   Operating Hours Presets: Business hours, Mall hours, Retail, Airport/Highways 24/7, or Custom
    -   Custom operating hours and days for flexible scheduling
    -   Location Tags System with 10 categories (50+ tags total):
        - Educational: School Nearby, College/University, Coaching Centers, Library
        - Healthcare: Hospital, Clinic, Pharmacy, Diagnostic Center
        - Commercial: Shopping Mall, Market Area, Office Complex, Bank/ATM
        - Food & Dining: Restaurant, Food Court, Cafe, Street Food
        - Transportation: Bus Stop, Metro Station, Railway Station, Airport, Parking Area
        - Residential: Housing Society, PG/Hostel, Apartment Complex
        - Religious & Cultural: Temple, Church, Mosque, Gurudwara, Cultural Center
        - Industrial: Factory, Industrial Area, Warehouse
        - Safety & Security: Police Station, Fire Station, Security Office
        - Entertainment: Cinema Hall, Park/Garden, Sports Complex, Gym
    -   Custom Location Tags for user-defined points of interest
    
    **Enhanced Audience Demographics:**
    -   Detailed Age Groups: Children (5-12), Teenagers (13-17), Young Adults (18-25), Adults (26-40), Middle Age (41-55), Seniors (55+), All Ages
    -   Gender Orientation: Male Dominant, Female Dominant, Mixed Gender, Family Oriented
    -   Income Levels: Budget Conscious, Middle Income, Premium Audience, Luxury Buyers
    -   Lifestyle Tags: Working Professionals, Students, Commuters, Shoppers, Tourists, Local Residents, Health Conscious, Tech Savvy
    -   Custom Audience Tags for user-defined demographic characteristics
    
    -   All enhanced fields stored in database with backward compatibility for existing screens
    -   Comprehensive constants defined in `shared/constants.ts` for consistency across app
    -   Form validation and UI updated to support all new targeting dimensions

## Previous Changes (October 16, 2025)
-   **Added Email/Password Authentication**: Extended Firebase authentication to support email/password signup and login alongside existing Google OAuth
-   **Updated Login Page**: Redesigned login page with tabs for "Login" and "Sign Up", each supporting both Google and email/password authentication
-   **Role Selection**: Email/password signup includes inline role selection (Advertiser vs Screen Owner) within the form
-   **Indian Geography Integration**: Complete state/UT support with 28 Indian states and 8 union territories
    -   Added `state` field to screens database schema for accurate location tracking
    -   Screen onboarding form now includes state dropdown with all 36 states/UTs
    -   Updated all 11 existing screens in database with accurate state values
    -   Created shared constants file (`shared/constants.ts`) for INDIAN_STATES and INDIAN_UNION_TERRITORIES
-   **Dynamic Location Filtering**: Campaign creation now shows only cities/states where screens actually exist
    -   New API endpoint `/api/screens/locations` returns available states and cities from active screens
    -   State dropdown in campaign creation dynamically populated from database
    -   City dropdown in campaign creation dynamically populated from database
    -   State filtering now uses actual `state` field instead of substring matching on city names
    -   Ensures advertisers can only target locations with available screen inventory