#!/bin/bash

# ==========================================
# PIXELSPOT SERVER SETUP SCRIPT
# ==========================================
# Automated setup script for Ubuntu 22.04/24.04 on Hetzner
# This script installs all required dependencies for Pixelspot
#
# Usage:
#   chmod +x setup-server.sh
#   sudo ./setup-server.sh
#
# What this script does:
#   1. Updates system packages
#   2. Installs Node.js 20.x LTS
#   3. Installs PostgreSQL (optional)
#   4. Installs PM2 process manager
#   5. Installs Nginx web server
#   6. Configures firewall (UFW)
#   7. Creates application user
# ==========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}=========================================="
echo "Pixelspot Server Setup Script"
echo "==========================================${NC}"
echo ""

# ==========================================
# STEP 1: System Update
# ==========================================
echo -e "${YELLOW}[1/7] Updating system packages...${NC}"
apt update -y
apt upgrade -y
echo -e "${GREEN}✓ System updated${NC}"
echo ""

# ==========================================
# STEP 2: Install Essential Tools
# ==========================================
echo -e "${YELLOW}[2/7] Installing essential tools...${NC}"
apt install -y curl wget git ufw build-essential software-properties-common
echo -e "${GREEN}✓ Essential tools installed${NC}"
echo ""

# ==========================================
# STEP 3: Install Node.js 20.x LTS
# ==========================================
echo -e "${YELLOW}[3/7] Installing Node.js 20.x LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ Node.js installed: ${NODE_VERSION}${NC}"
echo -e "${GREEN}✓ npm installed: ${NPM_VERSION}${NC}"
echo ""

# ==========================================
# STEP 4: Install PostgreSQL (Optional)
# ==========================================
echo -e "${YELLOW}[4/7] PostgreSQL Installation${NC}"
read -p "Do you want to install PostgreSQL locally? (y/n) [Skip if using Neon]: " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    echo -e "${GREEN}✓ PostgreSQL installed and started${NC}"
    
    # Create database and user
    read -p "Create Pixelspot database? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter database name [pixelspot_db]: " DB_NAME
        DB_NAME=${DB_NAME:-pixelspot_db}
        
        read -p "Enter database user [pixelspot_user]: " DB_USER
        DB_USER=${DB_USER:-pixelspot_user}
        
        read -sp "Enter database password: " DB_PASS
        echo ""
        
        sudo -u postgres psql <<EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOF
        echo -e "${GREEN}✓ Database created: $DB_NAME${NC}"
        echo -e "${GREEN}✓ User created: $DB_USER${NC}"
        echo ""
        echo -e "${YELLOW}Database connection string:${NC}"
        echo "DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
        echo ""
    fi
else
    echo -e "${YELLOW}Skipped PostgreSQL installation${NC}"
    echo -e "${YELLOW}Remember to configure DATABASE_URL with your Neon connection string${NC}"
fi
echo ""

# ==========================================
# STEP 5: Install PM2 Process Manager
# ==========================================
echo -e "${YELLOW}[5/7] Installing PM2 process manager...${NC}"
npm install -g pm2
echo -e "${GREEN}✓ PM2 installed${NC}"

# Setup PM2 startup script
echo -e "${YELLOW}Setting up PM2 startup script...${NC}"
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
echo -e "${GREEN}✓ PM2 startup configured${NC}"
echo ""

# ==========================================
# STEP 6: Install Nginx
# ==========================================
echo -e "${YELLOW}[6/7] Installing Nginx web server...${NC}"
apt install -y nginx
systemctl start nginx
systemctl enable nginx
echo -e "${GREEN}✓ Nginx installed and started${NC}"
echo ""

# ==========================================
# STEP 7: Configure Firewall
# ==========================================
echo -e "${YELLOW}[7/7] Configuring firewall (UFW)...${NC}"
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw status
echo -e "${GREEN}✓ Firewall configured${NC}"
echo ""

# ==========================================
# STEP 8: Create Application Directory
# ==========================================
echo -e "${YELLOW}Creating application directory...${NC}"
mkdir -p /var/www/pixelspot
mkdir -p /var/www/pixelspot/logs

# Create pixelspot user (optional)
read -p "Create 'pixelspot' system user? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if id "pixelspot" &>/dev/null; then
        echo -e "${YELLOW}User 'pixelspot' already exists${NC}"
    else
        useradd -r -s /bin/bash -d /var/www/pixelspot pixelspot
        echo -e "${GREEN}✓ User 'pixelspot' created${NC}"
    fi
    chown -R pixelspot:pixelspot /var/www/pixelspot
    echo -e "${GREEN}✓ Directory ownership set to pixelspot user${NC}"
fi
echo ""

# ==========================================
# Installation Complete
# ==========================================
echo -e "${GREEN}=========================================="
echo "✓ Server Setup Complete!"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}Installed Components:${NC}"
echo "  • Node.js: $(node -v)"
echo "  • npm: $(npm -v)"
echo "  • PM2: $(pm2 -v)"
echo "  • Nginx: $(nginx -v 2>&1)"
if systemctl is-active --quiet postgresql; then
    echo "  • PostgreSQL: $(psql --version)"
fi
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Clone your Pixelspot repository to /var/www/pixelspot"
echo "  2. Copy .env.production.template to .env.production and configure"
echo "  3. Run setup-database.sh to initialize the database"
echo "  4. Run deploy.sh to build and start the application"
echo "  5. Configure Nginx with deployment/nginx-pixelspot.conf"
echo "  6. Setup SSL certificate with certbot (see SSL-SETUP.md)"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"
