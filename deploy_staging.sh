#!/bin/bash
set -e

# Load environment variables from .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "Starting deployment to staging..."

# Run deployment verification
echo "Running verification steps..."
if ! ./verify_deployment.sh; then
  echo "Verification failed. Aborting deployment."
  exit 1
fi

echo "Verification successful. Proceeding with deployment..."

# Simulate deployment
echo "Tagging Docker images for staging..."
echo "docker tag analytics-dashboard:latest registry.example.com/analytics-dashboard:staging"
echo "docker tag batch-processor:latest registry.example.com/batch-processor:staging"

echo "Pushing Docker images to registry..."
echo "docker push registry.example.com/analytics-dashboard:staging"
echo "docker push registry.example.com/batch-processor:staging"

echo "Updating staging environment..."
echo "kubectl set image deployment/analytics-dashboard analytics-dashboard=registry.example.com/analytics-dashboard:staging"
echo "kubectl set image deployment/batch-processor batch-processor=registry.example.com/batch-processor:staging"

echo "Deployment to staging complete!"
