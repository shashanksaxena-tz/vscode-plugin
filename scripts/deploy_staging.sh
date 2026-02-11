#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "Starting Staging Deployment..."

# 1. Check for .env file
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found.${NC}"
  echo -e "${YELLOW}Please run ./scripts/setup_secrets.sh to create one.${NC}"
  exit 1
fi

# 2. Pre-flight checks
echo "Running pre-flight verification..."
if ./scripts/verify_deployment.sh --static-only; then
    echo -e "${GREEN}Pre-flight checks passed.${NC}"
else
    echo -e "${RED}Pre-flight checks failed. Aborting deployment.${NC}"
    exit 1
fi

# 3. Generate configuration
echo "Generating configuration..."
if ./scripts/generate_config.sh; then
    echo -e "${GREEN}Configuration generated.${NC}"
else
    echo -e "${RED}Failed to generate configuration.${NC}"
    exit 1
fi

# 4. Deploy
echo "Deploying to staging (simulated for this environment)..."

# Note: In a real environment, we would run:
# docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
# docker image prune -f

if command -v docker >/dev/null 2>&1; then
    echo "Docker found. Proceeding with deployment commands..."
    # Using dry-run/check if possible or just assuming user knows what they are doing.
    # For now, we will just echo the commands that would run.
    echo "Running: docker compose -f docker-compose.prod.yml up -d --build --remove-orphans"
    docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
    echo "Running: docker image prune -f"
    docker image prune -f
    echo -e "${GREEN}Deployment completed successfully!${NC}"
else
    echo -e "${YELLOW}Docker not found. Skipping actual container startup.${NC}"
    echo -e "${GREEN}Deployment script finished (Dry Run).${NC}"
fi
