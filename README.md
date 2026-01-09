# 🎶 Vinu Music Studio (AI Music Suite)

**The Ultimate Local-First AI Music Production Suite.**

Vinu Music Studio allows you to generate music, isolate vocals, and arrange tracks in a professional timeline interface — all running locally on your machine. It combines state-of-the-art AI models (MusicGen, AudioLDM, Demucs) with a modern web-based DAW.

---

## ⚡ Quick Start Guide ("Pip to Pip")

Follow these steps to set up the project from scratch.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1. **Python 3.10+**  
   https://www.python.org/downloads/

2. **Node.js 18+**  
   https://nodejs.org/

3. **FFmpeg** (required for audio processing)  
   - Windows: https://www.gyan.dev/ffmpeg/builds/  
   - Mac: `brew install ffmpeg`  
   - Linux: `sudo apt install ffmpeg`

---

## 1️⃣ Backend Setup (The AI Engine)

The backend handles all AI generation, heavy processing, and file management.

cd backend
python -m venv venv

makefile
Copy code

Activate:

venv\Scripts\activate # Windows
source venv/bin/activate # Mac/Linux

yaml
Copy code

Install dependencies:

pip install -r requirements.txt

pgsql
Copy code

Create `backend/.env` (DO NOT COMMIT THIS):

GOOGLE_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=optional_key_here

powershell
Copy code

Start backend:

uvicorn main:app --host 0.0.0.0 --port 8000

yaml
Copy code

You should see:
🔥 UPDATED MAIN.PY LOADED 🔥
Backend listening on...

yaml
Copy code

---

## 2️⃣ Frontend Setup (The Studio UI)

Open a new terminal:

cd frontend
npm install
npm run dev

yaml
Copy code

---

## 🚀 Running the Application

Once both servers are running, open:

http://localhost:5173

vbnet
Copy code

Default login key:
PTG2025

yaml
Copy code

---

## ✨ Key Features

### 🎹 AI Music & SFX
- Text-to-Music generation  
- Foley & sound-effects generation  
- Voice & instrument isolation (Demucs)

### 🎛️ Professional DAW
- Multi-track timeline  
- Drag & drop clips  
- Trim, split, move, duplicate  
- Volume, pan & pitch controls  
- Video sync for scoring  

### 🤖 ROOBO AI Assistant
- Knows your project state  
- Can answer studio questions  
- Helps with editing and workflow  

---

## 🛠️ Troubleshooting

FFmpeg not found → Install FFmpeg and add to PATH  
Backend not connecting → Make sure port 8000 is running  
Module not found → Activate `venv`  

---

**Verified & Updated for 2026 Release**
