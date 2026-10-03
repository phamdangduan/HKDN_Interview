@echo off
title TalentAI Python Backend Server (Legacy Backup)
color 0b
echo ========================================================
echo     TALENTAI BACKEND SERVER (Python FastAPI - Backup)
echo ========================================================
echo.
echo Database: MySQL80 (localhost:3306/talentai_db)
echo API Docs:  http://localhost:8000/docs
echo.
cd /d "%~dp0backend-python"

REM Kiem tra file cau hinh .env
if not exist ".env" (
    if exist ".env.example" (
        echo [*] Phat hien chua co file .env, dang tu dong khoi tao tu .env.example...
        copy ".env.example" ".env" >nul
        echo [OK] Da tao file .env cho Python Backend.
        echo.
    )
)

python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
