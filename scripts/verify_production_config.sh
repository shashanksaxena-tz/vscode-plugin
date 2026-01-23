#!/bin/bash
set -e

echo "Verifying production configuration..."

# Go to repo root
cd "$(dirname "$0")/.."

REQUIRED_FILES=(
    "docker-compose.prod.yml"
    "monitoring/prometheus.yml"
    "monitoring/alert_rules.yml"
    "monitoring/alertmanager.yml.template"
    "monitoring/grafana/datasources/datasource.yml"
    "scripts/deploy.sh"
    "scripts/generate_config.sh"
)

MISSING_FILES=0

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "Missing file: $file"
        MISSING_FILES=1
    else
        echo "OK: $file"
    fi
done

# Check execution permissions
if [ -f "scripts/deploy.sh" ] && [ ! -x "scripts/deploy.sh" ]; then
    echo "Warning: scripts/deploy.sh is not executable. Run: chmod +x scripts/deploy.sh"
fi
if [ -f "scripts/generate_config.sh" ] && [ ! -x "scripts/generate_config.sh" ]; then
    echo "Warning: scripts/generate_config.sh is not executable. Run: chmod +x scripts/generate_config.sh"
fi

if [ $MISSING_FILES -eq 1 ]; then
    echo "Verification failed. Missing required files."
    exit 1
fi

echo "Verification successful."
