@echo off
cd /d "%~dp0"
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3210" ^| findstr "LISTENING"') do (
  taskkill /PID %%p /F
)
echo Website server on port 3210 has been stopped if it was running.
pause
