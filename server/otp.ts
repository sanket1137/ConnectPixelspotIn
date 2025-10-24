// Simple in-memory OTP storage
// In production, use Redis or database with TTL

interface OTPData {
  code: string;
  expiresAt: number;
  type: 'email' | 'mobile';
  target: string; // email address or mobile number
}

const otpStore = new Map<string, OTPData>();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of otpStore.entries()) {
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
    return false;
  }
  
  if (otpData.expiresAt < Date.now()) {
    otpStore.delete(identifier);
    return false;
  }
  
  if (otpData.code !== code) {
    return false;
  }
  
  // OTP is valid, delete it
  otpStore.delete(identifier);
  return true;
}

export function sendEmailOTP(email: string, code: string): Promise<void> {
  // For now, just log the OTP
  // In production, integrate with SendGrid or similar
  console.log(`📧 Email OTP for ${email}: ${code}`);
  console.log(`This OTP will expire in 10 minutes`);
  
  // TODO: Send actual email using SendGrid/Resend
  return Promise.resolve();
}

export function sendMobileOTP(mobile: string, code: string): Promise<void> {
  // For now, just log the OTP
  // In production, integrate with Twilio
  console.log(`📱 Mobile OTP for ${mobile}: ${code}`);
  console.log(`This OTP will expire in 10 minutes`);
  
  // TODO: Send actual SMS using Twilio
  return Promise.resolve();
}
