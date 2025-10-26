#!/bin/bash

# ==========================================
# PIXELSPOT DEPLOYMENT SCRIPT
# ==========================================
# Builds and deploys the Pixelspot application
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# What this script does:
#   1. Pulls latest code from Git (optional)
#   2. Installs/updates dependencies
#   3. Runs database migrations
#   4. Builds frontend and backend
#   5. Restarts PM2 application
#   6. Verifies deployment
# ==========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=========================================="
echo "Pixelspot Deployment Script"
echo "==========================================${NC}"
echo ""

# ==========================================
# Configuration
# ==========================================
APP_NAME="pixelspot"
APP_DIR="/var/www/pixelspot"
ENV_FILE=".env.production"

# ==========================================
# STEP 1: Git Pull (Optional)
# ==========================================
echo -e "${YELLOW}[1/6] Checking for updates...${NC}"

if [ -d ".git" ]; then
    read -p "Pull latest changes from Git? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Fetching latest changes...${NC}"
        git fetch origin
        
        # Show current and remote branch status
        CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
        echo "Current branch: $CURRENT_BRANCH"
        
        # Check if there are changes
        LOCAL=$(git rev-parse @)
        REMOTE=$(git rev-parse @{u})
        
        if [ $LOCAL = $REMOTE ]; then
            echo -e "${GREEN}Already up to date${NC}"
        else
            echo -e "${BLUE}Pulling changes...${NC}"
            git pull origin $CURRENT_BRANCH
            echo -e "${GREEN}✓ Code updated${NC}"
        fi
    else
        echo -e "${YELLOW}Skipped Git pull${NC}"
    fi
else
    echo -e "${YELLOW}Not a Git repository - skipping update${NC}"
fi
echo ""

# ==========================================
# STEP 2: Check Environment Variables
# ==========================================
echo -e "${YELLOW}[2/6] Checking environment configuration...${NC}"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE not found${NC}"
    echo "Please create $ENV_FILE from .env.production.template"
    exit 1
fi

# Load environment variables
export $(cat $ENV_FILE | grep -v '^#' | xargs)

# Verify critical variables
MISSING_VARS=()

if [ -z "$DATABASE_URL" ]; then MISSING_VARS+=("DATABASE_URL"); fi
if [ -z "$VITE_FIREBASE_API_KEY" ]; then MISSING_VARS+=("VITE_FIREBASE_API_KEY"); fi
if [ -z "$SESSION_SECRET" ]; then MISSING_VARS+=("SESSION_SECRET"); fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}Error: Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

echo -e "${GREEN}✓ Environment configuration valid${NC}"
echo ""

# ==========================================
# STEP 3: Install Dependencies
# ==========================================
echo -e "${YELLOW}[3/6] Installing dependencies...${NC}"

# Check if package.json has changed
if [ -f "package.json" ]; then
    npm install --production=false
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}Error: package.json not found${NC}"
    exit 1
fi
echo ""

# ==========================================
# STEP 4: Database Migrations
# ==========================================
echo -e "${YELLOW}[4/6] Running database migrations...${NC}"

read -p "Run database migrations? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Pushing database schema...${NC}"
    npm run db:push || {
        echo -e "${RED}Warning: Database migration failed${NC}"
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    }
    echo -e "${GREEN}✓ Database migrations complete${NC}"
else
    echo -e "${YELLOW}Skipped database migrations${NC}"
fi
echo ""

# ==========================================
# STEP 5: Build Application
# ==========================================
echo -e "${YELLOW}[5/6] Building application...${NC}"

# Clean previous build
if [ -d "dist" ]; then
    echo -e "${BLUE}Cleaning previous build...${NC}"
    rm -rf dist
fi

# Build application
echo -e "${BLUE}Building frontend and backend...${NC}"
npm run build

# Verify build output
if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
    echo -e "${RED}Error: Build failed - dist/index.js not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Application built successfully${NC}"
echo ""

# ==========================================
# STEP 6: Deploy with PM2
# ==========================================
echo -e "${YELLOW}[6/6] Deploying with PM2...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}Error: PM2 is not installed${NC}"
    echo "Install PM2: npm install -g pm2"
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if app is already running
if pm2 list | grep -q "$APP_NAME"; then
    echo -e "${BLUE}Reloading existing application...${NC}"
    pm2 reload ecosystem.config.js --env production
    echo -e "${GREEN}✓ Application reloaded (zero downtime)${NC}"
else
    echo -e "${BLUE}Starting new application...${NC}"
    pm2 start ecosystem.config.js --env production
    echo -e "${GREEN}✓ Application started${NC}"
fi

# Save PM2 configuration
pm2 save

echo ""

# ==========================================
# Verification
# ==========================================
echo -e "${YELLOW}Verifying deployment...${NC}"
sleep 3

# Check PM2 status
echo -e "${BLUE}PM2 Status:${NC}"
pm2 status $APP_NAME

echo ""

# Check application health
echo -e "${BLUE}Testing application endpoint...${NC}"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 || echo "000")

if [ "$HEALTH_CHECK" = "200" ] || [ "$HEALTH_CHECK" = "302" ]; then
    echo -e "${GREEN}✓ Application is responding (HTTP $HEALTH_CHECK)${NC}"
else
    echo -e "${RED}⚠ Application may not be responding correctly (HTTP $HEALTH_CHECK)${NC}"
    echo -e "${YELLOW}Check logs with: pm2 logs $APP_NAME${NC}"
fi

echo ""

# ==========================================
# Deployment Complete
# ==========================================
echo -e "${GREEN}=========================================="
echo "✓ Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}Application Status:${NC}"
pm2 info $APP_NAME | grep -E "name|status|uptime|memory|cpu"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  • View logs:      pm2 logs $APP_NAME"
echo "  • Monitor:        pm2 monit"
echo "  • Restart:        pm2 restart $APP_NAME"
echo "  • Stop:           pm2 stop $APP_NAME"
echo "  • View status:    pm2 status"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Verify application is working: http://YOUR_SERVER_IP"
echo "  2. Check Nginx configuration and reload if needed"
echo "  3. Setup SSL certificate if not already done"
echo "  4. Monitor logs for any errors"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"
