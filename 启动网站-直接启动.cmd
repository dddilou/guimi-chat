@echo off
chcp 65001 >nul
setlocal
setlocal EnableDelayedExpansion
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  set "GUIMI_NODE=node"
) else (
  set "GUIMI_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)
if not exist "%GUIMI_NODE%" if not "%GUIMI_NODE%"=="node" (
  echo 请先安装 Node.js 20 或更新版本，然后重新双击本文件。
  pause
  exit /b 1
)
if "%DEEPSEEK_MODEL%"=="" set "DEEPSEEK_MODEL=deepseek-v4-flash"
set "PORT="
for %%p in (3210 3211 3212 3213 3214 3215) do (
  netstat -ano | findstr ":%%p " | findstr "LISTENING" >nul
  if errorlevel 1 if "!PORT!"=="" set "PORT=%%p"
)
if "!PORT!"=="" (
  echo 3210 到 3215 都被占用了，请关闭旧的网站窗口后重试。
  pause
  exit /b 1
)
echo 电脑地址：http://127.0.0.1:!PORT!/
echo 当前界面版本：wechat-tight-20260910
echo.
echo 手机和电脑连同一个 Wi-Fi 或同一个热点后，请在手机浏览器输入下面的地址。
powershell -NoProfile -ExecutionPolicy Bypass -Command "$port=$env:PORT; $ips=Get-CimInstance Win32_NetworkAdapterConfiguration | ? {$_.IPEnabled} | %% {$_.IPAddress} | ? {$_ -match '^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)'}; if(!$ips){Write-Host '没有找到手机可用地址，请确认电脑已连 Wi-Fi 或热点。'} else {$ips | %% {Write-Host ('手机地址：http://' + $_ + ':' + $port + '/')}}"
echo.
echo 如果提示端口被占用，请先关闭其他启动窗口。
echo.
echo 正在测试 DeepSeek 连接...
"%GUIMI_NODE%" --env-file=.env --use-env-proxy test-deepseek.mjs
echo.
echo 关闭这个窗口会停止网站。
"%GUIMI_NODE%" --use-env-proxy server.mjs
pause
