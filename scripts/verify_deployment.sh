#!/bin/bash
set -e

echo "Verifying Deployment..."

# Check if containers are running
if [ -x "$(command -v docker)" ]; then
    services=("dashboard" "batch-processor")
    for service in "${services[@]}"; do
        # Use docker compose ps to check if service is running
        # Note: 'docker compose' (v2) vs 'docker-compose' (v1)
        if docker compose -f docker-compose.prod.yml ps --filter "status=running" --format json | grep -q "$service"; then
            echo "✅ Service $service is running."
        else
            # Fallback check or simple grep if json format fails or logic is complex
            if docker compose -f docker-compose.prod.yml ps | grep "$service" | grep -i "Up"; then
                 echo "✅ Service $service is running."
            else
                 echo "❌ Service $service is NOT running."
                 exit 1
            fi
        fi
    done
else
    echo "Docker not found, skipping runtime verification."
fi

# Health checks (if curl is available)
if [ -x "$(command -v curl)" ]; then
    echo "Checking health endpoints..."
    # Dashboard
    if curl -f -s -o /dev/null http://localhost:3000/api/health; then
        echo "✅ Dashboard is healthy."
    else
        echo "⚠️ Dashboard health check failed (or not ready yet)."
    fi
    # Batch Processor
    if curl -f -s -o /dev/null http://localhost:8080/health; then
        echo "✅ Batch Processor is healthy."
    else
        echo "⚠️ Batch Processor health check failed (or not ready yet)."
    fi
fi
