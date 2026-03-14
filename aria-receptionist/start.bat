@echo off
title ARIA Voice AI Receptionist

echo.
echo ====================================================
echo   ARIA -- AI Voice Receptionist
echo   The Velvet Room
echo ====================================================
echo.

:: Check Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo         Please install from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js detected

:: Setup .env files if missing
if not exist "backend\.env" (
    echo.
    echo [SETUP] Creating backend environment file...
    copy "backend\.env.example" "backend\.env" >nul
    echo.
    echo [ACTION REQUIRED] Please edit backend\.env and add:
    echo   - GEMINI_API_KEY=your_gemini_api_key_here
    echo   - MONGODB_URI=mongodb://localhost:27017/aria_receptionist
    echo.
    echo File location: %CD%\backend\.env
    echo.
    echo After editing the file, run this script again.
    notepad "backend\.env"
    pause
    exit /b 0
)

if not exist "frontend\.env" (
    copy "frontend\.env.example" "frontend\.env" >nul
)

:: Install backend dependencies
echo.
echo [SETUP] Installing backend dependencies...
cd backend
call npm install --silent
cd ..

:: Install frontend dependencies
echo [SETUP] Installing frontend dependencies...
cd frontend
call npm install --silent
cd ..

echo [OK] All dependencies installed

:: Start backend in a new window
echo.
echo [START] Starting backend server on port 5000...
start "ARIA Backend" cmd /k "cd backend && npm run dev"

:: Wait for backend to start
timeout /t 4 /nobreak >nul

:: Start frontend in a new window
echo [START] Starting frontend on port 5173...
start "ARIA Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ====================================================
echo   ARIA is running!
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:5000/health
echo   Admin:     http://localhost:5173 (click Admin btn)
echo.
echo   Use Google Chrome for voice features!
echo ====================================================
echo.

:: Open browser
start "" "http://localhost:5173"

echo Press any key to close this window (servers keep running)
pause >nul
