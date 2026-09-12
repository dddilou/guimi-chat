@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "GUIMI_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%GUIMI_NODE%" set "GUIMI_NODE=node"
echo 请打开 http://127.0.0.1:3210
echo 手机请和电脑连接同一个 Wi-Fi，使用下面的局域网地址：
"%GUIMI_NODE%" -e "for(const list of Object.values(require('node:os').networkInterfaces()))for(const a of list)if(a.family==='IPv4'&&!a.internal&&/^(192\.168\.|10\.)/.test(a.address))console.log('http://'+a.address+':3210/')"
echo 保持此窗口开启，关闭窗口会停止网站。
"%GUIMI_NODE%" --use-env-proxy server.mjs
pause
