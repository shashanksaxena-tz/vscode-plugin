#!/bin/bash
set -e

# Deployment script for staging environment
# Validates environment variables and starts services using docker-compose.prod.yml

echo "Starting deployment to staging..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    exit 1
fi

# Export environment variables from .env for validation
# We use grep to filter out comments and empty lines
set -a
source <(grep -v '^#' .env | grep -v '^\s*$')
set +a

# List of required variables
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

MISSING_VARS=()

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        MISSING_VARS+=("$VAR")
    fi
done

# Provider specific checks
if [ "$LLM_PROVIDER" = "anthropic" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    MISSING_VARS+=("ANTHROPIC_API_KEY")
elif [ "$LLM_PROVIDER" = "openai" ] && [ -z "$OPENAI_API_KEY" ]; then
    MISSING_VARS+=("OPENAI_API_KEY")
elif [ "$LLM_PROVIDER" = "gemini" ] && [ -z "$GOOGLE_API_KEY" ]; then
    MISSING_VARS+=("GOOGLE_API_KEY")
fi

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "Error: The following environment variables are missing:"
    for VAR in "${MISSING_VARS[@]}"; do
        echo "  - $VAR"
    done
    exit 1
fi

echo "Environment validation passed."

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: docker command not found."
    exit 1
fi

# Build and start services
echo "Building and starting services..."
docker compose -f docker-compose.prod.yml up -d --build

echo "Deployment completed successfully!"
