#!/bin/bash

# Deploy script for Copilot Analytics Platform

set -e

echo "Starting deployment..."

# Pull latest changes
git pull origin main

# Build and start services
docker compose -f docker-compose.prod.yml up -d --build

# Verify health
echo "Verifying service health..."
sleep 30

if curl -s http://localhost:3000/api/health > /dev/null; then
  echo "Dashboard is healthy"
else
  echo "Dashboard failed health check"
  exit 1
fi

if curl -s http://localhost:8080/health > /dev/null; then
  echo "Batch Processor is healthy"
else
  echo "Batch Processor failed health check"
  exit 1
fi

echo "Deployment successful!"
