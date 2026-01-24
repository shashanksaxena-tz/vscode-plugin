#!/bin/bash
set -e

echo "Deploying to Staging..."

# Check for .env file
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create one based on .env.example."
  exit 1
fi

# Verify configuration (static check)
echo "Verifying configuration..."
# Check if docker-compose.prod.yml exists
if [ ! -f docker-compose.prod.yml ]; then
  echo "Error: docker-compose.prod.yml not found."
  exit 1
fi

# Deploy
echo "Starting services..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo "Deployment completed successfully."
