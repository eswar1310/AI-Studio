# 🌐 LAN Setup Guide - AI Music Studio

## Quick Start for Users on the Same Network

This guide will help you access the AI Music Studio from any device on the same WiFi/LAN network.

---

## 📋 Prerequisites

- **Host Computer**: The computer running the backend server (Windows/Mac/Linux)
- **Client Devices**: Any device with a web browser (laptop, tablet, phone)
- **Same Network**: All devices must be connected to the same WiFi or LAN

---

## 🚀 Step-by-Step Setup

### Step 1: Find Your Host Computer's IP Address

#### On Windows:
1. Open Command Prompt (`Win + R`, type `cmd`, press Enter)
2. Type: `ipconfig`
3. Look for "IPv4 Address" under your active network adapter
4. Example: `192.168.1.100`

#### On Mac/Linux:
1. Open Terminal
2. Type: `ifconfig` or `ip addr`
3. Look for your IP address (usually starts with `192.168.` or `10.`)

**Write down this IP address - you'll need it!**

---

### Step 2: Start the Backend Server

On the host computer:

```powershell
cd c:\Users\Admin\Desktop\aimusic\backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
🔥 UPDATED MAIN.PY LOADED 🔥
🌐 Backend accessible at: http://YOUR_IP:8000
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

### Step 3: Start the Frontend Server

On the host computer (in a new terminal):

```powershell
cd c:\Users\Admin\Desktop\aimusic\frontend
npm run dev
```

You should see:
```
VITE v7.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: http://YOUR_IP:5173/
```

---

### Step 4: Access from Other Devices

On any device on the same network:

1. Open a web browser (Chrome, Firefox, Safari, etc.)
2. Go to: `http://YOUR_IP:5173`
   - Replace `YOUR_IP` with the IP address from Step 1
   - Example: `http://192.168.1.100:5173`

3. **Login** with the API key: `PTG2025`

4. Start creating music! 🎵

---

## 🔧 Troubleshooting

### Problem: "Cannot connect to server"

**Solution 1: Check Firewall**
- Windows: Allow ports 8000 and 5173 through Windows Firewall
  ```powershell
  # Run as Administrator
  New-NetFirewallRule -DisplayName "AI Music Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
  New-NetFirewallRule -DisplayName "AI Music Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
  ```

**Solution 2: Verify Same Network**
- Ensure all devices are on the same WiFi network
- Check if devices can ping each other:
  ```
  ping YOUR_IP
  ```

**Solution 3: Disable VPN**
- VPNs can interfere with local network access
- Temporarily disable VPN on both host and client

**Solution 4: Check Antivirus**
- Some antivirus software blocks local network connections
- Add exceptions for ports 8000 and 5173

---

### Problem: "Connection Status shows Offline"

**Check:**
1. Is the backend server running?
2. Can you access `http://YOUR_IP:8000/docs` from the client device?
3. Try restarting both servers

---

### Problem: "Rate limit exceeded"

**Cause**: Too many generation requests in a short time

**Solution**: Wait 1 minute and try again. The backend limits to 10 requests per minute per IP.

---

### Problem: "Invalid API key"

**Solution**: Make sure you're using the correct API key: `PTG2025`

To change the API key:
1. Edit `backend/.env`
2. Set: `MUSIC_API_KEY=your_new_key`
3. Restart the backend server
4. Login with the new key

---

## 📱 Mobile Access

### iOS (iPhone/iPad)
1. Open Safari
2. Go to `http://YOUR_IP:5173`
3. Tap the Share button → "Add to Home Screen"
4. Now you have a native-like app!

### Android
1. Open Chrome
2. Go to `http://YOUR_IP:5173`
3. Tap the menu (⋮) → "Add to Home screen"
4. Now you have a native-like app!

---

## 🔒 Security Tips

### For Home Use:
- Default API key (`PTG2025`) is fine
- Only accessible on your local network

### For Public WiFi:
- **Change the API key** in `backend/.env`
- Use a strong, unique key
- Consider using a VPN for the host computer

### For Production:
- Set up HTTPS with a reverse proxy (Nginx/Caddy)
- Use proper authentication
- Implement user management

---

## 🎯 Performance Tips

### For Best Performance:
1. **Use 5GHz WiFi** instead of 2.4GHz (if available)
2. **Connect via Ethernet** for the host computer
3. **Close unnecessary apps** on the host computer
4. **Use a modern browser** (Chrome, Firefox, Edge)

### Recommended Specs:
- **Host Computer**: 8GB+ RAM, 4+ CPU cores
- **Network**: 100Mbps+ connection
- **Browser**: Latest version of Chrome/Firefox/Edge

---

## 📊 Monitoring

### Check Server Status:
Visit `http://YOUR_IP:8000/api/health` to see:
- Server version
- Active tasks
- Disk space
- Available models

### Check Connection:
The frontend shows a connection indicator in the top-right corner:
- 🟢 **Green**: Connected
- 🔴 **Red**: Disconnected

---

## 🆘 Getting Help

### Common URLs:
- **Frontend**: `http://YOUR_IP:5173`
- **Backend API**: `http://YOUR_IP:8000`
- **API Docs**: `http://YOUR_IP:8000/docs`
- **Health Check**: `http://YOUR_IP:8000/api/health`

### Logs:
- **Backend logs**: Check the terminal running uvicorn
- **Frontend logs**: Open browser DevTools (F12) → Console tab

---

## 🎉 You're All Set!

Now anyone on your network can:
- ✅ Generate AI music and sound effects
- ✅ Use the professional studio timeline
- ✅ Export audio and video projects
- ✅ Access their generation history

**Enjoy creating music together!** 🎵🎶

---

## 📝 Quick Reference Card

```
┌─────────────────────────────────────────┐
│  AI Music Studio - Quick Reference      │
├─────────────────────────────────────────┤
│  Frontend:  http://YOUR_IP:5173         │
│  Backend:   http://YOUR_IP:8000         │
│  API Key:   PTG2025                     │
│                                          │
│  Keyboard Shortcuts:                    │
│  • Space      → Play/Pause              │
│  • Ctrl+E     → Export Audio            │
│  • Ctrl+S     → Save Project            │
│  • Delete     → Delete Selected         │
└─────────────────────────────────────────┘
```

---

*Last Updated: 2025-12-31*
