# Deployment Ready - Map Image Fixes & Owner Bookings

## Changes Made

### 1. **Added Screen Images to Map InfoWindows** ✅
**Files Modified:**
- `client/src/pages/advertiser/CreateCampaign.tsx`
  - Step 2 InfoWindow (line ~924): Added image display with fallback
  - Step 4 InfoWindow (line ~1788): Added image display with fallback

**What Changed:**
- Both maps now show screen images in popups (like DiscoverScreens)
- Large image preview (h-48, ~192px)
- Fallback to placeholder if image missing
- Shows screen type badge, size, footfall, price
- Matches the professional InfoWindow design from DiscoverScreens

**Why:**
- User reported: "over map popup it must show the images added along with the screen"
- Creates consistent experience across all map views
- Better visual representation of screens

---

### 2. **Fixed Owner Bookings API** ✅
**Files Modified:**
- `server/storage.ts` (line 233-256)

**What Changed:**
```typescript
// BEFORE: Only fetched "pending_owner" bookings (0 results)
const bookingsList = await db.select().from(bookings).where(
  and(
    eq(bookings.status, "pending_owner"),
    or(...screenIds.map(id => eq(bookings.screenId, id)))
  )
);

// AFTER: Fetch ALL bookings for owner's screens
const bookingsList = await db.select().from(bookings).where(
  or(...screenIds.map(id => eq(bookings.screenId, id)))
).orderBy(desc(bookings.createdAt));
```

**Why:**
- Owner booking page was empty (0/0/0 tabs)
- Database has 9 bookings: 6 approved, 3 rejected
- Frontend filters bookings locally into tabs
- Backend was only returning "pending_owner" (which is 0)

**Expected Result After Deploy:**
- Pending tab: 0 bookings
- Approved tab: 6 bookings  
- Rejected tab: 3 bookings

---

## Build Status ✅

**Client:** Built successfully
- Bundle: `dist/public/assets/index-BtfnZvyC.js` (1.37MB)
- CSS: `dist/public/assets/index-DRt3IQoB.css` (91.5KB)

**Server:** Built successfully
- Bundle: `dist/index.js` (142.2KB)
- Includes owner bookings fix

---

## Deployment Commands

### Deploy Client (Map Image Fixes)
```bash
scp -r dist/public/* root@188.245.231.251:/var/www/pixelspot/dist/public/
```

### Deploy Server (Owner Bookings Fix)
```bash
scp dist/index.js root@188.245.231.251:/var/www/pixelspot/dist/
```

### Restart PM2
```bash
ssh root@188.245.231.251 "pm2 restart pixelspot && pm2 logs pixelspot --lines 20"
```

---

## Testing Checklist

### Map Images ✓
1. Go to https://connect.pixelspot.in/advertiser/campaigns/new
2. Step 2 - Choose Your Target Area:
   - Select any city with screens (e.g., Bengaluru, Mumbai)
   - Markers should appear on map
   - Click any marker → InfoWindow should show:
     - ✅ Screen image (or placeholder)
     - ✅ Screen type badge
     - ✅ Screen name + location
     - ✅ Size and footfall stats
     - ✅ Price per day
3. Step 4 - Customize Plan (if using map view):
   - Same InfoWindow design should appear

### Owner Bookings ✓
1. Go to https://connect.pixelspot.in/owner/requests
2. Should see:
   - Pending tab: 0 bookings
   - Approved tab: 6 bookings (with campaign details)
   - Rejected tab: 3 bookings (with rejection reason)
3. No longer shows empty 0/0/0

---

## Database Verification (Already Done)

```sql
-- Booking status counts
SELECT status, COUNT(*) FROM bookings GROUP BY status;
--  approved |     6
--  rejected |     3

-- Active screens count  
SELECT COUNT(*) FROM screens WHERE status = 'active';
-- 27 screens active

-- Screen locations
SELECT city, COUNT(*) as count 
FROM screens 
WHERE status = 'active' 
GROUP BY city 
ORDER BY count DESC;
-- Bengaluru: 9
-- Mumbai: 3
-- Delhi: 3
-- Hyderabad: 2
-- Chennai: 2
-- Kolkata: 2
-- Pune: 2
-- Ahmedabad: 2
```

---

## Architecture Notes

### Map Components Usage:
- **PublicHome.tsx**: Uses LoadScript + GoogleMap (simple markers)
- **DiscoverScreens.tsx**: Uses useLoadScript + GoogleMap (advanced InfoWindow with images)
- **CreateCampaign.tsx**: Uses useLoadScript + GoogleMap (NOW has images in InfoWindow)

All three share the same Google Maps API key: `VITE_GOOGLE_MAPS_API_KEY`

### InfoWindow Design Pattern:
- Width: 320px
- Image height: 192px (h-48)
- Fallback: MapPin icon on gray background
- Type badge: Top-right corner
- Price display: Teal color (#0d9488)
- Stats: Pills with borders

---

## Next Steps

1. **Deploy to Production** (requires SSH password)
   - Upload client bundle
   - Upload server bundle
   - Restart PM2

2. **Verify on Production**
   - Test campaign creation map
   - Test owner bookings page
   - Check PM2 logs for errors

3. **Optional Cleanup** (future)
   - Remove debug console logs from CreateCampaign
   - Consider extracting InfoWindow into reusable component
   - Add lazy loading for map images

---

## Commit Message Suggestion

```
feat: Add screen images to map popups + fix owner bookings

- Display screen images in InfoWindow across all map views
- Match professional popup design from DiscoverScreens
- Fix owner bookings API to fetch ALL bookings (not just pending)
- Owner page now shows 6 approved + 3 rejected bookings
- Build: index-BtfnZvyC.js (client), 142.2KB (server)
```
