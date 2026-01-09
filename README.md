<<<<<<< HEAD
# 🎶 Vinu Music Studio (AI Music Suite)

**The Ultimate Local-First AI Music Production Suite.**

Vinu Music Studio allows you to generate music, isolate vocals, and arrange tracks in a professional timeline interface—all running locally on your machine. It combines state-of-the-art AI models (MusicGen, AudioLDM, Demucs) with a modern web-based DAW.

---

## ⚡ Quick Start Guide ("Pip to Pip")

Follow these steps to set up the project from scratch.

### 📋 Prerequisites

Before you begin, ensure you have the following installed:
1.  **Python 3.10+**: [Download Python](https://www.python.org/downloads/)
2.  **Node.js 18+**: [Download Node.js](https://nodejs.org/)
3.  **FFmpeg**: Essential for audio processing.
    *   **Windows**: [Download & Install](https://www.gyan.dev/ffmpeg/builds/) (Add to System PATH)
    *   **Mac**: `brew install ffmpeg`
    *   **Linux**: `sudo apt install ffmpeg`

---

### 1️⃣ Backend Setup (The AI Engine)
The backend handles all AI generation, heavy processing, and file management.

1.  **Navigate to the backend folder**:
    ```bash
    cd backend
    ```

2.  **Create a virtual environment (Recommended)**:
    ```bash
    python -m venv venv
    ```

3.  **Activate the virtual environment**:
    *   **Windows**:
        ```bash
        venv\Scripts\activate
        ```
    *   **Mac/Linux**:
        ```bash
        source venv/bin/activate
        ```

4.  **Install Python dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

5.  **Configure Environment Variables**:
    *   Create a `.env` file inside the `backend` folder.
    *   Add your API keys (Required for ROOBO Chat Assistant):
        ```env
        GOOGLE_API_KEY=your_gemini_api_key_here
        ELEVENLABS_API_KEY=optional_key_here
        ```

6.  **Start the Backend Server**:
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8000
    ```
    *You should see "🔥 UPDATED MAIN.PY LOADED 🔥" and "Backend listening on..."*

---

### 2️⃣ Frontend Setup (The Studio UI)
The frontend provides the visual interface, timeline, and studio controls.

1.  **Open a NEW terminal** (keep the backend running) and navigate to the frontend folder:
    ```bash
    cd frontend
    ```

2.  **Install Node dependencies**:
    ```bash
    npm install
    ```

3.  **Start the Development Server**:
    ```bash
    npm run dev
    ```

---

### 🚀 Running the Application

Once both servers are running:
1.  Open your browser and go to: **`http://localhost:5173`**
2.  **First Run**: You will be asked to log in. The system uses a local API key for security (default: `PTG2025`).

---

## ✨ Key Features

### 🎹 AI Music Generation
*   **Text-to-Music**: Type "Epic orchestral soundtrack" and get a track in seconds.
*   **Sound Effects**: Generate custom foley and SFX for your projects.
*   **Voice Isolation**: Separate vocals, drums, and bass from any song using Demucs.

### 🎛️ Full-Featured Studio (DAW)
*   **Multi-Track Timeline**: Arrange, layer, and mix your generated or imported audio.
*   **Clip Editing**: Split, trim, move, and duplicate clips with professional precision.
*   **Real-Time Effects**: Adjust Volume, Pan, and Pitch (Transpose) for every track.
*   **Video Sync**: Load an MP4 video to score music directly to picture.

### 🤖 ROOBO AI Assistant
*   **Context-Aware Chat**: ROOBO knows your project state (tracks, BPM, assets).
*   **Helpful Guide**: Ask "How do I split a clip?" or "What is my current BPM?"

---

## 🛠️ Troubleshooting

*   **"FFmpeg not found"**: Ensure FFmpeg is installed and added to your system's PATH environment variable. The backend needs this to convert WAV to MP3.
*   **"Backend Connection Failed"**: Make sure the backend terminal is running and listening on port 8000.
*   **"No Module found"**: Ensure you activated the virtual environment (`venv`) before running `pip install` or `uvicorn`.

---

*Verified & Updated for 2026 Release.*
=======
# AI-Studio
>>>>>>> 81174361cad5bbd27f9eb32312171fe04e63472a
