#!/bin/bash
set -e

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Starting End-to-End Simulation (Logic Verification)...${NC}"

# Navigate to batch-processor
cd batch-processor

# Run the E2E integration test
echo "Running E2E simulation test..."
npm test src/jobs/e2eFlow.test.ts

echo -e "${GREEN}Simulation completed successfully!${NC}"
