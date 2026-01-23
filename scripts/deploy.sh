#!/bin/bash
set -e

echo "Starting deployment..."

# Navigate to repo root
cd "$(dirname "$0")/.."

# Source environment variables
if [ -f .env ]; then
    echo "Loading environment variables..."
    set -a
    source .env
    set +a
else
    echo "Warning: .env file not found. Ensure environment variables are set."
fi

# Pull latest changes
echo "Pulling latest changes from git..."
git pull origin main

# Generate configuration files
echo "Generating configuration files..."
if [ -x "./scripts/generate_config.sh" ]; then
    ./scripts/generate_config.sh
else
    echo "Error: ./scripts/generate_config.sh not found or not executable."
    exit 1
fi

# Run Docker Compose
echo "Starting Docker containers..."
docker compose -f docker-compose.prod.yml up -d --build

# Prune unused images
echo "Pruning unused images..."
docker image prune -f

echo "Deployment completed successfully."
