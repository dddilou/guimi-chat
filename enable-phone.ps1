$ErrorActionPreference = 'Stop'
try {
  $ruleName='GuimiChat-LAN-3210'
  if (!(Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -Name $ruleName -DisplayName 'Guimi Chat LAN 3210' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3210 -RemoteAddress LocalSubnet -Profile Any | Out-Null
  }
  'OK: phone access enabled for local network.' | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'phone-access.log')
} catch {
  $_.Exception.Message | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'phone-access.log')
  exit 1
}
