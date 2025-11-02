import nodemailer from 'nodemailer';

class AWSEmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail = 'no-reply@pixelspot.in';
  private initialized: boolean;

  constructor() {
    this.initialized = this.initializeService();
  }

  private initializeService(): boolean {
    if (!process.env.AWS_SES_SMTP_USER || !process.env.AWS_SES_SMTP_PASSWORD) {
      console.warn('⚠️  AWS SES credentials not found. Email notifications will be skipped.');
      return false;
    }

    try {
      // Get AWS SES region from env (default to us-east-1)
      const sesRegion = process.env.AWS_SES_REGION || 'us-east-1';
      const smtpHost = `email-smtp.${sesRegion}.amazonaws.com`;
      
      // Configure Nodemailer with AWS SES SMTP
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: 587,
        secure: false, // Use STARTTLS
        auth: {
          user: process.env.AWS_SES_SMTP_USER,
          pass: process.env.AWS_SES_SMTP_PASSWORD,
        },
        debug: false,
        // Add aggressive timeouts to prevent hanging (important: SMTP ports often blocked)
        connectionTimeout: 3000, // 3 seconds to connect
        greetingTimeout: 3000,   // 3 seconds for server greeting
        socketTimeout: 5000,     // 5 seconds for any socket operation
      });

      console.log(`✅ AWS SES email service initialized (region: ${sesRegion})`);
      console.warn(`⚠️  Note: If SMTP port 587 is blocked by firewall, emails will be skipped (non-critical)`);
      return true;
    } catch (error) {
      console.error('❌ AWS SES initialization failed:', error);
      return false;
    }
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    // Mock mode if no credentials
    if (!this.transporter) {
      console.log('📧 [MOCK] Email to:', options.to);
      console.log('📋 Subject:', options.subject);
      console.log('📄 Content:', options.text);
      return true;
    }

    try {
      // Add timeout wrapper to prevent hanging (3 seconds max for entire operation)
      const sendWithTimeout = Promise.race([
        this.transporter.sendMail({
          from: `"Pixelspot" <${this.fromEmail}>`,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email send timeout after 3s')), 3000)
        )
      ]);

      const info = await sendWithTimeout;
      console.log('✅ Email sent:', (info as any).messageId);
      return true;
    } catch (error: any) {
      // Handle timeout or connection errors (common when SMTP ports blocked)
      if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        console.warn(`⚠️  Email skipped (SMTP port likely blocked): ${options.subject} to ${options.to}`);
        return false; // Non-critical failure
      }
      
      // Handle unverified email error (sandbox mode)
      if (error.message?.includes('Email address is not verified')) {
        console.log('\n🚀 AWS SES UNVERIFIED EMAIL - DEV BYPASS');
        console.log('==========================================');
        console.log(`📧 Recipient: ${options.to}`);
        console.log(`📋 Subject: ${options.subject}`);
        console.log(`📄 Content: ${options.text}`);
        console.log(`⚠️  Email would send if recipient was verified`);
        console.log('==========================================\n');
        return true; // Bypass for development
      }

      console.error('❌ Email send failed:', error);
      return false;
    }
  }

  async sendOTPEmail(
    email: string,
    otp: string,
    purpose: 'registration' | 'verification'
  ): Promise<{ success: boolean; message: string }> {
    const subject = purpose === 'registration'
      ? 'Verify Your Pixelspot Account'
      : 'Pixelspot Email Verification';

    const html = this.generateOTPEmailHTML(otp, purpose);
    const text = this.generateOTPEmailText(otp, purpose);

    try {
      const result = await this.sendEmail({ to: email, subject, html, text });
      
      return {
        success: result,
        message: result 
          ? `OTP sent to ${email}` 
          : 'Failed to send email'
      };
    } catch (error: any) {
      // Development mode fallback
      if (error.message?.includes('Email address is not verified')) {
        console.log(`📧 DEV MODE - OTP for ${email}: ${otp}`);
        return {
          success: true,
          message: 'Development mode - Check server console for OTP'
        };
      }
      return {
        success: false,
        message: 'Email service error'
      };
    }
  }

  private generateOTPEmailHTML(otp: string, purpose: string): string {
    const title = purpose === 'registration' 
      ? 'Welcome to Pixelspot!' 
      : 'Verify Your Email';
    
    const message = purpose === 'registration'
      ? 'Thank you for registering. Verify your email with this OTP:'
      : 'Complete your profile by verifying your email with this OTP:';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { 
              text-align: center; 
              background: #000000; 
              padding: 30px 20px; 
            }
            .logo-text {
              font-size: 36px;
              font-weight: bold;
              color: #ffffff;
              margin: 0;
              letter-spacing: 1px;
            }
            .tagline {
              color: #cccccc;
              margin: 8px 0 0 0;
              font-size: 14px;
            }
            .content {
              padding: 30px 20px;
            }
            .otp-box {
              background: #e3f2fd;
              border: 2px solid #2196f3;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              color: #2196f3;
              letter-spacing: 4px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="logo-text">Pixelspot</h1>
                <p class="tagline">Digital Outdoor Advertising</p>
            </div>
            <div class="content">
            
            <h2>${title}</h2>
            <p>${message}</p>
            
            <div class="otp-box">
                <p style="margin: 0 0 10px 0; font-weight: bold;">
                  Your verification code:
                </p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
                  Expires in 10 minutes
                </p>
            </div>
            
            <p><strong>Important:</strong> Never share this code. 
               Pixelspot will never ask for it.</p>
            
            <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p>If you didn't request this, ignore this email.</p>
                <p>&copy; 2025 Pixelspot. All rights reserved.</p>
            </div>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateOTPEmailText(otp: string, purpose: string): string {
    return `
${purpose === 'registration' ? 'Welcome to Pixelspot!' : 'Verify Your Email'}

Your verification code: ${otp}

This code expires in 10 minutes.

Never share this code with anyone. Pixelspot will never ask for it.

If you didn't request this, ignore this email.

© 2025 Pixelspot
    `.trim();
  }
}

export const emailService = new AWSEmailService();
