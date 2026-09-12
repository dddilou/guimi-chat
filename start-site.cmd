@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  set "GUIMI_NODE=node"
) else (
  set "GUIMI_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)
set "DEEPSEEK_MODEL=deepseek-v4-flash"
set "PORT="
for %%p in (3210 3211 3212 3213 3214 3215) do (
  netstat -ano | findstr ":%%p " | findstr "LISTENING" >nul
  if errorlevel 1 if "!PORT!"=="" set "PORT=%%p"
)
if "!PORT!"=="" (
  echo No free port found from 3210 to 3215.
  pause
  exit /b 1
)
echo URL: http://127.0.0.1:!PORT!/
echo Testing DeepSeek with API key...
"%GUIMI_NODE%" --env-file=.env --use-env-proxy test-deepseek.mjs
echo Starting website. Keep this window open.
"%GUIMI_NODE%" --use-env-proxy server.mjs
pause
