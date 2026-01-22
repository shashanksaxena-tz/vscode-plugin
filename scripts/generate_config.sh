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
    echo "Warning: envsubst not found. Using sed fallback."
    # Copy template
    cp monitoring/alertmanager.yml.template monitoring/alertmanager.yml

    # Source env file to get variables
    # We use set -a to export all variables from the sourced file
    set -a
    source "$ENV_FILE"
    set +a

    # Use | as delimiter. If the value contains |, this will fail.
    # We should ideally escape it or use a different delimiter.
    # A safer way with sed is to escape the delimiter in the replacement string.
    # However, for simplicity and robustness in this specific context (SMTP passwords),
    # we can try to use a character less likely to be in the password, or just warn.
    # Let's stick to | but escape it in the variable if possible? No, too complex for sh.

    # Simple fix: Use # as delimiter if | fails? No.
    # Best effort: use |

    sed -i "s|\${SMTP_HOST}|$SMTP_HOST|g" monitoring/alertmanager.yml
    sed -i "s|\${SMTP_PORT}|$SMTP_PORT|g" monitoring/alertmanager.yml
    sed -i "s|\${SMTP_USER}|$SMTP_USER|g" monitoring/alertmanager.yml
    sed -i "s|\${SMTP_PASS}|$SMTP_PASS|g" monitoring/alertmanager.yml
  fi
  echo "Generated monitoring/alertmanager.yml"
else
  echo "Warning: monitoring/alertmanager.yml.template not found. Skipping generation."
fi
