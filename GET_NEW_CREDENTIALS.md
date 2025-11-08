## ⚠️ YOUR CURRENT SMTP CREDENTIALS ARE INVALID

The test failed with:
```
535 Authentication Credentials Invalid
User "AKIARSDDW6TIQTRXVFNJ" failed to authenticate
```

This means the SMTP password is **wrong or expired**.

---

## 🔑 You Need to Get NEW Credentials

**Choose ONE of these methods:**

### **Method 1: AWS SES API Credentials (RECOMMENDED) ✅**

**Why:** Works even when port 587 is blocked (your production server blocks it!)

**Steps:**
1. Open: https://console.aws.amazon.com/iam/home#/users
2. Click **"Create user"**
3. Username: `pixelspot-ses-sender`
4. Click **"Next"**
5. Select **"Attach policies directly"**
6. Search and check: **`AmazonSESFullAccess`**
7. Click **"Next"** → **"Create user"**
8. Click on the user → **"Security credentials"** tab
9. Click **"Create access key"**
10. Select **"Application running outside AWS"**
11. Click **"Next"** → **"Create access key"**
12. **COPY THESE NOW:**
    - Access key ID: `AKIA...` (20 chars)
    - Secret access key: `xyz...` (40 chars)

**Add to `.env.development` (lines 22-28):**
```bash
AWS_ACCESS_KEY_ID=AKIA________________  # Paste here
AWS_SECRET_ACCESS_KEY=____________________________  # Paste here
```

---

### **Method 2: Generate NEW SMTP Credentials**

**Steps:**
1. Open: https://console.aws.amazon.com/ses/home?region=us-east-1#/smtp
2. Click **"Create SMTP credentials"**
3. Username: `pixelspot-smtp-2025`
4. Click **"Create user"**
5. **COPY THESE NOW:**
   - SMTP Username: `AKIA...`
   - SMTP Password: `xyz...`

**Replace in `.env.development` (lines 32-33):**
```bash
AWS_SES_SMTP_USER=AKIA________________  # New username
AWS_SES_SMTP_PASSWORD=____________________________  # New password
```

---

## ✅ ALSO REQUIRED: Verify Sender Email

**After getting credentials, you MUST do this:**

1. Go to: https://console.aws.amazon.com/ses/home?region=us-east-1#/verified-identities
2. Click **"Create identity"**
3. Select **"Email address"**
4. Enter: `sanketdhole595@gmail.com` (use YOUR email for testing)
5. Click **"Create identity"**
6. **Check your Gmail inbox**
7. Click the verification link from AWS

**Then update `.env.development` line 36:**
```bash
AWS_SES_FROM_EMAIL=sanketdhole595@gmail.com
```

---

## 🧪 Test After Setup

Once you have credentials:

```powershell
# Test with your verified email
node test-email-ses.cjs sanketdhole595@gmail.com
```

Expected success:
```
✅ SUCCESS! Email sent successfully
Message ID: <some-id>
```

---

## ⏰ Quick Start (5 minutes)

**Do this NOW:**

1. ✅ Go to AWS IAM and create user (Method 1 above) - 3 min
2. ✅ Copy Access Key ID and Secret Key to `.env.development` - 1 min
3. ✅ Verify `sanketdhole595@gmail.com` in SES Console - 1 min
4. ✅ Update `AWS_SES_FROM_EMAIL=sanketdhole595@gmail.com` - 10 sec
5. ✅ Test: `node test-email-ses.cjs sanketdhole595@gmail.com`

**That's it!** Emails will work. 🎉

---

## 🆘 Need Help?

I've updated your `.env.development` file with clear instructions.

**Next step:** Open one of these links and get your credentials:
- **API Credentials (better):** https://console.aws.amazon.com/iam/home#/users
- **SMTP Credentials (backup):** https://console.aws.amazon.com/ses/home?region=us-east-1#/smtp

Copy the credentials and paste them into `.env.development` where I marked them!
