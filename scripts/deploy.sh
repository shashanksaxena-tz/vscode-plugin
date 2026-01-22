#!/bin/bash
set -e

# Deployment Script for Copilot Analytics Platform

echo "Starting deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please create one based on the documentation."
    exit 1
fi

# 1. Pull latest changes
echo "Pulling latest changes..."
git pull origin main

# 2. Build and start services
echo "Rebuilding and restarting services..."
docker compose -f docker-compose.prod.yml up -d --build

# 3. Clean up unused images
echo "Cleaning up unused Docker images..."
docker image prune -f

echo "Deployment completed successfully."
echo "Please run scripts/verify_deployment.sh to verify the deployment."
