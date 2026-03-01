#!/bin/bash
set -e

# Pull latest changes
git pull origin main

# Generate configuration files
if [ -f "scripts/generate_config.sh" ]; then
    chmod +x scripts/generate_config.sh
    ./scripts/generate_config.sh
fi

# Apply Database Migrations
if [ -n "$SUPABASE_DB_URL" ]; then
    echo "Applying database migrations..."
    npx supabase db push --db-url "$SUPABASE_DB_URL"
else
    echo "Error: SUPABASE_DB_URL is not set. Cannot run migrations."
    exit 1
fi

# Deploy using production compose file
docker compose -f docker-compose.prod.yml up -d --build

# Prune unused images to save space
docker image prune -f
