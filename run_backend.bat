@echo off
title TalentAI TypeScript Backend Server
color 0a
echo =======================================================================
echo     TALENTAI - HE THONG PHONG VAN AI GIA LAP (TypeScript + Prisma)
echo =======================================================================
echo.
echo [1] Co so du lieu:  MySQL (localhost:3306/talentai_db)
echo [2] Backend API:    http://localhost:8000/
echo.
echo --- DUONG DAN TRUY CAP GIAO DIEN (FRONTEND) ---
echo [*] Trang chu:              http://localhost:8000/
echo [*] Thiet lap phong thi:    http://localhost:8000/candidate/setup.html
echo [*] So khop ATS (CV - JD):  http://localhost:8000/public/cv_jd_matcher.html
echo [*] Doanh nghiep Portal:    http://localhost:8000/enterprise/portal.html
echo =======================================================================
cd /d "%~dp0backend-ts"

REM Kiem tra file cau hinh .env
if not exist ".env" (
    if exist ".env.example" (
        echo [*] Phat hien chua co file .env, dang tu dong khoi tao tu .env.example...
        copy ".env.example" ".env" >nul
        echo [OK] Da tao file .env. Vui long kiem tra mat khau MySQL va GEMINI_API_KEY neu can.
        echo.
    )
)

REM Kiem tra thu vien node_modules
if not exist "node_modules\" (
    echo [*] Phat hien chua cai dat thu vien, dang tu dong chay 'npm install'...
    echo [*] Qua trinh nay chi dien ra 1 lan duy nhat o lan chay dau tien...
    call npm install
    echo.
    echo [OK] Cai dat thu vien hoan tat!
    echo.
)

echo Dang khoi chay TalentAI Server...
call npm run dev
pause
