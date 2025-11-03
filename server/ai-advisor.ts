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

const SYSTEM_PROMPT = `You are an expert DOOH (Digital Out-of-Home) advertising campaign advisor for PixelSpot, India's leading DOOH marketplace. Your role is to quickly recommend optimal screens based on available information.

## CRITICAL INSTRUCTIONS - BE ACTION-ORIENTED:
- When you have website context or campaign type, make SMART ASSUMPTIONS and call searchScreens IMMEDIATELY
- DO NOT ask many questions - use available context to make intelligent defaults
- Call searchScreens after at most 1 clarifying question (preferably 0 questions if you have enough context)
- Be decisive and proactive, not conversational
- IMPORTANT: Start with BROAD searches (city + maybe 1-2 filters) - don't over-filter or you'll get 0 results

## Your Approach:
1. **Analyze Context**: Use website info and campaign type to infer business type, target audience, and goals
2. **Search BROADLY First**: Call searchScreens with just CITY and optionally 1-2 key filters (venue type OR lifestyle tag)
3. **Explain Briefly**: Provide concise reasoning for recommendations

## Searching Best Practices:
- ALWAYS include cities array (e.g., ["Bangalore"])
- OPTIONAL: Add 1-2 venueCategories if highly relevant (e.g., ["Café", "Restaurant"] for food business)
- OPTIONAL: Add 1-2 lifestyleTags if highly relevant (e.g., ["Food Lovers"] for café)
- DO NOT specify: genderOrientation, incomeLevel, ageGroups unless user explicitly requests
- DO NOT set maxPricePerDay unless user mentions budget constraint
- The scoring system will rank results by relevance - you don't need to filter everything

## Campaign Type Defaults (BROAD SEARCHES):
- **Brand Awareness**: cities only, let scoring find best venues
- **Product Launch**: cities + maybe 1-2 venue types (Mall, Airport)
- **Store Promotion**: cities + maybe venue near store type
- **Event Promotion**: cities + maybe entertainment venues
- **Café/Restaurant**: cities + ["Café", "Restaurant", "Mall"] + ["Food Lovers"]

## Filter Mappings (USE SPARINGLY):
- **Venue Types**: Mall, Airport, Metro, Café, Restaurant, Gym, Cinema, Shopping Complex, etc.
- **Lifestyle Tags**: "Food Lovers", "Shopping Enthusiasts", "Tech Enthusiasts", "Business Professionals", etc.

REMEMBER: BROAD searches work better. Start with city + max 1-2 filters. The system scores and ranks results automatically.`;

export async function getCampaignAdvice(
  messages: ChatMessage[],
  storage: IStorage,
  websiteContext?: string,
  campaignType?: string
): Promise<{ message: string; screenRecommendations?: ScreenRecommendation[] }> {
  
  // Inject context into the conversation if available
  const contextualMessages: ChatMessage[] = [...messages];
  if (websiteContext || campaignType) {
    let contextInfo = "";
    if (websiteContext) {
      contextInfo += `\n\nWebsite Context:\n${websiteContext}`;
    }
    if (campaignType) {
      contextInfo += `\n\nCampaign Type: ${campaignType}`;
    }
    if (contextInfo) {
      contextInfo += "\n\nUSE THIS CONTEXT TO MAKE SMART ASSUMPTIONS AND SEARCH SCREENS IMMEDIATELY. Don't ask unnecessary questions.";
      
      // Add context to the system message
      if (contextualMessages.length > 0 && contextualMessages[0].role === 'user') {
        contextualMessages[0] = {
          ...contextualMessages[0],
          content: contextualMessages[0].content + contextInfo
        };
      }
    }
  }
  
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
      ...contextualMessages,
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
          ...contextualMessages,
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
      
      // Add follow-up suggestions to the message
      const baseMessage = explanationCompletion.choices[0].message.content || "Here are my recommendations:";
      const followUpPrompt = `\n\n💡 **What would you like to do next?**\n\n• Adjust the budget or location?\n• See screens in different venue types?\n• Refine the target audience?\n• Get more information about any screen?\n\nJust let me know how I can help further!`;
      
      return {
        message: baseMessage + followUpPrompt,
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
  
  console.log('[AI Advisor] Search criteria:', JSON.stringify(criteria, null, 2));
  console.log('[AI Advisor] Total approved screens:', allScreens.length);
  
  // Apply filters
  let filtered = allScreens.filter((screen: Screen) => screen.status === "approved");
  
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
  // Use scoring instead of hard filtering to avoid 0 results
  if (filtered.length > 0) {
    const scoredScreens = filtered.map((screen: Screen) => {
      let score = 0;
      
      // Venue category match (high priority)
      if (criteria.venueCategories && criteria.venueCategories.length > 0) {
        if (criteria.venueCategories.includes(screen.venueCategory)) {
          score += 10;
        }
      }
      
      // Price filter (hard limit if specified)
      if (criteria.maxPricePerDay && screen.pricePerDay > criteria.maxPricePerDay) {
        score -= 100; // Penalize heavily but don't exclude
      }
      
      // Footfall (medium priority)
      if (criteria.minFootfall && screen.avgDailyFootfall && screen.avgDailyFootfall >= criteria.minFootfall) {
        score += 5;
      }
      
      // Age groups (soft match)
      if (criteria.ageGroups && criteria.ageGroups.length > 0 && screen.detailedAgeGroups) {
        const matches = criteria.ageGroups.filter((age: string) => 
          screen.detailedAgeGroups?.includes(age)
        ).length;
        score += matches * 3;
      }
      
      // Gender orientation (soft match)
      if (criteria.genderOrientation && screen.genderOrientation === criteria.genderOrientation) {
        score += 3;
      }
      
      // Income level (soft match)
      if (criteria.incomeLevel && screen.incomeLevel === criteria.incomeLevel) {
        score += 3;
      }
      
      // Lifestyle tags (soft match)
      if (criteria.lifestyleTags && criteria.lifestyleTags.length > 0 && screen.lifestyleTags) {
        const matches = criteria.lifestyleTags.filter((tag: string) =>
          screen.lifestyleTags?.includes(tag)
        ).length;
        score += matches * 2;
      }
      
      return { screen, score };
    });
    
    // Sort by score first, then by footfall
    const sorted = scoredScreens
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.screen.avgDailyFootfall || 0) - (a.screen.avgDailyFootfall || 0);
      })
      .map(item => item.screen);
    
    const limit = criteria.limit || 5;
    const result = sorted.slice(0, limit);
    console.log('[AI Advisor] Returning', result.length, 'screens');
    return result;
  }
  
  // Fallback: if no screens found even with location, return top screens from all cities
  console.log('[AI Advisor] No screens found with location filter, returning top screens from all cities');
  const sorted = allScreens.sort((a: Screen, b: Screen) => 
    (b.avgDailyFootfall || 0) - (a.avgDailyFootfall || 0)
  );
  
  const limit = criteria.limit || 5;
  return sorted.slice(0, limit);
}
