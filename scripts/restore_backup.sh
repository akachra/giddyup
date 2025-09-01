#!/bin/bash

# GiddyUp Health App - Database Restore Script
# Usage: ./scripts/restore_backup.sh [backup_filename]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backup filename is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide backup filename${NC}"
    echo "Usage: $0 <backup_filename>"
    echo ""
    echo "Available backups:"
    ls -la ./backups/*.sql.gz 2>/dev/null || echo "No backup files found"
    exit 1
fi

BACKUP_FILE="./backups/$1"
TEMP_SQL_FILE="/tmp/restore_temp_$(date +%s).sql"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file '$BACKUP_FILE' not found${NC}"
    echo ""
    echo "Available backups:"
    ls -la ./backups/*.sql.gz 2>/dev/null || echo "No backup files found"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable not set${NC}"
    exit 1
fi

echo -e "${YELLOW}WARNING: This will completely replace your current database!${NC}"
echo -e "${YELLOW}Make sure you have a current backup before proceeding.${NC}"
echo ""
echo "Backup file: $BACKUP_FILE"
echo "Database: $(echo $DATABASE_URL | sed 's/:[^@]*@/@[HIDDEN]@/')"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to proceed): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo -e "${GREEN}Starting database restore...${NC}"

# Step 1: Decompress backup file
echo "📦 Decompressing backup file..."
gunzip -c "$BACKUP_FILE" > "$TEMP_SQL_FILE"

if [ ! -s "$TEMP_SQL_FILE" ]; then
    echo -e "${RED}Error: Failed to decompress backup file or file is empty${NC}"
    rm -f "$TEMP_SQL_FILE"
    exit 1
fi

# Step 2: Restore database
echo "🗄️ Restoring database..."
if psql "$DATABASE_URL" < "$TEMP_SQL_FILE"; then
    echo -e "${GREEN}✅ Database restore completed successfully!${NC}"
else
    echo -e "${RED}❌ Database restore failed!${NC}"
    rm -f "$TEMP_SQL_FILE"
    exit 1
fi

# Step 3: Clean up
echo "🧹 Cleaning up temporary files..."
rm -f "$TEMP_SQL_FILE"

echo ""
echo -e "${GREEN}🎉 Restore process completed successfully!${NC}"
echo "Your database has been restored from: $BACKUP_FILE"
echo ""
echo "You may want to restart your application to ensure all caches are cleared."