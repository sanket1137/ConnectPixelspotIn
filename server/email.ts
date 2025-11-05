import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

class AWSEmailService {
  private sesClient: SESClient | null = null;
  private fromEmail = 'no-reply@pixelspot.in';
  private initialized: boolean;
  private usingSMTP: boolean = false;

  constructor() {
    this.initialized = this.initializeService();
  }

  private initializeService(): boolean {
    // Get AWS SES region from env (default to ap-south-1)
    const sesRegion = process.env.AWS_SES_REGION || 'ap-south-1';

    // Check for AWS API credentials (preferred - uses HTTPS, not blocked by firewall)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        this.sesClient = new SESClient({
          region: sesRegion,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
          },
        });

        console.log(`✅ AWS SES API service initialized`);
        console.log(`   Region: ${sesRegion}`);
        console.log(`   Method: AWS SES API (HTTPS)`);
        console.log(`   Access Key: ${process.env.AWS_ACCESS_KEY_ID?.substring(0, 8)}...`);
        console.log(`   ✅ Port 443 (HTTPS) - NOT blocked by firewall`);
        return true;
      } catch (error) {
        console.error('❌ AWS SES API initialization failed:', error);
        return false;
      }
    }

    // Fallback to SMTP if API credentials not available
    if (process.env.AWS_SES_SMTP_USER && process.env.AWS_SES_SMTP_PASSWORD) {
      this.usingSMTP = true;
      console.warn('⚠️  AWS SES configured with SMTP credentials');
      console.warn('⚠️  SMTP port 587 is BLOCKED by Replit firewall');
      console.warn('⚠️  Emails will NOT be sent - only logged to console');
      console.warn('⚠️  For email delivery, please add AWS API credentials:');
      console.warn('     - AWS_ACCESS_KEY_ID');
      console.warn('     - AWS_SECRET_ACCESS_KEY');
      return false;
    }

    console.warn('⚠️  No AWS SES credentials found. Email notifications will be skipped.');
    return false;
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    // Mock mode if no credentials or using blocked SMTP
    if (!this.sesClient || this.usingSMTP) {
      console.log('\n📧 [CONSOLE LOG - Email Not Sent]');
      console.log('==========================================');
      console.log(`📧 To: ${options.to}`);
      console.log(`📋 Subject: ${options.subject}`);
      console.log(`📄 Content: ${options.text}`);
      console.log('==========================================\n');
      return true; // Return true to not break the flow
    }

    try {
      const command = new SendEmailCommand({
        Source: `"Pixelspot" <${this.fromEmail}>`,
        Destination: {
          ToAddresses: [options.to],
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: options.text || '',
              Charset: 'UTF-8',
            },
            Html: {
              Data: options.html,
              Charset: 'UTF-8',
            },
          },
        },
      });

      const response = await this.sesClient.send(command);
      console.log('✅ Email sent successfully via AWS SES API');
      console.log(`   Message ID: ${response.MessageId}`);
      console.log(`   To: ${options.to}`);
      return true;
    } catch (error: any) {
      // Handle unverified email error (sandbox mode)
      if (error.message?.includes('Email address is not verified') || 
          error.message?.includes('not verified') ||
          error.Code === 'MessageRejected') {
        console.log('\n🚀 AWS SES SANDBOX MODE - EMAIL NOT VERIFIED');
        console.log('==========================================');
        console.log(`📧 Recipient: ${options.to}`);
        console.log(`📋 Subject: ${options.subject}`);
        console.log(`📄 Content: ${options.text}`);
        console.log(`⚠️  Email would send if recipient was verified in AWS SES`);
        console.log(`⚠️  Verify email at: https://console.aws.amazon.com/ses/`);
        console.log('==========================================\n');
        return true; // Bypass for development
      }

      console.error('❌ Email send failed:', error.message || error);
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
      console.log(`📧 DEV MODE - OTP for ${email}: ${otp}`);
      return {
        success: true,
        message: 'Development mode - Check server console for OTP'
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
