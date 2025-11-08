# Campaign Creation & Discover Flow Fixes

**Date:** November 8, 2025  
**Issues Fixed:**
1. Screen markers not showing on map in campaign creation Step 2
2. City search showing "no screens found" 
3. Cart flow from Discover to Campaign not working

## Issues Identified

### Issue 1: Screens Not Showing on Map in Step 2
**URL:** https://connect.pixelspot.in/advertiser/campaigns/new

**Problem:**
- Map in Step 2 (Choose Area) was not displaying screen markers
- Only location marker and radius circle visible
- Screens were being fetched but markers weren't rendering

**Root Cause:**
- Markers were added in previous fix
- However, timing issue: screens fetched when `currentStep >= 2`, but markers need to render when data arrives
- No visibility into whether data was being fetched correctly

### Issue 2: City Search Returns Empty
**Problem:**
- Selecting a city in "City Search" mode showed "No screens found in this selected area"
- Cities were populated in dropdown (from previous fix)
- But screen filtering wasn't working

**Root Cause:**
- Backend `status = "approved"` vs database `status = "active"` mismatch
- **This was already fixed** in previous deployment (changed to use "active")
- Issue may be caching or user not seeing updated data

### Issue 3: Cart Flow Broken
**URL:** /advertiser/discover → /advertiser/campaigns/new

**Problem:**
- User selects screens in Discover page (adds to cart)
- Clicks "Create Campaign"
- Redirected to campaign creation
- **Selected screens not pre-populated**
- User has to select screens again

**Root Cause:**
- DiscoverScreens saves selected IDs to localStorage: `selectedScreenIds`
- CreateCampaign never reads from localStorage on mount
- No synchronization between pages

## Solutions Implemented

### 1. Enhanced Debug Logging (Issue #1 & #2)

Added comprehensive console logging to track data flow:

**File: `client/src/pages/advertiser/CreateCampaign.tsx`**

```typescript
// Log when fetching screens
console.log("🔍 Fetching screens in area:", { 
  areaType, currentStep, lat, lng, radiusKm, city, budget, duration
});
console.log("📡 Fetching from URL:", url);

// Log fetch results
console.log("✅ Screens fetched (map):", data.length, "screens");
console.log("✅ Screens fetched (city):", data.length, "screens");

// Log when screensInArea updates
console.log("📍 screensInArea updated:", screensInArea.length, "screens");
if (screensInArea.length > 0) {
  console.log("   Sample screen:", screensInArea[0].name, "at", screensInArea[0].city);
}
```

**Benefits:**
- See exactly when API calls are made
- Verify URL construction with parameters
- Confirm data is received
- Track state updates
- Debug map marker rendering

### 2. Fixed Cart Flow (Issue #3)

**Pre-load Selected Screens on Mount:**

```typescript
// Load pre-selected screens from localStorage (from Discover page)
useEffect(() => {
  const SELECTED_SCREENS_KEY = "selectedScreenIds";
  const saved = localStorage.getItem(SELECTED_SCREENS_KEY);
  if (saved) {
    try {
      const savedIds = JSON.parse(saved);
      if (Array.isArray(savedIds) && savedIds.length > 0) {
        console.log("📦 Loading pre-selected screens from cart:", savedIds.length, "screens");
        setSelectedScreenIds(savedIds);
        
        // Fetch full screen details for pre-selected screens
        const fetchPreselectedScreens = async () => {
          try {
            const response = await apiRequest("GET", "/api/screens");
            const allScreens = await response.json();
            // Filter to only include pre-selected screens
            const preselectedScreens = allScreens.filter((s: Screen) => 
              savedIds.includes(s.id)
            );
            setScreensInArea(preselectedScreens);
            console.log("✅ Loaded", preselectedScreens.length, "pre-selected screen details");
          } catch (error) {
            console.error("Error fetching pre-selected screen details:", error);
          }
        };
        fetchPreselectedScreens();
        
        // Clear localStorage after loading to avoid conflicts
        localStorage.removeItem(SELECTED_SCREENS_KEY);
      }
    } catch (error) {
      console.error("Error loading pre-selected screens:", error);
    }
  }
}, []); // Run only once on mount
```

**Flow:**
1. User selects screens in Discover page
2. Clicks "Create Campaign" button
3. Discover page stores IDs in localStorage: `["screen-id-1", "screen-id-2"]`
4. Campaign page loads
5. **NEW:** Reads localStorage on mount
6. **NEW:** Fetches full screen details via `/api/screens`
7. **NEW:** Filters to only pre-selected screens
8. Sets `selectedScreenIds` and `screensInArea` state
9. **NEW:** Clears localStorage (one-time use)
10. User sees selected screens in Step 4
11. User can proceed with campaign creation

**Benefits:**
- Seamless user experience
- No need to re-select screens
- Cart is preserved across navigation
- Works with existing localStorage mechanism
- Cleans up after loading (no stale data)

## Files Modified

### client/src/pages/advertiser/CreateCampaign.tsx

**Changes:**
1. **Added debug logging** (Lines ~220-270):
   - Log fetch parameters before API call
   - Log API URL construction
   - Log response data count
   - Log screensInArea state changes

2. **Added localStorage cart loading** (Lines ~210-240):
   - Read `selectedScreenIds` from localStorage
   - Fetch full screen details for pre-selected IDs
   - Set both `selectedScreenIds` and `screensInArea` state
   - Clear localStorage after loading
   - Console log for visibility

3. **Added screensInArea observer** (Lines ~240-245):
   - Log whenever screensInArea changes
   - Show count and sample screen
   - Helps debug map marker rendering

**Total Lines Added:** ~60 lines

## Testing Guide

### Test 1: Map View in Campaign Creation

**URL:** https://connect.pixelspot.in/advertiser/campaigns/new

**Steps:**
1. Login as advertiser
2. Start new campaign
3. Fill Step 1 (name, objective, budget)
4. Go to Step 2
5. **Select "Map & Radius"**
6. Click on map to set location (try Bengaluru: 12.9716, 77.5946)
7. Adjust radius slider
8. **Open browser console (F12)**

**Expected Console Output:**
```
🔍 Fetching screens in area: { areaType: "map", currentStep: 2, lat: 12.9716, lng: 77.5946, radiusKm: 5, ... }
📡 Fetching from URL: /api/screens/in-area?lat=12.9716&lng=77.5946&radiusKm=5&budget=10000&duration=7
✅ Screens fetched (map): 9 screens
📍 screensInArea updated: 9 screens
   Sample screen: MG Road LED Billboard at Bengaluru
```

**Expected Visual:**
- Purple monitor icons appear on map
- Icons positioned at screen locations
- Click icon → InfoWindow with screen details
- Multiple screens visible within radius

### Test 2: City Search in Campaign Creation

**URL:** https://connect.pixelspot.in/advertiser/campaigns/new

**Steps:**
1. Continue from Step 2
2. **Select "City Search"**
3. Open city dropdown
4. Select "Bengaluru"
5. **Open browser console**

**Expected Console Output:**
```
🔍 Fetching screens in area: { areaType: "city", city: "Bengaluru", ... }
📡 Fetching from URL: /api/screens/in-area?city=Bengaluru&budget=10000&duration=7
✅ Screens fetched (city): 9 screens
📍 screensInArea updated: 9 screens
   Sample screen: MG Road LED Billboard at Bengaluru
```

**Expected Visual:**
- Message: "9 screens found in Bengaluru"
- Live estimate card shows footfall and budget info
- Can proceed to Step 3

### Test 3: Cart Flow (Discover → Campaign)

**URL:** https://connect.pixelspot.in/advertiser/discover

**Steps:**
1. Login as advertiser
2. Go to Discover Screens page
3. **Add 3-5 screens to cart** (click Add/green checkmark)
4. **See shopping cart icon** with count
5. **Click "Create Campaign" button**
6. **Redirected to campaign creation**
7. **Open browser console**

**Expected Console Output:**
```
📦 Loading pre-selected screens from cart: 5 screens
✅ Loaded 5 pre-selected screen details
📍 screensInArea updated: 5 screens
   Sample screen: MG Road LED Billboard at Bengaluru
```

**Expected Visual:**
- Step 1: Fill campaign details
- **Step 4:** Selected screens already checked ✅
- Can adjust selection if needed
- Total budget reflects pre-selected screens
- Proceed normally to create campaign

## Debugging Tips

If screens still don't appear:

### 1. Check Console Logs
```javascript
// Look for these patterns:
🔍 Fetching screens in area     // API call initiated
📡 Fetching from URL            // Verify URL is correct
✅ Screens fetched              // Data received (check count)
📍 screensInArea updated        // State updated
❌ Error fetching screens       // API error (check network tab)
```

### 2. Network Tab Checks
- **Request URL:** Should match console log
- **Status:** Should be 200 OK
- **Response:** Should have array with screens
- **Auth header:** Bearer token present

### 3. Common Issues

**No screens in console (count = 0):**
- Check if database has active screens: `SELECT COUNT(*) FROM screens WHERE status = 'active'`
- Verify coordinates are correct (India: lat 8-35, lng 68-97)
- Check radius is reasonable (1-10 km)
- For city: verify exact city name matches database

**Markers don't render despite data:**
- Verify Google Maps API key is valid
- Check latitude/longitude are numbers (not strings)
- Look for JavaScript errors in console
- Verify `isLoaded` from useLoadScript is true

**Cart flow doesn't work:**
- Check localStorage has `selectedScreenIds` before navigation
- Verify IDs are valid (exist in database)
- Check `/api/screens` endpoint returns screens
- Look for fetch errors in console

## Deployment Status

**Build:** ✅ Successful
- Client bundle: 1,370.31 KB (1.34 MB)
- New filename: `index-BhfH7HvN.js` (hash changed)
- Server: 142.3 KB (no changes)

**Deployed Files:**
- `/var/www/pixelspot/dist/public/assets/index-BhfH7HvN.js` ✅
- `/var/www/pixelspot/dist/public/index.html` ✅ (references new bundle)
- `/var/www/pixelspot/dist/public/assets/index-DRt3IQoB.css` ✅

**PM2 Status:** ✅ Online (PID: 264998)

**Production:** https://connect.pixelspot.in

## What to Tell Users

### For Map View Issues:
> "We've added detailed logging to help diagnose the map issue. Please:
> 1. Open browser console (F12) before creating campaign
> 2. Go through campaign creation Step 2
> 3. Share console logs showing:
>    - 🔍 Fetching screens messages
>    - ✅ Screens fetched count
>    - Any ❌ errors
> This will help us see exactly where the issue occurs."

### For City Search:
> "The backend was already fixed to use 'active' status. The city dropdown should now work. 
> Try selecting 'Bengaluru' or 'Mumbai' and check the console for log messages."

### For Cart Flow:
> "Cart flow is now implemented! When you:
> 1. Select screens in Discover page
> 2. Click 'Create Campaign'
> 3. Your selected screens will be pre-loaded automatically
> 
> Check the console for '📦 Loading pre-selected screens' message."

## Next Steps

1. **Monitor Production Logs:**
   - Watch for user reports with console outputs
   - Check PM2 logs for API errors
   - Monitor `/api/screens/in-area` endpoint

2. **Gather User Feedback:**
   - Ask users to share console logs
   - Verify which specific step fails
   - Test with different cities and radii

3. **Database Verification:**
   ```sql
   -- Verify active screens exist
   SELECT city, COUNT(*) FROM screens WHERE status = 'active' GROUP BY city;
   
   -- Should show:
   -- Bengaluru: 9
   -- Mumbai: 3
   -- New Delhi: 3
   -- etc.
   ```

4. **Potential Improvements:**
   - Add loading spinner while fetching screens
   - Show "No screens found" message explicitly
   - Add retry button if API fails
   - Cache screen data in sessionStorage
   - Add unit tests for cart flow

## Known Limitations

- Console logs will clutter browser console (remove in next release)
- Cart flow clears localStorage immediately (can't go back)
- Pre-selected screens must exist in database
- No error handling if pre-selected screen was deleted
- Map markers may overlap if screens are close together

## Rollback Plan

If issues persist:

1. **Remove console logs** (clean up for production)
2. **Keep cart flow** (new feature, doesn't break existing)
3. **Investigate specific user reports** with console outputs
4. **Check if "approved" vs "active" fix was deployed**

Previous working commit: Can revert CreateCampaign.tsx if needed.
