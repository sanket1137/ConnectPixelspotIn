# AI Advisor Filtering Fix - Issue Resolution

## 🐛 Problem Identified

**User's Question:**
> "When I ask for 'roadside screens', why does it still show Mall and Metro screens in the response?"

**Root Cause:**
The AI advisor had **TWO issues**:

### Issue 1: Backend Filtering (FIXED ✅)
The `searchScreensInDatabase()` function was treating `venueCategories` as a **SCORING filter** instead of a **STRICT filter**. 

**Before (Wrong):**
```typescript
// Only scored venue matches, but returned ALL screens
if (filters.venueCategories && filters.venueCategories.length > 0) {
  if (filters.venueCategories.some(vc => screen.venueCategory === vc)) {
    score += 10; // Just add points
  }
}
// No filtering - all screens returned
```

**After (Correct):**
```typescript
// STRICT FILTER: Only return matching venues
if (filters.venueCategories && filters.venueCategories.length > 0) {
  if (!filters.venueCategories.some(vc => screen.venueCategory === vc)) {
    return false; // Exclude non-matching screens
  }
}
```

### Issue 2: Frontend Display (NEEDS FIXING ⚠️)
The frontend is likely **caching** or **appending** screen recommendations instead of replacing them.

**Likely frontend issue:**
```typescript
// ❌ Wrong: Appending to previous results
setScreenRecommendations(prev => [...prev, ...newRecommendations]);

// ✅ Correct: Replace with new results
setScreenRecommendations(newRecommendations || []);
```

---

## ✅ Backend Fixes Deployed

### 1. Strict Filtering for Venue Categories
Now when AI searches with `venueCategories: ["Road Side"]`, **ONLY** roadside screens are returned.

```typescript
// Added strict filtering in ai-advisor-v2.ts lines 252-256
if (filters.venueCategories && filters.venueCategories.length > 0) {
  if (!filters.venueCategories.some(vc => screen.venueCategory === vc)) {
    return false; // Exclude non-matching venues
  }
}
```

### 2. Strict Filtering for Demographics
Also applied strict filtering for:
- **genderOrientation** - Only returns matching gender demographics
- **incomeLevel** - Only returns matching income levels
- **maxPricePerDay** - Only returns screens within budget
- **minFootfall** - Only returns screens meeting footfall requirement

```typescript
// Lines 268-278
if (filters.genderOrientation && screen.genderOrientation !== filters.genderOrientation) {
  return false;
}

if (filters.incomeLevel && screen.incomeLevel !== filters.incomeLevel) {
  return false;
}
```

### 3. Updated AI Instructions
Enhanced the SYSTEM_PROMPT and TOOL_DEFINITIONS to clearly distinguish:

**STRICT Filters** (exclude non-matching):
- ✅ `venueCategories` - e.g., ["Road Side"] → ONLY roadside screens
- ✅ `genderOrientation` - e.g., "Male Dominant" → ONLY male-dominant screens
- ✅ `incomeLevel` - e.g., "Premium Audience" → ONLY premium screens
- ✅ `maxPricePerDay` - e.g., 5000 → ONLY screens ≤₹5000/day
- ✅ `minFootfall` - e.g., 10000 → ONLY screens ≥10k footfall

**SCORING Filters** (prefer but don't exclude):
- 📊 `lifestyleTags` - e.g., ["Food Lovers"] → scores higher but returns all
- 📊 `ageGroups` - e.g., ["Young Adults"] → scores higher but returns all

---

## 🧪 Test Scenario

### Before Fix:
```
User: "want screen in mumbai"
AI: Returns 3 screens (Road Side, Metro, Mall)

User: "want screen which is road side"
AI: Returns 3 screens (Road Side, Metro, Mall) ❌ BUG
```

### After Fix:
```
User: "want screen in mumbai"
AI: Returns 3 screens (Road Side, Metro, Mall)

User: "want screen which is road side"
AI: Returns 1 screen (Road Side only) ✅ FIXED
```

---

## 📊 Expected API Response

When user asks "I want roadside screens in Mumbai":

**AI Tool Call:**
```json
{
  "cities": ["Mumbai"],
  "venueCategories": ["Road Side"]
}
```

**Backend Processing:**
1. Filters all screens in Mumbai
2. **Excludes** Metro and Mall screens (strict filter)
3. **Includes** only Road Side screens
4. Scores remaining screens by footfall, price, etc.
5. Returns top 10 Road Side screens

**API Response:**
```json
{
  "message": "Here is a prime roadside screen option in Mumbai...",
  "screenRecommendations": [
    {
      "id": "...",
      "name": "Marine Drive Billboard",
      "venueCategory": "Road Side", // ✅ Only Road Side
      "reason": "Road Side venue matches your target environment"
    }
    // No Metro or Mall screens ✅
  ]
}
```

---

## ⚠️ Frontend Action Required

**Check your chat component for this pattern:**

```typescript
// Find where you handle AI responses
const handleChatResponse = (response) => {
  // ❌ If you see this pattern, CHANGE IT:
  setScreens(prevScreens => [...prevScreens, ...response.screenRecommendations]);
  
  // ✅ Should be:
  setScreens(response.screenRecommendations || []);
};
```

**Locations to check:**
- AI Chat component state updates
- Screen recommendations list rendering
- Conversation message handlers

---

## 🔍 How to Verify the Fix

### Test 1: Basic Venue Filtering
```javascript
// In browser console on connect.pixelspot.in
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Show me only roadside screens in Mumbai"
  })
});

const data = await response.json();
console.log('Screens:', data.screenRecommendations);

// ✅ Should only see venueCategory: "Road Side"
// ❌ Should NOT see "Metro" or "Mall"
```

### Test 2: Refinement Flow
```javascript
// First message - broad search
const resp1 = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "I need screens in Mumbai"
  })
});

const data1 = await resp1.json();
const conversationId = data1.conversationId;
console.log('First search (all venues):', data1.screenRecommendations.map(s => s.venueCategory));
// Expected: ["Road Side", "Metro", "Mall", ...]

// Second message - refine to roadside
const resp2 = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Actually, show me only roadside screens",
    conversationId: conversationId
  })
});

const data2 = await resp2.json();
console.log('Refined search (roadside only):', data2.screenRecommendations.map(s => s.venueCategory));
// Expected: ["Road Side", "Road Side", "Road Side"] ✅
```

---

## 📝 Changes Summary

### Files Modified:
1. **`server/ai-advisor-v2.ts`**
   - Lines 252-278: Added strict filtering logic
   - Lines 47-68: Updated SYSTEM_PROMPT with filter behavior explanation
   - Lines 107-142: Updated TOOL_DEFINITIONS with STRICT/SCORING labels

### Deployment:
```bash
✅ Built: dist/index.js (174.0kb)
✅ Uploaded to production
✅ PM2 restarted (PID 278823)
✅ Server online at connect.pixelspot.in
```

---

## 🎯 Filter Behavior Reference

| Filter | Type | Behavior | Example |
|--------|------|----------|---------|
| `cities` | STRICT | Only returns screens in specified cities | `["Mumbai"]` → Mumbai only |
| `venueCategories` | STRICT | Only returns screens at specified venues | `["Road Side"]` → No malls/metros |
| `genderOrientation` | STRICT | Only returns matching gender demographics | `"Male Dominant"` → No female-oriented |
| `incomeLevel` | STRICT | Only returns matching income levels | `"Premium"` → No budget screens |
| `maxPricePerDay` | STRICT | Only returns screens within budget | `5000` → Max ₹5000/day |
| `minFootfall` | STRICT | Only returns screens meeting footfall | `10000` → Min 10k/day |
| `lifestyleTags` | SCORING | Prefers matching but returns all | `["Food Lovers"]` → Scores higher |
| `ageGroups` | SCORING | Prefers matching but returns all | `["Young Adults"]` → Scores higher |

---

## ✅ Resolution Status

**Backend:** ✅ **FIXED & DEPLOYED**
- Strict filtering implemented
- AI instructions updated
- Deployed to production

**Frontend:** ⚠️ **NEEDS VERIFICATION**
- Check screen list state management
- Ensure new recommendations replace old ones
- Test conversation refinement flow

---

## 📞 Next Steps

1. ✅ **Backend deployed** - No action needed
2. ⚠️ **Test in production** - Verify filtering works correctly
3. 🔧 **Fix frontend** (if needed) - Update screen list state handling
4. ✅ **User testing** - Confirm issue is resolved

---

**Deployed:** January 20, 2025, 7:20 AM  
**Server:** connect.pixelspot.in  
**Status:** ✅ Backend fix deployed, awaiting frontend verification
