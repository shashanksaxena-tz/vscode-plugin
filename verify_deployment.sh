#!/bin/bash
set -e

# Function to check if a variable is set
check_env_var() {
  if [ -z "${!1}" ]; then
    echo "Error: Environment variable '$1' is not set."
    echo "Please define it in your .env file or export it."
    exit 1
  fi
}

echo "Starting deployment verification..."

# Check if .env file exists
if [ -f .env ]; then
  echo "Loading environment variables from .env..."
  # Use set -a to export variables from .env
  set -a
  source .env
  set +a
else
  echo "Warning: .env file not found. Ensure required environment variables are exported."
fi

# Check required environment variables
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "LLM_PROVIDER" "SMTP_HOST" "SMTP_PORT" "SMTP_USER" "SMTP_PASS" "ENCRYPTION_KEY")

for VAR in "${REQUIRED_VARS[@]}"; do
  check_env_var "$VAR"
done

echo "Environment variables check passed."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: docker could not be found. Please install Docker."
  exit 1
fi

echo "Docker check passed."

# Build Docker images
echo "Building Docker images..."
docker compose build

echo "Docker build successful."

# Run tests if possible
if [ -d "analytics-dashboard" ]; then
  echo "Running analytics-dashboard tests..."
  cd analytics-dashboard
  if [ -f "package.json" ]; then
     # Use npm ci for clean install if package-lock.json exists, otherwise npm install
     if [ -f "package-lock.json" ]; then
       if [ ! -d "node_modules" ]; then
          echo "Installing dependencies for analytics-dashboard (npm ci)..."
          npm ci
       fi
     else
       if [ ! -d "node_modules" ]; then
          echo "Installing dependencies for analytics-dashboard (npm install)..."
          npm install
       fi
     fi
     npm test
  else
    echo "Skipping analytics-dashboard tests: package.json not found."
  fi
  cd ..
fi

if [ -d "batch-processor" ]; then
  echo "Running batch-processor tests..."
  cd batch-processor
  if [ -f "package.json" ]; then
     if [ -f "package-lock.json" ]; then
       if [ ! -d "node_modules" ]; then
          echo "Installing dependencies for batch-processor (npm ci)..."
          npm ci
       fi
     else
       if [ ! -d "node_modules" ]; then
          echo "Installing dependencies for batch-processor (npm install)..."
          npm install
       fi
     fi
     npm test
  else
    echo "Skipping batch-processor tests: package.json not found."
  fi
  cd ..
fi

echo "Verification completed successfully."
