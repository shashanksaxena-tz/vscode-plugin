#!/bin/bash
set -e

echo "Deploying Copilot Analytics Platform..."

# Pull latest changes
if [ -d ".git" ]; then
  echo "Pulling latest changes from git..."
  git pull origin main
else
  echo "Not a git repository, skipping pull."
fi

# Build and start services
echo "Building and starting services..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

# Prune unused images
echo "Pruning unused docker images..."
docker image prune -f

echo "Deployment complete!"
