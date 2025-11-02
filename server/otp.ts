// Simple in-memory OTP storage
// In production, use Redis or database with TTL

interface OTPData {
  code: string;
  expiresAt: number;
  type: 'email' | 'mobile';
  target: string; // email address or mobile number
  used?: boolean; // Track if OTP has been used
}

const otpStore = new Map<string, OTPData>();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(otpStore.entries());
  for (const [key, data] of entries) {
    if (data.expiresAt < now) {
      otpStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeOTP(identifier: string, type: 'email' | 'mobile', target: string): string {
  const code = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  otpStore.set(identifier, {
    code,
    expiresAt,
    type,
    target,
  });
  
  return code;
}

export function verifyOTP(identifier: string, code: string): boolean {
  const otpData = otpStore.get(identifier);
  
  if (!otpData) {
    console.log(`❌ OTP not found for identifier: ${identifier}`);
    return false;
  }
  
  if (otpData.expiresAt < Date.now()) {
    console.log(`❌ OTP expired for identifier: ${identifier}`);
    otpStore.delete(identifier);
    return false;
  }

  // Check if OTP was already used (within last 30 seconds)
  if (otpData.used) {
    const timeSinceUse = Date.now() - (otpData.expiresAt - 10 * 60 * 1000);
    if (timeSinceUse < 30000) { // 30 seconds grace period for duplicate requests
      console.log(`✅ OTP already used recently for ${identifier}, allowing duplicate verification`);
      return true;
    } else {
      console.log(`❌ OTP already used for identifier: ${identifier}`);
      return false;
    }
  }
  
  if (otpData.code !== code) {
    console.log(`❌ OTP code mismatch for identifier: ${identifier}`);
    return false;
  }
  
  // Mark OTP as used instead of deleting it immediately
  otpData.used = true;
  console.log(`✅ OTP verified and marked as used for identifier: ${identifier}`);
  
  // Schedule deletion after 30 seconds (grace period for retries)
  setTimeout(() => {
    otpStore.delete(identifier);
    console.log(`🗑️ OTP deleted for identifier: ${identifier}`);
  }, 30000);
  
  return true;
}

// ComBirds SMS Service Configuration
interface ComBirdsConfig {
  apiKey: string;
  userId: string;
  password: string;
  senderId: string;
  otpTemplateId: string;
  baseUrl: string;
}

class ComBirdsSMSService {
  private config: ComBirdsConfig;
  private initialized: boolean;

  constructor() {
    this.config = {
      apiKey: process.env.COMBIRDS_API_KEY || '',
      userId: process.env.COMBIRDS_USER_ID || '',
      password: process.env.COMBIRDS_PASSWORD || '',
      senderId: process.env.COMBIRDS_HEADER || 'EDUMRC',
      otpTemplateId: '1707168926925165526', // Fixed DLT template ID
      baseUrl: 'https://smsapi.edumarcsms.com/api/v1'
    };
    
    this.initialized = !!(this.config.apiKey && this.config.userId && this.config.password);
  }

  validateMobileNumber(mobile: string): { isValid: boolean; cleaned: string; error?: string } {
    // Remove spaces, dashes, country code
    const cleaned = mobile.replace(/[\s\-\+]/g, '').replace(/^91/, '');
    
    // Must be 10 digits starting with 6-9
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      return {
        isValid: false,
        cleaned: '',
        error: 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9'
      };
    }
    
    return { isValid: true, cleaned };
  }

  async sendOTP(mobile: string, otp: string): Promise<{ success: boolean; message: string; error?: string }> {
    // Validate mobile number
    const validation = this.validateMobileNumber(mobile);
    if (!validation.isValid) {
      return { success: false, message: validation.error || 'Invalid mobile number' };
    }

    const cleanMobile = validation.cleaned;

    // If not initialized (no credentials), fall back to console logging
    if (!this.initialized) {
      console.log(`📱 Mobile OTP for +91 ${cleanMobile}: ${otp}`);
      console.log(`This OTP will expire in 10 minutes`);
      console.log(`⚠️  ComBirds SMS API not configured - OTP logged to console only`);
      return { 
        success: true, 
        message: `OTP logged to console (SMS API not configured): ${otp}` 
      };
    }

    // Create OTP message (must match DLT template)
    const otpMessage = `Your Pixelspot OTP for verification is: ${otp}. OTP is confidential, refrain from sharing it with anyone. By Edumarc Technologies`;
    
    const payload = {
      number: [cleanMobile],
      message: otpMessage,
      senderId: this.config.senderId,
      templateId: this.config.otpTemplateId
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/sendsms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.config.apiKey
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.data?.msg?.includes('SMS Submitted')) {
        console.log(`✅ SMS sent to +91 ${cleanMobile}`);
        console.log(`📱 Transaction ID: ${result.data.transactionId}`);
        console.log(`📤 Sender ID: ${this.config.senderId}`);
        console.log(`📋 Full response:`, JSON.stringify(result));
        return {
          success: true,
          message: `OTP sent to +91 ${cleanMobile}`
        };
      } else {
        console.error('ComBirds SMS error:', result);
        console.error(`❌ Failed with sender ID: ${this.config.senderId}`);
        return {
          success: false,
          message: 'Failed to send SMS',
          error: result.message
        };
      }
    } catch (error: any) {
      console.error('ComBirds SMS service error:', error);
      return {
        success: false,
        message: 'SMS service error',
        error: error.message
      };
    }
  }
}

// Initialize SMS service
const smsService = new ComBirdsSMSService();

export async function sendEmailOTP(email: string, code: string): Promise<void> {
  const { emailService } = await import('./email');
  await emailService.sendOTPEmail(email, code, 'verification');
}

export async function sendMobileOTP(mobile: string, code: string): Promise<void> {
  const result = await smsService.sendOTP(mobile, code);
  
  if (!result.success) {
    console.error('Failed to send mobile OTP:', result.message, result.error);
    // Don't throw error - just log it. OTP is still valid in memory
  }
}
