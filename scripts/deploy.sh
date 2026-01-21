#!/bin/bash
set -e

# Define the project directory
PROJECT_DIR="/home/deploy/copilot-analytics-platform"

# Navigate to project directory
cd $PROJECT_DIR || { echo "Directory $PROJECT_DIR not found"; exit 1; }

echo "Starting deployment..."

# Pull the latest changes
echo "Pulling latest changes from git..."
git pull origin main

# Build and start services
echo "Rebuilding and restarting containers..."
docker compose -f docker-compose.prod.yml up -d --build

# Prune unused images to save space
echo "Pruning unused docker images..."
docker image prune -f

echo "Deployment completed successfully."
