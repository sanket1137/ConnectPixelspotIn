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
-   **AI-Driven Campaign Creation**: A 5-step workflow for advertisers to create highly targeted campaigns based on objectives, location, demographics, intent, duration, and venue types, culminating in AI-recommended screens and budget estimation.
-   **Dual-View Screen Discovery**: Advertisers can seamlessly toggle between a list view (card-based, paginated) and an interactive Google Maps view with custom, status-aware markers for screen selection.
-   **Multi-Step Booking Approval Workflow**: Bookings require approval from both the Screen Owner and an Admin, ensuring proper oversight.
-   **Comprehensive Screen Data Model**: Screens are categorized with detailed identity, location/context, audience demographics, and commercial data to support granular targeting.
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
-   **Authentication Flow**: Standard Firebase Google OAuth flow, where ID tokens are verified by the backend to establish user sessions and roles.

## External Dependencies
-   **Database**: PostgreSQL (Neon)
-   **ORM**: Drizzle ORM
-   **Authentication**: Firebase Google OAuth
-   **Maps**: Google Maps API (@react-google-maps/api)
-   **Payments**: Stripe
-   **Storage**: Replit Object Storage
-   **Frontend Framework**: React
-   **Backend Framework**: Express.js
-   **TypeScript**: Used across both frontend and backend for type safety.
-   **Vite**: Frontend build tool.
-   **Shadcn UI**: Component library.