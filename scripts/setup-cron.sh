#!/usr/bin/env bash
set -euo pipefail

# ENViroSwarm Server Cron Setup
# Run this on your production server to automate health checks and backups

PROJECT_DIR="/opt/enviroswarm"
CRON_FILE="/tmp/enviroswarm-crontab"

echo "Setting up automated cron jobs for ENViroSwarm..."

# Remove old entries if they exist
crontab -l 2>/dev/null | grep -v "ENViroSwarm" > "$CRON_FILE" || true

# Add new entries
cat >> "$CRON_FILE" <<EOF
# ENViroSwarm Health Check — every 5 minutes
*/5 * * * * cd $PROJECT_DIR && ./scripts/health-check.sh >> /var/log/enviroswarm-health.log 2>&1

# ENViroSwarm Database Backup — daily at 3 AM
0 3 * * * cd $PROJECT_DIR && ./scripts/backup.sh >> /var/log/enviroswarm-backup.log 2>&1

# ENViroSwarm Docker Log Cleanup — weekly on Sunday at 2 AM
0 2 * * 0 docker system prune -f >> /var/log/enviroswarm-cleanup.log 2>&1

# ENViroSwarm Log Rotation — daily at 1 AM
0 1 * * * cd $PROJECT_DIR && find logs/ -name '*.log' -mtime +7 -delete 2>/dev/null || true
EOF

# Install crontab
crontab "$CRON_FILE"
rm -f "$CRON_FILE"

echo "✅ Cron jobs installed!"
echo ""
echo "Current cron jobs:"
crontab -l | grep "ENViroSwarm"
