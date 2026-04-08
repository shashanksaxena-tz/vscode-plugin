#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Staging Deployment...${NC}"

# Check required environment variables
REQUIRED_VARS=(
  "SUPABASE_URL"
  "SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "ENCRYPTION_KEY"
  "SMTP_HOST"
  "SMTP_USER"
  "SMTP_PASS"
)

MISSING_VARS=0
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo -e "${RED}Error: Environment variable $VAR is not set.${NC}"
    MISSING_VARS=1
  fi
done

if [ $MISSING_VARS -eq 1 ]; then
  echo -e "${RED}Deployment aborted due to missing environment variables.${NC}"
  exit 1
fi

# Generate Alertmanager configuration
echo -e "${GREEN}Generating Alertmanager configuration...${NC}"
./scripts/generate_config.sh .env

# Build and start services
echo -e "${GREEN}Building and starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d --build

# Health Check
echo -e "${GREEN}Waiting for services to be healthy...${NC}"
# Wait loop for health
MAX_RETRIES=12
count=0
echo "Waiting for Dashboard..."
while ! curl -s -f http://localhost:3000/api/health > /dev/null; do
    if [ $count -ge $MAX_RETRIES ]; then
        echo -e "${RED}Dashboard failed to start.${NC}"
        break
    fi
    echo "Waiting for Dashboard ($count)..."
    sleep 5
    count=$((count+1))
done

if curl -s -f http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}Dashboard is healthy!${NC}"
fi

count=0
echo "Waiting for Batch Processor..."
while ! curl -s -f http://localhost:8080/health > /dev/null; do
    if [ $count -ge $MAX_RETRIES ]; then
        echo -e "${RED}Batch Processor failed to start.${NC}"
        break
    fi
    echo "Waiting for Batch Processor ($count)..."
    sleep 5
    count=$((count+1))
done

if curl -s -f http://localhost:8080/health > /dev/null; then
    echo -e "${GREEN}Batch Processor is healthy!${NC}"
fi

echo -e "${GREEN}Deployment Complete!${NC}"
