#!/bin/bash
set -e

# Deployment script for Copilot Analytics Platform

echo "Starting deployment..."

# 1. Pull latest changes
echo "Pulling latest changes from git..."
git pull origin main

# 2. Stop existing containers
echo "Stopping existing containers..."
docker compose -f docker-compose.prod.yml down --remove-orphans

# 3. Build and start containers
echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

# 4. Prune unused images to save space
echo "Pruning unused images..."
docker image prune -f

echo "Deployment completed successfully!"
