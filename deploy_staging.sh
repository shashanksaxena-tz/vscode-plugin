#!/bin/bash
set -e

# Function to print colored output
print_green() {
    echo -e "\033[32m$1\033[0m"
}

print_red() {
    echo -e "\033[31m$1\033[0m"
}

# Source environment variables if .env file exists
if [ -f .env ]; then
    print_green "Loading environment variables from .env..."
    export $(cat .env | xargs)
fi

print_green "Starting deployment to staging..."

# Run verification script first
print_green "Running deployment verification..."
./verify_deployment.sh
if [ $? -ne 0 ]; then
    print_red "Verification failed. Aborting deployment."
    exit 1
fi

print_green "Verification successful. Proceeding with deployment..."

# Tag Docker images for staging (Simulated)
TAG="staging-$(date +%Y%m%d-%H%M%S)"
print_green "Tagging Docker images with tag: $TAG"
docker tag analytics-dashboard:latest staging-registry.example.com/analytics-dashboard:$TAG
docker tag batch-processor:latest staging-registry.example.com/batch-processor:$TAG

# Push Docker images to registry (Simulated)
print_green "Pushing Docker images to staging registry..."
# Note: In a real deployment, we would run:
# docker push staging-registry.example.com/analytics-dashboard:$TAG
# docker push staging-registry.example.com/batch-processor:$TAG
print_green "Simulated push complete."

print_green "Deploying to staging environment..."
# Note: In a real deployment, we would trigger a deployment via SSH or CI/CD pipeline
# e.g., ssh user@staging-server "cd /app && docker-compose pull && docker-compose up -d"
print_green "Deployment simulation complete! Staging environment updated."
