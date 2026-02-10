#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Staging Deployment...${NC}"

# 1. Check required environment variables
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY")
MISSING_VARS=0

# Load .env if it exists
if [ -f .env ]; then
  echo "Loading .env file..."
  export $(grep -v '^#' .env | xargs)
fi

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo -e "${RED}Error: Environment variable $VAR is missing.${NC}"
    MISSING_VARS=1
  fi
done

# Check LLM Provider specific keys
if [ "$LLM_PROVIDER" == "anthropic" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}Error: ANTHROPIC_API_KEY is missing for LLM_PROVIDER=anthropic.${NC}"
    MISSING_VARS=1
fi

if [ $MISSING_VARS -eq 1 ]; then
  echo -e "${RED}Deployment failed due to missing environment variables.${NC}"
  exit 1
fi

echo -e "${GREEN}Environment variables verified.${NC}"

# 2. Build Docker Images
echo -e "${GREEN}Building Docker images...${NC}"

# Dashboard
echo "Building analytics-dashboard..."
# docker build -t copilot-analytics-dashboard:staging ./analytics-dashboard \
#   --build-arg NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
#   --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Batch Processor
echo "Building batch-processor..."
# docker build -t copilot-analytics-batch-processor:staging ./batch-processor

echo -e "${GREEN}Builds completed (simulated).${NC}"

# 3. Push to Registry (Placeholder)
echo -e "${GREEN}Pushing images to registry...${NC}"
# docker push copilot-analytics-dashboard:staging
# docker push copilot-analytics-batch-processor:staging
echo -e "${GREEN}Push completed (simulated).${NC}"

# 4. Update Staging Environment (Placeholder)
echo -e "${GREEN}Updating staging environment...${NC}"
# This could be a helm upgrade, a docker-compose up on a remote server, or a webhook trigger.
# ssh user@staging-server "cd /app && docker-compose pull && docker-compose up -d"
echo -e "${GREEN}Staging environment updated (simulated).${NC}"

echo -e "${GREEN}Deployment to Staging Successful!${NC}"
