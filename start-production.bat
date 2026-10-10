@echo off
setlocal enabledelayedexpansion
title LibraFlow Production Server (Single Port 5000)

:: Force working directory to be the exact folder containing this script
cd /d "%~dp0"

echo ==============================================================================
echo        LibraFlow -- Unified Production Server Launch (Port 5000)
echo ==============================================================================
echo Project Directory: %CD%
echo.

if not exist "%~dp0.env" (
    if exist "%~dp0.env.example" (
        copy /Y "%~dp0.env.example" "%~dp0.env" >nul
    )
)

:: Free up port 5000 if previously occupied
echo [INFO] Ensuring port 5000 is free...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5000" ^| findstr "LISTENING"') do (
    if "%%a" neq "0" (
        echo [INFO] Terminating previous process %%a occupying port 5000...
        taskkill /F /PID %%a >nul 2>&1
    )
)

echo [INFO] Ensuring production frontend is built...
cd /d "%~dp0frontend"
call npm run build

echo.
echo [INFO] Starting LibraFlow Production Server on Port 5000...
echo Both the Frontend Web UI and Express Backend REST API are served at:
echo http://localhost:5000
echo.

cd /d "%~dp0backend"
call node src/server.js
pause
