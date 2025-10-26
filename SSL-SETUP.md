# SSL/HTTPS Setup Guide for Pixelspot

Complete guide for installing and configuring SSL certificates using **Let's Encrypt** on Ubuntu server with Nginx.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Setup (Recommended)](#quick-setup-recommended)
3. [Manual Setup](#manual-setup)
4. [Verify SSL Installation](#verify-ssl-installation)
5. [Auto-Renewal Configuration](#auto-renewal-configuration)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Configuration](#advanced-configuration)

---

## Prerequisites

Before proceeding, ensure:

- ✅ Domain name pointing to your server IP (A record configured)
- ✅ Nginx installed and running
- ✅ Firewall allows HTTP (80) and HTTPS (443)
- ✅ Application accessible via HTTP first
- ✅ DNS propagation complete (check with `nslookup yourdomain.com`)

### Verify DNS Configuration

```bash
# Check if domain points to your server
nslookup pixelspot.in

# Should return your server IP address
# If not, update DNS A record and wait for propagation (can take up to 48 hours)
```

### Verify Nginx Configuration

```bash
# Test Nginx configuration
sudo nginx -t

# Ensure site is accessible
curl -I http://pixelspot.in
```

---

## Quick Setup (Recommended)

The fastest way to setup SSL with automatic Nginx configuration.

### Step 1: Install Certbot

```bash
# Update package list
sudo apt update

# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Obtain SSL Certificate (Automatic)

```bash
# Replace with your actual domain(s)
sudo certbot --nginx -d pixelspot.in -d www.pixelspot.in

# Follow the prompts:
# 1. Enter your email address (for renewal notifications)
# 2. Agree to Terms of Service (yes)
# 3. Share email with EFF (optional)
# 4. Choose redirect option: 2 (Redirect HTTP to HTTPS)
```

**What this does:**
- Obtains SSL certificate from Let's Encrypt
- Automatically configures Nginx
- Sets up HTTP to HTTPS redirect
- Configures SSL security settings

### Step 3: Verify Installation

```bash
# Check certificate status
sudo certbot certificates

# Test HTTPS
curl -I https://pixelspot.in

# Test auto-renewal
sudo certbot renew --dry-run
```

**Done!** Your site is now accessible via HTTPS at:
- https://pixelspot.in
- https://www.pixelspot.in

---

## Manual Setup

For more control over the SSL configuration.

### Step 1: Install Certbot

```bash
sudo apt update
sudo apt install -y certbot
```

### Step 2: Stop Nginx Temporarily

```bash
sudo systemctl stop nginx
```

### Step 3: Obtain SSL Certificate (Standalone)

```bash
# Obtain certificate using standalone mode
sudo certbot certonly --standalone \
  -d pixelspot.in \
  -d www.pixelspot.in \
  --agree-tos \
  --email your-email@example.com \
  --no-eff-email

# Certificate will be saved to:
# /etc/letsencrypt/live/pixelspot.in/fullchain.pem
# /etc/letsencrypt/live/pixelspot.in/privkey.pem
```

### Step 4: Configure Nginx for HTTPS

Edit your Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/pixelspot
```

The `deployment/nginx-pixelspot.conf` file already includes HTTPS configuration.

**Uncomment the HTTPS server block** (lines starting with #server):

```nginx
# Find and uncomment this entire block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name pixelspot.in www.pixelspot.in;
    
    ssl_certificate /etc/letsencrypt/live/pixelspot.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pixelspot.in/privkey.pem;
    
    # ... rest of HTTPS configuration
}
```

**Update HTTP server block** to redirect to HTTPS:

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name pixelspot.in www.pixelspot.in;
    
    # For Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}
```

### Step 5: Test and Reload Nginx

```bash
# Test configuration
sudo nginx -t

# If successful, reload Nginx
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx
```

### Step 6: Verify HTTPS

```bash
# Test HTTPS connection
curl -I https://pixelspot.in

# Should return: HTTP/2 200
```

---

## Verify SSL Installation

### Check Certificate Details

```bash
# View certificate information
sudo certbot certificates

# Output shows:
# - Certificate Name
# - Domains
# - Expiry Date
# - Certificate Path
# - Private Key Path
```

### Online SSL Checkers

Test your SSL configuration:

1. **SSL Labs**: https://www.ssllabs.com/ssltest/
   - Enter your domain: pixelspot.in
   - Wait for analysis
   - Target: A+ rating

2. **Why No Padlock**: https://www.whynopadlock.com/
   - Checks for mixed content issues

### Browser Testing

1. Open https://pixelspot.in in browser
2. Click padlock icon in address bar
3. Verify:
   - Connection is secure
   - Certificate is valid
   - Issued by Let's Encrypt
   - Covers your domain(s)

### Command Line Testing

```bash
# Test SSL connection
openssl s_client -connect pixelspot.in:443 -servername pixelspot.in

# Check certificate expiry
echo | openssl s_client -connect pixelspot.in:443 -servername pixelspot.in 2>/dev/null | openssl x509 -noout -dates

# Test HTTP/2
curl -I --http2 https://pixelspot.in
```

---

## Auto-Renewal Configuration

Let's Encrypt certificates expire after **90 days**. Certbot automatically sets up renewal.

### Verify Auto-Renewal

```bash
# Check if renewal timer is active
sudo systemctl status certbot.timer

# Test renewal process (dry run)
sudo certbot renew --dry-run

# If successful, you'll see:
# "Congratulations, all simulated renewals succeeded"
```

### Manual Renewal

```bash
# Renew all certificates
sudo certbot renew

# Renew specific certificate
sudo certbot renew --cert-name pixelspot.in

# Force renewal (even if not due)
sudo certbot renew --force-renewal
```

### Setup Renewal Hook

Create a script to reload Nginx after renewal:

```bash
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

Add content:

```bash
#!/bin/bash
systemctl reload nginx
```

Make executable:

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

### Check Renewal Schedule

```bash
# View renewal timer
sudo systemctl list-timers | grep certbot

# Certbot runs twice daily to check for renewal
```

---

## Troubleshooting

### Certificate Issuance Failed

**Error: "Failed authorization procedure"**

```bash
# Check if port 80 is accessible
sudo netstat -tlnp | grep :80

# Verify domain DNS
nslookup pixelspot.in

# Check firewall
sudo ufw status

# Ensure Nginx is stopped if using standalone
sudo systemctl stop nginx
sudo certbot certonly --standalone -d pixelspot.in
```

### Nginx Won't Start After SSL

```bash
# Check for configuration errors
sudo nginx -t

# Common issues:
# 1. Certificate path incorrect
# 2. Missing semicolon
# 3. Duplicate server blocks

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### Certificate Not Valid

**Browser shows "Certificate not trusted"**

```bash
# Verify certificate chain is complete
sudo certbot certificates

# Check if using fullchain.pem (not cert.pem)
# In nginx config:
ssl_certificate /etc/letsencrypt/live/pixelspot.in/fullchain.pem;
# NOT:
# ssl_certificate /etc/letsencrypt/live/pixelspot.in/cert.pem;
```

### Mixed Content Warnings

Browser shows padlock but with warning:

```bash
# Check for HTTP resources in HTTPS pages
# Update all internal links to use HTTPS or protocol-relative URLs

# In your code, change:
<script src="http://example.com/script.js">

# To:
<script src="https://example.com/script.js">
# Or:
<script src="//example.com/script.js">
```

### Rate Limit Exceeded

**Error: "too many certificates already issued"**

Let's Encrypt has rate limits:
- 50 certificates per domain per week
- 5 duplicate certificates per week

Solution:
```bash
# Wait for rate limit window to pass (7 days)
# Use staging environment for testing:
sudo certbot certonly --staging --standalone -d test.pixelspot.in
```

---

## Advanced Configuration

### Enable HTTP/2

Already configured in `deployment/nginx-pixelspot.conf`:

```nginx
listen 443 ssl http2;
listen [::]:443 ssl http2;
```

### Enable HSTS (HTTP Strict Transport Security)

Already configured in HTTPS server block:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### OCSP Stapling

Already configured in HTTPS server block:

```nginx
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/letsencrypt/live/pixelspot.in/chain.pem;
```

### Optimize SSL Performance

```nginx
# SSL Session Cache (already configured)
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# Use modern ciphers only
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers off;
```

### Wildcard Certificate

For multiple subdomains:

```bash
# Obtain wildcard certificate
sudo certbot certonly --manual \
  --preferred-challenges=dns \
  -d pixelspot.in \
  -d *.pixelspot.in

# Follow DNS challenge instructions
# Add TXT record to DNS:
# _acme-challenge.pixelspot.in TXT "verification-code"
```

---

## Certificate Information

### Default Paths

```bash
# Certificate files location
/etc/letsencrypt/live/pixelspot.in/

# Files:
fullchain.pem  # Full certificate chain (use this in Nginx)
privkey.pem    # Private key (use this in Nginx)
cert.pem       # Certificate only
chain.pem      # Intermediate certificates
```

### Backup Certificates

```bash
# Backup entire Let's Encrypt directory
sudo tar -czf letsencrypt-backup-$(date +%Y%m%d).tar.gz /etc/letsencrypt

# Copy to safe location
sudo mv letsencrypt-backup-*.tar.gz /var/backups/
```

### Restore Certificates

```bash
# Restore from backup
sudo tar -xzf letsencrypt-backup-YYYYMMDD.tar.gz -C /

# Reload Nginx
sudo systemctl reload nginx
```

---

## Useful Commands Reference

```bash
# Obtain certificate (automatic Nginx config)
sudo certbot --nginx -d pixelspot.in -d www.pixelspot.in

# Obtain certificate (manual config)
sudo certbot certonly --standalone -d pixelspot.in

# Renew all certificates
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run

# List all certificates
sudo certbot certificates

# Delete certificate
sudo certbot delete --cert-name pixelspot.in

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check certificate expiry
sudo certbot certificates | grep Expiry

# View certificate details
openssl x509 -in /etc/letsencrypt/live/pixelspot.in/cert.pem -text -noout
```

---

## Support & Resources

### Documentation
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **Certbot**: https://certbot.eff.org/
- **SSL Labs**: https://www.ssllabs.com/ssltest/

### Rate Limits
- **Let's Encrypt Rate Limits**: https://letsencrypt.org/docs/rate-limits/

### Getting Help

If you encounter issues:

1. Check Certbot logs: `sudo tail -f /var/log/letsencrypt/letsencrypt.log`
2. Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify DNS with: `nslookup pixelspot.in`
4. Test connectivity: `curl -I http://pixelspot.in`

---

**Last Updated**: January 2025
**Version**: 1.0.0
