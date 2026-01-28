#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting staging deployment...${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create a .env file with required environment variables."
    exit 1
fi

# Pull latest changes (optional, assumes running in a git repo)
if [ -d .git ]; then
    echo "Pulling latest changes..."
    git pull origin main || echo -e "${RED}Warning: Failed to pull latest changes.${NC}"
fi

# Build and start services
echo "Building and starting services..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

# Prune unused images
echo "Pruning unused images..."
docker image prune -f

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo "Run ./scripts/verify_deployment.sh to verify the services."
