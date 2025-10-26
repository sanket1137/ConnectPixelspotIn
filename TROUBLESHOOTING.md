# Pixelspot Deployment Troubleshooting Guide

Comprehensive troubleshooting guide for common deployment issues on Hetzner Ubuntu server.

---

## Table of Contents

1. [Application Issues](#application-issues)
2. [Database Issues](#database-issues)
3. [Nginx Issues](#nginx-issues)
4. [SSL/HTTPS Issues](#ssl-https-issues)
5. [PM2 Issues](#pm2-issues)
6. [Performance Issues](#performance-issues)
7. [Environment Variables](#environment-variables)
8. [External Services](#external-services)
9. [System Resources](#system-resources)

---

## Application Issues

### Application Won't Start

**Symptom**: PM2 shows status as "errored" or constantly restarting

**Check logs:**
```bash
pm2 logs pixelspot --err
```

**Common causes:**

**1. Missing environment variables**
```bash
# Verify .env.production exists
ls -la .env.production

# Check for missing required variables
cat .env.production | grep -E "DATABASE_URL|FIREBASE|SESSION_SECRET"
```

**Solution:**
```bash
# Copy template and fill in values
cp .env.production.template .env.production
nano .env.production
```

**2. Port already in use**
```bash
# Check if port 5000 is already in use
sudo netstat -tlnp | grep 5000
```

**Solution:**
```bash
# Kill the process using port 5000
sudo kill -9 $(sudo lsof -t -i:5000)

# Or change PORT in .env.production
nano .env.production  # Change PORT to 5001
```

**3. Build files missing**
```bash
# Check if build output exists
ls -la dist/
ls -la dist/index.js
```

**Solution:**
```bash
# Rebuild application
npm run build

# Restart PM2
pm2 restart pixelspot
```

**4. Node.js version mismatch**
```bash
# Check Node.js version
node -v  # Should be v20.x.x
```

**Solution:**
```bash
# Reinstall correct Node.js version
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
```

---

### 502 Bad Gateway Error

**Symptom**: Nginx shows "502 Bad Gateway" when accessing site

**Diagnosis:**
```bash
# Check if application is running
pm2 status pixelspot

# Check if port 5000 is listening
sudo netstat -tlnp | grep 5000

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

**Common causes:**

**1. Application not running**
```bash
# Start application
pm2 start ecosystem.config.js --env production
```

**2. Incorrect upstream configuration**
```bash
# Check Nginx config
sudo nano /etc/nginx/sites-available/pixelspot

# Verify upstream block:
upstream pixelspot_backend {
    server 127.0.0.1:5000;  # Must match PORT in .env.production
    keepalive 64;
}
```

**3. Firewall blocking connection**
```bash
# Check UFW status
sudo ufw status

# Ensure port 5000 is accessible locally
curl http://localhost:5000
```

---

### Application Crashes After Deployment

**Check crash logs:**
```bash
# View error logs
pm2 logs pixelspot --err --lines 100

# Check for specific errors
pm2 logs pixelspot | grep -i "error\|exception\|fatal"
```

**Common causes:**

**1. Memory limit exceeded**
```bash
# Check memory usage
pm2 info pixelspot | grep memory

# Increase memory limit in ecosystem.config.js
max_memory_restart: '2G'  # Increase from 1G
```

**2. Unhandled promise rejections**
```bash
# Look for promise errors in logs
pm2 logs pixelspot | grep -i "unhandled"
```

**3. Missing dependencies**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install --production=false
npm run build
pm2 restart pixelspot
```

---

## Database Issues

### Cannot Connect to Database

**Symptom**: "Connection refused" or "Connection timeout" errors

**Check connection:**
```bash
# Test database connection
psql "$DATABASE_URL" -c "SELECT 1"
```

**Common causes:**

**1. Incorrect DATABASE_URL**
```bash
# Verify DATABASE_URL format
echo $DATABASE_URL

# Format should be:
# postgresql://user:password@host:port/database
```

**Solution:**
```bash
# Update DATABASE_URL in .env.production
nano .env.production

# Restart application
pm2 restart pixelspot
```

**2. Database not accepting connections**
```bash
# If using local PostgreSQL, check if running
sudo systemctl status postgresql

# Start if stopped
sudo systemctl start postgresql
```

**3. Firewall blocking database connection**
```bash
# For Neon or remote database, check network connectivity
ping your-database-host.neon.tech
telnet your-database-host.neon.tech 5432
```

**4. SSL/TLS required**
```bash
# Neon requires SSL - verify connection string includes sslmode
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

---

### Database Migration Errors

**Symptom**: "Drizzle migration failed" or schema errors

**Check migration status:**
```bash
# View database tables
psql "$DATABASE_URL" -c "\dt"

# Check migration logs
npm run db:push 2>&1 | tee migration.log
```

**Common causes:**

**1. Schema conflicts**
```bash
# Drop all tables (WARNING: deletes all data)
# Only use for fresh deployments
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Run migrations again
npm run db:push
```

**2. Permission errors**
```bash
# Grant permissions to user
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE pixelspot_db TO pixelspot_user;
GRANT ALL ON SCHEMA public TO pixelspot_user;
```

---

### Database Connection Pool Exhausted

**Symptom**: "Connection pool exhausted" or "Too many connections"

**Check active connections:**
```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM pg_stat_activity;"
```

**Solution:**
```bash
# Restart application to reset connections
pm2 restart pixelspot

# Increase pool size in server/db.ts if needed
# Default Neon serverless driver handles this automatically
```

---

## Nginx Issues

### Nginx Won't Start

**Check configuration:**
```bash
# Test Nginx configuration
sudo nginx -t

# Common errors:
# - Syntax error
# - Duplicate server blocks
# - Missing semicolon
# - File path errors
```

**View error logs:**
```bash
sudo tail -f /var/log/nginx/error.log
```

**Common causes:**

**1. Configuration syntax error**
```bash
# Fix syntax errors shown by nginx -t
sudo nano /etc/nginx/sites-available/pixelspot

# Common fixes:
# - Add missing semicolons
# - Fix bracket matching
# - Remove duplicate directives
```

**2. Port 80/443 already in use**
```bash
# Check what's using port 80
sudo netstat -tlnp | grep :80

# Kill conflicting process or change Nginx port
```

**3. SSL certificate files not found**
```bash
# Verify certificate paths exist
ls -la /etc/letsencrypt/live/pixelspot.in/

# If missing, run certbot first
sudo certbot --nginx -d pixelspot.in
```

---

### Nginx Not Forwarding Requests

**Symptom**: Static files work, but API requests fail

**Check upstream:**
```bash
# Verify application is running
pm2 status pixelspot

# Test local API endpoint
curl http://localhost:5000/api/health
```

**Check proxy configuration:**
```bash
sudo nano /etc/nginx/sites-available/pixelspot

# Verify proxy_pass is correct:
location /api {
    proxy_pass http://pixelspot_backend;  # Must match upstream name
    # ...
}
```

**Solution:**
```bash
# Reload Nginx
sudo systemctl reload nginx

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

---

### Static Files Not Loading

**Symptom**: 404 errors for CSS, JS, images

**Check build output:**
```bash
# Verify frontend build exists
ls -la /var/www/pixelspot/dist/public/

# Check file permissions
ls -la /var/www/pixelspot/dist/public/index.html
```

**Solution:**
```bash
# Rebuild frontend
npm run build

# Fix permissions
sudo chown -R www-data:www-data /var/www/pixelspot/dist/public
sudo chmod -R 755 /var/www/pixelspot/dist/public

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL/HTTPS Issues

### SSL Certificate Not Valid

**Symptom**: Browser shows "Not Secure" or certificate error

**Check certificate:**
```bash
sudo certbot certificates

# Verify expiry date, domains covered
```

**Common causes:**

**1. Certificate expired**
```bash
# Renew certificate
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal

# Reload Nginx
sudo systemctl reload nginx
```

**2. Wrong certificate path in Nginx**
```bash
# Check Nginx SSL configuration
sudo nano /etc/nginx/sites-available/pixelspot

# Must use fullchain.pem, not cert.pem:
ssl_certificate /etc/letsencrypt/live/pixelspot.in/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/pixelspot.in/privkey.pem;
```

**3. Domain mismatch**
```bash
# Certificate must cover the domain you're accessing
# If accessing www.pixelspot.in, certificate must include it

# Obtain new certificate with both domains
sudo certbot --nginx -d pixelspot.in -d www.pixelspot.in
```

---

### Mixed Content Warnings

**Symptom**: Padlock shows but with warning icon

**Diagnosis:**
```bash
# Check browser console for mixed content errors
# Look for HTTP resources loaded on HTTPS page
```

**Solution:**
```bash
# Update all URLs in code to HTTPS or protocol-relative
# Change:  src="http://example.com/file.js"
# To:      src="https://example.com/file.js"
# Or:      src="//example.com/file.js"
```

---

## PM2 Issues

### PM2 Not Starting on Boot

**Symptom**: Application stops after server reboot

**Check startup configuration:**
```bash
# Check if PM2 startup is configured
pm2 startup

# Run the command it outputs
```

**Solution:**
```bash
# Setup PM2 startup script
pm2 startup systemd
# Copy and run the command shown

# Start your app
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Reboot to test
sudo reboot
```

---

### PM2 Shows Old Code After Deployment

**Symptom**: Changes not reflected after deployment

**Solution:**
```bash
# Full restart (not reload)
pm2 restart pixelspot

# Or reload with no-cache
pm2 reload pixelspot --update-env

# Or delete and restart
pm2 delete pixelspot
pm2 start ecosystem.config.js --env production
```

---

### High Memory Usage by PM2

**Check memory:**
```bash
pm2 info pixelspot | grep memory
```

**Solution:**
```bash
# Reduce instance count in ecosystem.config.js
instances: 2  # Instead of 'max'

# Or increase memory limit
max_memory_restart: '2G'

# Restart PM2
pm2 restart pixelspot
```

---

## Performance Issues

### Slow Response Times

**Diagnose:**
```bash
# Monitor application
pm2 monit

# Check CPU and memory
htop

# Check database query performance
# Enable slow query logging in PostgreSQL
```

**Common causes:**

**1. Database queries not optimized**
```bash
# Check slow queries in database
psql "$DATABASE_URL" -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

**2. Not using cluster mode**
```bash
# Verify cluster mode in ecosystem.config.js
instances: 'max'
exec_mode: 'cluster'
```

**3. Large payload sizes**
```bash
# Check response sizes
curl -I https://pixelspot.in/api/large-endpoint

# Enable compression in Nginx (already configured)
```

---

### High CPU Usage

**Check processes:**
```bash
# View CPU usage
htop

# Check PM2 status
pm2 status
```

**Solution:**
```bash
# Reduce PM2 instances
instances: 2  # In ecosystem.config.js

# Check for infinite loops in code
pm2 logs pixelspot | grep -i "loop\|recursive"
```

---

## Environment Variables

### Environment Variables Not Loading

**Symptom**: Application can't access environment variables

**Check:**
```bash
# Verify .env.production exists
ls -la .env.production

# Check if PM2 is using correct env file
pm2 info pixelspot | grep env
```

**Solution:**
```bash
# Restart with environment update
pm2 restart pixelspot --update-env

# Or delete and restart
pm2 delete pixelspot
pm2 start ecosystem.config.js --env production
```

---

### Frontend Environment Variables Missing

**Symptom**: `import.meta.env.VITE_*` variables are undefined

**Common cause**: Frontend environment variables must be prefixed with `VITE_`

**Solution:**
```bash
# Ensure variables are prefixed correctly:
VITE_FIREBASE_API_KEY=...
VITE_GOOGLE_MAPS_API_KEY=...
VITE_STRIPE_PUBLIC_KEY=...

# Rebuild application
npm run build
pm2 restart pixelspot
```

---

## External Services

### Firebase Authentication Errors

**Symptom**: Users can't log in, Firebase errors in console

**Check configuration:**
```bash
# Verify Firebase credentials in .env.production
echo $VITE_FIREBASE_API_KEY
echo $VITE_FIREBASE_PROJECT_ID
echo $VITE_FIREBASE_APP_ID
```

**Common issues:**

**1. Incorrect Firebase project**
```bash
# Verify project ID matches Firebase console
# https://console.firebase.google.com/
```

**2. Authorized domains not configured**
```bash
# Add your domain to Firebase Console:
# Authentication > Settings > Authorized domains
# Add: pixelspot.in, www.pixelspot.in
```

---

### Email (AWS SES) Not Sending

**Symptom**: OTP emails not received

**Check logs:**
```bash
pm2 logs pixelspot | grep -i "email\|ses"
```

**Common causes:**

**1. SES credentials incorrect**
```bash
# Verify AWS SES credentials
echo $AWS_SES_SMTP_USER
echo $AWS_SES_SMTP_PASSWORD
```

**2. Email not verified in SES**
```bash
# In SES sandbox mode, verify recipient emails
# AWS Console > SES > Email Addresses > Verify
```

**3. SES in sandbox mode**
```bash
# Request production access
# AWS Console > SES > Account Dashboard > Request Production Access
```

---

### SMS (ComBirds) Not Sending

**Symptom**: OTP SMS not received

**Check logs:**
```bash
pm2 logs pixelspot | grep -i "sms\|combirds\|otp"
```

**Common causes:**

**1. ComBirds credentials incorrect**
```bash
# Verify ComBirds credentials
cat .env.production | grep COMBIRDS
```

**2. DLT template not approved**
```bash
# Verify DLT template ID is approved
# Check ComBirds dashboard
```

**3. Invalid mobile number format**
```bash
# Must be 10-digit Indian mobile number
# Format: 9876543210 (without +91)
```

---

### Google Maps Not Loading

**Symptom**: Map shows "For development purposes only" or blank

**Check console:**
```bash
# Check browser console for API errors
# Look for: "Google Maps JavaScript API error"
```

**Common causes:**

**1. API key not set**
```bash
echo $VITE_GOOGLE_MAPS_API_KEY
```

**2. APIs not enabled**
```bash
# Enable in Google Cloud Console:
# - Maps JavaScript API
# - Geocoding API
# - Places API
```

**3. Domain restrictions**
```bash
# Add your domain to API key restrictions
# Google Cloud Console > Credentials > API Key > Website restrictions
# Add: pixelspot.in, www.pixelspot.in
```

---

## System Resources

### Out of Disk Space

**Check disk usage:**
```bash
df -h

# Check which directories use most space
du -sh /* | sort -h
```

**Solutions:**
```bash
# Clean old logs
pm2 flush
sudo rm -rf /var/log/nginx/*.log.*.gz
sudo journalctl --vacuum-time=7d

# Clean old backups
sudo rm -f /var/backups/pixelspot/*_backup_*.sql.gz

# Clean npm cache
npm cache clean --force

# Remove old packages
sudo apt autoremove
sudo apt clean
```

---

### Out of Memory

**Check memory:**
```bash
free -h
```

**Solutions:**
```bash
# Reduce PM2 instances
instances: 2  # In ecosystem.config.js

# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Quick Diagnostic Commands

```bash
# Check all services status
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql  # If using local DB

# View all logs
pm2 logs pixelspot
sudo tail -f /var/log/nginx/error.log

# Check system resources
htop
df -h
free -h

# Test application endpoints
curl -I http://localhost:5000
curl -I https://pixelspot.in

# Restart everything
pm2 restart pixelspot
sudo systemctl restart nginx

# Nuclear option (full restart)
pm2 delete pixelspot
pm2 start ecosystem.config.js --env production
pm2 save
sudo systemctl restart nginx
```

---

## Getting Help

If issues persist after troubleshooting:

1. **Collect logs:**
   ```bash
   pm2 logs pixelspot --lines 100 > pm2-logs.txt
   sudo tail -100 /var/log/nginx/error.log > nginx-logs.txt
   ```

2. **Check environment:**
   ```bash
   node -v
   npm -v
   pm2 -v
   nginx -v
   ```

3. **Document steps taken:**
   - What changed before the issue started?
   - What have you tried?
   - Error messages encountered?

4. **Contact support with:**
   - Log files
   - Environment details
   - Steps to reproduce

---

**Last Updated**: January 2025
**Version**: 1.0.0
