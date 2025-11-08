# AWS SES Email Fix Guide

## 🔍 **Problem Identified**

Your AWS SES account is currently in **SANDBOX MODE**, which means:
- ✅ Can send emails to **verified email addresses only**
- ❌ Cannot send to arbitrary user emails (registration, notifications, etc.)
- ⚠️ The sender email `noreply@pixelspot.in` **MUST be verified** in AWS SES

## 🎯 **Quick Solutions**

### **Option 1: Request Production Access (RECOMMENDED)**

This removes all restrictions and allows sending to any email address.

#### Steps:
1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Select region: **us-east-1** (your configured region)
3. Click **"Account Dashboard"** in left sidebar
4. Look for **"Request production access"** button
5. Fill out the form:
   - **Mail type**: Transactional
   - **Website URL**: https://connect.pixelspot.in
   - **Use case description**:
     ```
     PixelSpot is a digital outdoor advertising platform that connects screen owners with advertisers. We need to send:
     - OTP verification emails during user registration
     - Account notification emails (screen approvals, campaign updates)
     - Estimated volume: 100-500 emails/day
     - All emails are user-initiated and expected.
     ```
   - **Compliance with AWS policies**: Yes (check the box)
6. Submit request
7. **Approval time**: Usually 24-48 hours

---

### **Option 2: Verify Sender Email Address (DO THIS NOW)**

Even in sandbox mode, you MUST verify the sender email.

#### Steps:
1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Region: **us-east-1**
3. Left sidebar: **"Verified identities"**
4. Click **"Create identity"**
5. Select **"Email address"**
6. Enter: `noreply@pixelspot.in`
7. Click **"Create identity"**
8. **Check the inbox** of `noreply@pixelspot.in`
9. Click verification link in email from AWS

**⚠️ IMPORTANT:** You need access to `noreply@pixelspot.in` inbox to verify it!

**Alternative if you don't have access:**
- Use your own verified email temporarily (e.g., `sanket@justsigns.co.in`)
- Update `.env.development` and `.env.production`:
  ```bash
  AWS_SES_FROM_EMAIL=sanket@justsigns.co.in
  ```

---

### **Option 3: Verify Domain (BEST FOR PRODUCTION)**

Verify the entire domain `pixelspot.in` to send from ANY email @pixelspot.in

#### Steps:
1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Region: **us-east-1**
3. Left sidebar: **"Verified identities"**
4. Click **"Create identity"**
5. Select **"Domain"**
6. Enter: `pixelspot.in`
7. Click **"Create identity"**
8. AWS will provide **DNS records** (DKIM, TXT)
9. Add these DNS records to your domain registrar (Hostinger, GoDaddy, etc.)
10. Wait for DNS propagation (24-48 hours)
11. AWS will automatically verify once DNS is detected

---

### **Option 4: Verify Test Recipient Emails (TEMPORARY)**

For testing in sandbox mode, verify the email addresses you want to send to.

#### Steps:
1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Region: **us-east-1**
3. Left sidebar: **"Verified identities"**
4. Click **"Create identity"**
5. Select **"Email address"**
6. Enter test email (e.g., `sanket@example.com`)
7. Click **"Create identity"**
8. Check that email's inbox
9. Click verification link

Repeat for each test email you need.

---

## 🧪 **Testing Email After Fix**

### **Test 1: Using Our Test Script**

```powershell
# Test with a verified email
node test-email-ses.cjs your-verified-email@example.com
```

Expected output:
```
✅ SUCCESS! Email sent successfully
Message ID: <some-id>
```

### **Test 2: Test Registration Flow**

```powershell
# Start your development server
npm run dev

# Then test registration with a verified email in browser
```

---

## 🔧 **Current Configuration**

```bash
AWS_SES_SMTP_USER=AKIARSDDW6TIQTRXVFNJ
AWS_SES_SMTP_PASSWORD=BAHOcifnPq+38CpAGeK6VC4SzDX2o/11NVoVpM+nvnFe
AWS_SES_FROM_EMAIL=noreply@pixelspot.in
AWS_SES_REGION=us-east-1
```

**Status:**
- ✅ Credentials are valid
- ✅ Region is correct
- ❌ Sender email NOT verified (needs verification)
- ❌ Account in SANDBOX mode (needs production access request)

---

## 🚀 **Recommended Action Plan**

**IMMEDIATE (5 minutes):**
1. ✅ Verify sender email `noreply@pixelspot.in` (OR use your own email temporarily)
2. ✅ Verify your test email address for testing

**SHORT-TERM (Today):**
3. ✅ Request production access (takes 24-48 hours for approval)
4. ✅ Test email sending with verified addresses

**LONG-TERM (This week):**
5. ✅ Verify domain `pixelspot.in` for better deliverability
6. ✅ Set up SPF, DKIM, DMARC records for email authentication

---

## 📋 **Verification Checklist**

- [ ] Sender email verified (`noreply@pixelspot.in` or alternative)
- [ ] At least one test recipient email verified
- [ ] Production access requested
- [ ] Test script runs successfully
- [ ] Registration flow sends OTP emails
- [ ] Notification emails working

---

## ❓ **Common Errors & Solutions**

### Error: "Email address is not verified"
**Solution:** Verify the sender email in AWS SES Console

### Error: "MessageRejected: Email address is not verified"
**Solution:** Verify the recipient email (only needed in sandbox mode)

### Error: "ETIMEDOUT" or "Connection timeout"
**Solution:** Port 587 is blocked by your ISP/network. Use mobile hotspot or VPN.

### Error: "Invalid login credentials"
**Solution:** SMTP credentials are wrong. Generate new ones in AWS SES Console.

---

## 🔗 **Useful Links**

- [AWS SES Console](https://console.aws.amazon.com/ses/)
- [Request Production Access](https://console.aws.amazon.com/ses/home?region=us-east-1#/account)
- [Verified Identities](https://console.aws.amazon.com/ses/home?region=us-east-1#/verified-identities)
- [SMTP Settings](https://console.aws.amazon.com/ses/home?region=us-east-1#/smtp)

---

## 📞 **Need Help?**

Run the test script to diagnose:
```powershell
node test-email-ses.cjs your-email@example.com
```

The script will tell you exactly what's wrong and how to fix it!
