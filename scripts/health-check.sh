#!/usr/bin/env bash
set -euo pipefail

# ENViroSwarm Health Check Script
# Can be run manually or as a cron job for monitoring

API_URL="${API_URL:-http://localhost:8000}"
WEB_URL="${WEB_URL:-http://localhost}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"

ERRORS=0

check() {
    local name="$1"
    local url="$2"
    local expected="$3"
    
    echo -n "Checking $name... "
    if RESPONSE=$(curl -sf "$url" 2>/dev/null); then
        if echo "$RESPONSE" | grep -q "$expected"; then
            echo "✅ OK"
        else
            echo "❌ FAIL (unexpected response)"
            ((ERRORS++)) || true
        fi
    else
        echo "❌ FAIL (no response)"
        ((ERRORS++)) || true
    fi
}

# Backend checks
check "API Health" "$API_URL/api/v1/health" "success"
check "API Pricing" "$API_URL/api/v1/pricing" "success"

# Web checks
check "Web Dashboard" "$WEB_URL" "EnviroSwarm"

# Database check (if psql available)
if command -v psql &>/dev/null; then
    echo -n "Checking Database... "
    if psql -h "${POSTGRES_HOST:-localhost}" -U "${POSTGRES_USER:-enviroswarm}" -d "${POSTGRES_DB:-enviroswarm}" -c "SELECT 1" >/dev/null 2>&1; then
        echo "✅ OK"
    else
        echo "❌ FAIL"
        ((ERRORS++)) || true
    fi
else
    echo "⚠️  psql not available, skipping DB check"
fi

# Disk space check
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "❌ DISK SPACE WARNING: ${DISK_USAGE}% used"
    ((ERRORS++)) || true
else
    echo "✅ Disk space: ${DISK_USAGE}% used"
fi

# Summary
echo ""
if [ "$ERRORS" -eq 0 ]; then
    echo "🎉 All health checks passed!"
    exit 0
else
    echo "⚠️  $ERRORS check(s) failed!"
    
    # Send alert if webhook configured
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -sf -X POST -H "Content-Type: application/json" \
            -d "{\"text\":\"ENViroSwarm Health Alert: $ERRORS checks failed on $(hostname)\"}" \
            "$ALERT_WEBHOOK" >/dev/null 2>&1 || true
    fi
    exit 1
fi