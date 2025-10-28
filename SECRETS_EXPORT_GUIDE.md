# Exporting Secrets from Replit to Production Server

This guide explains how to export all environment variables and secrets from your Replit workspace to deploy on your Hetzner Ubuntu server.

## 📋 Quick Status

### ✅ Already Configured in Replit (Ready to Export)
- Database (PostgreSQL/Neon)
- Firebase Authentication (Client & Admin)
- AWS SES Email Service
- ComBirds SMS Service
- Google Maps API
- OpenAI API
- Session Security
- Object Storage

### ⚠️ Missing Secrets (Need to Add)
- `STRIPE_SECRET_KEY` - Stripe production secret key
- `VITE_STRIPE_PUBLIC_KEY` - Stripe production public key
- `COMBIRDS_OTP_TEMPLATE_ID` - ComBirds template ID for OTP messages
- `FIREBASE_PRIVATE_KEY` - Firebase Admin SDK private key
- `FIREBASE_CLIENT_EMAIL` - Firebase Admin SDK client email

---

## Method 1: Export All Secrets via Replit Shell

### Step 1: Open Replit Shell
In your Replit workspace, open the Shell tool.

### Step 2: Run Export Command
```bash
printenv | grep -E '^(DATABASE_URL|VITE_FIREBASE|FIREBASE|AWS_SES|COMBIRDS|VITE_GOOGLE_MAPS|OPENAI|SESSION_SECRET|STRIPE|DEFAULT_OBJECT|PUBLIC_OBJECT|PRIVATE_OBJECT|PG)' > .env.export
```

### Step 3: View Exported File
```bash
cat .env.export
```

### Step 4: Copy to Your Local Machine
In the Replit Shell, display the file and copy its contents:
```bash
cat .env.export
```

Then paste this into a file on your local machine named `.env.production`

---

## Method 2: Manual Export via Replit Secrets UI

### Step 1: Access Secrets Tool
1. In Replit workspace, click "Tools" in the left sidebar
2. Select "Secrets" from the tools menu
3. You'll see all configured secrets

### Step 2: Copy Each Secret
Copy the following secrets and their values:

#### Database
- `DATABASE_URL`
- `PGHOST`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`
- `PGPORT`

#### Firebase (Client)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

#### AWS SES
- `AWS_SES_SMTP_USER`
- `AWS_SES_SMTP_PASSWORD`

#### ComBirds SMS
- `COMBIRDS_API_KEY`
- `COMBIRDS_USER_ID`
- `COMBIRDS_PASSWORD`
- `COMBIRDS_HEADER`

#### Google Maps
- `VITE_GOOGLE_MAPS_API_KEY`

#### OpenAI
- `OPENAI_API_KEY`

#### Security
- `SESSION_SECRET`

#### Object Storage
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`
- `PUBLIC_OBJECT_SEARCH_PATHS`
- `PRIVATE_OBJECT_DIR`

---

## Method 3: Quick Copy Script

### Create a helper script in Replit:
```bash
cat > export-secrets.sh << 'EOF'
#!/bin/bash
echo "# Pixelspot Production Environment Variables"
echo "# Generated: $(date)"
echo ""
echo "# Database"
echo "DATABASE_URL=$DATABASE_URL"
echo "PGHOST=$PGHOST"
echo "PGUSER=$PGUSER"
echo "PGPASSWORD=$PGPASSWORD"
echo "PGDATABASE=$PGDATABASE"
echo "PGPORT=$PGPORT"
echo ""
echo "# Firebase Client"
echo "VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY"
echo "VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID"
echo "VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID"
echo ""
echo "# AWS SES"
echo "AWS_SES_SMTP_USER=$AWS_SES_SMTP_USER"
echo "AWS_SES_SMTP_PASSWORD=$AWS_SES_SMTP_PASSWORD"
echo "AWS_SES_FROM_EMAIL=noreply@pixelspot.in"
echo ""
echo "# ComBirds"
echo "COMBIRDS_API_KEY=$COMBIRDS_API_KEY"
echo "COMBIRDS_USER_ID=$COMBIRDS_USER_ID"
echo "COMBIRDS_PASSWORD=$COMBIRDS_PASSWORD"
echo "COMBIRDS_HEADER=$COMBIRDS_HEADER"
echo ""
echo "# Google Maps"
echo "VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY"
echo ""
echo "# OpenAI"
echo "OPENAI_API_KEY=$OPENAI_API_KEY"
echo ""
echo "# Security"
echo "SESSION_SECRET=$SESSION_SECRET"
echo ""
echo "# Object Storage"
echo "DEFAULT_OBJECT_STORAGE_BUCKET_ID=$DEFAULT_OBJECT_STORAGE_BUCKET_ID"
echo "PUBLIC_OBJECT_SEARCH_PATHS=$PUBLIC_OBJECT_SEARCH_PATHS"
echo "PRIVATE_OBJECT_DIR=$PRIVATE_OBJECT_DIR"
EOF

chmod +x export-secrets.sh
./export-secrets.sh > .env.production
```

Then view and copy:
```bash
cat .env.production
```

---

## 🔐 Missing Secrets - How to Get Them

### 1. Firebase Admin SDK Credentials
**Where:** Firebase Console → Project Settings → Service Accounts

1. Go to https://console.firebase.google.com/
2. Select your project: `pixelspot-f4010`
3. Click "Project Settings" (gear icon)
4. Go to "Service Accounts" tab
5. Click "Generate New Private Key"
6. Download the JSON file
7. Extract these values:
   - `FIREBASE_PRIVATE_KEY` - The `private_key` field (keep the `\n` characters)
   - `FIREBASE_CLIENT_EMAIL` - The `client_email` field

### 2. Stripe Keys
**Where:** Stripe Dashboard → Developers → API Keys

1. Go to https://dashboard.stripe.com/
2. Navigate to Developers → API Keys
3. Copy:
   - `STRIPE_SECRET_KEY` - The secret key (starts with `sk_live_`)
   - `VITE_STRIPE_PUBLIC_KEY` - The publishable key (starts with `pk_live_`)

**For Testing:**
- Use test mode keys (sk_test_ and pk_test_) for staging environment

### 3. ComBirds OTP Template ID
**Where:** ComBirds Dashboard → Templates

1. Log in to https://combirds.com/
2. Go to Templates section
3. Find your OTP template
4. Copy the Template ID
5. Add as `COMBIRDS_OTP_TEMPLATE_ID`

---

## 📤 Transfer to Production Server

### Option A: SCP (Secure Copy)
```bash
# On your local machine
scp .env.production root@your-hetzner-ip:/var/www/pixelspot/.env
```

### Option B: Manual Copy
1. SSH into your Hetzner server:
   ```bash
   ssh root@your-hetzner-ip
   ```

2. Create the .env file:
   ```bash
   cd /var/www/pixelspot
   nano .env
   ```

3. Paste all the environment variables
4. Save and exit (Ctrl+X, Y, Enter)

### Option C: Use Deployment Script
The automated deployment script (`deployment/deploy.sh`) will prompt you to create the `.env` file during setup.

---

## 🔒 Security Best Practices

### 1. File Permissions
```bash
chmod 600 /var/www/pixelspot/.env
chown pixelspot:pixelspot /var/www/pixelspot/.env
```

### 2. Never Commit .env Files
Ensure `.env` is in your `.gitignore`:
```bash
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
echo "!.env.production.example" >> .gitignore
```

### 3. Backup Secrets Securely
Store a backup copy in a secure password manager or encrypted vault, NOT in Git.

---

## ✅ Verification

After setting up `.env` on production:

### 1. Verify File Exists
```bash
ls -la /var/www/pixelspot/.env
```

### 2. Check Variables are Loaded
```bash
cd /var/www/pixelspot
pm2 start ecosystem.config.js
pm2 logs pixelspot-backend --lines 50
```

Look for initialization messages confirming:
- ✅ Database connection
- ✅ AWS SES email service
- ✅ Firebase admin initialized
- ✅ Security measures enabled

### 3. Test Each Service
```bash
# Test database connection
npm run db:check

# Test email service (if you have a test script)
npm run test:email

# Check all environment variables loaded
pm2 env 0
```

---

## 🚨 Troubleshooting

### Variables Not Loading
```bash
# Check PM2 environment
pm2 env 0

# Restart with explicit env file
pm2 restart pixelspot-backend --update-env

# Force reload
pm2 reload ecosystem.config.js
```

### Firebase Admin Errors
- Ensure `FIREBASE_PRIVATE_KEY` includes `\n` characters
- Verify it's wrapped in double quotes
- Check `FIREBASE_CLIENT_EMAIL` matches downloaded JSON

### Database Connection Issues
- Verify `DATABASE_URL` is complete and correct
- Check Neon database is not paused
- Test connection: `psql $DATABASE_URL`

---

## 📞 Need Help?

If you encounter issues during export or setup:
1. Check the main [DEPLOYMENT.md](./DEPLOYMENT.md) guide
2. Review [TROUBLESHOOTING.md](./deployment/TROUBLESHOOTING.md)
3. Verify all secrets are correctly formatted (no extra spaces, quotes where needed)

---

## 📝 Production Checklist

- [ ] All Replit secrets exported
- [ ] Firebase Admin SDK credentials added
- [ ] Stripe production keys configured
- [ ] ComBirds template ID added
- [ ] `.env` file created on server
- [ ] File permissions set correctly (600)
- [ ] PM2 successfully loads all variables
- [ ] All services initialize without errors
- [ ] Backup of `.env` stored securely

---

**Ready to Deploy?** Follow the main deployment guide in [DEPLOYMENT.md](./DEPLOYMENT.md)
