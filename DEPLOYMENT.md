# Pixelspot Production Deployment Guide

Complete guide for deploying Pixelspot DOOH Advertising Platform on **Hetzner Ubuntu Server 22.04/24.04**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Specifications](#server-specifications)
3. [Quick Start (Automated)](#quick-start-automated)
4. [Manual Setup (Step-by-Step)](#manual-setup-step-by-step)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Application Deployment](#application-deployment)
8. [SSL/HTTPS Configuration](#ssl-https-configuration)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Backup & Recovery](#backup--recovery)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts & Services

- ✅ Hetzner Cloud account with Ubuntu 22.04/24.04 server
- ✅ Domain name (e.g., pixelspot.in) with DNS access
- ✅ Firebase Project (for authentication)
- ✅ AWS Account (for SES email service)
- ✅ ComBirds Account (for Indian SMS/OTP)
- ✅ Google Cloud Project (for Maps API)
- ✅ OpenAI API Key (for AI Campaign Advisor)
- ✅ Stripe Account (for payment processing)
- ✅ PostgreSQL Database (Neon or self-hosted)

### Local Requirements

- Git installed
- SSH client
- Database export tool (pg_dump) if migrating data

---

## Server Specifications

### Recommended Hetzner Server

**Minimum:**
- **Plan**: CPX21 or better
- **CPU**: 3 vCPUs
- **RAM**: 4 GB
- **Storage**: 80 GB SSD
- **Bandwidth**: 20 TB
- **Cost**: ~€8/month

**Production:**
- **Plan**: CPX31 or better
- **CPU**: 4 vCPUs
- **RAM**: 8 GB
- **Storage**: 160 GB SSD
- **Bandwidth**: 20 TB
- **Cost**: ~€15/month

### Operating System
- Ubuntu 22.04 LTS (Recommended)
- Ubuntu 24.04 LTS

---

## Quick Start (Automated)

For experienced teams, use our automated scripts:

```bash
# 1. SSH into your server
ssh root@YOUR_SERVER_IP

# 2. Clone the repository
git clone https://github.com/YOUR_ORG/pixelspot.git
cd pixelspot

# 3. Run automated setup
chmod +x deployment/setup-server.sh
./deployment/setup-server.sh

# 4. Configure environment variables
cp .env.production.template .env.production
nano .env.production  # Fill in all credentials

# 5. Setup database
chmod +x deployment/setup-database.sh
./deployment/setup-database.sh

# 6. Deploy application
chmod +x deployment/deploy.sh
./deployment/deploy.sh

# 7. Setup SSL (see SSL-SETUP.md)
```

Continue to [SSL/HTTPS Configuration](#ssl-https-configuration) for HTTPS setup.

---

## Manual Setup (Step-by-Step)

### Step 1: Initial Server Setup

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git ufw

# Create application user
adduser pixelspot
usermod -aG sudo pixelspot

# Setup SSH for application user (optional but recommended)
su - pixelspot
```

### Step 2: Install Node.js 20.x (LTS)

```bash
# Install Node.js from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v  # Should show v20.x.x
npm -v   # Should show v10.x.x
```

### Step 3: Install PostgreSQL

**Option A: Use Neon PostgreSQL (Recommended)**

Skip this step if using Neon. You'll only need the connection string.

**Option B: Install PostgreSQL Locally**

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql

# Inside PostgreSQL shell:
CREATE DATABASE pixelspot_db;
CREATE USER pixelspot_user WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE pixelspot_db TO pixelspot_user;
ALTER DATABASE pixelspot_db OWNER TO pixelspot_user;
\q

# Exit postgres user
exit
```

### Step 4: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 startup script
pm2 startup systemd
# Copy and run the command it outputs
```

### Step 5: Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 6: Configure Firewall

```bash
# Configure UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Environment Variables

### Create Production Environment File

```bash
cd /var/www/pixelspot
cp .env.production.template .env.production
nano .env.production
```

### Required Environment Variables

See `.env.production.template` for complete list with descriptions.

**Critical Variables:**

```env
# Application
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Firebase (Authentication)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=1:123...

# AWS SES (Email)
AWS_SES_SMTP_USER=AKIA...
AWS_SES_SMTP_PASSWORD=your-smtp-password

# ComBirds (SMS - India)
COMBIRDS_API_KEY=your-api-key
COMBIRDS_USER_ID=your-user-id
COMBIRDS_PASSWORD=your-password
COMBIRDS_HEADER=PIXLSP  # DLT approved sender ID

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=AIza...

# OpenAI (AI Advisor)
OPENAI_API_KEY=sk-...

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Session Security
SESSION_SECRET=generate-random-64-char-string
```

### Generate Secure SESSION_SECRET

```bash
# Generate random 64-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Setup

### Option 1: Using Neon PostgreSQL (Recommended)

1. Create Neon account at https://neon.tech
2. Create new project: "pixelspot-production"
3. Copy connection string
4. Add to `.env.production` as `DATABASE_URL`
5. Run migrations:

```bash
cd /var/www/pixelspot
npm install
npm run db:push
```

### Option 2: Migrate from Replit Database

```bash
# On Replit - Export database
pg_dump -U postgres -h $PGHOST -p $PGPORT -d $PGDATABASE -f pixelspot-backup.sql

# Download the SQL file to your local machine
# Then upload to your Hetzner server
scp pixelspot-backup.sql root@YOUR_SERVER_IP:/tmp/

# On Hetzner server - Import database
sudo -u postgres psql pixelspot_db < /tmp/pixelspot-backup.sql
```

### Option 3: Fresh Database Setup

```bash
cd /var/www/pixelspot
npm install
npm run db:push  # Drizzle will create all tables
```

---

## Application Deployment

### Step 1: Clone Repository

```bash
# Create application directory
sudo mkdir -p /var/www/pixelspot
sudo chown -R pixelspot:pixelspot /var/www/pixelspot

# Clone repository
cd /var/www/pixelspot
git clone https://github.com/YOUR_ORG/pixelspot.git .

# Or upload via rsync
# rsync -avz --exclude 'node_modules' /local/path/pixelspot/ root@YOUR_SERVER_IP:/var/www/pixelspot/
```

### Step 2: Install Dependencies

```bash
cd /var/www/pixelspot
npm install --production=false  # Install all dependencies including dev
```

### Step 3: Build Application

```bash
# Build frontend and backend
npm run build

# Verify build files exist
ls -la dist/  # Should contain index.js and frontend files
```

### Step 4: Configure PM2

Copy the `ecosystem.config.js` file to your project root:

```bash
cp deployment/ecosystem.config.js .
```

### Step 5: Start Application with PM2

```bash
# Start application
pm2 start ecosystem.config.js --env production

# Verify it's running
pm2 status
pm2 logs pixelspot

# Save PM2 configuration
pm2 save
```

### Step 6: Configure Nginx Reverse Proxy

```bash
# Copy Nginx configuration
sudo cp deployment/nginx-pixelspot.conf /etc/nginx/sites-available/pixelspot

# Edit configuration with your domain
sudo nano /etc/nginx/sites-available/pixelspot
# Replace 'yourdomain.com' with your actual domain (e.g., pixelspot.in)

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/pixelspot /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 7: Verify Application

```bash
# Check if app is accessible
curl http://YOUR_SERVER_IP

# Check PM2 status
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check logs
pm2 logs pixelspot
sudo tail -f /var/log/nginx/error.log
```

---

## SSL/HTTPS Configuration

See [SSL-SETUP.md](SSL-SETUP.md) for complete SSL installation guide using Let's Encrypt.

**Quick SSL Setup:**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (automatic Nginx configuration)
sudo certbot --nginx -d pixelspot.in -d www.pixelspot.in

# Test auto-renewal
sudo certbot renew --dry-run
```

After SSL setup, your site will be available at:
- https://pixelspot.in
- https://www.pixelspot.in

---

## Monitoring & Maintenance

### PM2 Monitoring

```bash
# View all processes
pm2 list

# Monitor real-time
pm2 monit

# View logs
pm2 logs pixelspot

# Restart application
pm2 restart pixelspot

# Stop application
pm2 stop pixelspot
```

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### Database Monitoring

```bash
# Connect to database
sudo -u postgres psql pixelspot_db

# Check database size
\l+

# Check table sizes
\dt+

# View active connections
SELECT * FROM pg_stat_activity;
```

### System Resources

```bash
# CPU and Memory usage
htop

# Disk usage
df -h

# Network usage
iftop
```

---

## Backup & Recovery

### Automated Database Backups

```bash
# Setup automated backups
cp deployment/backup-database.sh /var/www/pixelspot/
chmod +x /var/www/pixelspot/backup-database.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /var/www/pixelspot/backup-database.sh
```

### Manual Database Backup

```bash
# Backup database
sudo -u postgres pg_dump pixelspot_db > pixelspot-backup-$(date +%Y%m%d).sql

# Or if using Neon:
pg_dump $DATABASE_URL > pixelspot-backup-$(date +%Y%m%d).sql

# Compress backup
gzip pixelspot-backup-*.sql
```

### Database Restore

```bash
# Restore from backup
sudo -u postgres psql pixelspot_db < pixelspot-backup.sql

# Or if using Neon:
psql $DATABASE_URL < pixelspot-backup.sql
```

### Application Backup

```bash
# Backup uploaded files (if using local storage)
tar -czf pixelspot-files-$(date +%Y%m%d).tar.gz /var/www/pixelspot/uploads

# Backup environment variables
cp .env.production .env.production.backup
```

---

## Updating the Application

### Update Process

```bash
cd /var/www/pixelspot

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Run database migrations (if any)
npm run db:push

# Rebuild application
npm run build

# Restart PM2
pm2 restart pixelspot

# Check logs for errors
pm2 logs pixelspot --lines 50
```

### Zero-Downtime Deployment

PM2 cluster mode (configured in ecosystem.config.js) provides zero-downtime reloads:

```bash
# Graceful reload without downtime
pm2 reload pixelspot
```

---

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for comprehensive troubleshooting guide.

### Common Issues

**Application won't start:**
```bash
# Check PM2 logs
pm2 logs pixelspot --err

# Check environment variables
cat .env.production | grep -v PASSWORD  # Verify vars are set

# Test Node.js version
node -v  # Should be v20.x.x
```

**502 Bad Gateway:**
```bash
# Check if app is running
pm2 status

# Check Nginx configuration
sudo nginx -t

# Verify port 5000 is listening
sudo netstat -tlnp | grep 5000
```

**Database connection errors:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check PostgreSQL is running
sudo systemctl status postgresql
```

---

## Security Checklist

- [ ] Firewall configured (UFW enabled)
- [ ] SSH key-based authentication (disable password auth)
- [ ] Non-root user for application
- [ ] Environment variables secured (not in Git)
- [ ] SSL/HTTPS enabled with auto-renewal
- [ ] Database backups automated
- [ ] Rate limiting enabled (configured in app)
- [ ] CORS properly configured
- [ ] Security headers enabled (Helmet.js)
- [ ] PM2 startup on boot configured
- [ ] Fail2ban installed (optional but recommended)

---

## Performance Optimization

### Enable Gzip in Nginx

Already configured in `nginx-pixelspot.conf`.

### Database Connection Pooling

Already configured in `server/db.ts` using Neon serverless driver.

### PM2 Cluster Mode

Already configured in `ecosystem.config.js` - uses all available CPU cores.

### Cache Static Assets

Already configured in Nginx config with 1-year cache for static files.

---

## Support & Resources

### Documentation
- [SSL Setup Guide](SSL-SETUP.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Environment Variables Template](.env.production.template)

### External Resources
- **PM2 Documentation**: https://pm2.keymetrics.io/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Neon PostgreSQL**: https://neon.tech/docs
- **Let's Encrypt**: https://letsencrypt.org/

### Quick Commands Reference

```bash
# Start application
pm2 start ecosystem.config.js --env production

# View logs
pm2 logs pixelspot

# Restart application
pm2 restart pixelspot

# Reload Nginx
sudo systemctl reload nginx

# Test Nginx config
sudo nginx -t

# View system resources
htop

# Database backup
./deployment/backup-database.sh

# Update application
git pull && npm install && npm run build && pm2 restart pixelspot
```

---

## Contact & Support

For deployment issues, contact:
- **Technical Lead**: your-email@example.com
- **DevOps Team**: devops@example.com

---

**Last Updated**: January 2025
**Version**: 1.0.0
