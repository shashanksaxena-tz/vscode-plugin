#!/bin/bash
set -e

# Load environment variables from .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "Verifying deployment environment..."

# check for required environment variables
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "ANTHROPIC_API_KEY" "LLM_PROVIDER")
MISSING_VARS=0

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "Error: Environment variable $VAR is not set."
    MISSING_VARS=1
  fi
done

if [ $MISSING_VARS -eq 1 ]; then
  echo "Please set the required environment variables in .env or your shell."
  exit 1
fi

echo "Environment variables verified."

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "Error: docker could not be found."
    exit 1
fi

# Run tests for analytics-dashboard
echo "Running tests for analytics-dashboard..."
cd analytics-dashboard
echo "Installing dependencies (ci)..."
npm ci
npm test
cd ..

# Run tests for batch-processor
echo "Running tests for batch-processor..."
cd batch-processor
echo "Installing dependencies (ci)..."
npm ci
npm test
cd ..

# Build Docker images
echo "Building Docker images..."
docker compose build

echo "Verification complete!"
