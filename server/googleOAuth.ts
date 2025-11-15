import { google } from 'googleapis';
import crypto from 'crypto';

// OAuth2 Client Configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  // Dynamic redirect URI - will be set per request based on current domain
  undefined
);

// In-memory storage for state and code verifier (for CSRF and PKCE)
// In production, use Redis or database
const stateStore = new Map<string, { codeVerifier: string; role?: string; timestamp: number }>();

// Clean up expired state entries (older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  
  for (const [state, data] of stateStore.entries()) {
    if (now - data.timestamp > tenMinutes) {
      stateStore.delete(state);
    }
  }
}, 60000); // Run every minute

/**
 * Generate PKCE code challenge
 */
function generateCodeChallenge(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return { codeVerifier, codeChallenge };
}

/**
 * Generate authorization URL for Google OAuth
 */
export function getAuthorizationUrl(
  redirectUri: string,
  role?: 'screen_owner' | 'advertiser'
): string {
  // Generate PKCE parameters
  const { codeVerifier, codeChallenge } = generateCodeChallenge();
  
  // Generate CSRF protection token
  const state = crypto.randomBytes(32).toString('hex');
  
  // Store state and code verifier
  stateStore.set(state, {
    codeVerifier,
    role,
    timestamp: Date.now()
  });
  
  // Set redirect URI for this request
  oauth2Client.redirectUri = redirectUri;
  
  // Build authorization URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256', // SHA-256 hashing
    prompt: 'select_account', // Allow user to select account
    include_granted_scopes: true
  });
  
  console.log('🔐 Generated OAuth URL with state:', state.substring(0, 10) + '...');
  
  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(
  code: string,
  state: string,
  redirectUri: string
): Promise<{
  tokens: any;
  userInfo: {
    id: string;
    email: string;
    name: string;
    picture?: string;
    emailVerified: boolean;
  };
  role?: 'screen_owner' | 'advertiser';
}> {
  // Validate state (CSRF protection)
  const stateData = stateStore.get(state);
  
  if (!stateData) {
    console.error('❌ Invalid state parameter - possible CSRF attack or expired session');
    throw new Error('Invalid state parameter. Please try again.');
  }
  
  // Set redirect URI for token exchange
  oauth2Client.redirectUri = redirectUri;
  
  try {
    console.log('🔄 Exchanging authorization code for tokens...');
    
    // Exchange code for tokens with PKCE verification
    const { tokens } = await oauth2Client.getToken({
      code: code,
      codeVerifier: stateData.codeVerifier // PKCE verification
    });
    
    console.log('✅ Tokens received from Google');
    
    // Set credentials to fetch user info
    oauth2Client.setCredentials(tokens);
    
    // Fetch user information
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    
    console.log('✅ User info fetched:', data.email);
    
    // Clean up state
    stateStore.delete(state);
    
    return {
      tokens,
      userInfo: {
        id: data.id!,
        email: data.email!,
        name: data.name || data.email!,
        picture: data.picture,
        emailVerified: data.verified_email || false
      },
      role: stateData.role
    };
  } catch (error) {
    console.error('❌ Token exchange error:', error);
    stateStore.delete(state); // Clean up on error
    throw error;
  }
}

/**
 * Revoke Google OAuth token
 */
export async function revokeToken(accessToken: string): Promise<void> {
  try {
    await oauth2Client.revokeToken(accessToken);
    console.log('✅ Google token revoked');
  } catch (error) {
    console.error('❌ Error revoking token:', error);
    // Don't throw - logout should proceed even if revocation fails
  }
}
