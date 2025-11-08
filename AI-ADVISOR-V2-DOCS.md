# AI Campaign Advisor V2 - Session-Based Chat with Security

## Overview
The new AI Campaign Advisor V2 provides a session-based chat experience with conversation persistence, token management, rate limiting, and security measures to prevent abuse.

## Key Features

### 1. **Session-Based Conversations**
- All conversations are stored in the database
- Users can resume conversations across browser sessions
- Conversation history is preserved with full context

### 2. **Smart Context Management**
- Keeps last 20 messages in context window (configurable)
- Website context is cached for 24 hours to reduce scraping costs
- Automatic conversation title generation from first message

### 3. **Token Cost Optimization**
- Context trimming: Only last 20 messages sent to OpenAI
- Website caching: Scrapes once per 24 hours instead of every request
- Token usage tracking per conversation and message
- Estimated tokens saved in database for cost analytics

### 4. **Security & Rate Limiting**
- ✅ **Message Rate Limit**: 30 messages per hour per user
- ✅ **New Conversation Limit**: 10 new conversations per day
- ✅ **User Authentication**: Only logged-in advertisers can use AI chat
- ✅ **Conversation Ownership**: Users can only access their own conversations
- ✅ **Automated Scripts Prevention**: Rate limiting prevents bot attacks

### 5. **Performance Improvements**
- Database-backed persistence (no large JSON payloads from frontend)
- Indexed queries for fast conversation and message retrieval
- Automatic cleanup of expired rate limit records

## API Endpoints

### POST `/api/ai/chat`
Send a message to the AI advisor.

**Request:**
```json
{
  "message": "I need screens in Bangalore for my café",
  "conversationId": "uuid-123", // Optional: omit to create new conversation
  "websiteUrl": "https://mycafe.com", // Optional: for website context
  "campaignType": "brand_awareness" // Optional: brand_awareness, product_launch, etc.
}
```

**Response:**
```json
{
  "message": "Based on your café in Bangalore, I recommend these screens...",
  "screenRecommendations": [
    {
      "id": "screen-123",
      "name": "Coffee Shop LED",
      "venueName": "Café Street Bangalore",
      "city": "Bangalore",
      "score": 18,
      "pricePerDay": 1500,
      "reason": "Perfect venue match: Café; Audience match: Food Lovers"
    }
  ],
  "conversationId": "uuid-123",
  "tokensUsed": 1250
}
```

**Error Responses:**
- `429 Too Many Requests`: Rate limit exceeded
- `400 Bad Request`: Invalid message format
- `500 Internal Server Error`: OpenAI API error

### GET `/api/ai/conversations`
Get list of user's conversations.

**Query Parameters:**
- `limit`: Maximum number of conversations (default: 50)

**Response:**
```json
{
  "conversations": [
    {
      "id": "uuid-123",
      "title": "I need screens in Bangalore for my café...",
      "websiteUrl": "https://mycafe.com",
      "campaignType": "brand_awareness",
      "messageCount": 6,
      "totalTokensUsed": 4500,
      "lastMessageAt": "2025-01-20T10:30:00Z",
      "createdAt": "2025-01-20T10:00:00Z"
    }
  ]
}
```

### GET `/api/ai/conversations/:id/messages`
Get all messages from a specific conversation.

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-1",
      "conversationId": "uuid-123",
      "role": "user",
      "content": "I need screens in Bangalore for my café",
      "tokensUsed": null,
      "createdAt": "2025-01-20T10:00:00Z"
    },
    {
      "id": "msg-2",
      "conversationId": "uuid-123",
      "role": "assistant",
      "content": "Based on your café...",
      "screenRecommendations": [...],
      "tokensUsed": 1250,
      "createdAt": "2025-01-20T10:00:05Z"
    }
  ]
}
```

### DELETE `/api/ai/conversations/:id`
Delete a conversation and all its messages.

**Response:**
```json
{
  "success": true
}
```

## Database Schema

### `ai_conversations` Table
Stores conversation sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR (PK) | Unique conversation ID |
| user_id | VARCHAR (FK) | References users.id |
| title | TEXT | Auto-generated from first message |
| website_url | TEXT | Website being analyzed |
| website_context | TEXT | Cached website scrape (24h expiry) |
| website_context_expiry | TIMESTAMP | When to re-scrape |
| campaign_type | TEXT | brand_awareness, product_launch, etc. |
| message_count | INTEGER | Total messages in conversation |
| total_tokens_used | INTEGER | Cumulative token usage |
| last_message_at | TIMESTAMP | Last activity timestamp |
| created_at | TIMESTAMP | Conversation creation time |
| updated_at | TIMESTAMP | Last update time |

### `ai_messages` Table
Stores individual messages.

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR (PK) | Unique message ID |
| conversation_id | VARCHAR (FK) | References ai_conversations.id |
| role | TEXT | 'user' or 'assistant' |
| content | TEXT | Message text |
| screen_recommendations | JSONB | Array of recommended screens (assistant only) |
| tokens_used | INTEGER | Tokens consumed by this message |
| created_at | TIMESTAMP | Message timestamp |

### `ai_rate_limits` Table
Prevents abuse with rate limiting.

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR (PK) | Unique rate limit record |
| user_id | VARCHAR (FK) | References users.id |
| action_type | TEXT | 'message' or 'new_conversation' |
| count | INTEGER | Number of actions in window |
| window_start | TIMESTAMP | When this window started |
| expires_at | TIMESTAMP | When this record expires |

## Migration Instructions

1. **Run SQL Migration:**
   ```bash
   psql -U your_user -d your_database -f ai_conversations_migration.sql
   ```

2. **Verify Tables Created:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name IN ('ai_conversations', 'ai_messages', 'ai_rate_limits');
   ```

3. **Check Indexes:**
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename IN ('ai_conversations', 'ai_messages', 'ai_rate_limits');
   ```

## Frontend Integration Example

```typescript
// Start new conversation
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "I need screens for my product launch in Mumbai",
    websiteUrl: "https://myproduct.com",
    campaignType: "product_launch"
  })
});

const data = await response.json();
console.log(data.conversationId); // Save this for next messages

// Continue conversation
const response2 = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "What about screens near airports?",
    conversationId: data.conversationId // Use saved ID
  })
});

// List conversations
const convos = await fetch('/api/ai/conversations').then(r => r.json());

// Load conversation history
const history = await fetch(`/api/ai/conversations/${conversationId}/messages`)
  .then(r => r.json());
```

## Rate Limit Configuration

Adjust in `server/ai-advisor-v2.ts`:

```typescript
const RATE_LIMITS = {
  MESSAGES_PER_HOUR: 30, // Increase if needed
  NEW_CONVERSATIONS_PER_DAY: 10,
  MESSAGE_WINDOW_MINUTES: 60,
  CONVERSATION_WINDOW_MINUTES: 1440,
};
```

## Token Management Configuration

```typescript
const TOKEN_LIMITS = {
  MAX_MESSAGES_IN_CONTEXT: 20, // Reduce to save tokens, increase for longer memory
  WEBSITE_CONTEXT_EXPIRY_HOURS: 24, // How long to cache website scrapes
  ESTIMATED_TOKENS_PER_MESSAGE: 150,
};
```

## Security Best Practices

1. ✅ **Rate Limiting Enabled**: Prevents spam and automated attacks
2. ✅ **User Authentication Required**: Only logged-in advertisers can access
3. ✅ **Conversation Ownership Verified**: Users can't access others' chats
4. ✅ **Input Validation**: Message content validated before processing
5. ✅ **Error Handling**: Sensitive error details not exposed to users
6. ✅ **Token Limits**: Context window capped to prevent excessive costs
7. ✅ **Automatic Cleanup**: Expired rate limits cleaned up automatically

## Monitoring & Analytics

### Check Token Usage
```sql
-- Total tokens used by all users
SELECT SUM(total_tokens_used) as total_tokens FROM ai_conversations;

-- Top users by token usage
SELECT u.email, SUM(ac.total_tokens_used) as tokens
FROM ai_conversations ac
JOIN users u ON u.id = ac.user_id
GROUP BY u.email
ORDER BY tokens DESC
LIMIT 10;
```

### Check Rate Limit Status
```sql
-- Current rate limit records
SELECT u.email, arl.action_type, arl.count, arl.window_start, arl.expires_at
FROM ai_rate_limits arl
JOIN users u ON u.id = arl.user_id
WHERE arl.expires_at > NOW()
ORDER BY arl.window_start DESC;
```

### Conversation Analytics
```sql
-- Average messages per conversation
SELECT AVG(message_count) as avg_messages FROM ai_conversations;

-- Conversations created today
SELECT COUNT(*) FROM ai_conversations 
WHERE created_at::date = CURRENT_DATE;

-- Most active users
SELECT u.email, COUNT(ac.id) as conversation_count
FROM ai_conversations ac
JOIN users u ON u.id = ac.user_id
GROUP BY u.email
ORDER BY conversation_count DESC
LIMIT 10;
```

## Troubleshooting

### "Rate limit exceeded" errors
- Check user's current rate limit status in `ai_rate_limits` table
- Expired limits are automatically cleaned up every request
- Adjust `RATE_LIMITS` constants if limits are too restrictive

### High token costs
- Reduce `MAX_MESSAGES_IN_CONTEXT` to keep fewer messages in memory
- Check `total_tokens_used` column to identify expensive conversations
- Consider adding token budget limits per user

### Slow response times
- Website scraping has 10-second timeout (configurable)
- OpenAI API calls typically take 2-5 seconds
- Database queries are indexed for fast retrieval
- Consider caching frequently accessed conversations in Redis

### Website context not updating
- Website context expires after 24 hours
- Delete conversation and start new one to force re-scrape
- Check `website_context_expiry` column for expiry time

## Migration from V1 to V2

The old `/api/ai/campaign-advisor` endpoint is **deprecated but still functional** for backward compatibility.

**To migrate:**
1. Update frontend to use `/api/ai/chat` endpoint
2. Store `conversationId` from first response
3. Pass `conversationId` in subsequent messages
4. Remove local message state management (now server-side)

**Benefits of migrating:**
- Persistent conversations across sessions
- Better token cost management
- Rate limiting protection
- Conversation history UI
- Better user experience

## Future Enhancements

- [ ] Conversation summarization for very long threads
- [ ] Export conversation as PDF
- [ ] Share conversation link with team members
- [ ] AI-powered conversation search
- [ ] Token usage dashboard for admins
- [ ] Custom rate limits per user tier
- [ ] Conversation folders/tags
- [ ] Multi-language support
