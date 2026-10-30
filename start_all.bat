@echo off
cd /d "%~dp0"
echo ========================================================
echo   Starting Reason-First (ML + Backend + Frontend)
echo ========================================================

echo [1/3] Starting ML Diagnostic Server on port 8000...
start "Reason-First ML Server" cmd /k "python ml_model\math-diagnostic-ml\server.py"

ping 127.0.0.1 -n 3 >nul

echo [2/3] Starting Backend Express Server on port 4000...
start "Reason-First Backend" cmd /k "cd backend && npm run dev"

ping 127.0.0.1 -n 3 >nul

echo [3/3] Starting Frontend Vite App on port 5173...
start "Reason-First Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo All services launched!
echo - ML API:    http://localhost:8000/health
echo - Backend:   http://localhost:4000/health
echo - Frontend:  http://localhost:5173
echo ========================================================
pause
