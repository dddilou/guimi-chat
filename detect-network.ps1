$ErrorActionPreference = "SilentlyContinue"
Write-Host "Checking local website..."
try {
  $status = (Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:3210/" -TimeoutSec 5).StatusCode
  Write-Host "Local site: $status"
} catch {
  Write-Host "Local site failed: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Checking HTTPS..."
$targets = @(
  @("DeepSeek", "api.deepseek.com"),
  @("Baidu", "www.baidu.com"),
  @("Microsoft", "www.microsoft.com")
)
foreach ($target in $targets) {
  $name = $target[0]
  $hostName = $target[1]
  $ok = Test-NetConnection $hostName -Port 443 -InformationLevel Quiet
  Write-Host "$name`: $ok"
}

Write-Host ""
Write-Host "Checking Node access to DeepSeek without API key..."
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  $nodePath = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if (Test-Path $nodePath) { $node = @{ Source = $nodePath } }
}
if (-not $node) {
  Write-Host "Node.js not found."
} else {
  & $node.Source -e "fetch('https://api.deepseek.com').then(r=>console.log('Node DeepSeek status: '+r.status)).catch(e=>console.log('Node DeepSeek failed: '+(e.cause&&e.cause.code||e.message)))"
}

Write-Host ""
Write-Host "How to read:"
Write-Host "DeepSeek True means the network can reach DeepSeek."
Write-Host "Node status 401 means Node reached DeepSeek, but this simple test did not send an API key."
Write-Host "Use start-site-direct.cmd or the Chinese direct startup script to test with the API key."
