// ==========================================
// AWS SES EMAIL TEST SCRIPT
// ==========================================
// This script tests your AWS SES email configuration
// Run: node test-email-ses.cjs <recipient-email>

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load .env.development file
function loadEnv() {
  const envPath = path.join(__dirname, '.env.development');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const [key, ...values] = line.split('=');
    env[key] = values.join('=');
  });
  
  return env;
}

const env = loadEnv();

// AWS SES Credentials (from your .env.development)
const AWS_SES_SMTP_USER = env.AWS_SES_SMTP_USER;
const AWS_SES_SMTP_PASSWORD = env.AWS_SES_SMTP_PASSWORD;
const AWS_SES_REGION = env.AWS_SES_REGION || 'us-east-1';
const AWS_SES_FROM_EMAIL = env.AWS_SES_FROM_EMAIL || 'noreply@pixelspot.in';

async function testEmail(recipientEmail) {
  console.log('\n🔍 Testing AWS SES Email Configuration');
  console.log('=========================================\n');
  
  console.log('Configuration:');
  console.log(`  Region: ${AWS_SES_REGION}`);
  console.log(`  SMTP Host: email-smtp.${AWS_SES_REGION}.amazonaws.com`);
  console.log(`  SMTP Port: 587`);
  console.log(`  SMTP User: ${AWS_SES_SMTP_USER}`);
  console.log(`  From Email: ${AWS_SES_FROM_EMAIL}`);
  console.log(`  To Email: ${recipientEmail || 'NOT PROVIDED'}\n`);

  if (!recipientEmail) {
    console.error('❌ ERROR: Please provide recipient email as argument');
    console.log('Usage: node test-email-ses.js your-email@example.com\n');
    process.exit(1);
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: `email-smtp.${AWS_SES_REGION}.amazonaws.com`,
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: AWS_SES_SMTP_USER,
      pass: AWS_SES_SMTP_PASSWORD,
    },
    debug: true,
    logger: true,
  });

  console.log('📧 Sending test email...\n');

  try {
    const info = await transporter.sendMail({
      from: `"Pixelspot Test" <${AWS_SES_FROM_EMAIL}>`,
      to: recipientEmail,
      subject: 'Test Email from Pixelspot - AWS SES',
      text: 'This is a test email from Pixelspot using AWS SES SMTP.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2196f3;">✅ AWS SES Test Email</h2>
          <p>This email confirms that your AWS SES configuration is working correctly!</p>
          <p><strong>From:</strong> ${AWS_SES_FROM_EMAIL}</p>
          <p><strong>Region:</strong> ${AWS_SES_REGION}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            If you received this email, your AWS SES SMTP setup is working correctly.
          </p>
        </div>
      `,
    });

    console.log('\n✅ SUCCESS! Email sent successfully');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('\n📬 Check your inbox:', recipientEmail);
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('   - If in SES SANDBOX mode, recipient must be verified');
    console.log('   - Check spam/junk folder if not in inbox');
    console.log('   - Verify sender email (noreply@pixelspot.in) is verified in AWS SES\n');

  } catch (error) {
    console.error('\n❌ ERROR: Email send failed\n');
    console.error('Error details:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('Email address is not verified')) {
      console.log('\n🔧 FIX REQUIRED:');
      console.log('   AWS SES is in SANDBOX mode.');
      console.log('   You need to:');
      console.log('   1. Verify the recipient email in AWS SES Console');
      console.log('   2. OR request production access (remove sandbox)');
      console.log('\n   AWS SES Console: https://console.aws.amazon.com/ses/');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.log('\n🔧 FIX REQUIRED:');
      console.log('   Port 587 is blocked on your network/server.');
      console.log('   Solutions:');
      console.log('   1. Use a different network (mobile hotspot)');
      console.log('   2. Contact your ISP/hosting provider');
      console.log('   3. Use AWS SES API instead of SMTP (requires code changes)');
    } else if (error.message.includes('Invalid login')) {
      console.log('\n🔧 FIX REQUIRED:');
      console.log('   SMTP credentials are incorrect.');
      console.log('   Please verify in AWS SES Console:');
      console.log('   https://console.aws.amazon.com/ses/ → SMTP Settings');
    }
    console.log('');
    process.exit(1);
  }
}

// Get recipient email from command line argument
const recipientEmail = process.argv[2];
testEmail(recipientEmail);
