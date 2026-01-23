#!/bin/bash
set -e

# Load environment variables if .env exists
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "Deploying Copilot Analytics Platform..."

# Pull latest changes
echo "Pulling latest changes..."
git pull origin main

# Build and start services
echo "Building and starting services..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

# Cleanup
echo "Cleaning up unused images..."
docker image prune -f

echo "Deployment complete!"
