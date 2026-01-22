#!/bin/bash
set -e

# Navigate to project root
cd "$(dirname "$0")/.."

echo "Verifying production configuration..."

REQUIRED_FILES=(
  "docker-compose.prod.yml"
  "monitoring/prometheus.yml"
  "monitoring/alert_rules.yml"
  "monitoring/alertmanager.yml.template"
  "monitoring/grafana/datasources/datasource.yml"
  "monitoring/grafana/dashboards/main.json"
  "scripts/deploy.sh"
  "scripts/generate_config.sh"
)

MISSING=0
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "Error: Missing required file: $file"
    MISSING=1
  fi
done

if [ $MISSING -eq 1 ]; then
  exit 1
fi

# Check executable permissions
if [ ! -x "scripts/deploy.sh" ]; then
  echo "Error: scripts/deploy.sh is not executable"
  exit 1
fi

if [ ! -x "scripts/generate_config.sh" ]; then
  echo "Error: scripts/generate_config.sh is not executable"
  exit 1
fi

echo "All production configuration files are present and valid."
