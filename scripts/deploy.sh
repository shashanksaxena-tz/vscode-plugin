#!/bin/bash
set -e

# Pull latest changes
git pull origin main

# Generate configuration files
if [ -f "scripts/generate_config.sh" ]; then
    chmod +x scripts/generate_config.sh
    ./scripts/generate_config.sh
fi

# Deploy using production compose file
docker compose -f docker-compose.prod.yml up -d --build

# Prune unused images to save space
docker image prune -f
