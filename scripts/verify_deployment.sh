#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Parse arguments
STATIC_ONLY=false
for arg in "$@"; do
  if [ "$arg" == "--static-only" ]; then
    STATIC_ONLY=true
  fi
done

echo "Starting deployment verification..."
if [ "$STATIC_ONLY" = true ]; then
    echo "Running in STATIC ONLY mode (skipping container startup)."
fi

# 0. Static File Checks
echo "Checking critical configuration files..."
FILES_TO_CHECK=(
  "docker-compose.prod.yml"
  "monitoring/prometheus.yml"
  "monitoring/alert_rules.yml"
  "monitoring/alertmanager.yml.template"
  "monitoring/grafana/provisioning/datasources/datasource.yml"
  "monitoring/grafana/provisioning/dashboards/dashboard.yml"
  "monitoring/grafana/dashboards/batch_processor.json"
  "monitoring/grafana/dashboards/system_metrics.json"
)

MISSING_FILES=0
for file in "${FILES_TO_CHECK[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${RED}MISSING: $file${NC}"
    MISSING_FILES=$((MISSING_FILES + 1))
  else
    echo -e "${GREEN}FOUND: $file${NC}"
  fi
done

if [ $MISSING_FILES -gt 0 ]; then
  echo -e "${RED}Verification failed: $MISSING_FILES critical files missing.${NC}"
  exit 1
fi

if [ "$STATIC_ONLY" = true ]; then
  echo -e "${GREEN}Static verification SUCCESSFUL${NC}"
  exit 0
fi

# 1. Generate dummy .env file for verification
# We use .env.verify to avoid overwriting an existing .env file
echo "Generating temporary .env.verify file..."
cat > .env.verify <<EOF
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2MTY1ODU4MDYsImV4cCI6MTkyMTk0NTgwNn0.dummy-signature
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bW15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYxNjU4NTgwNiwidXhwIjoxOTIxOTQ1ODA2fQ.dummy-signature
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2MTY1ODU4MDYsImV4cCI6MTkyMTk0NTgwNn0.dummy-signature
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-dummy-key
OPENAI_API_KEY=sk-dummy-key
GOOGLE_API_KEY=dummy-key
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=pass
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
EOF

# 2. Generate configuration files
./scripts/generate_config.sh .env.verify

# 3. Start services
echo "Starting services with docker compose (Production Config)..."
# Use docker-compose.prod.yml to verify production artifacts
# Pass .env.verify to avoid using default .env
docker compose -f docker-compose.prod.yml --env-file .env.verify build
docker compose -f docker-compose.prod.yml --env-file .env.verify up -d

# 4. Wait for health checks
echo "Waiting for services to become healthy..."

check_health() {
  url=$1
  service=$2
  max_retries=30
  count=0

  while [ $count -lt $max_retries ]; do
    if wget --no-verbose --tries=1 --spider "$url" 2>/dev/null; then
      echo -e "${GREEN}✓ $service is up and running!${NC}"
      return 0
    fi
    echo "Waiting for $service... ($count/$max_retries)"
    sleep 2
    count=$((count + 1))
  done

  echo -e "${RED}✗ $service failed to start.${NC}"
  return 1
}

# Check Application Services
DASHBOARD_STATUS="FAIL"
if check_health "http://localhost:3000/api/health" "Dashboard"; then
  DASHBOARD_STATUS="PASS"
else
  docker compose -f docker-compose.prod.yml logs dashboard
fi

BATCH_STATUS="FAIL"
if check_health "http://localhost:8080/health" "Batch Processor"; then
  BATCH_STATUS="PASS"
else
  docker compose -f docker-compose.prod.yml logs batch-processor
fi

# Check Monitoring Services
PROMETHEUS_STATUS="FAIL"
if check_health "http://localhost:9090/-/healthy" "Prometheus"; then
  PROMETHEUS_STATUS="PASS"
else
  docker compose -f docker-compose.prod.yml logs prometheus
fi

ALERTMANAGER_STATUS="FAIL"
if check_health "http://localhost:9093/-/healthy" "Alertmanager"; then
  ALERTMANAGER_STATUS="PASS"
else
  docker compose -f docker-compose.prod.yml logs alertmanager
fi

GRAFANA_STATUS="FAIL"
if check_health "http://localhost:3001/api/health" "Grafana"; then
  GRAFANA_STATUS="PASS"
else
  docker compose -f docker-compose.prod.yml logs grafana
fi

# 5. Clean up
echo "Cleaning up..."
docker compose -f docker-compose.prod.yml --env-file .env.verify down
rm .env.verify

# 6. Report
echo "----------------------------------------"
echo "Verification Results:"
echo "Dashboard:       $DASHBOARD_STATUS"
echo "Batch Processor: $BATCH_STATUS"
echo "Prometheus:      $PROMETHEUS_STATUS"
echo "Alertmanager:    $ALERTMANAGER_STATUS"
echo "Grafana:         $GRAFANA_STATUS"
echo "----------------------------------------"

if [ "$DASHBOARD_STATUS" == "PASS" ] && \
   [ "$BATCH_STATUS" == "PASS" ] && \
   [ "$PROMETHEUS_STATUS" == "PASS" ] && \
   [ "$ALERTMANAGER_STATUS" == "PASS" ] && \
   [ "$GRAFANA_STATUS" == "PASS" ]; then
  echo -e "${GREEN}Deployment verification SUCCESSFUL${NC}"
  exit 0
else
  echo -e "${RED}Deployment verification FAILED${NC}"
  exit 1
fi
