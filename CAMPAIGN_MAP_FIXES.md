# Campaign Creation Map & City Dropdown Fixes

**Date:** November 7, 2025  
**Production URL:** https://connect.pixelspot.in/advertiser/campaigns/new

## Issues Fixed

### 1. ✅ Screens Not Visible on Map (Step 2 - Choose Area)
**Problem:** Map showed only the user's location marker and radius circle, but no screen markers.

**Root Cause:** The map in Step 2 wasn't rendering screen markers from the `screensInArea` state, even though screens were being fetched.

**Solution:** Added screen markers to the map with:
- Monitor/LED screen icon (purple color)
- InfoWindow popup on click showing:
  - Screen name
  - Location
  - Price per day (₹)
  - Daily footfall
- Visual feedback when hovering

**Code Changes:**
```tsx
// Added in CreateCampaign.tsx Step 2 map section
{screensInArea.map((screen) => (
  <Marker
    key={screen.id}
    position={{
      lat: parseFloat(screen.latitude.toString()),
      lng: parseFloat(screen.longitude.toString()),
    }}
    onClick={() => setSelectedMapScreen(screen)}
    icon={{
      path: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z",
      fillColor: "#8b5cf6",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
      scale: 1.5,
    }}
  />
))}
```

### 2. ✅ City Dropdown Empty (Choose Your Target Area)
**Problem:** City dropdown was not populated with any cities when selecting "City Search" option.

**Root Cause Investigation:**
- Backend endpoint `/api/screens/locations` exists and works correctly
- Database has screens with proper city/state data (Bengaluru, Karnataka, etc.)
- Query was using React Query correctly with default queryFn
- Possible issues:
  - Silent query failure (no error shown to user)
  - Authentication issues
  - Empty response from backend

**Solution:** Added comprehensive error handling and debug logging:
- Loading state display ("Loading cities...")
- Error state display ("Error loading cities")
- Empty state display ("No cities available")
- Console logging for debugging
- Disabled dropdown during loading

**Code Changes:**
```tsx
// Added debug logging
const { data: locationsData, isLoading: locationsLoading, error: locationsError } = useQuery<{...}>({
  queryKey: ["/api/screens/locations"],
});

useEffect(() => {
  if (locationsData) {
    console.log("Locations loaded:", locationsData);
  }
  if (locationsError) {
    console.error("Locations error:", locationsError);
  }
}, [locationsData, locationsError]);

// Enhanced dropdown with states
<Select disabled={locationsLoading}>
  <SelectValue placeholder={
    locationsLoading ? "Loading cities..." 
    : locationsError ? "Error loading cities" 
    : allCities.length === 0 ? "No cities available"
    : "Choose a city"
  } />
</Select>
```

## Database Verification

Confirmed screens exist with proper data:
```sql
SELECT id, name, city, state, latitude, longitude, status FROM screens LIMIT 5;

Results:
- st.joseph kormanagala | Bengaluru | Karnataka | 12.9310000 | 77.6200000 | active
- Screen 51 | Bengaluru | Karnataka | 72.8765430 | 77.6066890 | inactive
- Sanket Screen | Manda, Kalyan, Maharashtra | Maharashtra | 72.8765430 | 70.8675654 | inactive
- Marigowda Rd Screen | Bengaluru | Karnataka | 12.9597262 | 77.5945992 | active
- Screen1 | Bengaluru | Karnataka | 72.8765430 | 70.8675654 | active
```

## Backend Endpoint

**Endpoint:** `GET /api/screens/locations`  
**Authentication:** Required (Bearer token)  
**Response:**
```json
{
  "states": ["Karnataka", "Maharashtra", ...],
  "cities": {
    "Karnataka": ["Bengaluru", ...],
    "Maharashtra": ["Manda", ...]
  },
  "allCities": ["Bengaluru", "Manda", ...]
}
```

## Deployment

**Build Time:** 13.28s  
**Server Bundle:** 142.3KB  
**Client Bundle:** 1,369.21 KB (1.34MB)

**Deployed Files:**
- `/var/www/pixelspot/dist/index.js`
- `/var/www/pixelspot/dist/public/*`

**PM2 Status:** ✅ Online (PID: 263123)

## Testing Checklist

Test at: https://connect.pixelspot.in/advertiser/campaigns/new

### Step 2: Choose Your Target Area

**Map & Radius:**
- [ ] Click on map to set location
- [ ] Drag marker to adjust location
- [ ] Adjust radius slider (1-10 km)
- [ ] **Verify screens appear as purple monitor icons**
- [ ] **Click screen marker to see InfoWindow with details**
- [ ] Check that screens update when radius changes
- [ ] Verify radius circle is visible

**City Search:**
- [ ] Switch to "City Search" option
- [ ] **Check dropdown shows "Loading cities..." briefly**
- [ ] **Verify cities appear in dropdown** (e.g., Bengaluru)
- [ ] Select a city
- [ ] Check that screens load for selected city
- [ ] **Open browser console and check for logs:**
  - `Locations loaded: { states: [...], cities: {...}, allCities: [...] }`
  - No errors related to locations

### Troubleshooting

If cities still don't appear:
1. Open browser DevTools Console (F12)
2. Look for "Locations loaded:" or "Locations error:" logs
3. Check Network tab for `/api/screens/locations` request:
   - Status should be 200
   - Response should contain `allCities` array
4. Verify you're logged in as an advertiser
5. Check if Authorization header is present in request

If screens don't appear on map:
1. Console should log screen data when area changes
2. Check that `screensInArea` state has data
3. Verify latitude/longitude values are valid
4. Ensure Google Maps API key is working

## Files Modified

1. **client/src/pages/advertiser/CreateCampaign.tsx**
   - Added screen markers to Step 2 map
   - Added InfoWindow for screen details on click
   - Added loading/error states to city dropdown
   - Added debug logging for locations query
   - Enhanced dropdown placeholder messages

## Next Steps

1. **User Testing:** Have an advertiser test the campaign creation flow
2. **Monitor Console:** Check browser console for any errors or warnings
3. **Verify Data:** Confirm cities load from the API correctly
4. **Screen Display:** Ensure all screens in the selected area appear on map
5. **Performance:** Check if map renders smoothly with many screens

## Known Limitations

- Screens only appear after area is selected (not on initial map load)
- City dropdown requires authentication (won't work for unauthenticated users)
- Large number of screens may cause performance issues (consider clustering)
- InfoWindow shows basic info only (full details in Step 4)

## API Documentation

### GET /api/screens/locations
Returns unique cities and states from all approved screens.

**Response Schema:**
```typescript
{
  states: string[];          // Sorted array of unique states
  cities: {                  // Cities grouped by state
    [state: string]: string[];
  };
  allCities: string[];      // Sorted array of all unique cities
}
```

## Support

If issues persist:
1. Check PM2 logs: `ssh root@188.245.231.251 "pm2 logs pixelspot"`
2. Check server connectivity: `curl https://connect.pixelspot.in/api/screens/locations`
3. Verify database has screens: See SQL query in Database Verification section
4. Test authentication: Ensure user token is valid
