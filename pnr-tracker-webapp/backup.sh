#!/bin/bash

# Database Backup Script

set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="pnr_tracker_backup_$DATE.sql"

echo "📦 Creating database backup..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create database backup
docker-compose exec postgres pg_dump -U pnr_user -d pnr_tracker > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

echo "✅ Backup created: $BACKUP_DIR/$BACKUP_FILE.gz"

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "pnr_tracker_backup_*.sql.gz" -mtime +7 -delete

echo "🧹 Old backups cleaned up"
