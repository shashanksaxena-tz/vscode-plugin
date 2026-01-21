#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
  source .env
fi

echo "Deploying Copilot Analytics Platform..."

# Pull latest changes
echo "Pulling latest changes..."
git fetch origin main
git reset --hard origin/main

# Rebuild and restart services
echo "Rebuilding and restarting services..."
docker compose down
docker compose up -d --build

# Wait for services to start
echo "Waiting for services to start..."
sleep 30

# Check health
echo "Checking health..."
# Check Dashboard Health
if command -v curl &> /dev/null; then
  DASHBOARD_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "failed")
else
  DASHBOARD_HEALTH=$(wget --server-response --spider --quiet http://localhost:3000/api/health 2>&1 | awk 'NR==1{print $2}' || echo "failed")
fi

# Check Batch Processor Health
if command -v curl &> /dev/null; then
  BATCH_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health || echo "failed")
else
  BATCH_HEALTH=$(wget --server-response --spider --quiet http://localhost:8080/health 2>&1 | awk 'NR==1{print $2}' || echo "failed")
fi

if [ "$DASHBOARD_HEALTH" = "200" ] && [ "$BATCH_HEALTH" = "200" ]; then
  echo "Deployment successful! All services are healthy."
else
  echo "Deployment failed. Health checks returned: Dashboard=$DASHBOARD_HEALTH, Batch=$BATCH_HEALTH"
  # Optional: Rollback or notify
  exit 1
fi
