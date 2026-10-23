@echo off
setlocal
cd /d "%~dp0"
title Mell Maia - demonstracao local
where node >nul 2>&1
if errorlevel 1 (
  echo Instale Node.js 24 LTS antes de iniciar.
  pause
  exit /b 1
)
node scripts/preview.mjs --open
pause
