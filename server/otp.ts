// Database-backed OTP storage (supports PM2 cluster mode)
import { db } from "./db";
import { otps } from "@shared/schema";
import { eq, and, gt, sql as drizzleSql } from "drizzle-orm";

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Clean up expired OTPs every 5 minutes
setInterval(async () => {
  try {
    await db.delete(otps).where(gt(drizzleSql`now()`, otps.expiresAt));
  } catch (e) {
    console.error("OTP cleanup error:", e);
  }
}, 5 * 60 * 1000);

export async function storeOTP(identifier: string, type: 'email' | 'mobile', target: string): Promise<string> {
  const code = generateOTP();
  const validityMinutes = type === 'mobile' ? 2 : 10;
  const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);

  // Upsert: delete existing OTPs for this identifier, then insert new one
  await db.delete(otps).where(eq(otps.identifier, identifier));
  await db.insert(otps).values({ identifier, code, type, target, expiresAt });

  return code;
}

export async function verifyOTP(identifier: string, code: string): Promise<boolean> {
  const rows = await db.select().from(otps)
    .where(and(eq(otps.identifier, identifier), gt(otps.expiresAt, drizzleSql`now()`)))
    .limit(1);

  const otpData = rows[0];

  if (!otpData) {
    console.log(`❌ OTP not found or expired for identifier: ${identifier}`);
    return false;
  }

  // Allow recently-used OTPs (30s grace window for duplicate requests)
  if (otpData.used) {
    const createdMs = new Date(otpData.createdAt).getTime();
    if (Date.now() - createdMs < 30000) {
      console.log(`✅ OTP already used recently for ${identifier}, allowing duplicate verification`);
      return true;
    }
    console.log(`❌ OTP already used for identifier: ${identifier}`);
    return false;
  }

  if (otpData.code !== code) {
    console.log(`❌ OTP code mismatch for identifier: ${identifier}`);
    return false;
  }

  // Mark as used (keep for 30s grace period, cleanup job removes expired)
  await db.update(otps).set({ used: true }).where(eq(otps.id, otpData.id));
  console.log(`✅ OTP verified and marked as used for identifier: ${identifier}`);

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
      otpTemplateId: process.env.COMBIRDS_OTP_TEMPLATE_ID || '1707178064151587006',
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
    const otpMessage = `Dear Pixelspot user, your OTP for login is: ${otp}. This code is valid for 2 minutes. OTP is confidential. Do not share it with anyone. - EDUMARC`;
    
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
