#!/bin/bash
set -e

# Navigate to project root
cd "$(dirname "$0")/.."

echo "Deploying Copilot Analytics..."

# Load .env file if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env..."
  set -a
  source .env
  set +a
fi

# Pull latest changes
git pull origin main

# Generate configuration
./scripts/generate_config.sh

# Deploy with Docker Compose
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

# Prune unused images to save space
docker image prune -f

echo "Deployment successful!"
