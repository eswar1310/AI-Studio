# 🎵 AI Music Studio — Backend (FastAPI)

A powerful, local-first AI music backend built with **FastAPI**. It powers the **Vinu Music Studio** by providing text-to-music generation, SFX creation, and professional vocal isolation/stem separation.

---

## 🚀 Key Features

### 🎶 1. AI Music Generation
- **Meta MusicGen Integration**: High-fidelity music generation from text prompts.
- **Local Model Loading**: Automatically detects and loads models from the local Hugging Face cache.
- **Sampling Controls**: Full control over `temperature`, `top_k`, `top_p`, and `seed`.
- **Hybrid Export**: Generates both high-quality **WAV** and compressed **MP3** versions in memory.

### 🪄 2. AI Sound Effects (SFX)
- **AudioLDM 2 Support**: Industry-standard text-to-audio generation for sound effects, foley, and textures.
- **SFX Prompt Library**: Pre-configured categories for common cinematic sounds (Impacts, Risers, Nature, etc.).

### 🎙️ 3. Voice & Vocal Isolation
- **Facebook Demucs Integration**: Professional-grade stem separation.
- **Four-Stem Splitting**: High-performance isolation of vocals, drums, bass, and other instruments.
- **Async Processing**: Task-based workflow with real-time progress updates.

### 🌐 4. LAN & Discovery
- **Zero-Config LAN**: Automatically exposes the backend to other devices on the same local network.
- **Cross-Origin Support**: Robust CORS configuration for multi-device environments.
- **Swagger Documentation**: Self-documenting API at `/docs`.

---

## 🛠️ Installation & Setup

### 1. Prerequisites
- **Python 3.10+**
- **FFmpeg**: Required for audio transcoding (MP3 conversion).
  - *Windows*: `choco install ffmpeg`
  - *Mac*: `brew install ffmpeg`

### 2. Environment Setup
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt
```

### 3. Running the Server
```bash
# Run in development mode
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 📡 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/generate` | `POST` | Start music or SFX generation task |
| `/api/isolate` | `POST` | Start a vocal isolation (Demucs) task |
| `/api/result/{id}` | `GET` | Poll task status and retrieve download URLs |
| `/api/download/{id}/{file}` | `GET` | Download generated file (MP3/WAV) |
| `/api/history` | `GET` | Retrieve list of recent generations |
| `/api/health` | `GET` | Verify server status and network configuration |

---

## 🧠 Technical Highlights
- **In-Memory Buffer Strategy**: Audio files are processed and held in memory to ensure maximum speed and minimal disk I/O.
- **Snapshot-Aware Loader**: The engine automatically finds the latest model versions in your Hugging Face cache without manual configuration.
- **Task Orchestration**: Handles multiple concurrent requests using an asynchronous task manager.

## 🔑 Security
The backend uses a fixed API key defined in `config.py` for local security.
- **Header**: `x-api-key: PTG2025`

---
*Created for Vinu Music Studio by Antigravity AI.*