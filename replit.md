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

## Recent Changes (October 23, 2025)

-   **Complete Campaign Creation Redesign**: Streamlined from 5 complex mandatory steps to 6 simplified steps with budget-first approach:
    -   **Step 1: Campaign Goal & Budget** - Name, objective dropdown (5 options: Brand Awareness, Product Launch, Event Promotion, Seasonal Campaign, Local Promotion), and budget input
    -   **Step 2: Choose Area** - Dual input method: 
        - Option A: Interactive Google Map with draggable pin + radius slider (1-10 km)
        - Option B: City search autocomplete from available screens
        - Live estimate card showing reach across available LED screens
    -   **Step 3: Set Duration** - Auto-optimization toggle OR custom days input
        - Auto mode: Calls `/api/campaign/calculate-duration` to maximize reach
        - Shows calculated end date based on start date
    -   **Step 4: Audience & Location Filters** - Optional, collapsed by default
        - Venue types, age groups, gender, income levels, time preference
        - Reduces friction by making advanced targeting optional
    -   **Step 5: Smart Plan Suggestions** - Binary choice between Smart Plan (auto) and Customize Plan
        - **Smart Plan**: Shows all screens in area within budget, sorted by footfall
        - **Detailed Screen Breakdown**: Each screen shows:
            - Screen name with numbered badge (1, 2, 3...)
            - Full address with city, state, pincode
            - Screen type and resolution
            - Daily footfall metrics
            - Playback slots/hour and dwell time
            - Per-day cost × duration = total cost
            - Estimated individual screen reach
        - **Total Summary**: Shows campaign cost, remaining budget (color-coded)
        - **Customize Plan**: List/Map toggle for manual screen selection with checkboxes
        - Google Maps integration with custom screen markers and InfoWindow popups
    -   **Step 6: Upload Creative & Review** - Summary card with emoji icons and creative upload
        - Shows: Goal 🎯, Area 📍, Duration 📅, Budget 💰, Reach 👁️, Screen count, Creative preview
        - Primary CTA: "Create Campaign" / Secondary: "Save as Draft"

-   **New Backend Endpoints**:
    -   `GET /api/screens/in-area` - Supports map (lat/lng/radius) OR city-based targeting
        - Uses Haversine formula for accurate distance calculation
        - Filters by budget and duration if provided
        - Returns screens sorted by footfall (descending)
    -   `POST /api/campaign/calculate-duration` - Auto-calculates optimal campaign duration
        - Input: budget, screenIds
        - Output: days, screensPerDay, totalScreenDays, avgCostPerDay
        - Strategy: Favors more screens over longer duration (wider reach)
    -   `POST /api/campaign/calculate-reach` - Estimates campaign reach and impressions
        - Input: screenIds, duration
        - Output: reach (footfall × duration), impressions (reach × dwell × slots), screenCount

-   **Schema Updates**:
    -   Added `targetArea` JSON field to campaigns table: supports both map-based (lat/lng/radius) and city-based targeting
    -   Made demographic fields optional (targetAgeGroups, targetGender, targetAffluence, etc.)
    -   Added `budget` field to campaigns (mandatory)

-   **Design Philosophy**:
    -   Budget-first approach prevents sticker shock and reduces advertiser drop-off
    -   Map + radius is primary area selection, city search as fallback
    -   Auto-duration optimization suggests more screens with shorter durations for maximum reach
    -   Optional filters hidden by default to reduce cognitive load
    -   Smart Plan provides clear transparency on which screens are selected and their locations
    -   Dual-view screen discovery (List/Map) maintained for flexibility

## Previous Changes (October 22, 2025)
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