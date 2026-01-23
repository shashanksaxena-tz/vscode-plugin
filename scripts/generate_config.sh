#!/bin/bash
set -e

# Check for envsubst
if ! command -v envsubst &> /dev/null; then
    echo "envsubst could not be found. Please install gettext."
    exit 1
fi

echo "Generating monitoring/alertmanager.yml from template..."
envsubst < monitoring/alertmanager.yml.template > monitoring/alertmanager.yml

echo "Configuration generation complete."
