#!/bin/bash

# ==========================================
# PIXELSPOT DATABASE BACKUP SCRIPT
# ==========================================
# Creates automated backups of PostgreSQL database
#
# Usage:
#   chmod +x backup-database.sh
#   ./backup-database.sh
#
# Setup automated backups:
#   crontab -e
#   # Add: 0 2 * * * /var/www/pixelspot/deployment/backup-database.sh
#   # This runs daily at 2 AM
# ==========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==========================================
# Configuration
# ==========================================
BACKUP_DIR="/var/backups/pixelspot"
RETENTION_DAYS=30  # Keep backups for 30 days
DATE=$(date +%Y%m%d_%H%M%S)
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Load environment variables
if [ -f "/var/www/pixelspot/.env.production" ]; then
    export $(cat /var/www/pixelspot/.env.production | grep -v '^#' | xargs)
elif [ -f ".env.production" ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env.production not found${NC}"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set${NC}"
    exit 1
fi

echo -e "${GREEN}=========================================="
echo "Pixelspot Database Backup"
echo "==========================================${NC}"
echo "Timestamp: $TIMESTAMP"
echo ""

# ==========================================
# Create Backup Directory
# ==========================================
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}Creating backup directory: $BACKUP_DIR${NC}"
    mkdir -p "$BACKUP_DIR"
fi

# ==========================================
# Extract Database Info
# ==========================================
# Parse DATABASE_URL to get database name for backup filename
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
if [ -z "$DB_NAME" ]; then
    DB_NAME="pixelspot"
fi

BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_${DATE}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# ==========================================
# Create Database Backup
# ==========================================
echo -e "${YELLOW}Creating database backup...${NC}"
echo "Backup file: $BACKUP_FILE"

# Use pg_dump with DATABASE_URL
if command -v pg_dump &> /dev/null; then
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database backup created${NC}"
    else
        echo -e "${RED}Error: Database backup failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: pg_dump not found${NC}"
    echo "Install PostgreSQL client tools: apt install postgresql-client"
    exit 1
fi

# ==========================================
# Compress Backup
# ==========================================
echo -e "${YELLOW}Compressing backup...${NC}"
gzip "$BACKUP_FILE"

if [ -f "$COMPRESSED_FILE" ]; then
    BACKUP_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup compressed: $BACKUP_SIZE${NC}"
else
    echo -e "${RED}Error: Compression failed${NC}"
    exit 1
fi

# ==========================================
# Verify Backup
# ==========================================
echo -e "${YELLOW}Verifying backup integrity...${NC}"
gunzip -t "$COMPRESSED_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup integrity verified${NC}"
else
    echo -e "${RED}Error: Backup verification failed${NC}"
    exit 1
fi

# ==========================================
# Clean Old Backups
# ==========================================
echo -e "${YELLOW}Cleaning old backups (older than $RETENTION_DAYS days)...${NC}"

# Find and delete old backups
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS)

if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read -r file; do
        echo "  Removing: $(basename $file)"
        rm -f "$file"
    done
    echo -e "${GREEN}✓ Old backups cleaned${NC}"
else
    echo -e "${YELLOW}No old backups to clean${NC}"
fi

# ==========================================
# Backup Summary
# ==========================================
echo ""
echo -e "${GREEN}=========================================="
echo "✓ Backup Complete!"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}Backup Details:${NC}"
echo "  • File: $(basename $COMPRESSED_FILE)"
echo "  • Size: $BACKUP_SIZE"
echo "  • Location: $BACKUP_DIR"
echo "  • Timestamp: $TIMESTAMP"
echo ""

# Count total backups
TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
echo -e "${YELLOW}Total Backups: $TOTAL_BACKUPS${NC}"

# Show disk usage
BACKUP_DIR_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo -e "${YELLOW}Backup Directory Size: $BACKUP_DIR_SIZE${NC}"
echo ""

# ==========================================
# List Recent Backups
# ==========================================
echo -e "${YELLOW}Recent Backups:${NC}"
ls -lht "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -5 | while read -r line; do
    echo "  $line"
done

echo ""
echo -e "${GREEN}Backup successful! 🎉${NC}"

# ==========================================
# Optional: Upload to Cloud Storage
# ==========================================
# Uncomment to enable cloud backup to AWS S3, Google Cloud Storage, etc.

# Example: AWS S3
# if command -v aws &> /dev/null; then
#     echo -e "${YELLOW}Uploading to AWS S3...${NC}"
#     aws s3 cp "$COMPRESSED_FILE" s3://your-bucket-name/pixelspot-backups/
#     echo -e "${GREEN}✓ Backup uploaded to S3${NC}"
# fi

# Example: Google Cloud Storage
# if command -v gsutil &> /dev/null; then
#     echo -e "${YELLOW}Uploading to Google Cloud Storage...${NC}"
#     gsutil cp "$COMPRESSED_FILE" gs://your-bucket-name/pixelspot-backups/
#     echo -e "${GREEN}✓ Backup uploaded to GCS${NC}"
# fi

# ==========================================
# RESTORATION INSTRUCTIONS
# ==========================================
# To restore from backup:
#
# 1. List available backups:
#    ls -lh /var/backups/pixelspot/
#
# 2. Uncompress backup:
#    gunzip /var/backups/pixelspot/pixelspot_backup_YYYYMMDD_HHMMSS.sql.gz
#
# 3. Restore database:
#    psql $DATABASE_URL < /var/backups/pixelspot/pixelspot_backup_YYYYMMDD_HHMMSS.sql
#
# 4. Verify restoration:
#    psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
#
# ==========================================
