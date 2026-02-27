#!/bin/bash
set -e

# Function to print colored output
print_green() {
    echo -e "\033[32m$1\033[0m"
}

print_red() {
    echo -e "\033[31m$1\033[0m"
}

# Check for required tools
if ! command -v npm &> /dev/null; then
    print_red "npm is not installed. Please install Node.js and npm."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    print_red "docker is not installed. Please install Docker."
    exit 1
fi

print_green "Starting verification process..."

# Analytics Dashboard Verification
print_green "Verifying analytics-dashboard..."
cd analytics-dashboard
print_green "Installing dependencies..."
npm ci
print_green "Running tests..."
npm test
print_green "Building project..."
NEXT_PUBLIC_SUPABASE_URL="https://example.supabase.co" NEXT_PUBLIC_SUPABASE_ANON_KEY="dummy-key" npm run build
cd ..

# Batch Processor Verification
print_green "Verifying batch-processor..."
cd batch-processor
print_green "Installing dependencies..."
npm ci
print_green "Running tests..."
npm test
print_green "Compiling project..."
npm run build
cd ..

# Docker Compose Verification
print_green "Verifying Docker Compose configuration..."
# Providing dummy values for build args to ensure docker build succeeds
SUPABASE_URL="https://example.supabase.co" \
SUPABASE_ANON_KEY="dummy-key" \
SUPABASE_SERVICE_ROLE_KEY="dummy-service-key" \
LLM_PROVIDER="anthropic" \
ANTHROPIC_API_KEY="dummy-api-key" \
OPENAI_API_KEY="dummy-openai-key" \
GOOGLE_API_KEY="dummy-google-key" \
SMTP_HOST="smtp.example.com" \
SMTP_PORT="587" \
SMTP_USER="user" \
SMTP_PASS="pass" \
ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000" \
docker compose build

print_green "Verification successful! All checks passed."
