#!/bin/bash

# ============================================================
# ARIA Receptionist - One-command startup script (Mac/Linux)
# ============================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ARIA — AI Voice Receptionist                   ║${NC}"
echo -e "${BLUE}║   The Velvet Room                                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed.${NC}"
    echo "   Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}⚠️  Node.js version is below 18. Please upgrade.${NC}"
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check .env files
if [ ! -f "backend/.env" ]; then
    echo ""
    echo -e "${YELLOW}📋 Setting up backend environment...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}⚠️  Please edit backend/.env and add your API keys:${NC}"
    echo "   - GEMINI_API_KEY (required)"
    echo "   - MONGODB_URI (optional - defaults to local MongoDB)"
    echo ""
    echo "   File location: $(pwd)/backend/.env"
    echo ""
    read -p "Press ENTER after you've added your API key to continue..."
fi

if [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
fi

# Install dependencies
echo ""
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd backend
npm install --silent
cd ..

echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd frontend
npm install --silent
cd ..

echo ""
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Start backend in background
echo ""
echo -e "${BLUE}🚀 Starting backend server (port 5000)...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Check if backend is running
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Backend running (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}❌ Backend failed to start. Check backend/.env${NC}"
    exit 1
fi

# Start frontend
echo -e "${BLUE}🎨 Starting frontend (port 5173)...${NC}"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ ARIA is starting up!                          ║${NC}"
echo -e "${GREEN}║                                                    ║${NC}"
echo -e "${GREEN}║  🌐 Open: http://localhost:5173                   ║${NC}"
echo -e "${GREEN}║  📋 Admin: http://localhost:5173 → click Admin    ║${NC}"
echo -e "${GREEN}║  🔧 API:   http://localhost:5000/health           ║${NC}"
echo -e "${GREEN}║                                                    ║${NC}"
echo -e "${GREEN}║  🎙️  Use Google Chrome for voice features         ║${NC}"
echo -e "${GREEN}║  Press Ctrl+C to stop both servers                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

cd frontend
npm run dev

# Cleanup on exit
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID 2>/dev/null; exit" SIGINT SIGTERM
