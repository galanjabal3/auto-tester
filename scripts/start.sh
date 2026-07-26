#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/dashboard/server"
CLIENT_DIR="$ROOT_DIR/dashboard/client"

cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping servers...${NC}"
  kill $SERVER_PID $CLIENT_PID 2>/dev/null
  wait $SERVER_PID $CLIENT_PID 2>/dev/null
  echo -e "${GREEN}Done.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# --- Pre-checks ---
echo -e "${CYAN}Auto-Tester Startup${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js not found. Install from https://nodejs.org${NC}"
  exit 1
fi
echo -e "  Node.js $(node -v)"

# Check PostgreSQL
if ! pg_isready -h localhost -p 5432 &> /dev/null 2>&1; then
  echo -e "${RED}PostgreSQL not running on localhost:5432${NC}"
  exit 1
fi
echo -e "  PostgreSQL OK"

# Check node_modules
if [ ! -d "$SERVER_DIR/node_modules" ]; then
  echo -e "${YELLOW}Installing server dependencies...${NC}"
  (cd "$SERVER_DIR" && npm install)
fi

if [ ! -d "$CLIENT_DIR/node_modules" ]; then
  echo -e "${YELLOW}Installing client dependencies...${NC}"
  (cd "$CLIENT_DIR" && npm install)
fi

# Check Playwright browsers
if [ ! -d "$ROOT_DIR/node_modules/.cache/ms-playwright" ]; then
  if [ ! -d "$HOME/Library/Caches/ms-playwright" ]; then
    echo -e "${YELLOW}Installing Playwright browsers...${NC}"
    (cd "$ROOT_DIR" && npx playwright install chromium)
  fi
fi

# Build server if dist is missing or outdated
if [ ! -f "$SERVER_DIR/dist/index.js" ] || [ "$SERVER_DIR/src/index.ts" -nt "$SERVER_DIR/dist/index.js" ]; then
  echo -e "${YELLOW}Building server...${NC}"
  (cd "$SERVER_DIR" && npx tsc)
fi

echo ""

# --- Start server ---
echo -e "${CYAN}Starting API server on port 3001...${NC}"
cd "$SERVER_DIR"
node dist/index.js &
SERVER_PID=$!
sleep 2

if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo -e "${RED}Server failed to start. Check /tmp/auto-tester-server.log${NC}"
  exit 1
fi
echo -e "  ${GREEN}API server running${NC} → http://localhost:3001"

# --- Start client ---
echo -e "${CYAN}Starting Vite dev server...${NC}"
cd "$CLIENT_DIR"
npx vite --port 5173 > /tmp/auto-tester-vite.log 2>&1 &
CLIENT_PID=$!
sleep 3

if ! kill -0 $CLIENT_PID 2>/dev/null; then
  echo -e "${RED}Vite failed to start${NC}"
  kill $SERVER_PID 2>/dev/null
  exit 1
fi

VITE_URL=$(grep -oP 'Local:\s+\K\S+' /tmp/auto-tester-vite.log 2>/dev/null || echo "http://localhost:5173")
echo -e "  ${GREEN}Dashboard running${NC} → $VITE_URL"

echo ""
echo -e "${GREEN}All systems go!${NC}"
echo -e "  Dashboard:  ${CYAN}http://localhost:5173${NC}"
echo -e "  API:        ${CYAN}http://localhost:3001/api/health${NC}"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop both servers"
echo ""

wait
