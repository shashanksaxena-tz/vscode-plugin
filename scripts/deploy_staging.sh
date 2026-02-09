#!/bin/bash
set -e

# Load environment variables from .env if present
if [ -f .env ]; then
  # Use grep to remove comments and export variables
  export $(grep -v '^#' .env | xargs)
fi

echo "Starting deployment checks for Staging Environment..."

# Function to check if a variable is set
check_env_var() {
  if [ -z "${!1}" ]; then
    echo "Error: Environment variable $1 is not set."
    exit 1
  fi
}

# Check essential Supabase variables
check_env_var "SUPABASE_URL"
check_env_var "SUPABASE_ANON_KEY"
check_env_var "SUPABASE_SERVICE_ROLE_KEY"

# Check LLM Provider configuration
check_env_var "LLM_PROVIDER"
if [ "$LLM_PROVIDER" = "anthropic" ]; then
  check_env_var "ANTHROPIC_API_KEY"
elif [ "$LLM_PROVIDER" = "openai" ]; then
  check_env_var "OPENAI_API_KEY"
elif [ "$LLM_PROVIDER" = "gemini" ]; then
  check_env_var "GOOGLE_API_KEY"
fi

# Check SMTP Configuration (optional but recommended for notifications)
if [ -z "$SMTP_HOST" ]; then
  echo "Warning: SMTP_HOST is not set. Email notifications will not work."
else
  check_env_var "SMTP_PORT"
  check_env_var "SMTP_USER"
  check_env_var "SMTP_PASS"
fi

# Check encryption key for sensitive data
check_env_var "ENCRYPTION_KEY"

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: docker could not be found. Please install Docker."
    exit 1
fi

echo "Environment check passed."

# Build and deploy
echo "Building Docker images..."
docker compose build

echo "Starting services..."
docker compose up -d

echo "Deployment completed successfully."
echo "Dashboard is running at http://localhost:3000"
echo "Batch Processor is running at http://localhost:8080"
