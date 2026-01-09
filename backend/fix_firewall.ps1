$port = 8000
$ruleName = "AI Music Backend (8000)"

Write-Host "checking firewall permissions..."
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Requesting admin privileges to open port $port..."
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

Write-Host "Opening Port $port in Windows Firewall..."
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow -Profile Any -Force

Write-Host "✅ Port $port opened successfully!"
Write-Host "Backend is now accessible from LAN."
Read-Host -Prompt "Press Enter to exit"
