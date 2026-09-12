@echo off
chcp 65001 >nul
setlocal
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
echo 电脑地址：http://127.0.0.1:3210
echo 当前界面版本：wechat-tight-20260910
echo.
echo 手机和电脑连同一个 Wi-Fi 或同一个热点后，请在手机浏览器输入下面的地址。
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ips=Get-CimInstance Win32_NetworkAdapterConfiguration | ? {$_.IPEnabled} | %% {$_.IPAddress} | ? {$_ -match '^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)'}; if(!$ips){Write-Host '没有找到手机可用地址，请确认电脑已连 Wi-Fi 或热点。'} else {$ips | %% {Write-Host ('手机地址：http://' + $_ + ':3210/')}}"
echo.
netsh advfirewall firewall add rule name="诡秘聊天网站 3210" dir=in action=allow protocol=TCP localport=3210 >nul 2>nul
if %errorlevel%==0 (
  echo 已尝试放行 Windows 防火墙 3210 端口。
) else (
  echo 如果手机打不开，可能是 Windows 防火墙拦截。请右键本文件，选择“以管理员身份运行”。
)
echo.
if "%HTTPS_PROXY%"=="" (
  set /p "GUIMI_PROXY=如果你开了代理，填代理地址后回车；没开直接回车（例：http://127.0.0.1:7890）："
  if not "%GUIMI_PROXY%"=="" set "HTTPS_PROXY=%GUIMI_PROXY%"
)
echo.
echo 关闭这个窗口会停止网站。
echo 正在测试 DeepSeek 连接...
"%GUIMI_NODE%" --env-file=.env --use-env-proxy test-deepseek.mjs
echo.
"%GUIMI_NODE%" --use-env-proxy server.mjs
pause
