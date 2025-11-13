/**
 * AI Advisor Rate Limiting
 * 
 * Prevents brute-force probing and abusive behavior by limiting:
 * - Number of AI requests per hour
 * - Total tokens consumed per day
 * - Conversation creation rate
 */

interface RateLimitEntry {
  userId: string;
  count: number;
  windowStart: Date;
}

// In-memory storage for rate limits (in production, use Redis)
const requestLimits = new Map<string, RateLimitEntry>();
const tokenLimits = new Map<string, RateLimitEntry>();

// Rate limit configurations
const RATE_LIMIT_CONFIG = {
  // AI requests per hour per user
  AI_REQUESTS_PER_HOUR: 30,
  AI_REQUESTS_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  
  // Tokens per day per user
  TOKENS_PER_DAY: 50000,
  TOKEN_WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours
  
  // Conversation creation per hour
  CONVERSATIONS_PER_HOUR: 10,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

/**
 * Check if user has exceeded AI request rate limit
 */
export function checkAIRequestLimit(userId: string): RateLimitResult {
  const key = `ai_request:${userId}`;
  const now = new Date();
  
  let entry = requestLimits.get(key);
  
  // Create new entry if doesn't exist or window has expired
  if (!entry || now.getTime() - entry.windowStart.getTime() > RATE_LIMIT_CONFIG.AI_REQUESTS_WINDOW_MS) {
    entry = {
      userId,
      count: 0,
      windowStart: now,
    };
    requestLimits.set(key, entry);
  }
  
  // Check if limit exceeded
  if (entry.count >= RATE_LIMIT_CONFIG.AI_REQUESTS_PER_HOUR) {
    const resetAt = new Date(entry.windowStart.getTime() + RATE_LIMIT_CONFIG.AI_REQUESTS_WINDOW_MS);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      reason: `Rate limit exceeded. Maximum ${RATE_LIMIT_CONFIG.AI_REQUESTS_PER_HOUR} requests per hour.`,
    };
  }
  
  // Increment counter
  entry.count++;
  
  const resetAt = new Date(entry.windowStart.getTime() + RATE_LIMIT_CONFIG.AI_REQUESTS_WINDOW_MS);
  return {
    allowed: true,
    remaining: RATE_LIMIT_CONFIG.AI_REQUESTS_PER_HOUR - entry.count,
    resetAt,
  };
}

/**
 * Check if user has exceeded daily token limit
 */
export function checkTokenLimit(userId: string, tokensToUse: number): RateLimitResult {
  const key = `tokens:${userId}`;
  const now = new Date();
  
  let entry = tokenLimits.get(key);
  
  // Create new entry if doesn't exist or window has expired
  if (!entry || now.getTime() - entry.windowStart.getTime() > RATE_LIMIT_CONFIG.TOKEN_WINDOW_MS) {
    entry = {
      userId,
      count: 0,
      windowStart: now,
    };
    tokenLimits.set(key, entry);
  }
  
  // Check if adding these tokens would exceed limit
  if (entry.count + tokensToUse > RATE_LIMIT_CONFIG.TOKENS_PER_DAY) {
    const resetAt = new Date(entry.windowStart.getTime() + RATE_LIMIT_CONFIG.TOKEN_WINDOW_MS);
    return {
      allowed: false,
      remaining: Math.max(0, RATE_LIMIT_CONFIG.TOKENS_PER_DAY - entry.count),
      resetAt,
      reason: `Daily token limit exceeded. Maximum ${RATE_LIMIT_CONFIG.TOKENS_PER_DAY} tokens per day.`,
    };
  }
  
  const resetAt = new Date(entry.windowStart.getTime() + RATE_LIMIT_CONFIG.TOKEN_WINDOW_MS);
  return {
    allowed: true,
    remaining: RATE_LIMIT_CONFIG.TOKENS_PER_DAY - entry.count,
    resetAt,
  };
}

/**
 * Record token usage for a user
 */
export function recordTokenUsage(userId: string, tokensUsed: number): void {
  const key = `tokens:${userId}`;
  const now = new Date();
  
  let entry = tokenLimits.get(key);
  
  if (!entry || now.getTime() - entry.windowStart.getTime() > RATE_LIMIT_CONFIG.TOKEN_WINDOW_MS) {
    entry = {
      userId,
      count: 0,
      windowStart: now,
    };
    tokenLimits.set(key, entry);
  }
  
  entry.count += tokensUsed;
}

/**
 * Express middleware for AI request rate limiting
 */
export function aiRateLimitMiddleware(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const result = checkAIRequestLimit(req.user.id);
  
  if (!result.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: result.reason,
      resetAt: result.resetAt,
    });
  }
  
  // Add rate limit info to headers
  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
  res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());
  
  next();
}

/**
 * Get rate limit status for a user (for debugging/admin)
 */
export function getRateLimitStatus(userId: string): {
  requests: RateLimitEntry | null;
  tokens: RateLimitEntry | null;
} {
  return {
    requests: requestLimits.get(`ai_request:${userId}`) || null,
    tokens: tokenLimits.get(`tokens:${userId}`) || null,
  };
}

/**
 * Reset rate limits for a user (admin only)
 */
export function resetRateLimits(userId: string): void {
  requestLimits.delete(`ai_request:${userId}`);
  tokenLimits.delete(`tokens:${userId}`);
  console.log(`🔓 [Rate Limit] Reset limits for user: ${userId}`);
}

/**
 * Cleanup old entries to prevent memory leaks
 */
function cleanupOldEntries(): void {
  const now = Date.now();
  
  // Cleanup request limits
  for (const [key, entry] of requestLimits.entries()) {
    if (now - entry.windowStart.getTime() > RATE_LIMIT_CONFIG.AI_REQUESTS_WINDOW_MS * 2) {
      requestLimits.delete(key);
    }
  }
  
  // Cleanup token limits
  for (const [key, entry] of tokenLimits.entries()) {
    if (now - entry.windowStart.getTime() > RATE_LIMIT_CONFIG.TOKEN_WINDOW_MS * 2) {
      tokenLimits.delete(key);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupOldEntries, 60 * 60 * 1000);
