# 🔧 LAN Connection Troubleshooting Guide

## Your Server IP Address: `172.18.1.119`

---

## Quick Fix Steps

### Step 1: Add Windows Firewall Rules

Run these commands in **PowerShell as Administrator**:

```powershell
# Allow Backend (Port 8000)
New-NetFirewallRule -DisplayName "AI Music Studio - Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow

# Allow Frontend (Port 5173)
New-NetFirewallRule -DisplayName "AI Music Studio - Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```

### Step 2: Test from Another Device

On another device on the same network:

1. **Test Backend Connection:**
   - Open browser
   - Go to: `http://172.18.1.119:8000/api/health`
   - You should see JSON response with server info

2. **Test Frontend:**
   - Go to: `http://172.18.1.119:5173`
   - You should see the login page

3. **Login and Test:**
   - API Key: `PTG2025`
   - Try generating music

---

## If Still Not Working

### Check 1: Verify Servers are Running

On the host computer:
```powershell
# Check if backend is listening
netstat -an | findstr "8000"

# Check if frontend is listening  
netstat -an | findstr "5173"
```

You should see:
```
TCP    0.0.0.0:8000    0.0.0.0:0    LISTENING
TCP    0.0.0.0:5173    0.0.0.0:0    LISTENING
```

### Check 2: Test from Host Computer First

On the host computer (172.18.1.119):
```
http://172.18.1.119:8000/api/health
http://172.18.1.119:5173
```

If this doesn't work, the servers aren't binding correctly.

### Check 3: Disable Antivirus Temporarily

Some antivirus software blocks local network connections:
1. Temporarily disable antivirus
2. Test connection
3. If it works, add exceptions for ports 8000 and 5173

### Check 4: Check Network Type

Windows treats different network types differently:
1. Open Settings → Network & Internet
2. Click on your network connection
3. Make sure it's set to "Private" not "Public"

---

## Testing Commands

### From Client Device (Any OS):

**Test Backend:**
```bash
curl http://172.18.1.119:8000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "base_url": "http://172.18.1.119:8000",
  "version": "2.3.0",
  "active_tasks": 0,
  "disk_space_gb": 50,
  "models": ["musicgen-small", "audioldm2p"]
}
```

**Test Frontend:**
```bash
curl http://172.18.1.119:5173
```

Should return HTML content.

---

## Common Error Messages

### "Cannot connect to server"
**Cause:** Backend not accessible  
**Fix:** Add firewall rules (Step 1 above)

### "Connection refused"
**Cause:** Server not running or wrong IP  
**Fix:** Verify servers are running and IP is correct

### "Timeout"
**Cause:** Firewall blocking or wrong network  
**Fix:** Check firewall and ensure same network

### "Invalid API key"
**Cause:** Wrong API key  
**Fix:** Use `PTG2025`

---

## Restart Servers (If Needed)

### Backend:
```powershell
cd c:\Users\Admin\Desktop\aimusic\backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend:
```powershell
cd c:\Users\Admin\Desktop\aimusic\frontend
npm run dev
```

---

## Network Configuration

Your current network:
- **IP Address:** 172.18.1.119
- **Subnet:** 255.255.248.0
- **Gateway:** 172.18.0.1

Devices on the same network should have IPs like:
- 172.18.0.x
- 172.18.1.x
- 172.18.2.x
- etc.

---

## Quick Test Script

Save this as `test_connection.ps1` and run on client device:

```powershell
$serverIP = "172.18.1.119"

Write-Host "Testing AI Music Studio Connection..." -ForegroundColor Cyan
Write-Host ""

# Test Backend
Write-Host "Testing Backend (Port 8000)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://${serverIP}:8000/api/health" -TimeoutSec 5
    Write-Host "✅ Backend is accessible!" -ForegroundColor Green
    $response.Content
} catch {
    Write-Host "❌ Backend not accessible: $_" -ForegroundColor Red
}

Write-Host ""

# Test Frontend
Write-Host "Testing Frontend (Port 5173)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://${serverIP}:5173" -TimeoutSec 5
    Write-Host "✅ Frontend is accessible!" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend not accessible: $_" -ForegroundColor Red
}
```

---

## Success Checklist

- [ ] Firewall rules added
- [ ] Backend accessible at `http://172.18.1.119:8000/api/health`
- [ ] Frontend accessible at `http://172.18.1.119:5173`
- [ ] Can login with API key `PTG2025`
- [ ] Can generate music from client device
- [ ] Connection status shows green

---

## Still Having Issues?

1. **Check Windows Defender Firewall:**
   - Control Panel → Windows Defender Firewall
   - Click "Allow an app or feature through Windows Defender Firewall"
   - Look for Python and Node.js
   - Make sure both "Private" and "Public" are checked

2. **Check Router Settings:**
   - Some routers have "AP Isolation" or "Client Isolation"
   - This prevents devices from talking to each other
   - Disable this in router settings

3. **Use Different Port:**
   - If ports 8000/5173 are blocked, try different ports
   - Backend: `uvicorn main:app --host 0.0.0.0 --port 8080`
   - Frontend: Update vite.config.ts to use port 3000

---

*Your Server IP: 172.18.1.119*  
*Last Updated: 2025-12-31*
