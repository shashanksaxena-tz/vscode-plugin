#!/bin/bash
set -e

echo "Deploying to staging..."

# Pull latest changes (assuming we are on the server)
# git pull origin main

# Build and start services
echo "Building and starting services..."
docker compose down
docker compose build
docker compose up -d

# Verify health
echo "Waiting for services to start..."
sleep 30

echo "Checking Dashboard health..."
if curl -f http://localhost:3000/api/health; then
    echo "Dashboard is healthy"
else
    echo "Dashboard health check failed"
    exit 1
fi

echo "Checking Batch Processor health..."
if curl -f http://localhost:8080/health; then
    echo "Batch Processor is healthy"
else
    echo "Batch Processor health check failed"
    exit 1
fi

echo "Deployment complete!"
