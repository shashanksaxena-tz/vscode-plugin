#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Verifying deployment...${NC}"

# Check if docker-compose.prod.yml exists
if [ ! -f docker-compose.prod.yml ]; then
    echo -e "${RED}Error: docker-compose.prod.yml not found!${NC}"
    exit 1
fi

# Check running containers
echo "Checking running containers..."
docker compose -f docker-compose.prod.yml ps

# Check health endpoints (assuming localhost)
echo "Checking Dashboard health..."
if curl -s -f http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}Dashboard is healthy!${NC}"
else
    echo -e "${RED}Dashboard is NOT healthy or reachable!${NC}"
fi

echo "Checking Batch Processor health..."
if curl -s -f http://localhost:8080/health > /dev/null; then
    echo -e "${GREEN}Batch Processor is healthy!${NC}"
else
    echo -e "${RED}Batch Processor is NOT healthy or reachable!${NC}"
fi

echo -e "${GREEN}Verification check complete.${NC}"
