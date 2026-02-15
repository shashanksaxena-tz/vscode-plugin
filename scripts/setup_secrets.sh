#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "Setting up secrets..."

if [ -f .env ]; then
  echo -e "${YELLOW}.env file already exists. Skipping creation.${NC}"
else
  if [ -f .env.example ]; then
    echo "Copying .env.example to .env..."
    cp .env.example .env
    echo -e "${GREEN}.env created from template.${NC}"
  else
    echo -e "${YELLOW}Warning: .env.example not found. Creating empty .env.${NC}"
    touch .env
  fi
fi

echo ""
echo "Please edit .env and fill in the following required values:"
echo "- SUPABASE_URL"
echo "- SUPABASE_SERVICE_ROLE_KEY"
echo "- NEXT_PUBLIC_SUPABASE_URL"
echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "- LLM_PROVIDER keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)"
echo "- SMTP credentials"
echo "- ENCRYPTION_KEY"
echo ""
echo "You can open .env in your editor to make changes."
