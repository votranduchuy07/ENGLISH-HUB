@echo off
chcp 65001 >nul
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Chua cai Node.js. Hay tai ban LTS tai https://nodejs.org roi chay lai file nay.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Lan dau chay: dang cai thu vien, doi mot chut...
  call npm install
)
echo Dang mo English Hub tai http://localhost:5173 ...
echo (Dong cua so nay de tat web.)
call npm run dev -- --open
pause
