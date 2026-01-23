#!/bin/bash
set -e

# Check if envsubst is installed
if ! command -v envsubst &> /dev/null; then
    echo "Error: envsubst is not installed. Please install gettext/gettext-base."
    exit 1
fi

# Load .env if present
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

echo "Generating alertmanager.yml from template..."
# strictly replace only known variables to avoid accidental replacements if needed
# but for now, replacing all is fine for this template.
envsubst < monitoring/alertmanager.yml.template > monitoring/alertmanager.yml

echo "Configuration generated successfully."
