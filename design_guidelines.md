# PixelSpot Design Guidelines

## Design Approach

**Selected Approach**: Material Design System with marketplace-specific adaptations
**Key References**: Airbnb (map discovery), Linear (dashboard clarity), Shopify (multi-portal management)

**Design Principles**:
- Clarity over decoration: Information hierarchy drives every decision
- Trust through consistency: Professional, reliable interface for B2B transactions
- Efficiency-first: Minimize clicks, maximize productivity
- Role-appropriate experiences: Each portal tailored to specific user needs

---

## Core Design Elements

### A. Color Palette

**Primary Brand Colors**:
- Primary: `258 85% 45%` (Deep teal - trust, professionalism, technology)
- Primary Hover: `258 85% 38%`
- Secondary: `258 20% 95%` (Light teal for backgrounds)

**Role Identification** (Subtle accents in respective dashboards):
- Admin: `15 80% 50%` (Orange-red for authority)
- Screen Owner: `142 70% 45%` (Green for earnings/success)
- Advertiser: `258 85% 55%` (Bright teal for campaigns)

**Functional Colors**:
- Success: `142 70% 45%`
- Warning: `38 92% 50%`
- Error: `0 72% 51%`
- Info: `199 89% 48%`

**Neutrals** (Dark Mode Primary):
- Background: `240 10% 8%`
- Surface: `240 8% 12%`
- Surface Elevated: `240 7% 16%`
- Border: `240 6% 22%`
- Text Primary: `240 5% 96%`
- Text Secondary: `240 4% 65%`
- Text Tertiary: `240 3% 45%`

**Light Mode** (Alternative for public pages):
- Background: `0 0% 100%`
- Surface: `240 10% 98%`
- Text Primary: `240 10% 10%`

---

### B. Typography

**Font Families**:
- Primary: 'Inter' (UI, body, data)
- Display: 'Space Grotesk' (headings, marketing pages)
- Mono: 'JetBrains Mono' (codes, technical data)

**Type Scale**:
- Hero: 3.5rem / 4rem line-height, weight 700 (marketing)
- H1: 2.25rem / 2.75rem, weight 600 (page titles)
- H2: 1.75rem / 2.25rem, weight 600 (section headers)
- H3: 1.25rem / 1.75rem, weight 600 (card headers)
- Body: 0.938rem / 1.5rem, weight 400 (default text)
- Small: 0.813rem / 1.25rem, weight 400 (labels, captions)
- Tiny: 0.75rem / 1rem, weight 500 (metadata, badges)

---

### C. Layout System

**Spacing Primitives**: Tailwind units of 1, 2, 4, 6, 8, 12, 16, 24 (focused set for consistency)

**Grid System**:
- Container max-width: `max-w-7xl` (dashboards), `max-w-6xl` (forms)
- Dashboard grids: 12-column on desktop, stack on mobile
- Card grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Gutter spacing: `gap-6` (standard), `gap-4` (compact lists)

**Component Spacing**:
- Section padding: `py-12 px-6` (mobile), `py-16 px-8` (desktop)
- Card padding: `p-6`
- Input padding: `px-4 py-2.5`
- Button padding: `px-6 py-2.5`

---

### D. Component Library

**Navigation**:
- Top bar: Sticky navigation with role indicator, user menu, notifications
- Sidebar: Collapsible on mobile, persistent on desktop (w-64), icon+label navigation
- Breadcrumbs: For deep navigation paths in admin/owner portals

**Data Display**:
- Tables: Striped rows, sticky headers, sortable columns, row hover states
- Cards: Elevated surface (`shadow-lg`), rounded corners (`rounded-xl`), hover lift effect
- Stats: Large numbers with context, trend indicators (↑↓), sparkline charts
- Maps: Full-width Mapbox integration, floating filter panel, cluster markers

**Forms**:
- Input fields: Dark backgrounds, 1px borders, focus rings (primary color)
- Select dropdowns: Custom styled with chevron icons
- Date pickers: Calendar overlay with range selection
- File uploads: Drag-drop zones with preview thumbnails
- Multi-step wizards: Progress indicators, back/next navigation

**Overlays**:
- Modals: Center-screen, max-w-2xl, backdrop blur
- Drawers: Slide from right, full-height, for filters/details
- Toasts: Top-right notifications, auto-dismiss, icon+message

**Buttons**:
- Primary: Filled with primary color, white text
- Secondary: Outlined with border, transparent background
- Ghost: No border, hover background only
- Sizes: sm (py-1.5 px-3), md (py-2.5 px-6), lg (py-3 px-8)

---

### E. Key Features Design

**Map-Based Discovery** (Advertiser Hero):
- Full-screen map (Mapbox) with left filter sidebar (w-96, collapsible)
- Screen markers: Custom pins with pricing tooltip on hover
- Selected screen: Highlighted with slide-out detail card
- Filters: City, pincode, price range, screen type, size, availability dates

**Dashboard Layouts**:
- Admin: KPI cards (4-column grid) → Recent activity table → Charts (2-column)
- Screen Owner: Earnings summary → Screen performance grid → Booking requests
- Advertiser: Active campaigns (kanban) → Budget tracking → Screen map preview

**Campaign Builder Wizard**:
- 5 steps: Objective → Screens (map) → Duration → Creative Upload → Review
- Progress bar at top, step validation before proceeding
- Screen selection: Multi-select from map with cart summary

**Screen Management** (Owner):
- Gallery view: Image cards with edit/delete actions
- Form sections: Basic info, location (map picker), pricing, availability calendar, media uploads
- Availability calendar: Month view with date range selection, blocked dates

---

## Images

**Map Markers**: Custom SVG pins with PixelSpot logo, color-coded by screen availability
**Screen Images**: Required uploads (16:9 ratio), shown in cards and detail views
**Campaign Creatives**: Preview thumbnails in campaign cards and booking confirmations
**Dashboard Empty States**: Illustrations for "No screens added", "No campaigns yet"
**Hero Section** (Public Landing): Large background image of digital billboard in urban setting (Mumbai/Delhi cityscape), overlay gradient from bottom

---

## Animations

**Minimal & Purposeful**:
- Page transitions: Fade in/out (200ms)
- Card hovers: Subtle lift with shadow (`transition-shadow duration-200`)
- Map markers: Bounce on click (300ms)
- Loading states: Skeleton screens (shimmer effect)
- Notifications: Slide in from top-right (300ms ease-out)

**No**: Auto-playing carousels, parallax scrolling, animated gradients

---

## Platform-Specific Notes

**Role Differentiation**:
- Top bar background colors vary subtly by role (admin: darker, owner: neutral, advertiser: primary tint)
- Dashboard widgets have role-specific accent colors
- Navigation icons match role color scheme

**Responsive Priorities**:
- Mobile: Stack all grids, collapsible sidebar to hamburger menu, map takes 60vh on mobile
- Tablet: 2-column layouts, persistent sidebar with icons only
- Desktop: Full multi-column dashboards, persistent labeled sidebar

**Trust Elements**:
- Display payment security badges (Stripe verified)
- Show screen owner verification status
- Include booking protection messaging
- Use professional photography for public pages