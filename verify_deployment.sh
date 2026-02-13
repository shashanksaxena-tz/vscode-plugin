#!/bin/bash
set -e

echo "Starting Deployment Verification..."

# 1. Check for .env file
if [ ! -f .env ]; then
    echo "WARNING: .env file not found. Please create one based on .env.example."
    # We will continue with dummy values for build verification if missing
else
    echo "✓ .env file found."
    source .env
fi

# 2. Check for critical environment variables (mock check if not in env)
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "ENCRYPTION_KEY")
MISSING_VARS=0

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        echo "WARNING: $VAR is not set."
        MISSING_VARS=$((MISSING_VARS + 1))
    fi
done

if [ $MISSING_VARS -gt 0 ]; then
    echo "Some environment variables are missing. Deployment might fail."
else
    echo "✓ Critical environment variables are set."
fi

# 3. Verify Analytics Dashboard Build
echo "Verifying Analytics Dashboard Build..."
cd analytics-dashboard

# Check if npm dependencies need to be installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm ci --legacy-peer-deps > /dev/null 2>&1
fi

# Run build with potentially dummy variables if not set
export NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL:-"https://example.supabase.co"}
export NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-"dummy-anon-key"}

echo "Running npm run build..."
if npm run build; then
    echo "✓ Dashboard built successfully."
else
    echo "✗ Dashboard build failed."
    exit 1
fi

cd ..

echo "Deployment Verification Completed Successfully."
