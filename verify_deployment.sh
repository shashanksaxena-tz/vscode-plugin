#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment verification...${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found.${NC}"
    echo "Please copy .env.example to .env and configure the variables."
    exit 1
fi

echo -e "${GREEN}✔ .env file found${NC}"

# Load environment variables
set -a
source .env
set +a

# Check for required environment variables
REQUIRED_VARS=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "LLM_PROVIDER"
)

MISSING_VARS=0
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        echo -e "${RED}Error: Variable $VAR is missing or empty in .env${NC}"
        MISSING_VARS=1
    fi
done

if [ $MISSING_VARS -eq 1 ]; then
    echo "Please ensure all required variables are set in .env."
    exit 1
fi

echo -e "${GREEN}✔ Required environment variables present${NC}"

# Try Docker build
if command -v docker &> /dev/null; then
    echo -e "${GREEN}Building Docker containers...${NC}"
    if docker compose build; then
        echo -e "${GREEN}✔ Docker build successful${NC}"
    else
        echo -e "${YELLOW}Warning: Docker build failed. Attempting local build...${NC}"
        LOCAL_BUILD=true
    fi
else
    echo -e "${YELLOW}Docker not found. Attempting local build...${NC}"
    LOCAL_BUILD=true
fi

if [ "$LOCAL_BUILD" = true ]; then
    echo -e "${GREEN}Starting local build verification...${NC}"

    # Build Batch Processor
    echo -e "${GREEN}Building Batch Processor...${NC}"
    cd batch-processor
    if npm ci && npm run build; then
        echo -e "${GREEN}✔ Batch Processor built successfully${NC}"
    else
        echo -e "${RED}Error: Batch Processor build failed${NC}"
        exit 1
    fi
    cd ..

    # Build Dashboard
    echo -e "${GREEN}Building Dashboard...${NC}"
    cd analytics-dashboard

    # Dashboard requires these variables to be prefixed with NEXT_PUBLIC_
    export NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
    export NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

    # Use legacy-peer-deps as per memory
    if npm ci --legacy-peer-deps && npm run build; then
        echo -e "${GREEN}✔ Dashboard built successfully${NC}"
    else
        echo -e "${RED}Error: Dashboard build failed${NC}"
        exit 1
    fi
    cd ..
fi

echo -e "${GREEN}Deployment verification completed successfully!${NC}"
