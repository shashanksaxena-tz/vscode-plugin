#!/bin/bash
set -e

echo "Deploying Copilot Analytics Platform..."

if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Pulling latest changes..."
    git pull origin main || echo "Git pull failed or branch not found, continuing with current code..."
fi

echo "Starting services..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo "Pruning unused images..."
docker image prune -f

echo "Deployment complete!"
