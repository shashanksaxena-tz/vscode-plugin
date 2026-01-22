#!/bin/bash
set -e

# Navigate to project root
cd "$(dirname "$0")/.."

echo "Generating configuration..."

# Check required env vars for Alertmanager
if [ -z "$SMTP_HOST" ] || [ -z "$SMTP_PORT" ] || [ -z "$SMTP_USER" ] || [ -z "$SMTP_PASS" ] || [ -z "$ALERT_EMAIL_TO" ]; then
  echo "Error: SMTP environment variables are missing."
  echo "Please ensure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and ALERT_EMAIL_TO are set."
  exit 1
fi

# Generate alertmanager.yml from template
# We use a simple sed replacement if envsubst is not available, or assume envsubst is installed.
# Using sed for better portability in minimal environments if envsubst is missing.
if command -v envsubst >/dev/null 2>&1; then
  envsubst < monitoring/alertmanager.yml.template > monitoring/alertmanager.yml
else
  # Fallback to sed (basic replacement)
  sed -e "s|\${SMTP_HOST}|$SMTP_HOST|g" \
      -e "s|\${SMTP_PORT}|$SMTP_PORT|g" \
      -e "s|\${SMTP_USER}|$SMTP_USER|g" \
      -e "s|\${SMTP_PASS}|$SMTP_PASS|g" \
      -e "s|\${ALERT_EMAIL_TO}|$ALERT_EMAIL_TO|g" \
      monitoring/alertmanager.yml.template > monitoring/alertmanager.yml
fi

echo "Configuration generated."
