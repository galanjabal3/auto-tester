#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${CYAN}Auto-Tester CLI${NC}"
echo ""

# Check PostgreSQL
if ! pg_isready -h localhost -p 5432 &> /dev/null 2>&1; then
  echo -e "${RED}PostgreSQL not running on localhost:5432${NC}"
  exit 1
fi

SITE="${1:-}"
ALL=false

if [ -z "$SITE" ]; then
  echo "Usage:"
  echo "  ./scripts/test.sh <site-name>     Run tests for a specific site"
  echo "  ./scripts/test.sh --all           Run tests for all sites"
  echo ""
  echo "Available sites:"
  for f in "$ROOT_DIR"/configs/sites/*.yaml; do
    [ -f "$f" ] && echo "  - $(basename "$f" .yaml)"
  done
  exit 0
fi

if [ "$SITE" = "--all" ]; then
  ALL=true
fi

cd "$ROOT_DIR"

if $ALL; then
  echo -e "${CYAN}Running all sites...${NC}"
  npx ts-node cli/index.ts run --all
else
  if [ ! -f "configs/sites/${SITE}.yaml" ]; then
    echo -e "${RED}Config not found: configs/sites/${SITE}.yaml${NC}"
    exit 1
  fi
  echo -e "${CYAN}Running tests for: ${SITE}${NC}"
  npx ts-node cli/index.ts run --site "$SITE"
fi

echo ""
echo -e "${GREEN}Done!${NC}"
echo -e "  Reports: $ROOT_DIR/reports/"
