@echo off
setlocal enabledelayedexpansion
title LibraFlow Production Server (Single Port 5000)

echo ==============================================================================
echo        LibraFlow -- Unified Production Server Launch (Port 5000)
echo ==============================================================================
echo.

if not exist ".env" (
    if exist ".env.example" (
        copy /Y ".env.example" ".env" >nul
    )
)

echo [INFO] Ensuring production frontend is built...
cd frontend
call npm run build
cd ..

echo.
echo [INFO] Starting LibraFlow Production Server on Port 5000...
echo Both the Frontend Web UI and Express Backend REST API are served at:
echo http://localhost:5000
echo.
cd backend
call node src/server.js
pause
