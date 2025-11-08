# 🔑 AWS SES API Credentials Setup Guide

## ⚠️ **CRITICAL: Port 587 is Blocked on Your Production Server**

Your Hetzner server **blocks SMTP port 587**, which is why emails aren't being sent. This is a common security measure by hosting providers to prevent spam.

**Solution:** Use AWS SES API instead of SMTP (no ports required!)

---

## 📋 **Step 1: Create AWS IAM User with SES Permissions**

### 1.1 Go to AWS IAM Console
- Open: https://console.aws.amazon.com/iam/
- Region: **Global** (IAM is region-independent)

### 1.2 Create New IAM User
1. Click **"Users"** in left sidebar
2. Click **"Create user"**
3. User name: `pixelspot-ses-api`
4. Click **"Next"**

### 1.3 Set Permissions
1. Select **"Attach policies directly"**
2. Search for: **AmazonSESFullAccess**
3. Check the box next to it
4. Click **"Next"**
5. Click **"Create user"**

### 1.4 Create Access Keys
1. Click on the user you just created (`pixelspot-ses-api`)
2. Go to **"Security credentials"** tab
3. Scroll to **"Access keys"** section
4. Click **"Create access key"**
5. Select **"Application running outside AWS"**
6. Click **"Next"**
7. (Optional) Add description: "PixelSpot SES API access"
8. Click **"Create access key"**

### 1.5 **IMPORTANT: Save Credentials Now!**
You'll see:
- **Access key ID**: `AKIA...` (20 characters)
- **Secret access key**: `abcd...` (40 characters)

⚠️ **Save these immediately! You won't see the secret key again!**

---

## 📝 **Step 2: Update Environment Variables**

### 2.1 Update Local Development (`.env.development`)

```bash
# Add these NEW lines (keep existing AWS_SES_SMTP_* for fallback)
AWS_ACCESS_KEY_ID=AKIA________________  # Your Access Key ID
AWS_SECRET_ACCESS_KEY=____________________________  # Your Secret Access Key
AWS_SES_REGION=us-east-1

# Keep existing SMTP credentials as fallback
AWS_SES_SMTP_USER=AKIARSDDW6TIQTRXVFNJ
AWS_SES_SMTP_PASSWORD=BAHOcifnPq+38CpAGeK6VC4SzDX2o/11NVoVpM+nvnFe
AWS_SES_FROM_EMAIL=noreply@pixelspot.in
```

### 2.2 Update Production (`ecosystem.config.cjs`)

Add to the `env_production` section:

```javascript
env_production: {
  // ... existing variables ...
  
  // ADD THESE NEW LINES:
  AWS_ACCESS_KEY_ID: 'AKIA________________',  // Your Access Key ID
  AWS_SECRET_ACCESS_KEY: '____________________________',  // Your Secret Access Key
  AWS_SES_REGION: 'us-east-1',
  
  // Keep existing SMTP credentials
  AWS_SES_SMTP_USER: 'AKIARSDDW6TIQTRXVFNJ',
  AWS_SES_SMTP_PASSWORD: 'BAHOcifnPq+38CpAGeK6VC4SzDX2o/11NVoVpM+nvnFe',
  AWS_SES_FROM_EMAIL: 'noreply@pixelspot.in',
  
  // ... rest of variables ...
}
```

---

## 🎯 **Step 3: Verify Sender Email in AWS SES**

**CRITICAL:** You MUST verify `noreply@pixelspot.in` to send emails!

### Option A: Verify Email Address (Quick)

1. Go to: https://console.aws.amazon.com/ses/
2. Region: **us-east-1** (top-right dropdown)
3. Left sidebar: **"Verified identities"**
4. Click **"Create identity"**
5. Select **"Email address"**
6. Enter: `noreply@pixelspot.in`
7. Click **"Create identity"**
8. **Check the inbox** of noreply@pixelspot.in
9. Click verification link in AWS email

⚠️ **Problem:** You need access to noreply@pixelspot.in inbox!

**Temporary Solution:**
- Use your own email (e.g., `sanket@justsigns.co.in`)
- Update `AWS_SES_FROM_EMAIL` in all env files

### Option B: Verify Domain (Best for Production)

1. Go to: https://console.aws.amazon.com/ses/
2. Region: **us-east-1**
3. Left sidebar: **"Verified identities"**
4. Click **"Create identity"**
5. Select **"Domain"**
6. Enter: `pixelspot.in`
7. Click **"Create identity"**
8. AWS will show DNS records (DKIM, TXT)
9. Add these to your domain's DNS (Hostinger, GoDaddy, etc.)
10. Wait 24-48 hours for verification

---

## 🚀 **Step 4: Request Production Access (Remove Sandbox)**

Currently in **SANDBOX mode** - can only send to verified emails.

### Request Production Access:

1. Go to: https://console.aws.amazon.com/ses/
2. Region: **us-east-1**
3. Left sidebar: **"Account dashboard"**
4. Look for **"Request production access"** button
5. Fill out form:
   - **Mail type**: Transactional
   - **Website URL**: https://connect.pixelspot.in
   - **Use case**:
     ```
     PixelSpot is a digital outdoor advertising platform. We send:
     - OTP verification emails during registration
     - Notification emails for screen approvals and campaigns
     - Expected volume: 100-500 emails/day
     - All emails are user-initiated and expected
     ```
   - **Compliance**: Check "Yes"
6. Submit request
7. **Wait 24-48 hours** for approval

---

## ✅ **Step 5: Deploy & Test**

### 5.1 Test Locally

```powershell
# Start dev server
npm run dev

# Try registration with ANY email
# (In sandbox: must be verified, Production: any email works)
```

### 5.2 Deploy to Production

```powershell
# Build
npm run build

# Deploy
.\deploy-production.ps1
```

### 5.3 Check Production Logs

```powershell
ssh -i pixelssh root@188.245.231.251 "pm2 logs --lines 20"
```

Look for:
```
✅ AWS SES API initialized (region: us-east-1) - Using SES API (port-free)
✅ Email sent via SES API: <message-id>
```

---

## 🎉 **Expected Results**

### Before (SMTP - FAILED):
```
⚠️  Email skipped (SMTP port likely blocked): Pixelspot Email Verification to user@example.com
```

### After (SES API - SUCCESS):
```
✅ AWS SES API initialized (region: us-east-1) - Using SES API (port-free)
✅ Email sent via SES API: 010201934f9a6c8e-abcd1234-5678-90ab-cdef-123456789abc-000000
```

---

## 📊 **Credential Priority**

The system now uses this priority:

1. ✅ **AWS SES API** (if `AWS_ACCESS_KEY_ID` set) - **PREFERRED** (no ports needed)
2. ⚠️ **SMTP** (if only `AWS_SES_SMTP_USER` set) - Requires port 587 (often blocked)
3. 📧 **Mock mode** (if no credentials) - Just logs to console

---

## 🔐 **Security Best Practices**

### ✅ DO:
- Store credentials in environment variables
- Use IAM user with **minimum permissions** (only SES)
- Rotate access keys every 90 days
- Monitor AWS SES sending quota

### ❌ DON'T:
- Commit credentials to git
- Share secret access keys
- Use root AWS account credentials
- Leave unused access keys active

---

## 📞 **Troubleshooting**

### "MessageRejected: Email address is not verified"
**Fix:** Verify sender email in SES Console (Step 3)

### "Access Denied" or "InvalidClientTokenId"
**Fix:** Double-check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

### Still seeing "SMTP port blocked" messages
**Fix:** Make sure AWS_ACCESS_KEY_ID is in environment (restart server after adding)

### Emails going to spam
**Fix:** 
1. Verify domain (not just email)
2. Set up SPF, DKIM, DMARC records
3. Request production access

---

## 🔗 **Quick Links**

- [Create IAM User](https://console.aws.amazon.com/iam/home#/users$new)
- [SES Console](https://console.aws.amazon.com/ses/home?region=us-east-1)
- [Verify Identities](https://console.aws.amazon.com/ses/home?region=us-east-1#/verified-identities)
- [Request Production Access](https://console.aws.amazon.com/ses/home?region=us-east-1#/account)

---

## 📝 **Summary Checklist**

- [ ] Created IAM user with SES permissions
- [ ] Generated Access Key ID and Secret Access Key
- [ ] Added credentials to `.env.development`
- [ ] Added credentials to `ecosystem.config.cjs`
- [ ] Verified sender email (or domain) in SES
- [ ] Requested production access
- [ ] Tested locally
- [ ] Deployed to production
- [ ] Verified emails are sending (check logs)

Once all steps are complete, emails will work on both local and production! 🎉
