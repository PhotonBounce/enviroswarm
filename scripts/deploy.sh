#!/usr/bin/env bash
set -euo pipefail

# ENViroSwarm Deployment Script
# Usage: ./scripts/deploy.sh [backend|web|all]

ENVIRONMENT=${ENVIRONMENT:-production}
DEPLOY_TARGET=${1:-all}
COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_DIR="/opt/enviroswarm"

log() {
    echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $*"
}

deploy_backend() {
    log "Deploying backend..."
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" pull backend
    docker-compose -f "$COMPOSE_FILE" up -d --no-deps --build backend
    log "Backend deployed. Running health check..."
    sleep 5
    for i in {1..10}; do
        if curl -sf http://localhost:8000/api/v1/health >/dev/null; then
            log "Health check passed!"
            return 0
        fi
        log "Health check attempt $i failed, retrying..."
        sleep 3
    done
    log "ERROR: Health check failed after 10 attempts"
    return 1
}

deploy_web() {
    log "Deploying web dashboard..."
    cd "$PROJECT_DIR"
    if [ -d "web-dashboard/dist" ]; then
        log "Web assets already built. Restarting nginx..."
        docker-compose -f "$COMPOSE_FILE" restart nginx
    else
        log "ERROR: web-dashboard/dist not found. Build it first."
        return 1
    fi
}

deploy_all() {
    log "Deploying full stack..."
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" down
    docker-compose -f "$COMPOSE_FILE" up -d --build
    log "Full stack deployed. Running smoke tests..."
    sleep 10
    curl -sf http://localhost:8000/api/v1/health || { log "Backend health check failed"; exit 1; }
    curl -sf http://localhost:80 || { log "Nginx health check failed"; exit 1; }
    log "All smoke tests passed. Deployment successful!"
}

# Main
case "$DEPLOY_TARGET" in
    backend)
        deploy_backend
        ;;
    web)
        deploy_web
        ;;
    all)
        deploy_all
        ;;
    *)
        echo "Usage: $0 [backend|web|all]"
        exit 1
        ;;
esac