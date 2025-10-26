#!/bin/bash

# ==========================================
# PIXELSPOT DATABASE SETUP SCRIPT
# ==========================================
# Sets up PostgreSQL database and runs Drizzle migrations
#
# Usage:
#   chmod +x setup-database.sh
#   ./setup-database.sh
#
# Prerequisites:
#   - DATABASE_URL must be set in .env.production
#   - Node.js and npm must be installed
#   - Application dependencies must be installed (npm install)
# ==========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=========================================="
echo "Pixelspot Database Setup Script"
echo "==========================================${NC}"
echo ""

# ==========================================
# Check Prerequisites
# ==========================================
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}Error: .env.production not found${NC}"
    echo "Please create .env.production from .env.production.template"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set in .env.production${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment variables loaded${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
fi

# ==========================================
# Database Connection Test
# ==========================================
echo -e "${YELLOW}Testing database connection...${NC}"

# Extract database info from DATABASE_URL for logging
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
if [ -z "$DB_HOST" ]; then
    DB_HOST="(connection string provided)"
fi

echo "Connecting to: $DB_HOST"

# Test connection using Node.js
node -e "
const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✓ Database connection successful');
    process.exit(0);
  })
  .catch((err) => {
    console.error('✗ Database connection failed:', err.message);
    process.exit(1);
  });
" || {
    echo -e "${RED}Error: Cannot connect to database${NC}"
    echo "Please verify DATABASE_URL in .env.production"
    exit 1
}

echo ""

# ==========================================
# Database Migration Options
# ==========================================
echo -e "${YELLOW}Database Migration Options:${NC}"
echo "  1. Push schema (recommended for new deployments)"
echo "  2. Generate and run migrations (recommended for updates)"
echo "  3. Skip migration"
echo ""
read -p "Select option (1-3): " -n 1 -r MIGRATION_OPTION
echo ""

case $MIGRATION_OPTION in
    1)
        echo -e "${YELLOW}Pushing database schema...${NC}"
        npm run db:push
        echo -e "${GREEN}✓ Database schema pushed successfully${NC}"
        ;;
    2)
        echo -e "${YELLOW}Generating migrations...${NC}"
        npm run db:generate
        echo -e "${GREEN}✓ Migrations generated${NC}"
        
        echo -e "${YELLOW}Running migrations...${NC}"
        npm run db:migrate
        echo -e "${GREEN}✓ Migrations applied successfully${NC}"
        ;;
    3)
        echo -e "${YELLOW}Skipping migration${NC}"
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""

# ==========================================
# Verify Database Schema
# ==========================================
echo -e "${YELLOW}Verifying database schema...${NC}"

# List tables using Node.js
node -e "
const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(\`
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name
\`)
  .then((result) => {
    console.log('Database tables:');
    result.rows.forEach(row => {
      console.log('  •', row.table_name);
    });
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
"

echo ""

# ==========================================
# Optional: Seed Data
# ==========================================
read -p "Do you want to seed the database with sample data? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "server/seed.ts" ] || [ -f "server/seed.js" ]; then
        echo -e "${YELLOW}Seeding database...${NC}"
        npm run db:seed || {
            echo -e "${YELLOW}Note: Seed script not found or failed${NC}"
        }
        echo -e "${GREEN}✓ Database seeded${NC}"
    else
        echo -e "${YELLOW}No seed script found (server/seed.ts)${NC}"
    fi
fi

echo ""

# ==========================================
# Database Setup Complete
# ==========================================
echo -e "${GREEN}=========================================="
echo "✓ Database Setup Complete!"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}Database Information:${NC}"
echo "  • Host: $DB_HOST"
echo "  • Status: Connected and ready"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Run deploy.sh to build and deploy the application"
echo "  2. Configure Nginx reverse proxy"
echo "  3. Setup SSL certificate with certbot"
echo ""
echo -e "${GREEN}Database is ready! 🎉${NC}"
