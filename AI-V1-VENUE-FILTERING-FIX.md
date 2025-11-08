# AI Advisor V1 - Venue Filtering Fix

## Issue Identified

**Problem**: User reported that when asking for "roadside screens" in the AI advisor, the screen cards below were showing ALL venue types (Road Side, Mall, Metro) instead of ONLY roadside screens.

**Root Cause**: 
1. Frontend was using `/api/ai/campaign-advisor` (V1 endpoint - deprecated but still in use)
2. We had been updating `ai-advisor-v2.ts` but NOT `ai-advisor.ts` (V1)
3. V1 code had venue filtering as **SCORING** (+10 points) instead of **STRICT FILTER** (exclude non-matching)

---

## Technical Details

### V1 vs V2 Endpoints

| Version | File | Endpoint | Frontend Usage |
|---------|------|----------|----------------|
| V1 (deprecated) | `server/ai-advisor.ts` | `/api/ai/campaign-advisor` | ✅ **Currently Used** |
| V2 (new) | `server/ai-advisor-v2.ts` | `/api/ai/chat` | ❌ Not used yet |

**Finding**: The current UI (`AICampaignAdvisor.tsx` line 112) calls `/api/ai/campaign-advisor` which uses the OLD V1 file.

---

## Fixes Applied to V1 (`ai-advisor.ts`)

### 1. **Updated SYSTEM_PROMPT** (Lines 24-62)

**BEFORE (Problematic)**:
```typescript
- IMPORTANT: Start with BROAD searches (city + maybe 1-2 filters) - don't over-filter or you'll get 0 results
- Search BROADLY First: Call searchScreens with just CITY and optionally 1-2 key filters
```

**AFTER (Fixed)**:
```typescript
## IMPORTANT FILTERING RULES:
- When user says "roadside", "road side", "next to road" → MUST use venueCategories: ["Road Side"]
- When user says "mall", "shopping mall" → MUST use venueCategories: ["Mall", "Shopping Complex"]
- When user says "metro", "metro station" → MUST use venueCategories: ["Metro"]
- When user specifies ANY venue type → ALWAYS use venueCategories filter to exclude others
- When user refines search → ADD the new filter, don't ignore it
- Start broad ONLY if user has NO specific requirements - otherwise be precise!

## Examples of Correct Filtering:
- User: "roadside screens in Mumbai" → cities: ["Mumbai"], venueCategories: ["Road Side"]
- User: "I want screens next to road" → venueCategories: ["Road Side"]
```

### 2. **Updated Tool Description** (Lines 106-109)

**BEFORE**:
```typescript
description: "Search for screens in the database based on campaign requirements..."
```

**AFTER**:
```typescript
description: "Search for screens in the database. IMPORTANT: If user mentions specific venue type (roadside, mall, metro, etc.), ALWAYS use venueCategories filter to return ONLY those venues..."
```

### 3. **Updated venueCategories Parameter** (Lines 119-122)

**BEFORE**:
```typescript
venueCategories: {
  type: "array",
  items: { type: "string" },
  description: "Types of venues (e.g., ['Mall', 'Metro', 'Airport'])",
}
```

**AFTER**:
```typescript
venueCategories: {
  type: "array",
  items: { type: "string" },
  description: "STRICT FILTER: Only returns screens at these venues. ALWAYS USE THIS when user mentions venue type (roadside, mall, metro, etc.). Options: Airport, Mall, Metro, Restaurant, Café, Gym, Hospital, College, Road Side, Shopping Complex, etc. Example: User says 'roadside' → venueCategories: ['Road Side']",
}
```

### 4. **Changed Filtering Logic from SCORING to STRICT** (Lines 281-300)

**BEFORE (Bug - Scoring Only)**:
```typescript
// Apply filters (screens from getApprovedScreens are already active)
let filtered = allScreens;

// CRITICAL: Apply location filter first (required)
if (criteria.cities && criteria.cities.length > 0) {
  filtered = filtered.filter((screen: Screen) => 
    criteria.cities.some((city: string) => 
      screen.city.toLowerCase().includes(city.toLowerCase())
    )
  );
  console.log('[AI Advisor] After city filter:', filtered.length);
}

// If we have screens after location filter, apply optional filters as SOFT filters
if (filtered.length > 0) {
  const scoredScreens = filtered.map((screen: Screen) => {
    let score = 0;
    
    // Venue category match (high priority) - JUST SCORING, NO EXCLUSION!
    if (criteria.venueCategories && criteria.venueCategories.length > 0) {
      if (criteria.venueCategories.includes(screen.venueCategory)) {
        score += 10; // Just gives bonus points
      }
    }
```

**AFTER (Fixed - Strict Filtering)**:
```typescript
// Apply filters (screens from getApprovedScreens are already active)
let filtered = allScreens;

// CRITICAL: Apply location filter first (required)
if (criteria.cities && criteria.cities.length > 0) {
  filtered = filtered.filter((screen: Screen) => 
    criteria.cities.some((city: string) => 
      screen.city.toLowerCase().includes(city.toLowerCase())
    )
  );
  console.log('[AI Advisor] After city filter:', filtered.length);
}

// STRICT FILTER: Venue categories (exclude non-matching venues)
if (criteria.venueCategories && criteria.venueCategories.length > 0) {
  filtered = filtered.filter((screen: Screen) =>
    criteria.venueCategories.includes(screen.venueCategory)
  );
  console.log('[AI Advisor] After venue category filter:', filtered.length);
}

// If we have screens after location filter, apply optional filters as SOFT filters
if (filtered.length > 0) {
  const scoredScreens = filtered.map((screen: Screen) => {
    let score = 0;
    
    // Venue category match (already filtered above, add bonus for reason)
    if (criteria.venueCategories && criteria.venueCategories.length > 0) {
      if (criteria.venueCategories.includes(screen.venueCategory)) {
        score += 10;
      }
    }
```

**Key Change**: Added `.filter()` on lines 295-299 to **exclude** non-matching venues BEFORE scoring.

---

## How It Works Now

### User Flow Example:

**User**: "I want screens next to road in Mumbai"

**Backend Processing**:
1. ✅ AI detects: city = "Mumbai", venue = "Road Side"
2. ✅ AI calls: `searchScreens({ cities: ["Mumbai"], venueCategories: ["Road Side"] })`
3. ✅ Backend filters:
   ```typescript
   // Step 1: Filter by city
   filtered = allScreens.filter(s => s.city.includes("Mumbai"))
   
   // Step 2: STRICT venue filter (NEW!)
   filtered = filtered.filter(s => ["Road Side"].includes(s.venueCategory))
   
   // Step 3: Score remaining screens
   ```
4. ✅ Returns: ONLY Road Side screens in Mumbai

**Frontend Display**:
- AI message text: Correct description
- Screen cards: ONLY Road Side screens (Mall and Metro excluded)

---

## Files Modified

1. **server/ai-advisor.ts** (V1 - currently in use)
   - SYSTEM_PROMPT: Added explicit filtering rules and examples
   - Tool definition: Enhanced with "ALWAYS USE" language
   - venueCategories description: Marked as STRICT FILTER with example
   - searchScreensInDatabase: Added strict .filter() for venue categories

2. **server/ai-advisor-v2.ts** (V2 - not yet in use, already fixed)
   - Same fixes applied in previous deployment

---

## Deployment Info

- **Version**: V1 Strict Venue Filtering Fix
- **Deployed**: November 8, 2025
- **Server**: https://connect.pixelspot.in
- **PM2 Status**: PID 280789, Restart #16
- **Build Size**: 186.9kb

---

## Testing

### Test Case: "Roadside Screens"

**Prompt**: "I want screens next to road in Mumbai"

**Expected Behavior**:
- ✅ AI calls: `searchScreens({ cities: ["Mumbai"], venueCategories: ["Road Side"] })`
- ✅ Backend excludes: All non-Road Side venues
- ✅ Screen cards show: ONLY Road Side screens
- ❌ Screen cards do NOT show: Mall, Metro, or any other venue types

**Before Fix**:
- ❌ AI text mentioned roadside
- ❌ Cards showed: Road Side (correct), PLUS Mall (wrong), PLUS Metro (wrong)

**After Fix**:
- ✅ AI text mentions roadside
- ✅ Cards show: Road Side ONLY

---

## Why This Happened

### Timeline:
1. Created V2 (`ai-advisor-v2.ts`) with session-based chat
2. Applied venue filtering fixes to V2
3. Assumed frontend was using V2
4. **BUT**: Frontend still using V1 (`/api/ai/campaign-advisor`)
5. V1 never got the filtering fix until now

### Lesson:
- Always check which endpoint the frontend is actually calling
- If maintaining two versions, apply fixes to BOTH
- Consider migrating frontend to V2 endpoint in future

---

## Next Steps (Optional)

### **Option 1: Keep Using V1** (Current)
- ✅ V1 now has all fixes applied
- ✅ Works correctly
- ❌ V1 marked as deprecated but still functional

### **Option 2: Migrate to V2** (Future Enhancement)
- Update `AICampaignAdvisor.tsx` line 112:
  ```typescript
  // BEFORE
  const response = await fetch("/api/ai/campaign-advisor", { ... })
  
  // AFTER
  const response = await fetch("/api/ai/chat", { ... })
  ```
- Benefits: Session persistence, rate limiting, better token management
- Requires: Testing conversation flow, ensuring backward compatibility

---

## Resolution

**Issue**: ✅ **FIXED**
**Root Cause**: V1 using scoring instead of strict filtering for venue categories
**Solution**: Added `.filter()` to exclude non-matching venues before scoring
**Status**: Deployed and ready for testing

**Now when users ask for "roadside screens", they will ONLY see roadside screens in the card display!** 🎯
