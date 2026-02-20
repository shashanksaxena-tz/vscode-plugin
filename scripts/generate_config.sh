#!/bin/bash
set -e

# Script to generate configuration files from templates
# Usage: ./scripts/generate_config.sh [env_file]

ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: Environment file $ENV_FILE not found."
    exit 1
fi

echo "Generating Alertmanager configuration using $ENV_FILE..."

if [ -f monitoring/alertmanager.yml.template ]; then
  # Use envsubst if available
  if command -v envsubst >/dev/null 2>&1; then
    # Export variables from env file so envsubst can see them
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    envsubst < monitoring/alertmanager.yml.template > monitoring/alertmanager.yml
  else
    echo "Warning: envsubst not found. Using Python fallback."

    # Source env file to get variables
    set -a
    source "$ENV_FILE"
    set +a

    # Use python for safe substitution
    python3 -c "import os, sys; print(os.path.expandvars(sys.stdin.read()), end='')" < monitoring/alertmanager.yml.template > monitoring/alertmanager.yml
  fi
  echo "Generated monitoring/alertmanager.yml"
else
  echo "Warning: monitoring/alertmanager.yml.template not found. Skipping generation."
fi
