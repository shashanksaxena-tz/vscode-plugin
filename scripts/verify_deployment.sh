#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment verification...${NC}"

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env..."
  set -a
  source .env
  set +a
fi

# 1. Check for required environment variables
echo "Checking environment variables..."
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "ANTHROPIC_API_KEY")
MISSING_VARS=0

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo -e "${RED}Error: ${VAR} is not set.${NC}"
    MISSING_VARS=1
  fi
done

if [ $MISSING_VARS -eq 1 ]; then
  echo -e "${RED}Please set the missing environment variables in your .env file or environment.${NC}"
  exit 1
fi

echo -e "${GREEN}Environment variables check passed.${NC}"

# 2. Run tests
echo "Running tests..."

echo "Testing analytics-dashboard..."
cd analytics-dashboard
npm test
cd ..

echo "Testing batch-processor..."
cd batch-processor
npm test
cd ..

echo -e "${GREEN}All tests passed.${NC}"

# 3. Build Docker images
echo "Building Docker images..."
docker compose build

echo -e "${GREEN}Docker build successful.${NC}"
echo -e "${GREEN}Verification complete!${NC}"
