import OpenAI from "openai";
import type { IStorage } from "./storage";
import type { Screen } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ScreenRecommendation {
  id: string;
  name: string;
  location: string;
  city: string;
  venueCategory: string;
  pricePerDay: number;
  avgDailyFootfall: number;
  reason: string;
}

const SYSTEM_PROMPT = `You are an expert DOOH (Digital Out-of-Home) advertising campaign advisor for PixelSpot, India's leading DOOH marketplace. Your role is to help advertisers create effective campaigns by understanding their business, goals, and target audience, then recommending optimal screens.

## Your Approach:
1. **Understand the Business**: Ask about their product/service, target customers, campaign objectives (awareness, sales, footfall, etc.)
2. **Extract Requirements**: Identify budget, preferred locations/cities, target demographics (age, gender, affluence, lifestyle)
3. **Recommend Screens**: When you have enough information, use the searchScreens function to find suitable screens
4. **Explain Recommendations**: Always explain WHY each screen is a good fit based on their specific needs

## Key Information to Gather:
- Business type and offering
- Campaign objective (brand awareness, product launch, store visits, etc.)
- Budget range
- Target locations (cities, specific areas, venue types)
- Target audience (age groups, gender, income level, lifestyle)
- Campaign duration preference
- Any specific requirements (high footfall, premium locations, tech-savvy audience, etc.)

## Screen Database Context:
- Screens are categorized by venue type (Mall, Airport, Metro, Café, Gym, etc.)
- Each screen has demographics: age groups, gender orientation, income level, lifestyle tags
- Screens have different visibility levels, operating hours, and footfall
- Pricing varies by location, venue type, and screen characteristics

## Filter Mappings:
- **Age Groups**: "Children (5-12)", "Teenagers (13-17)", "Young Adults (18-25)", "Adults (26-40)", "Middle Age (41-55)", "Seniors (55+)"
- **Gender**: "Male Dominant", "Female Dominant", "Mixed Gender", "Family Oriented"
- **Income Levels**: "Budget Conscious", "Middle Income", "Premium Audience", "Luxury Buyers"
- **Time Slots**: "Morning Rush", "Lunch Hours", "Evening Leisure", "Late Night"
- **Lifestyle Tags**: "Tech Enthusiasts", "Fitness Focused", "Food Lovers", "Business Professionals", "Students", "Shopping Enthusiasts", "Entertainment Seekers", "Health Conscious", "Luxury Oriented", "Family Oriented", "Eco Conscious", "Adventure Seekers"

When recommending screens, provide clear reasoning based on alignment with their business and target audience. Be conversational, helpful, and guide them toward making informed decisions.

If you need more information to make good recommendations, ask clarifying questions. Once you have sufficient information, call the searchScreens function to get actual screen data.`;

export async function getCampaignAdvice(
  messages: ChatMessage[],
  storage: IStorage
): Promise<{ message: string; screenRecommendations?: ScreenRecommendation[] }> {
  
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "searchScreens",
        description: "Search for screens in the database based on campaign requirements. Use this when you have gathered enough information about the advertiser's needs.",
        parameters: {
          type: "object",
          properties: {
            cities: {
              type: "array",
              items: { type: "string" },
              description: "List of cities to search in (e.g., ['Bangalore', 'Mumbai'])",
            },
            venueCategories: {
              type: "array",
              items: { type: "string" },
              description: "Types of venues (e.g., ['Mall', 'Metro', 'Airport'])",
            },
            ageGroups: {
              type: "array",
              items: { type: "string" },
              description: "Target age groups from: Children (5-12), Teenagers (13-17), Young Adults (18-25), Adults (26-40), Middle Age (41-55), Seniors (55+)",
            },
            genderOrientation: {
              type: "string",
              enum: ["Male Dominant", "Female Dominant", "Mixed Gender", "Family Oriented"],
              description: "Target gender orientation",
            },
            incomeLevel: {
              type: "string",
              enum: ["Budget Conscious", "Middle Income", "Premium Audience", "Luxury Buyers"],
              description: "Target income level",
            },
            lifestyleTags: {
              type: "array",
              items: { type: "string" },
              description: "Lifestyle characteristics that match the target audience",
            },
            maxPricePerDay: {
              type: "number",
              description: "Maximum price per day budget",
            },
            minFootfall: {
              type: "number",
              description: "Minimum daily footfall required",
            },
            limit: {
              type: "number",
              description: "Maximum number of screens to return (default 5)",
              default: 5,
            },
          },
          required: [],
        },
      },
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ],
    tools,
    tool_choice: "auto",
    temperature: 0.7,
    max_tokens: 1500,
  });

  const responseMessage = completion.choices[0].message;
  
  // Check if the model wants to call a function
  if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
    const toolCall = responseMessage.tool_calls[0];
    
    if (toolCall.type === "function" && toolCall.function.name === "searchScreens") {
      const args = JSON.parse(toolCall.function.arguments);
      
      // Query the database with the extracted criteria
      const screens = await searchScreensInDatabase(args, storage);
      
      // Generate reasoning for each screen recommendation
      const recommendations: ScreenRecommendation[] = screens.map(screen => {
        const reasons: string[] = [];
        
        if (args.cities && args.cities.includes(screen.city)) {
          reasons.push(`Located in ${screen.city}`);
        }
        
        if (args.venueCategories && args.venueCategories.includes(screen.venueCategory)) {
          reasons.push(`${screen.venueCategory} venue matches your target environment`);
        }
        
        if (screen.avgDailyFootfall && args.minFootfall && screen.avgDailyFootfall >= args.minFootfall) {
          reasons.push(`High footfall of ${screen.avgDailyFootfall.toLocaleString()} daily views`);
        }
        
        if (args.ageGroups && screen.detailedAgeGroups) {
          const matchingAges = args.ageGroups.filter((age: string) => 
            screen.detailedAgeGroups?.includes(age)
          );
          if (matchingAges.length > 0) {
            reasons.push(`Audience includes ${matchingAges.join(', ')}`);
          }
        }
        
        if (args.incomeLevel && screen.incomeLevel === args.incomeLevel) {
          reasons.push(`${screen.incomeLevel} audience segment`);
        }
        
        if (args.lifestyleTags && screen.lifestyleTags) {
          const matchingLifestyle = args.lifestyleTags.filter((tag: string) =>
            screen.lifestyleTags?.includes(tag)
          );
          if (matchingLifestyle.length > 0) {
            reasons.push(`${matchingLifestyle.join(', ')} audience`);
          }
        }
        
        return {
          id: screen.id,
          name: screen.name,
          location: screen.location,
          city: screen.city,
          venueCategory: screen.venueCategory || "Digital Display",
          pricePerDay: screen.pricePerDay,
          avgDailyFootfall: screen.avgDailyFootfall || 0,
          reason: reasons.length > 0 ? reasons.join('; ') : 'Good match for your campaign',
        };
      });
      
      // Make a second API call to generate the explanation message
      const explanationCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
          responseMessage,
          {
            role: "tool",
            content: JSON.stringify(recommendations),
            tool_call_id: toolCall.id,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });
      
      return {
        message: explanationCompletion.choices[0].message.content || "Here are my recommendations:",
        screenRecommendations: recommendations,
      };
    }
  }
  
  return {
    message: responseMessage.content || "I'm here to help! Tell me more about your campaign.",
  };
}

async function searchScreensInDatabase(
  criteria: any,
  storage: IStorage
): Promise<Screen[]> {
  // Get all approved screens
  const allScreens = await storage.getApprovedScreens();
  
  // Apply filters
  let filtered = allScreens.filter((screen: Screen) => screen.status === "approved");
  
  if (criteria.cities && criteria.cities.length > 0) {
    filtered = filtered.filter((screen: Screen) => 
      criteria.cities.some((city: string) => 
        screen.city.toLowerCase().includes(city.toLowerCase())
      )
    );
  }
  
  if (criteria.venueCategories && criteria.venueCategories.length > 0) {
    filtered = filtered.filter((screen: Screen) => 
      criteria.venueCategories.includes(screen.venueCategory)
    );
  }
  
  if (criteria.maxPricePerDay) {
    filtered = filtered.filter((screen: Screen) => 
      screen.pricePerDay <= criteria.maxPricePerDay
    );
  }
  
  if (criteria.minFootfall) {
    filtered = filtered.filter((screen: Screen) => 
      screen.avgDailyFootfall && screen.avgDailyFootfall >= criteria.minFootfall
    );
  }
  
  if (criteria.ageGroups && criteria.ageGroups.length > 0) {
    filtered = filtered.filter((screen: Screen) => 
      screen.detailedAgeGroups && 
      criteria.ageGroups.some((age: string) => screen.detailedAgeGroups?.includes(age))
    );
  }
  
  if (criteria.genderOrientation) {
    filtered = filtered.filter((screen: Screen) => 
      screen.genderOrientation === criteria.genderOrientation
    );
  }
  
  if (criteria.incomeLevel) {
    filtered = filtered.filter((screen: Screen) => 
      screen.incomeLevel === criteria.incomeLevel
    );
  }
  
  if (criteria.lifestyleTags && criteria.lifestyleTags.length > 0) {
    filtered = filtered.filter((screen: Screen) => 
      screen.lifestyleTags && 
      criteria.lifestyleTags.some((tag: string) => screen.lifestyleTags?.includes(tag))
    );
  }
  
  // Sort by footfall (descending) and take the limit
  const sorted = filtered.sort((a: Screen, b: Screen) => 
    (b.avgDailyFootfall || 0) - (a.avgDailyFootfall || 0)
  );
  
  const limit = criteria.limit || 5;
  return sorted.slice(0, limit);
}
