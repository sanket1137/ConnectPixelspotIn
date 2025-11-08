-- AI Conversations - Session-based chat context with security measures
-- Migration: Add tables for AI conversation persistence, rate limiting, and token management

-- AI Conversations table - stores conversation sessions
CREATE TABLE IF NOT EXISTS ai_conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT, -- Auto-generated from first message or user-set
  website_url TEXT, -- Website being analyzed for campaign
  website_context TEXT, -- Scraped website content (cached)
  website_context_expiry TIMESTAMP, -- Re-scrape after 24 hours
  campaign_type TEXT, -- brand_awareness, product_launch, etc.
  message_count INTEGER NOT NULL DEFAULT 0,
  total_tokens_used INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- AI Messages table - individual messages in conversations
CREATE TABLE IF NOT EXISTS ai_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  screen_recommendations JSONB, -- Only for assistant messages with recommendations
  tokens_used INTEGER, -- Estimated tokens for this message
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- AI Rate Limits table - prevent abuse and automated attacks
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('message', 'new_conversation')),
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_last_message ON ai_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_user_action ON ai_rate_limits(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_expires ON ai_rate_limits(expires_at);

-- Comments for documentation
COMMENT ON TABLE ai_conversations IS 'Session-based AI chat conversations with context persistence';
COMMENT ON TABLE ai_messages IS 'Individual messages in AI conversations (user and assistant)';
COMMENT ON TABLE ai_rate_limits IS 'Rate limiting to prevent abuse and automated attacks';

COMMENT ON COLUMN ai_conversations.website_context IS 'Cached website scrape (title, description, text) - reused for 24 hours';
COMMENT ON COLUMN ai_conversations.total_tokens_used IS 'Cumulative token usage for cost tracking';
COMMENT ON COLUMN ai_messages.screen_recommendations IS 'JSON array of recommended screens with scores and reasons';
COMMENT ON COLUMN ai_rate_limits.action_type IS 'message: max per hour, new_conversation: max per day';
