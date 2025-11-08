# AI Advisor V2 - Quick Test Guide

## 🧪 How to Test the New AI Chat API

### Prerequisites
- Logged in as advertiser user on https://connect.pixelspot.in
- Browser console open (F12)
- Valid authentication token

---

## Test 1: Start a New Conversation

```javascript
// Open browser console on https://connect.pixelspot.in
// Make sure you're logged in as advertiser

const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: "I want to promote my new café in Bangalore. Can you recommend screens?",
    websiteUrl: "https://www.thirdwavecoffeeroasters.com/", // Optional
    campaignType: "brand_awareness" // Optional
  })
});

const data = await response.json();
console.log('Response:', data);

// Expected response:
// {
//   message: "Based on your café...",
//   screenRecommendations: [
//     {
//       id: "...",
//       name: "Coffee Shop LED",
//       venueName: "Café Street",
//       city: "Bangalore",
//       score: 18,
//       pricePerDay: 1500,
//       reason: "Perfect venue match: Café; Audience: Food Lovers"
//     }
//   ],
//   conversationId: "uuid-here",
//   tokensUsed: 1250
// }

// IMPORTANT: Save the conversationId for next test
const conversationId = data.conversationId;
console.log('Conversation ID:', conversationId);
```

---

## Test 2: Continue the Conversation

```javascript
// Use the conversationId from Test 1
const conversationId = "YOUR_CONVERSATION_ID_HERE";

const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: "What about screens in malls? I want high footfall areas.",
    conversationId: conversationId // Use saved ID
  })
});

const data = await response.json();
console.log('Response:', data);

// The AI should remember your café context and provide mall screens
```

---

## Test 3: List All Conversations

```javascript
const response = await fetch('/api/ai/conversations');
const data = await response.json();
console.log('My Conversations:', data.conversations);

// Expected response:
// {
//   conversations: [
//     {
//       id: "uuid",
//       title: "I want to promote my new café...",
//       websiteUrl: "https://...",
//       campaignType: "brand_awareness",
//       messageCount: 4,
//       totalTokensUsed: 2500,
//       lastMessageAt: "2025-01-20T10:30:00Z",
//       createdAt: "2025-01-20T10:00:00Z"
//     }
//   ]
// }
```

---

## Test 4: Load Conversation History

```javascript
// Use conversationId from Test 1
const conversationId = "YOUR_CONVERSATION_ID_HERE";

const response = await fetch(`/api/ai/conversations/${conversationId}/messages`);
const data = await response.json();
console.log('Chat History:', data.messages);

// Expected response:
// {
//   messages: [
//     {
//       id: "msg-1",
//       role: "user",
//       content: "I want to promote my new café...",
//       tokensUsed: null,
//       createdAt: "2025-01-20T10:00:00Z"
//     },
//     {
//       id: "msg-2",
//       role: "assistant",
//       content: "Based on your café...",
//       screenRecommendations: [...],
//       tokensUsed: 1250,
//       createdAt: "2025-01-20T10:00:05Z"
//     },
//     ...
//   ]
// }
```

---

## Test 5: Delete a Conversation

```javascript
// Use conversationId from Test 1
const conversationId = "YOUR_CONVERSATION_ID_HERE";

const response = await fetch(`/api/ai/conversations/${conversationId}`, {
  method: 'DELETE'
});

const data = await response.json();
console.log('Deleted:', data);

// Expected response:
// { success: true }

// Verify deletion
const listResponse = await fetch('/api/ai/conversations');
const list = await listResponse.json();
console.log('Remaining conversations:', list.conversations);
```

---

## Test 6: Rate Limiting

```javascript
// Try to send 31 messages rapidly (exceeds 30/hour limit)

for (let i = 1; i <= 31; i++) {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Test message ${i}`
    })
  });
  
  const data = await response.json();
  console.log(`Message ${i}:`, response.status, data);
  
  if (response.status === 429) {
    console.log('✅ Rate limit working! Got 429 error:', data.error);
    break;
  }
  
  // Small delay to avoid overwhelming server
  await new Promise(r => setTimeout(r, 100));
}

// Expected: First 30 should work, 31st should return:
// Status 429
// {
//   error: "Rate limit exceeded: Maximum 30 messages per hour. Please try again later."
// }
```

---

## Test 7: Website Context Caching

```javascript
// First message with website URL
const response1 = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Analyze my website and recommend screens",
    websiteUrl: "https://www.starbucks.in/"
  })
});

const data1 = await response1.json();
const conversationId = data1.conversationId;
console.log('First message (scrapes website):', data1);

// Wait 2 seconds then send another message
await new Promise(r => setTimeout(r, 2000));

const response2 = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "What screens would work best for coffee lovers?",
    conversationId: conversationId
  })
});

const data2 = await response2.json();
console.log('Second message (uses cached website context):', data2);

// Second message should be faster because website context is cached
```

---

## Test 8: Error Handling - Unauthorized Access

```javascript
// Try to access someone else's conversation
const fakeConversationId = "00000000-0000-0000-0000-000000000000";

const response = await fetch(`/api/ai/conversations/${fakeConversationId}/messages`);
const data = await response.json();

console.log('Status:', response.status);
console.log('Response:', data);

// Expected:
// Status: 404 (not found) or 403 (forbidden)
// {
//   error: "Conversation not found" // or "Access denied"
// }
```

---

## Test 9: Token Usage Tracking

```javascript
// Send multiple messages and check token accumulation

let totalTokens = 0;

for (let i = 1; i <= 3; i++) {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Tell me about screen ${i} for my campaign`
    })
  });
  
  const data = await response.json();
  totalTokens += data.tokensUsed || 0;
  console.log(`Message ${i}: ${data.tokensUsed} tokens (total: ${totalTokens})`);
}

// Check conversation token count
const listResponse = await fetch('/api/ai/conversations');
const { conversations } = await listResponse.json();
const latestConvo = conversations[0];
console.log('Conversation total tokens:', latestConvo.totalTokensUsed);
console.log('Matches accumulated?', latestConvo.totalTokensUsed >= totalTokens);
```

---

## Test 10: Screen Search Scoring

```javascript
// Test the scoring algorithm with specific filters

const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "I need screens in Bangalore at coffee shops targeting young professionals with high footfall"
  })
});

const data = await response.json();
console.log('Recommendations:', data.screenRecommendations);

// Check if results are properly scored
data.screenRecommendations.forEach((screen, index) => {
  console.log(`${index + 1}. ${screen.name}`);
  console.log(`   Score: ${screen.score}`);
  console.log(`   Reason: ${screen.reason}`);
  console.log(`   Price: ₹${screen.pricePerDay}/day`);
  console.log(`   Footfall: ${screen.avgDailyFootfall.toLocaleString()}/day`);
  console.log('');
});

// Screens should be sorted by score (highest first)
// Reasons should explain why the screen was selected
```

---

## Expected Behavior Summary

### ✅ What Should Work
1. **New conversations** created without conversationId
2. **Continuing conversations** with saved conversationId
3. **Conversation list** showing all user's chats
4. **Chat history** loading all messages
5. **Rate limiting** at 30 messages/hour and 10 conversations/day
6. **Website caching** reusing scraped content for 24 hours
7. **Conversation ownership** preventing unauthorized access
8. **Token tracking** accumulating across conversation
9. **Smart scoring** ranking screens by relevance
10. **Conversation deletion** removing chat and messages

### ❌ What Should Fail (Expected Errors)
1. **Missing message** - 400 Bad Request
2. **Invalid conversationId** - 404 Not Found
3. **Rate limit exceeded** - 429 Too Many Requests
4. **Unauthorized role** - Only advertisers can access
5. **Others' conversations** - 403 Forbidden
6. **Malformed requests** - 400 Bad Request

---

## Database Verification Queries

After testing, verify data in database:

```sql
-- Check conversations created
SELECT 
  u.email,
  ac.title,
  ac.message_count,
  ac.total_tokens_used,
  ac.created_at
FROM ai_conversations ac
JOIN users u ON u.id = ac.user_id
ORDER BY ac.created_at DESC
LIMIT 10;

-- Check messages
SELECT 
  am.role,
  LEFT(am.content, 50) as content_preview,
  am.tokens_used,
  am.created_at
FROM ai_messages am
JOIN ai_conversations ac ON ac.id = am.conversation_id
ORDER BY am.created_at DESC
LIMIT 20;

-- Check rate limits
SELECT 
  u.email,
  arl.action_type,
  arl.count,
  arl.window_start,
  arl.expires_at
FROM ai_rate_limits arl
JOIN users u ON u.id = arl.user_id
WHERE arl.expires_at > NOW()
ORDER BY arl.window_start DESC;

-- Token usage by user
SELECT 
  u.email,
  COUNT(ac.id) as conversation_count,
  SUM(ac.total_tokens_used) as total_tokens
FROM ai_conversations ac
JOIN users u ON u.id = ac.user_id
GROUP BY u.email
ORDER BY total_tokens DESC;
```

---

## Troubleshooting

### Issue: "429 Rate limit exceeded"
**Solution:** Wait 1 hour or test with different user account

### Issue: "Conversation not found"
**Solution:** Make sure conversationId is from the same user

### Issue: "No screen recommendations"
**Solution:** Try broader search terms (just city name)

### Issue: "Slow response"
**Solution:** First message scrapes website (up to 10s), subsequent messages are faster

### Issue: "Token usage 0"
**Solution:** OpenAI API might be slow, check logs: `pm2 logs pixelspot`

---

## Success Criteria

✅ Test passes if:
- Conversations persist across page refreshes
- Messages appear in correct chronological order
- Screen recommendations have scores and reasons
- Rate limits trigger after threshold
- Website context cached (faster 2nd message)
- Token usage accumulates correctly
- Only owner can access their conversations

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. 📱 Build frontend UI for chat interface
3. 🎨 Design conversation list sidebar
4. 💬 Add real-time message streaming (optional)
5. 📊 Create admin dashboard for token monitoring
6. 🚀 Launch to beta users

---

**Happy Testing! 🎉**

For issues, check:
- PM2 logs: `ssh root@188.245.231.251 "pm2 logs pixelspot"`
- Database: SQL queries above
- Documentation: `AI-ADVISOR-V2-DOCS.md`
