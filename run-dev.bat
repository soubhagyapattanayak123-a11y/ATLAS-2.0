@echo off
echo ========================================================
echo   Launching ATLAS 2.0 Full-Stack Development Services
echo ========================================================
echo.

echo Starting FastAPI Backend in a new window...
start "ATLAS 2.0 - Backend (FastAPI)" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe run.py"

echo Starting React + TypeScript Frontend in a new window...
start "ATLAS 2.0 - Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both services are spinning up!
echo - Backend API:  http://127.0.0.1:8000
echo - Swagger Docs: http://127.0.0.1:8000/docs
echo - Frontend App: http://localhost:5173
echo.
