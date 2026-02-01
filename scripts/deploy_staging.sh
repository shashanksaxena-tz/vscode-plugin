#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting staging deployment...${NC}"

# 1. Check for required environment variables
REQUIRED_VARS=(
  "SUPABASE_URL"
  "SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "LLM_PROVIDER"
  "SMTP_HOST"
  "SMTP_PORT"
  "SMTP_USER"
  "SMTP_PASS"
  "ENCRYPTION_KEY"
)

MISSING_VARS=0
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo -e "${RED}Error: Environment variable $VAR is not set.${NC}"
    MISSING_VARS=1
  fi
done

if [ $MISSING_VARS -eq 1 ]; then
  echo -e "${RED}Please set all required environment variables before deploying.${NC}"
  exit 1
fi

# 2. Build and Start Services
echo -e "${GREEN}Building and starting services...${NC}"
docker compose -f docker-compose.prod.yml up --build -d

# 3. Health Checks
echo -e "${GREEN}Waiting for services to be healthy...${NC}"

# Function to check health
check_health() {
  local url=$1
  local name=$2
  local max_retries=30
  local attempt=1

  while [ $attempt -le $max_retries ]; do
    if curl -s -f "$url" > /dev/null; then
      echo -e "${GREEN}$name is healthy!${NC}"
      return 0
    fi
    echo "Waiting for $name (attempt $attempt/$max_retries)..."
    sleep 5
    ((attempt++))
  done

  echo -e "${RED}$name failed to become healthy.${NC}"
  return 1
}

# Check Dashboard
check_health "http://localhost:3000/api/health" "Dashboard" || exit 1

# Check Batch Processor
check_health "http://localhost:8080/health" "Batch Processor" || exit 1

echo -e "${GREEN}Deployment completed successfully!${NC}"
