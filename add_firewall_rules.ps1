# Run these commands in PowerShell as Administrator

Write-Host "Adding Windows Firewall Rules for AI Music Studio..." -ForegroundColor Cyan

# Backend Rule
try {
    New-NetFirewallRule -DisplayName "AI Music Studio - Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -ErrorAction Stop
    Write-Host "✅ Backend firewall rule added (Port 8000)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend rule might already exist or error: $_" -ForegroundColor Yellow
}

# Frontend Rule
try {
    New-NetFirewallRule -DisplayName "AI Music Studio - Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -ErrorAction Stop
    Write-Host "✅ Frontend firewall rule added (Port 5173)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Frontend rule might already exist or error: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Firewall configuration complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your server IP: 172.18.1.119" -ForegroundColor Yellow
Write-Host ""
Write-Host "From another device on the same network, access:" -ForegroundColor White
Write-Host "  Frontend: http://172.18.1.119:5173" -ForegroundColor Green
Write-Host "  Backend:  http://172.18.1.119:8000/api/health" -ForegroundColor Green
Write-Host ""
Write-Host "API Key: PTG2025" -ForegroundColor Yellow
