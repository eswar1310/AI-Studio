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
## OUT PUTS 
<img width="1915" height="936" alt="image" src="https://github.com/user-attachments/assets/e51b3aae-2b89-4927-aacb-c325bb04b863" />
<img width="1905" height="945" alt="Screenshot 2026-01-09 164839" src="https://github.com/user-attachments/assets/8e726933-ddee-478c-99b0-1252187c9a44" />
<img width="1918" height="943" alt="Screenshot 2026-01-09 164903" src="https://github.com/user-attachments/assets/fe586b93-6b00-4a61-904f-3e6c90da90b4" />
<img width="1918" height="947" alt="image" src="https://github.com/user-attachments/assets/24ac38b0-47fc-484e-9fd4-90b06011fd39" />
<img width="1919" height="941" alt="Screenshot 2026-01-09 165014" src="https://github.com/user-attachments/assets/b795dfa0-aac4-4b95-81ac-ec45585ee24c" />
<img width="1919" height="937" alt="Screenshot 2026-01-09 165027" src="https://github.com/user-attachments/assets/d2eea91a-4db1-444b-bc72-ef15ffce81e4" />
<img width="1896" height="929" alt="Screenshot 2026-01-09 165053" src="https://github.com/user-attachments/assets/ce3dfc50-c3c0-4cd1-81eb-becbf6193588" />
<img width="1919" height="937" alt="Screenshot 2026-01-09 165218" src="https://github.com/user-attachments/assets/b581b0bb-4dae-4ada-b279-d964ccfbe1dc" />
<img width="1919" height="927" alt="Screenshot 2026-01-09 165231" src="https://github.com/user-attachments/assets/f9904e46-590b-4a84-8831-9875ec2b0bb8" />








