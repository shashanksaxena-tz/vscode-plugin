#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment to staging...${NC}"

# Check for .env file
if [ -f .env ]; then
    echo "Loading environment variables from .env"
    # Use grep to ignore comments and empty lines
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${RED}Error: .env file not found.${NC}"
    echo "Please copy .env.example to .env and fill in the values."
    exit 1
fi

# Required variables
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "SMTP_HOST" "SMTP_USER" "SMTP_PASS" "ENCRYPTION_KEY" "LLM_PROVIDER")
MISSING_VARS=0

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        echo -e "${RED}Error: Environment variable $VAR is not set.${NC}"
        MISSING_VARS=1
    fi
done

# Check provider specific keys
if [ "$LLM_PROVIDER" == "anthropic" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}Error: ANTHROPIC_API_KEY is required for 'anthropic' provider.${NC}"
    MISSING_VARS=1
elif [ "$LLM_PROVIDER" == "openai" ] && [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}Error: OPENAI_API_KEY is required for 'openai' provider.${NC}"
    MISSING_VARS=1
elif [ "$LLM_PROVIDER" == "gemini" ] && [ -z "$GOOGLE_API_KEY" ]; then
    echo -e "${RED}Error: GOOGLE_API_KEY is required for 'gemini' provider.${NC}"
    MISSING_VARS=1
fi

if [ $MISSING_VARS -eq 1 ]; then
    exit 1
fi

echo "Environment checks passed."

# Build and start services
echo -e "${GREEN}Building and starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo -e "${GREEN}Services started.${NC}"

# Verify deployment
if [ -f ./scripts/verify_deployment.sh ]; then
    echo "Running verification script..."
    ./scripts/verify_deployment.sh
else
    echo -e "${RED}Warning: Verification script not found at ./scripts/verify_deployment.sh${NC}"
fi

echo -e "${GREEN}Deployment complete!${NC}"
