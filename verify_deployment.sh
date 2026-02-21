#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Deployment Verification...${NC}"

# 1. Check for required environment variables
echo -e "\n${GREEN}[1/5] Checking Environment Variables...${NC}"
REQUIRED_VARS=(
  "SUPABASE_URL"
  "SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "ANTHROPIC_API_KEY"
  "SMTP_HOST"
  "SMTP_PORT"
  "SMTP_USER"
  "SMTP_PASS"
  "ENCRYPTION_KEY"
)

MISSING_VARS=0
if [ -f .env ]; then
  echo "Loading .env file..."
  set -a
  source .env
  set +a
fi

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo -e "${RED}Error: Environment variable $VAR is missing.${NC}"
    MISSING_VARS=1
  else
    echo "  - $VAR is set"
  fi
done

if [ $MISSING_VARS -eq 1 ]; then
  echo -e "${RED}Verification failed: Missing environment variables.${NC}"
  # We don't exit here strictly to allow running tests in environments where we might want to skip env check
  # But for strict verification, we should exit. Given this is a script to verify deployment readiness, exiting is safer.
  exit 1
fi

# 2. Verify Docker installation
echo -e "\n${GREEN}[2/5] Verifying Docker Installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed.${NC}"
    exit 1
fi
echo "  - Docker is installed: $(docker --version)"

if ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: docker compose is not available.${NC}"
    exit 1
fi
echo "  - Docker Compose is installed: $(docker compose version)"

# 3. Install dependencies
echo -e "\n${GREEN}[3/5] Installing Dependencies...${NC}"
echo "  - Installing analytics-dashboard dependencies..."
(cd analytics-dashboard && npm install)
echo "  - Installing batch-processor dependencies..."
(cd batch-processor && npm install)

# 4. Run Unit Tests
echo -e "\n${GREEN}[4/5] Running Unit Tests...${NC}"
echo "  - Running analytics-dashboard tests..."
(cd analytics-dashboard && npm test)

echo "  - Running batch-processor tests..."
(cd batch-processor && npm test)

# 5. Build Docker Images
echo -e "\n${GREEN}[5/5] Building Docker Images...${NC}"
# We assume .env variables are available to docker compose
docker compose build

echo -e "\n${GREEN}Deployment Verification Completed Successfully!${NC}"
