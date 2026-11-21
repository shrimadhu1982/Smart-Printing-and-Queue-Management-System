@echo off
echo ===================================================
echo   Smart Printing & Queue Management System
echo   Launching Backend and Frontend...
echo ===================================================

start "SmartPrint Backend (Node.js)" cmd /k ""%~dp0run_backend.bat""
start "SmartPrint Frontend (React Vite)" cmd /k ""%~dp0run_frontend.bat""

echo.
echo Both services are starting:
echo  - Backend:  http://localhost:5000/api/health
echo  - Frontend: http://localhost:5173
echo.
pause
