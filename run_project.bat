@echo off
title TalentAI - System Launcher
color 0b

echo =======================================================================
echo    TALENTAI - NEN TANG PHONG VAN AI GIA LAP ^& SANG LOC UNG VIEN
echo =======================================================================
echo.
echo [1] Co so du lieu: MySQL (localhost:3306/talentai_db)
echo [2] Backend API:   http://localhost:8000/
echo [3] Frontend Web:  http://localhost:5173/
echo =======================================================================
echo.

REM Kiem tra Backend .env
cd /d "%~dp0backend-ts"
if not exist ".env" (
    if exist ".env.example" (
        echo [*] Dang tao file backend-ts/.env tu .env.example...
        copy ".env.example" ".env" >nul
    )
)

REM Kiem tra Backend node_modules
if not exist "node_modules\" (
    echo [*] Dang cai dat thu vien Backend (npm install)...
    call npm install
)

REM Kiem tra Frontend node_modules
cd /d "%~dp0frontend"
if not exist "node_modules\" (
    echo [*] Dang cai dat thu vien Frontend (npm install)...
    call npm install
)

echo.
echo [*] Dang khoi chay Backend va Frontend...
echo.

REM Khoi chay Backend trong cua so rieng
start "TalentAI Backend (:8000)" cmd /k "cd /d ""%~dp0backend-ts"" && npm run dev"

REM Khoi chay Frontend trong cua so rieng
start "TalentAI Frontend (:5173)" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

timeout /t 3 >nul
start http://localhost:5173/

echo [OK] He thong da khoi chay thanh cong!
exit
