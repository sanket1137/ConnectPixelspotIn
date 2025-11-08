# AI Advisor - Comprehensive Test Cases

Based on the screens table schema, here are detailed test cases with exact prompts and expected results.

---

## Test Case 1: Basic Venue Type Filtering

### **Prompt to AI:**
```
"I want roadside screens in Mumbai"
```

### **Expected AI Behavior:**
- Detects: City = Mumbai, Venue Type = Road Side
- Applies filters: `cities: ["Mumbai"], venueCategories: ["Road Side"]`

### **Expected Results:**
- ✅ ONLY screens where `venue_category = "Road Side"`
- ✅ ONLY screens where `city = "Mumbai"`
- ❌ NO Mall, Metro, or other venue types
- Should return: 1-10 Road Side screens in Mumbai, sorted by score

### **Why This Screen:**
- "Road Side venue matches requirement"
- "Located in Mumbai"

---

## Test Case 2: Location-Based Targeting (Near Schools)

### **Prompt to AI:**
```
"I want to promote my education app. Show me screens near schools in Bangalore"
```

### **Expected AI Behavior:**
- Detects: City = Bangalore, Product = Education App, Target = Schools
- Applies filters: 
  ```javascript
  cities: ["Bangalore"],
  locationTags: ["School", "College/University"],
  occupationMix: ["Students"],
  userIntent: ["Education"]
  ```

### **Expected Results:**
- ✅ Screens where `location_tags` contains "School" or "College/University" (HIGH SCORE +2 each)
- ✅ Screens where `occupation_mix` contains "Students" (+3 points)
- ✅ Screens where `user_intent` contains "Education" (+3 points)
- ❌ Should prefer but not exclude non-school areas (SCORING filter)

### **Why This Screen:**
- "Near: School, College/University"
- "Occupation: Students"
- "User intent: Education"
- "Located in Bangalore"

---

## Test Case 3: Interest-Based Targeting (Fitness)

### **Prompt to AI:**
```
"Target fitness enthusiasts for gym membership in Mumbai"
```

### **Expected AI Behavior:**
- Detects: Product = Gym Membership, Target = Fitness Enthusiasts
- Applies filters:
  ```javascript
  cities: ["Mumbai"],
  interestSegments: ["Fitness"],
  lifestyleTags: ["Health Conscious"],
  userIntent: ["Fitness"]
  ```

### **Expected Results:**
- ✅ Screens where `interest_segments` contains "Fitness" (HIGH SCORE +4 points - highly specific!)
- ✅ Screens where `lifestyle_tags` contains "Health Conscious" (+2 points)
- ✅ Screens where `user_intent` contains "Fitness" (+3 points)
- Should return: Gym venues, fitness centers, health clubs, parks with high scores

### **Why This Screen:**
- "Interest: Fitness" (most important - +4 points)
- "Lifestyle: Health Conscious"
- "User intent: Fitness"
- "Located in Mumbai"

---

## Test Case 4: Time-Based Targeting (Morning Commuters)

### **Prompt to AI:**
```
"I want to advertise breakfast brand to morning commuters in Delhi"
```

### **Expected AI Behavior:**
- Detects: Product = Breakfast, Target = Morning Commuters
- Applies filters:
  ```javascript
  cities: ["Delhi"],
  timeOfDayActivity: ["Morning Rush"],
  userIntent: ["Commuting"],
  venueCategories: ["Metro", "Bus Stop", "Railway Station"]
  ```

### **Expected Results:**
- ✅ ONLY screens at Metro, Bus Stop, Railway Station (`venue_category` - STRICT)
- ✅ Screens where `time_of_day_activity` contains "Morning Rush" (+2 points)
- ✅ Screens where `user_intent` contains "Commuting" (+3 points)
- Should return: Transit screens active during morning hours

### **Why This Screen:**
- "Metro venue matches requirement" (or Bus Stop, Railway Station)
- "Active: Morning Rush"
- "User intent: Commuting"
- "Located in Delhi"

---

## Test Case 5: Demographic Targeting (Luxury Buyers)

### **Prompt to AI:**
```
"Luxury car launch targeting high-income professionals in tech park areas of Bangalore"
```

### **Expected AI Behavior:**
- Detects: Product = Luxury Car, Target = High Income + Professionals + Tech Areas
- Applies filters:
  ```javascript
  cities: ["Bangalore"],
  incomeLevel: "Luxury Buyers",
  interestSegments: ["Luxury Cars", "Tech"],
  occupationMix: ["Working Professionals"],
  customLocationTags: ["Tech Park"]
  ```

### **Expected Results:**
- ✅ ONLY screens where `income_level = "Luxury Buyers"` (STRICT)
- ✅ Screens where `interest_segments` contains "Luxury Cars" or "Tech" (+4 each = +8 points!)
- ✅ Screens where `occupation_mix` contains "Working Professionals" (+3 points)
- ✅ Screens where `custom_location_tags` contains "Tech Park" (+2 points)
- Should return: Premium office complexes, corporate parks, high-end malls

### **Why This Screen:**
- "Income level match: Luxury Buyers"
- "Interest: Luxury Cars, Tech"
- "Occupation: Working Professionals"
- "Location: Tech Park"
- "Located in Bangalore"

---

## Test Case 6: Engagement-Based Targeting (Video Ads)

### **Prompt to AI:**
```
"I have a 2-minute video ad, need screens with seated audience and good dwell time"
```

### **Expected AI Behavior:**
- Detects: Content Type = Video (2 minutes), Need = High Engagement
- Applies filters:
  ```javascript
  cities: ["Bangalore"], // or detected city
  trafficType: "Seated Audience",
  minDwellTime: 5
  ```

### **Expected Results:**
- ✅ ONLY screens where `traffic_type = "Seated Audience"` (STRICT)
- ✅ ONLY screens where `avg_dwell_time >= 5` minutes (STRICT)
- ✅ Screens with `avg_dwell_time >= 30` get +5 bonus points
- ✅ Screens with `avg_dwell_time >= 15` get +3 bonus points
- Should return: Cinema, Salon, Café, Restaurant screens

### **Why This Screen:**
- "Seated audience (high engagement)" (+5 points)
- "High dwell time: 30 min" (or 15 min, or 5+ min)
- "Located in [city]"

---

## Test Case 7: Environment-Based Targeting (Indoor Only)

### **Prompt to AI:**
```
"Need indoor screens only for monsoon campaign in Mumbai, budget ₹3000 per day"
```

### **Expected AI Behavior:**
- Detects: Environment = Indoor, Budget = ₹3000, City = Mumbai
- Applies filters:
  ```javascript
  cities: ["Mumbai"],
  environmentType: "Indoor",
  maxPricePerDay: 3000
  ```

### **Expected Results:**
- ✅ ONLY screens where `environment_type = "Indoor"` (STRICT)
- ✅ ONLY screens where `price_per_day <= 3000` (STRICT)
- ✅ Screens with `price_per_day < 2000` get +2 bonus points
- Should return: Mall, Metro, Office, Salon screens (indoor venues)

### **Why This Screen:**
- "Indoor environment (weather-proof)" (+2 points)
- "Great value: ₹[price]/day" (if under ₹2000)
- "Located in Mumbai"

---

## Test Case 8: Multi-Criteria Targeting (Food Delivery)

### **Prompt to AI:**
```
"Promote food delivery app targeting shoppers during lunch hours in shopping malls, Delhi"
```

### **Expected AI Behavior:**
- Detects: Product = Food Delivery, Target = Shoppers, Time = Lunch, Location = Malls
- Applies filters:
  ```javascript
  cities: ["Delhi"],
  venueCategories: ["Mall", "Shopping Complex", "Food Court"],
  interestSegments: ["Foodies"],
  userIntent: ["Dining", "Shopping"],
  timeOfDayActivity: ["Lunch Hours"],
  userMood: ["Relaxed", "Leisure"]
  ```

### **Expected Results:**
- ✅ ONLY Mall, Shopping Complex, Food Court screens (`venue_category` - STRICT)
- ✅ Screens where `interest_segments` contains "Foodies" (+4 points - highly specific!)
- ✅ Screens where `user_intent` contains "Dining" or "Shopping" (+3 each = +6 points)
- ✅ Screens where `time_of_day_activity` contains "Lunch Hours" (+2 points)
- ✅ Screens where `user_mood` contains "Relaxed" or "Leisure" (+2 each)
- Should return: Food courts, mall screens, restaurant areas

### **Why This Screen:**
- "Mall venue matches requirement" (or Shopping Complex, Food Court)
- "Interest: Foodies" (+4 points - most important)
- "User intent: Dining, Shopping"
- "Active: Lunch Hours"
- "Mood: Relaxed, Leisure"
- "Located in Delhi"

---

## Test Case 9: Occupation-Based Targeting (Working Professionals)

### **Prompt to AI:**
```
"Coffee shop promotion targeting working professionals in office areas, Bangalore, budget ₹5000"
```

### **Expected AI Behavior:**
- Detects: Product = Coffee Shop, Target = Working Professionals, Location = Office Areas
- Applies filters:
  ```javascript
  cities: ["Bangalore"],
  venueCategories: ["Office Building", "Corporate Park", "Co-working"],
  interestSegments: ["Coffee"],
  occupationMix: ["Working Professionals"],
  lifestyleTags: ["Working Professionals"],
  userIntent: ["Work"],
  maxPricePerDay: 5000
  ```

### **Expected Results:**
- ✅ ONLY Office Building, Corporate Park, Co-working screens (`venue_category` - STRICT)
- ✅ ONLY screens where `price_per_day <= 5000` (STRICT)
- ✅ Screens where `interest_segments` contains "Coffee" (+4 points)
- ✅ Screens where `occupation_mix` contains "Working Professionals" (+3 points)
- ✅ Screens where `lifestyle_tags` contains "Working Professionals" (+2 points)
- ✅ Screens where `user_intent` contains "Work" (+3 points)

### **Why This Screen:**
- "Office Building venue matches requirement"
- "Interest: Coffee" (+4 points)
- "Occupation: Working Professionals"
- "Lifestyle: Working Professionals"
- "User intent: Work"
- "Great value: ₹[price]/day" (if under ₹5000)
- "Located in Bangalore"

---

## Test Case 10: Age Group Targeting (Young Adults)

### **Prompt to AI:**
```
"Gaming console launch targeting teenagers and young adults in Mumbai"
```

### **Expected AI Behavior:**
- Detects: Product = Gaming Console, Target = Teenagers + Young Adults
- Applies filters:
  ```javascript
  cities: ["Mumbai"],
  ageGroups: ["Teenagers (13-17)", "Young Adults (18-25)"],
  interestSegments: ["Tech"],
  lifestyleTags: ["Tech Savvy"],
  customAudienceTags: ["Gamers"]
  ```

### **Expected Results:**
- ✅ Screens where `detailed_age_groups` contains "Teenagers (13-17)" (+3 points)
- ✅ Screens where `detailed_age_groups` contains "Young Adults (18-25)" (+3 points)
- ✅ Screens where `interest_segments` contains "Tech" (+4 points)
- ✅ Screens where `lifestyle_tags` contains "Tech Savvy" (+2 points)
- ✅ Screens where `custom_audience_tags` contains "Gamers" (+3 points)
- Should return: College areas, malls, gaming cafes, tech hubs

### **Why This Screen:**
- "Age match: Teenagers (13-17), Young Adults (18-25)"
- "Interest: Tech" (+4 points)
- "Lifestyle: Tech Savvy"
- "Audience: Gamers"
- "Located in Mumbai"

---

## Test Case 11: Gender-Based Targeting (Women)

### **Prompt to AI:**
```
"Beauty salon promotion targeting women in Mumbai"
```

### **Expected AI Behavior:**
- Detects: Product = Beauty Salon, Target = Women
- Applies filters:
  ```javascript
  cities: ["Mumbai"],
  genderOrientation: "Female Dominant",
  venueCategories: ["Mall", "Shopping Complex", "Salon"],
  userIntent: ["Shopping", "Leisure"]
  ```

### **Expected Results:**
- ✅ ONLY screens where `gender_orientation = "Female Dominant"` (STRICT)
- ✅ ONLY Mall, Shopping Complex, Salon screens (`venue_category` - STRICT)
- ✅ Screens where `user_intent` contains "Shopping" or "Leisure" (+3 each)
- Should return: Women-centric shopping areas, malls, salons

### **Why This Screen:**
- "Mall venue matches requirement" (or Shopping Complex, Salon)
- "Gender demographic match: Female Dominant"
- "User intent: Shopping, Leisure"
- "Located in Mumbai"

---

## Test Case 12: Footfall-Based Targeting (High Traffic)

### **Prompt to AI:**
```
"Brand awareness campaign, need screens with minimum 10,000 daily footfall in Delhi"
```

### **Expected AI Behavior:**
- Detects: Campaign Type = Brand Awareness, Requirement = High Footfall
- Applies filters:
  ```javascript
  cities: ["Delhi"],
  minFootfall: 10000
  ```

### **Expected Results:**
- ✅ ONLY screens where `avg_daily_footfall >= 10000` (STRICT)
- ✅ Screens with `avg_daily_footfall > 10000` get +5 bonus points
- Should return: Airports, major malls, metro stations, busy roads

### **Why This Screen:**
- "High footfall: 15,000/day" (or whatever the actual number is)
- "Located in Delhi"

---

## Test Case 13: Custom Audience Tags

### **Prompt to AI:**
```
"Co-working space promotion targeting digital nomads and young entrepreneurs in Bangalore"
```

### **Expected AI Behavior:**
- Detects: Product = Co-working, Target = Digital Nomads + Young Entrepreneurs
- Applies filters:
  ```javascript
  cities: ["Bangalore"],
  customAudienceTags: ["Digital Nomads", "Young Entrepreneurs"],
  occupationMix: ["Working Professionals", "Business Owners"],
  venueCategories: ["Co-working", "Café", "Office Building"]
  ```

### **Expected Results:**
- ✅ ONLY Co-working, Café, Office Building screens (`venue_category` - STRICT)
- ✅ Screens where `custom_audience_tags` contains "Digital Nomads" (+3 points)
- ✅ Screens where `custom_audience_tags` contains "Young Entrepreneurs" (+3 points)
- ✅ Screens where `occupation_mix` contains "Working Professionals" or "Business Owners" (+3 each)

### **Why This Screen:**
- "Co-working venue matches requirement"
- "Audience: Digital Nomads, Young Entrepreneurs"
- "Occupation: Working Professionals, Business Owners"
- "Located in Bangalore"

---

## Test Case 14: Mood-Based Targeting

### **Prompt to AI:**
```
"Spa promotion targeting people in relaxed mood in shopping areas, Mumbai"
```

### **Expected AI Behavior:**
- Detects: Product = Spa, Target Mood = Relaxed, Location = Shopping Areas
- Applies filters:
  ```javascript
  cities: ["Mumbai"],
  userMood: ["Relaxed", "Leisure"],
  venueCategories: ["Mall", "Shopping Complex", "Salon"],
  userIntent: ["Shopping", "Leisure"]
  ```

### **Expected Results:**
- ✅ ONLY Mall, Shopping Complex, Salon screens (`venue_category` - STRICT)
- ✅ Screens where `user_mood` contains "Relaxed" (+2 points)
- ✅ Screens where `user_mood` contains "Leisure" (+2 points)
- ✅ Screens where `user_intent` contains "Shopping" or "Leisure" (+3 each)

### **Why This Screen:**
- "Mall venue matches requirement"
- "Mood: Relaxed, Leisure"
- "User intent: Shopping, Leisure"
- "Located in Mumbai"

---

## Test Case 15: Refinement Flow (Conversation Context)

### **Prompt Sequence:**

**1st Message:**
```
"I want screens in Mumbai"
```

**Expected Result 1:**
- Broad search: All venue types in Mumbai
- Returns top 10 screens sorted by footfall and value

**2nd Message:**
```
"Only roadside screens please"
```

**Expected Result 2:**
- ✅ Applies refinement: `venueCategories: ["Road Side"]`
- ✅ Remembers city: Mumbai
- ✅ Returns ONLY Road Side screens in Mumbai
- ❌ NO Mall, Metro, or other venue types

**3rd Message:**
```
"With minimum 5000 footfall"
```

**Expected Result 3:**
- ✅ Applies refinement: `minFootfall: 5000`
- ✅ Remembers: city = Mumbai, venueCategories = ["Road Side"]
- ✅ Returns ONLY Road Side screens in Mumbai with footfall >= 5000

---

## Scoring Reference

### **Points System:**
- **Venue Category Match** (STRICT): +10 points (or excluded if no match)
- **Interest Segments Match**: +4 points each (HIGHEST - highly specific)
- **User Intent Match**: +3 points each
- **Occupation Mix Match**: +3 points each
- **Age Group Match**: +3 points each
- **Custom Audience Tags Match**: +3 points each
- **Gender Match**: +3 points
- **Income Level Match**: +3 points
- **Lifestyle Tags Match**: +2 points each
- **Location Tags Match**: +2 points each
- **Custom Location Tags Match**: +2 points each
- **Time of Day Activity Match**: +2 points each
- **User Mood Match**: +2 points each
- **Seated Audience Bonus**: +5 points
- **High Dwell Time (30+ min)**: +5 points
- **Good Dwell Time (15+ min)**: +3 points
- **Outdoor Digital**: +3 points
- **Indoor**: +2 points
- **High Footfall (>10k)**: +5 points
- **Good Footfall (>5k)**: +3 points
- **Great Value (<₹2000)**: +2 points
- **Good Value (<₹5000)**: +1 point

---

## How to Test

1. **Copy any prompt above** (the text in quotes after "Prompt to AI:")
2. **Paste it into the AI Campaign Advisor** in your application
3. **Compare the results** with the "Expected Results" section
4. **Check the "Why This Screen" reasons** - they should match the explanation

### Success Criteria:
- ✅ Correct venue types returned (if STRICT filter applied)
- ✅ Relevant demographic matching
- ✅ Appropriate scoring and ranking
- ✅ Clear explanation of why each screen was recommended
- ✅ No irrelevant screens mixed in

### Red Flags:
- ❌ Mixed venue types when user specified one type
- ❌ Screens outside target city
- ❌ Missing obvious matches (check if data exists in DB)
- ❌ Generic reasons without mentioning specific matches
- ❌ Ignoring user refinements in conversation

---

## Database Fields Used

Each test case validates different columns:

- **Test 1**: `venue_category`, `city`
- **Test 2**: `location_tags`, `occupation_mix`, `user_intent`
- **Test 3**: `interest_segments`, `lifestyle_tags`, `user_intent`
- **Test 4**: `time_of_day_activity`, `user_intent`, `venue_category`
- **Test 5**: `income_level`, `interest_segments`, `occupation_mix`, `custom_location_tags`
- **Test 6**: `traffic_type`, `avg_dwell_time`
- **Test 7**: `environment_type`, `price_per_day`
- **Test 8**: `venue_category`, `interest_segments`, `user_intent`, `time_of_day_activity`, `user_mood`
- **Test 9**: `venue_category`, `interest_segments`, `occupation_mix`, `lifestyle_tags`, `user_intent`, `price_per_day`
- **Test 10**: `detailed_age_groups`, `interest_segments`, `lifestyle_tags`, `custom_audience_tags`
- **Test 11**: `gender_orientation`, `venue_category`, `user_intent`
- **Test 12**: `avg_daily_footfall`
- **Test 13**: `custom_audience_tags`, `occupation_mix`, `venue_category`
- **Test 14**: `user_mood`, `venue_category`, `user_intent`
- **Test 15**: Conversation context memory

**All major columns are covered across these 15 test cases!**
