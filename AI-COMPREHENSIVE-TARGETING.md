# AI Advisor - Comprehensive Demographic Targeting

## Overview
The AI Campaign Advisor now utilizes **ALL available screen demographic and targeting data** from the database to provide highly personalized, relevant screen recommendations based on advertiser requirements.

---

## ✅ Complete Filter Coverage

### **Previously Supported (6 filters)**
- ✅ Cities
- ✅ Venue Categories
- ✅ Lifestyle Tags
- ✅ Gender Orientation
- ✅ Income Level
- ✅ Age Groups
- ✅ Price & Footfall

### **Newly Added (11 filters)**
- ✅ **Location Tags** - Nearby facilities (School, Hospital, Mall, Tech Park, etc.)
- ✅ **Custom Location Tags** - User-added tags (Beach View, Heritage Site, etc.)
- ✅ **Interest Segments** - Highly specific targeting (Fitness, Coffee, Tech, Luxury Cars, Fashion, Foodies)
- ✅ **Custom Audience Tags** - Custom targeting (Young Entrepreneurs, Digital Nomads, Pet Owners)
- ✅ **Occupation Mix** - Professional targeting (Students, Working Professionals, Business Owners)
- ✅ **User Intent** - Behavioral targeting (Shopping, Commuting, Dining, Fitness, Entertainment)
- ✅ **User Mood** - Emotional targeting (Relaxed, Rushed, Social, Focused, Leisure)
- ✅ **Time of Day Activity** - Schedule-based targeting (Morning Rush, Lunch Hours, Evening Leisure)
- ✅ **Traffic Type** - Engagement quality (Pedestrian, Seated Audience, Transit, Mixed)
- ✅ **Environment Type** - Weather/visibility (Indoor, Semi-Outdoor, Outdoor Digital)
- ✅ **Dwell Time** - Engagement duration (minimum average dwell time in minutes)

---

## 🎯 Filter Types & Scoring

### **STRICT Filters** (Exclude Non-Matching)
These filters **ONLY return screens that match**. Use when advertiser has specific requirements.

| Filter | Purpose | Example Use Case |
|--------|---------|------------------|
| `venueCategories` | Only specific venue types | "Show only roadside screens" |
| `genderOrientation` | Only specific gender demographics | "Female-dominant areas only" |
| `incomeLevel` | Only specific income levels | "Luxury buyers only" |
| `trafficType` | Only specific traffic patterns | "Seated audience for video ads" |
| `environmentType` | Only specific environments | "Indoor screens only" |
| `maxPricePerDay` | Budget constraints | "Under ₹5000/day" |
| `minFootfall` | Minimum reach requirement | "At least 10,000/day" |
| `minDwellTime` | Minimum engagement time | "At least 5 minutes dwell time" |

### **SCORING Filters** (Prefer Matching)
These filters **prefer matching screens but don't exclude others**. Use for soft preferences.

| Filter | Points | Purpose | Example Use Case |
|--------|--------|---------|------------------|
| `locationTags` | +2 each | Area-based targeting | "Near schools for education app" |
| `customLocationTags` | +2 each | Unique location features | "Beach view for resort ads" |
| `lifestyleTags` | +2 each | Lifestyle preferences | "Health conscious audience" |
| `interestSegments` | **+4 each** | **Highly specific niches** | "Fitness enthusiasts for gym" |
| `customAudienceTags` | +3 each | Custom targeting | "Digital nomads for coworking" |
| `ageGroups` | +3 each | Age preferences | "Young adults preferred" |
| `occupationMix` | +3 each | Professional targeting | "Working professionals" |
| `userIntent` | +3 each | Behavioral matching | "Shopping audience" |
| `userMood` | +2 each | Emotional targeting | "Relaxed mood for spa ads" |
| `timeOfDayActivity` | +2 each | Time-based targeting | "Morning rush for breakfast" |

### **Automatic Bonuses** (Always Applied)
| Metric | Bonus | Condition |
|--------|-------|-----------|
| Footfall | +5 | > 10,000/day |
| Footfall | +3 | > 5,000/day |
| Footfall | +1 | > 2,000/day |
| Dwell Time | +5 | ≥ 30 minutes |
| Dwell Time | +3 | ≥ 15 minutes |
| Dwell Time | +1 | ≥ 5 minutes |
| Traffic Type | +5 | Seated Audience |
| Traffic Type | +2 | Pedestrian |
| Environment | +3 | Outdoor Digital |
| Environment | +2 | Indoor |
| Price | +2 | < ₹2,000/day |
| Price | +1 | < ₹5,000/day |

---

## 🎬 Use Case Examples

### 1. **Education App - "Near Schools"**
```
User: "I want to promote my education app near schools in Bangalore"

AI Uses:
- cities: ["Bangalore"]
- locationTags: ["School", "College/University"]
- occupationMix: ["Students"]
- userIntent: ["Education"]

Result: Screens near educational institutions with student audience
```

### 2. **Gym Membership - "Fitness Enthusiasts"**
```
User: "Target fitness enthusiasts for gym membership in Mumbai"

AI Uses:
- cities: ["Mumbai"]
- interestSegments: ["Fitness"] (+4 points - highly specific!)
- lifestyleTags: ["Health Conscious"]
- userIntent: ["Fitness"]

Result: High-scoring screens with fitness-focused audience
```

### 3. **Luxury Car Launch - "Premium Tech Parks"**
```
User: "Luxury car launch targeting rich professionals in tech areas"

AI Uses:
- cities: ["Bangalore"]
- incomeLevel: "Luxury Buyers" (STRICT - only luxury areas)
- customLocationTags: ["Tech Park"]
- occupationMix: ["Working Professionals"]
- interestSegments: ["Luxury Cars", "Tech"]

Result: Only premium screens in tech park areas
```

### 4. **Coffee Shop - "Morning Commuters"**
```
User: "Promote café targeting morning commuters"

AI Uses:
- cities: ["Mumbai"]
- interestSegments: ["Coffee"]
- timeOfDayActivity: ["Morning Rush"]
- userIntent: ["Commuting"]
- venueCategories: ["Metro", "Bus Stop", "Railway Station"]

Result: Transit screens active during morning rush with coffee lovers
```

### 5. **Video Ad Campaign - "Seated Audience"**
```
User: "I have a 2-minute video ad, need engaged audience"

AI Uses:
- cities: ["Bangalore"]
- trafficType: "Seated Audience" (STRICT - only seated)
- minDwellTime: 5 (STRICT - at least 5 minutes)

Result: Only cinema, café, salon screens where people sit and watch
```

### 6. **Food Delivery - "Lunch Hour Shoppers"**
```
User: "Food delivery app targeting lunch crowd in shopping areas"

AI Uses:
- cities: ["Delhi"]
- interestSegments: ["Foodies"]
- userIntent: ["Dining", "Shopping"]
- timeOfDayActivity: ["Lunch Hours"]
- venueCategories: ["Mall", "Shopping Complex", "Food Court"]

Result: Mall screens active during lunch with food-loving shoppers
```

### 7. **Indoor Screens - "Weather-Proof Campaign"**
```
User: "Need screens that work during monsoon, indoor only"

AI Uses:
- cities: ["Mumbai"]
- environmentType: "Indoor" (STRICT - excludes outdoor)

Result: Only indoor screens (malls, offices, metro stations)
```

---

## 🔒 Data Security

### **Public Data Exposed to AI**
✅ Screen name, venue, location, city
✅ Venue category, price, footfall
✅ All demographic and targeting data
✅ Screen ID (for booking reference)

### **Sensitive Data Protected**
❌ Owner ID, owner personal information
❌ User authentication data (firebaseUid)
❌ Campaign details from other advertisers
❌ Booking history, payment information
❌ Any data from users, campaigns, or bookings tables

**AI Only Has Access To:**
- `getApprovedScreens()` - Public screen marketplace data
- Own conversation history
- Website scraping (for campaign context)

---

## 🚀 AI Intelligence Features

### **Smart Defaults by Campaign Type**

The AI automatically infers filters based on campaign context:

| Campaign Type | Auto-Applied Filters |
|---------------|---------------------|
| **Gym/Fitness** | interestSegments: ["Fitness"], userIntent: ["Fitness"], lifestyleTags: ["Health Conscious"] |
| **Food Delivery** | interestSegments: ["Foodies"], userIntent: ["Dining"], timeOfDayActivity: ["Lunch Hours"] |
| **Luxury Products** | incomeLevel: "Luxury Buyers", interestSegments: ["Luxury Cars"] |
| **Education App** | locationTags: ["School", "College/University"], occupationMix: ["Students"] |
| **Coffee Shop** | interestSegments: ["Coffee"], userIntent: ["Dining"], lifestyleTags: ["Working Professionals"] |
| **Tech Products** | interestSegments: ["Tech"], lifestyleTags: ["Tech Savvy"], occupationMix: ["Working Professionals"] |
| **Commuter Products** | userIntent: ["Commuting"], timeOfDayActivity: ["Morning Rush"], venueCategories: ["Metro", "Bus Stop"] |

### **Broad-to-Narrow Search Strategy**

1. **Initial Search**: City only (or city + 1-2 key filters)
2. **Refinement**: Add specific filters based on user feedback
3. **Optimization**: Balance between specificity and result count

### **Context-Aware**

- Scrapes advertiser website to understand business
- Remembers conversation context (last 20 messages)
- Learns from user refinements
- Suggests filter adjustments if 0 results

---

## 📊 Implementation Details

### **Code Location**
- File: `server/ai-advisor-v2.ts`
- Interface: `SearchFilters` (lines 33-65)
- Scoring Logic: `searchScreensInDatabase()` (lines 366-612)
- AI Instructions: `SYSTEM_PROMPT` (lines 72-139)
- Tool Definition: `TOOL_DEFINITIONS` (lines 141-269)

### **Database Schema**
All data comes from `screens` table columns:
- Location: `locationTags`, `customLocationTags`, `venueCategory`, `city`
- Demographics: `detailedAgeGroups`, `genderOrientation`, `incomeLevel`, `occupationMix`
- Interests: `lifestyleTags`, `interestSegments`, `customAudienceTags`
- Behavior: `userIntent`, `userMood`, `timeOfDayActivity`
- Engagement: `trafficType`, `avgDwellTime`, `environmentType`
- Metrics: `avgDailyFootfall`, `pricePerDay`

---

## 🧪 Testing Scenarios

### Test Query Examples:
1. ✅ "Screens near schools for education app in Bangalore"
2. ✅ "Target gym-goers with fitness interests in Mumbai"
3. ✅ "Morning commuters for breakfast brand in Delhi"
4. ✅ "Seated audience for 2-minute video ad in premium areas"
5. ✅ "Luxury car buyers near tech parks in Bangalore"
6. ✅ "Food delivery targeting lunch crowd in shopping malls"
7. ✅ "Indoor screens only for monsoon campaign in Mumbai"
8. ✅ "Young entrepreneurs in coworking spaces"
9. ✅ "Shoppers in relaxed mood for spa promotion"
10. ✅ "Working professionals in evening leisure time"

### Expected Behavior:
- AI should immediately search (0-1 clarifying questions max)
- Results should match ALL specified criteria
- Scoring should prioritize highly relevant matches
- Explanations should mention why screens match

---

## 📈 Deployment Info

- **Version**: Enhanced Comprehensive Targeting
- **Deployed**: November 8, 2025
- **Server**: https://connect.pixelspot.in
- **PM2 Status**: PID 279284, Restart #14
- **Build Size**: 183.9kb

---

## 🎯 Result

**Before Enhancement**: 6 basic filters (Cities, Venue, Age, Gender, Income, Price)
**After Enhancement**: **17 comprehensive filters** covering every aspect of screen targeting

The AI can now answer **every advertiser question** with precision:
- ✅ Age groups ✅ Gender ✅ Income level
- ✅ Surrounding area ✅ Nearby facilities ✅ Location features
- ✅ Occupation ✅ Lifestyle ✅ Interests
- ✅ User behavior ✅ User mood ✅ Time of day
- ✅ Traffic type ✅ Environment ✅ Engagement metrics
- ✅ Price ✅ Footfall

**Every column in the screens table is now utilized for intelligent matching!** 🎉
