# GiddyUp Health App - Database Restore Guide

## Available Backup Files
Your database backups are stored in the `./backups/` directory as compressed `.sql.gz` files.

## How to Restore Data

### 1. List Available Backups
```bash
ls -la ./backups/
```

### 2. Choose a Backup File
Select the backup file you want to restore from (e.g., `giddyup_backup_2025-08-13_034159.sql.gz`)

### 3. Restore Process

#### Option A: Full Database Restore (Complete Replacement)
```bash
# Decompress the backup file
gunzip -c ./backups/giddyup_backup_2025-08-13_034159.sql.gz > restore_temp.sql

# Restore to database (this will replace ALL data)
psql "$DATABASE_URL" < restore_temp.sql

# Clean up temporary file
rm restore_temp.sql
```

#### Option B: Selective Restore (Advanced)
```bash
# Decompress backup to examine contents
gunzip -c ./backups/giddyup_backup_2025-08-13_034159.sql.gz > backup_contents.sql

# Edit the SQL file to restore only specific tables or data
# Then apply selective changes:
psql "$DATABASE_URL" < modified_restore.sql
```

## Backup File Information
- **Location**: `./backups/` directory in project root
- **Format**: Compressed SQL dumps (`.sql.gz`)
- **Retention**: 7 days (automatic cleanup)
- **Content**: Complete database schema and data
- **Schedule**: Daily at 3:00 AM EST

## Recovery Scenarios

### Scenario 1: Data Corruption
Use Option A for complete restoration to last known good state.

### Scenario 2: Accidental Data Loss
Use Option A to restore, or Option B if you only need specific tables.

### Scenario 3: Need Historical Data
Restore to a temporary database first to extract specific records:
```bash
# Create temporary database
createdb temp_restore_db

# Restore to temporary database
gunzip -c ./backups/backup_file.sql.gz | psql temp_restore_db

# Extract needed data
psql temp_restore_db -c "SELECT * FROM health_metrics WHERE date = '2025-08-10';"

# Drop temporary database when done
dropdb temp_restore_db
```

## Important Notes
- Always backup current data before restoring
- Full restore will replace ALL existing data
- Contact support if you need help with complex restore scenarios
- Test restores in development environment when possible

## Emergency Contact
If you need immediate help with data restoration, the backup files contain complete snapshots of your health data and can be restored by any PostgreSQL administrator.