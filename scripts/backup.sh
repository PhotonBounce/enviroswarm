#!/usr/bin/env bash
set -euo pipefail

# ENViroSwarm Backup Script
# Backs up PostgreSQL database + API key registry

BACKUP_DIR="/opt/enviroswarm/backups"
DB_NAME="${POSTGRES_DB:-enviroswarm}"
DB_USER="${POSTGRES_USER:-enviroswarm}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PASS="${POSTGRES_PASSWORD:-}"
RETENTION_DAYS=7

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/enviroswarm-backup-$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Database backup
export PGPASSWORD="$DB_PASS"
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -Fc > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

# Verify
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    echo "[$(date)] Backup successful: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
else
    echo "[$(date)] ERROR: Backup failed or empty file"
    exit 1
fi

# Upload to S3 if configured (optional)
if [ -n "${AWS_S3_BUCKET:-}" ] && [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
    echo "[$(date)] Uploading to S3..."
    aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/" --storage-class STANDARD_IA
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "enviroswarm-backup-*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Cleanup complete. Backups older than $RETENTION_DAYS days removed."