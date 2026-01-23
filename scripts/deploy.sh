#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "Starting deployment..."

# Verify configuration
echo "Verifying production configuration..."
./scripts/verify_production_config.sh

# Generate dynamic configuration
echo "Generating dynamic configuration..."
./scripts/generate_config.sh

# Deploy with Docker Compose
echo "Building and starting services..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo "Deployment complete."
