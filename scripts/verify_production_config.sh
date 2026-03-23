#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Starting Production Configuration Verification..."

FAIL=0

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓ Found $1${NC}"
    else
        echo -e "${RED}✗ Missing $1${NC}"
        FAIL=1
    fi
}

check_executable() {
    if [ -x "$1" ]; then
        echo -e "${GREEN}✓ $1 is executable${NC}"
    else
        echo -e "${RED}✗ $1 is not executable (or missing)${NC}"
        FAIL=1
    fi
}

# 1. Check for Docker Compose Production File
check_file "docker-compose.prod.yml"

# 2. Check for Scripts
check_file "scripts/deploy.sh"
check_executable "scripts/deploy.sh"

check_file "scripts/verify_deployment.sh"
check_executable "scripts/verify_deployment.sh"

# 3. Check for Monitoring Configuration
echo "Checking Monitoring Configuration..."
check_file "monitoring/prometheus.yml"
check_file "monitoring/alert_rules.yml"
check_file "monitoring/alertmanager.yml.template"
check_file "monitoring/grafana/provisioning/datasources/datasource.yml"
check_file "monitoring/grafana/provisioning/dashboards/dashboard.yml"
check_file "monitoring/grafana/dashboards/batch_processor.json"
check_file "monitoring/grafana/dashboards/system_metrics.json"

# 4. Check for Environment Variables Template or Documentation
if [ -f ".env.example" ] || [ -f "docs/deployment.md" ]; then
    echo -e "${GREEN}✓ Found deployment documentation or env example${NC}"
else
    echo -e "${RED}✗ Missing .env.example or docs/deployment.md${NC}"
    FAIL=1
fi

# 5. Check contents of docker-compose.prod.yml (basic check)
if grep -q "production" docker-compose.prod.yml; then
    echo -e "${GREEN}✓ docker-compose.prod.yml contains 'production' references${NC}"
else
    echo -e "${RED}✗ docker-compose.prod.yml might not be configured for production${NC}"
    FAIL=1
fi

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}Configuration verification SUCCESSFUL${NC}"
    exit 0
else
    echo -e "${RED}Configuration verification FAILED${NC}"
    exit 1
fi
