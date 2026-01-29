#!/bin/bash
set -e

# Deployment script for Staging

echo "Starting deployment to Staging..."

# Check required environment variables
if [ -z "$SUPABASE_URL" ]; then
  echo "Error: SUPABASE_URL is not set."
  exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "Error: SUPABASE_ANON_KEY is not set."
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_SERVICE_ROLE_KEY is not set."
  exit 1
fi

# Build and start services
echo "Building and starting services..."
# Using standard docker-compose.yml as production one is not present in root
docker compose -f docker-compose.yml up -d --build

# Health check
echo "Waiting for services to be ready..."
sleep 10

if curl -s http://localhost:3000/api/health > /dev/null; then
  echo "Dashboard is healthy."
else
  echo "Warning: Dashboard health check failed."
fi

echo "Deployment complete!"
