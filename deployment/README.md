# Pixelspot Deployment Package

Complete deployment package for deploying Pixelspot on **Hetzner Ubuntu Server 22.04/24.04**.

---

## 📦 Package Contents

### Documentation
- **[../DEPLOYMENT.md](../DEPLOYMENT.md)** - Master deployment guide (START HERE)
- **[../SSL-SETUP.md](../SSL-SETUP.md)** - SSL/HTTPS certificate installation
- **[../TROUBLESHOOTING.md](../TROUBLESHOOTING.md)** - Common issues and solutions

### Configuration Files
- **[nginx-pixelspot.conf](nginx-pixelspot.conf)** - Nginx reverse proxy configuration
- **[../ecosystem.config.js](../ecosystem.config.js)** - PM2 process manager configuration
- **[../.env.production.template](../.env.production.template)** - Environment variables template

### Automation Scripts
- **[setup-server.sh](setup-server.sh)** - Server setup (Node.js, PostgreSQL, PM2, Nginx)
- **[setup-database.sh](setup-database.sh)** - Database initialization and migrations
- **[deploy.sh](deploy.sh)** - Build and deployment automation
- **[backup-database.sh](backup-database.sh)** - Database backup automation

---

## 🚀 Quick Start

### Step 1: Read the Master Guide

Start with the comprehensive deployment guide:

```bash
# Open and read DEPLOYMENT.md
cat ../DEPLOYMENT.md
```

### Step 2: Prepare Your Server

Requirements:
- Hetzner Ubuntu 22.04/24.04 server
- Root/sudo access
- Domain pointing to server IP

### Step 3: Run Setup Scripts

```bash
# 1. SSH into your server
ssh root@YOUR_SERVER_IP

# 2. Clone repository
git clone https://github.com/YOUR_ORG/pixelspot.git
cd pixelspot

# 3. Make scripts executable
chmod +x deployment/*.sh

# 4. Run server setup
sudo ./deployment/setup-server.sh

# 5. Configure environment variables
cp .env.production.template .env.production
nano .env.production  # Fill in all credentials

# 6. Setup database
./deployment/setup-database.sh

# 7. Deploy application
./deployment/deploy.sh

# 8. Configure Nginx
sudo cp deployment/nginx-pixelspot.conf /etc/nginx/sites-available/pixelspot
sudo nano /etc/nginx/sites-available/pixelspot  # Update domain
sudo ln -s /etc/nginx/sites-available/pixelspot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 9. Setup SSL (see SSL-SETUP.md)
sudo certbot --nginx -d pixelspot.in -d www.pixelspot.in
```

---

## 📋 Deployment Checklist

### Prerequisites
- [ ] Hetzner server provisioned
- [ ] Domain DNS configured (A record)
- [ ] SSH access to server
- [ ] All external service accounts created

### Server Setup
- [ ] Ubuntu server updated
- [ ] Node.js 20.x installed
- [ ] PostgreSQL installed (or Neon configured)
- [ ] PM2 installed
- [ ] Nginx installed
- [ ] Firewall configured

### Application Setup
- [ ] Repository cloned
- [ ] Environment variables configured
- [ ] Database initialized
- [ ] Application built
- [ ] PM2 started and saved

### Web Server Setup
- [ ] Nginx configured
- [ ] SSL certificate installed
- [ ] HTTPS redirect enabled
- [ ] Domain accessible

### Verification
- [ ] Application responds on HTTP
- [ ] Application responds on HTTPS
- [ ] Database connected
- [ ] All external services working
- [ ] PM2 starts on boot

---

## 🔑 Required Credentials

Before deployment, ensure you have:

### Database
- [ ] PostgreSQL connection string (Neon or local)

### Firebase (Authentication)
- [ ] Firebase API Key
- [ ] Firebase Project ID
- [ ] Firebase App ID

### AWS SES (Email)
- [ ] SMTP Username
- [ ] SMTP Password

### ComBirds (SMS - India)
- [ ] API Key
- [ ] User ID
- [ ] Password
- [ ] Sender ID (DLT approved)

### Google Maps
- [ ] API Key (with Maps, Geocoding, Places enabled)

### OpenAI
- [ ] API Key

### Stripe (Payments)
- [ ] Secret Key (Live)
- [ ] Publishable Key (Live)

### Security
- [ ] Session Secret (generated random string)

See [../.env.production.template](../.env.production.template) for complete list.

---

## 📝 Script Descriptions

### setup-server.sh
**Purpose**: Installs all server dependencies
**What it does**:
- Updates system packages
- Installs Node.js 20.x LTS
- Installs PostgreSQL (optional)
- Installs PM2 process manager
- Installs Nginx web server
- Configures firewall (UFW)
- Creates application directory

**Usage**:
```bash
sudo ./deployment/setup-server.sh
```

### setup-database.sh
**Purpose**: Initializes database and runs migrations
**What it does**:
- Verifies database connection
- Runs Drizzle migrations
- Creates database schema
- Optionally seeds data

**Usage**:
```bash
./deployment/setup-database.sh
```

**Prerequisites**:
- DATABASE_URL set in .env.production
- Node.js dependencies installed

### deploy.sh
**Purpose**: Builds and deploys application
**What it does**:
- Pulls latest code (optional)
- Installs dependencies
- Runs database migrations
- Builds frontend and backend
- Restarts PM2 application
- Verifies deployment

**Usage**:
```bash
./deployment/deploy.sh
```

**Use this for**:
- Initial deployment
- Deploying updates
- After code changes

### backup-database.sh
**Purpose**: Creates automated database backups
**What it does**:
- Exports PostgreSQL database
- Compresses backup
- Rotates old backups (30-day retention)
- Verifies backup integrity

**Usage**:
```bash
./deployment/backup-database.sh
```

**Setup automated backups**:
```bash
# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /var/www/pixelspot/deployment/backup-database.sh
```

---

## 🔧 Configuration Files

### nginx-pixelspot.conf
**Purpose**: Nginx reverse proxy configuration
**Features**:
- HTTP to HTTPS redirect
- SSL/TLS configuration
- Static file serving
- API proxy to Node.js backend
- Gzip compression
- Security headers
- WebSocket support

**Installation**:
```bash
sudo cp deployment/nginx-pixelspot.conf /etc/nginx/sites-available/pixelspot
sudo nano /etc/nginx/sites-available/pixelspot  # Update domain
sudo ln -s /etc/nginx/sites-available/pixelspot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### ecosystem.config.js
**Purpose**: PM2 process manager configuration
**Features**:
- Cluster mode (uses all CPU cores)
- Auto-restart on crash
- Memory limit (1GB)
- Log management
- Zero-downtime reload
- Daily restart (4 AM)

**Usage**:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## 🔍 Troubleshooting

If you encounter issues during deployment:

1. **Check logs**:
   ```bash
   pm2 logs pixelspot
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Verify services**:
   ```bash
   pm2 status
   sudo systemctl status nginx
   sudo systemctl status postgresql  # If using local DB
   ```

3. **Test connectivity**:
   ```bash
   curl http://localhost:5000
   curl -I https://pixelspot.in
   ```

4. **Consult guides**:
   - See [../TROUBLESHOOTING.md](../TROUBLESHOOTING.md) for detailed solutions
   - See [../DEPLOYMENT.md](../DEPLOYMENT.md) for step-by-step instructions

---

## 📞 Support

### Documentation Resources
- **Master Deployment Guide**: [../DEPLOYMENT.md](../DEPLOYMENT.md)
- **SSL Setup Guide**: [../SSL-SETUP.md](../SSL-SETUP.md)
- **Troubleshooting Guide**: [../TROUBLESHOOTING.md](../TROUBLESHOOTING.md)

### External Resources
- **PM2 Documentation**: https://pm2.keymetrics.io/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/
- **Neon PostgreSQL**: https://neon.tech/docs

---

## ⚠️ Important Notes

### Security
- Never commit `.env.production` to Git
- Use different credentials for staging and production
- Rotate SESSION_SECRET periodically
- Keep all API keys secure
- Use Stripe LIVE keys only in production

### Backups
- Setup automated database backups immediately
- Test backup restoration regularly
- Store backups in secure location
- Consider cloud backup storage

### Monitoring
- Monitor PM2 logs regularly
- Setup alerts for application crashes
- Monitor disk space usage
- Track SSL certificate expiry

### Updates
- Test updates in staging first
- Use `pm2 reload` for zero-downtime updates
- Keep dependencies updated
- Review changelog before updating

---

## 🎯 Deployment Flow

```
┌─────────────────────────────────────────────────┐
│          1. Provision Hetzner Server            │
│          2. Configure DNS (A record)            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          3. Run setup-server.sh                 │
│          4. Configure .env.production           │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          5. Run setup-database.sh               │
│          6. Run deploy.sh                       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          7. Configure Nginx                     │
│          8. Install SSL Certificate             │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          9. Verify Deployment                   │
│          10. Setup Monitoring & Backups         │
└─────────────────────────────────────────────────┘
```

---

**Ready to deploy? Start with [../DEPLOYMENT.md](../DEPLOYMENT.md)!**

**Version**: 1.0.0  
**Last Updated**: January 2025
