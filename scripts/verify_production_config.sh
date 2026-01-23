#!/bin/bash
set -e

REQUIRED_FILES=(
  "docker-compose.prod.yml"
  "scripts/deploy.sh"
  "scripts/generate_config.sh"
  "monitoring/prometheus.yml"
  "monitoring/alert_rules.yml"
  "monitoring/alertmanager.yml.template"
  "monitoring/grafana/datasources/datasource.yml"
)

echo "Verifying required files..."

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "Error: Required file $file is missing."
    exit 1
  fi
done

# Check execution permissions for scripts
if [ ! -x "scripts/deploy.sh" ]; then
  echo "Error: scripts/deploy.sh is not executable."
  exit 1
fi

if [ ! -x "scripts/generate_config.sh" ]; then
  echo "Error: scripts/generate_config.sh is not executable."
  exit 1
fi

echo "All production configuration files verified."
