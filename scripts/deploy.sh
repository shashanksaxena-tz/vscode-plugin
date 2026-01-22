#!/bin/bash
set -e

# Pull latest changes
git pull origin main

# Deploy using production compose file
docker compose -f docker-compose.prod.yml up -d --build

# Prune unused images to save space
docker image prune -f
