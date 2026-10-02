@echo off
setlocal enabledelayedexpansion
title LibraFlow - Smart Library Management and Circulation System

:: Force working directory to be the exact folder containing this script
cd /d "%~dp0"

echo ==============================================================================
echo        LibraFlow -- Smart Library Management and Circulation System
echo ==============================================================================
echo Project Directory: %CD%
echo.

:: 1. Check Node.js and npm
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your PATH!
    echo Please install Node.js 18, 20, or 22 from https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Check or create .env file from .env.example
if not exist "%~dp0.env" (
    if exist "%~dp0.env.example" (
        echo [INFO] Creating .env file from .env.example...
        copy /Y "%~dp0.env.example" "%~dp0.env" >nul
        echo [NOTICE] Default .env created.
        echo.
    ) else (
        echo [WARNING] Neither .env nor .env.example was found!
    )
)

:: 3. Check and install dependencies if needed
if not exist "%~dp0node_modules\" (
    echo [INFO] Installing root workspace dependencies...
    cd /d "%~dp0"
    call npm install
)

if not exist "%~dp0backend\node_modules\" (
    echo [INFO] Installing backend dependencies...
    cd /d "%~dp0backend"
    call npm install
)

if not exist "%~dp0frontend\node_modules\" (
    echo [INFO] Installing frontend dependencies...
    cd /d "%~dp0frontend"
    call npm install
)

:: 4. Build frontend distribution if not already present
if not exist "%~dp0frontend\dist\" (
    echo [INFO] Building production frontend assets...
    cd /d "%~dp0frontend"
    call npm run build
)

:: 5. Run Database Migrations safely from backend directory
echo [INFO] Checking and applying database migrations...
cd /d "%~dp0backend"
call node src/scripts/migrate.js
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Database migration encountered an issue.
    echo Please verify that MySQL is running and that your DB_PASSWORD in .env is correct.
    echo Continuing to launch servers so you can access the interface...
    echo.
)

:: Return to repository root directory
cd /d "%~dp0"

:: 6. Launch both Backend and Frontend together
echo.
echo ==============================================================================
echo [SUCCESS] Starting LibraFlow Full Stack Services...
echo ==============================================================================
echo  - Frontend Web UI:  http://localhost:5173
echo  - Backend REST API: http://localhost:5000/api/v1
echo  - Health Check:     http://localhost:5000/health
echo ==============================================================================
echo Press Ctrl+C at any time to stop both servers.
echo.

:: Launch the default concurrent development script from repository root
cd /d "%~dp0"
call npm run dev

pause
