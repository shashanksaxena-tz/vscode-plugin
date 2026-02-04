#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

STATIC_ONLY=false

for arg in "$@"; do
    if [ "$arg" == "--static-only" ]; then
        STATIC_ONLY=true
    fi
done

echo -e "${GREEN}Verifying deployment...${NC}"

# Check for configuration files
FILES=("docker-compose.prod.yml" ".env")
MISSING_FILES=0

for FILE in "${FILES[@]}"; do
    if [ ! -f "$FILE" ]; then
        echo -e "${RED}Error: Missing configuration file: $FILE${NC}"
        MISSING_FILES=1
    else
        echo -e "${GREEN}Found $FILE${NC}"
    fi
done

if [ $MISSING_FILES -eq 1 ]; then
    exit 1
fi

if [ "$STATIC_ONLY" = true ]; then
    echo -e "${GREEN}Static verification complete.${NC}"
    exit 0
fi

# Function to check health
check_health() {
    local url=$1
    local name=$2
    local retries=30
    local wait=2

    echo "Checking $name at $url..."

    for i in $(seq 1 $retries); do
        if curl -s -f "$url" > /dev/null; then
            echo -e "${GREEN}$name is healthy!${NC}"
            return 0
        fi
        echo -n "."
        sleep $wait
    done

    echo -e "${RED}Error: $name failed to become healthy after $((retries * wait)) seconds.${NC}"
    return 1
}

# Check Batch Processor
check_health "http://localhost:8080/health" "Batch Processor" || exit 1

# Check Dashboard
check_health "http://localhost:3000/api/health" "Dashboard" || exit 1

echo -e "${GREEN}All services verified successfully!${NC}"
