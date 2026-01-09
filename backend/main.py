import os
import json
import uuid
import random
import traceback
import socket
import shutil
from pathlib import Path
from datetime import datetime

from fastapi import (
    FastAPI, Form, HTTPException, Header,
    BackgroundTasks, Request, UploadFile, File
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import (
    API_KEY as CONFIG_API_KEY,
    ALLOWED_ORIGINS,
    OUTPUT_ROOT,
    HISTORY_FILE,
    DEFAULT_DEVICE,
    DEFAULT_MODEL,
)

from models.responses import GenerateResponse, ResultResponse
from services import elevenlabs, isolation
from services.tasks import TASKS
from services.sfx_styles import SOUND_PROMPTS
from engine.musicgen_engine import MusicEngine, GenParams
from engine.audio_utils import wav_to_mp3, mp3_to_wav


# -----------------------------------------------------------
# ENV + DEBUG
# -----------------------------------------------------------

print("🔥 UPDATED MAIN.PY LOADED 🔥")

API_KEY = os.getenv("MUSIC_API_KEY", CONFIG_API_KEY)

def get_lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.254.254.254', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = "127.0.0.1"
    finally:
        s.close()
    return IP

local_ip = get_lan_ip()
BASE_URL = f"http://{local_ip}:8000"

print(f"\nBackend listening on: {BASE_URL}")
print(f"Frontend/Docs available at: http://{local_ip}:5173/docs")
print("Note: Access the app via port 5173. The backend is proxied automatically.\n")


# -----------------------------------------------------------
# FASTAPI + RATE LIMITING
# -----------------------------------------------------------

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="🎵 AI Music Studio API", version="2.3.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    import asyncio
    loop = asyncio.get_running_loop()
    def custom_handler(loop, context):
        exc = context.get("exception")
        if isinstance(exc, ConnectionResetError) or (exc and "WinError 10054" in str(exc)):
            return
        loop.default_exception_handler(context)
    loop.set_exception_handler(custom_handler)


# -----------------------------------------------------------
# HISTORY
# -----------------------------------------------------------


# -----------------------------------------------------------
# HISTORY
# -----------------------------------------------------------

def append_history(entry: dict):
    history = []
    if HISTORY_FILE.exists():
        try:
            history = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        except:
            pass

    history.insert(0, entry)
    HISTORY_FILE.write_text(
        json.dumps(history[:200], indent=2),
        encoding="utf-8",
    )



@app.get("/api/history")
def get_history():
    if not HISTORY_FILE.exists():
        return []
    try:
        return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
    except:
        return []


@app.delete("/api/history")
def clear_history(x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    
    if HISTORY_FILE.exists():
        HISTORY_FILE.unlink()
    return {"status": "ok", "message": "History cleared"}



@app.get("/api/sfx-prompts")
def get_sfx_prompts():
    return SOUND_PROMPTS


# -----------------------------------------------------------
# GENERATE API
# -----------------------------------------------------------

@app.post("/api/generate", response_model=GenerateResponse)
@limiter.limit("60/minute")  # Increased limit for multiple users
async def generate_music(
    request: Request,  # Required for rate limiting
    background: BackgroundTasks,
    prompt: str = Form(...),

    ref_audio: UploadFile | str | None = File(default=None),
    use_paid: bool = Form(False),

    mode: str = Form("music"),      # music | sfx
    duration_sec: int = Form(10),

    # MusicGen params only
    temperature: float = Form(1.0),
    top_k: int = Form(250),
    top_p: float = Form(0.95),
    seed: int = Form(0),
    seed_lock: bool = Form(False),

    # Model meaning:
    # - music → MusicGen model
    # - sfx   → AudioLDM model
    model_name: str = Form(DEFAULT_MODEL),

    x_api_key: str = Header(None),
):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API Key")

    if isinstance(ref_audio, str):
        ref_audio = None

    task_id = uuid.uuid4().hex[:12]
    task_dir = OUTPUT_ROOT / task_id
    task_dir.mkdir(parents=True, exist_ok=True)

    effective_seed = (
        seed if (seed_lock and seed > 0)
        else random.randint(1, 2**31 - 1)
    )

    TASKS.create(task_id, {
        "status": "queued",
        "files": None,
        "meta": {
            "prompt": prompt,
            "mode": mode,
            "model": model_name,
            "duration": duration_sec,
            "seed": effective_seed,
            "created_at": datetime.utcnow().isoformat(),
        },
        "error": None,
    })

    async def job():
        try:
            print(f"🎶 Task {task_id} started (mode={mode}, model={model_name})")

            params = GenParams(
                temperature=temperature,
                top_k=top_k,
                top_p=top_p,
                seed=effective_seed,
            )

            engine = MusicEngine(
                model_name=model_name,
                device=DEFAULT_DEVICE,
                output_dir=task_dir,
            )

            # ---------------- MUSIC ----------------
            if mode == "music":
                if isinstance(ref_audio, UploadFile):
                    ref_path = task_dir / ref_audio.filename
                    ref_path.write_bytes(await ref_audio.read())

                    wav_path = engine.generate_with_reference(
                        prompt=prompt,
                        ref_audio_path=ref_path,
                        duration=duration_sec,
                        params=params,
                    )
                else:
                    wav_path = engine.generate_text(
                        prompt=prompt,
                        duration=duration_sec,
                        params=params,
                    )

            # ---------------- SFX ----------------
            elif mode == "sfx":
                # model_name here = audioldm2p | audioldmp | audioldm-s-full-v2
                if use_paid:
                    print(f"Using ElevenLabs for SFX: {prompt}")
                    sfx_content = elevenlabs.generate_sfx(prompt, duration_sec)
                    mp3_path = task_dir / "audio.mp3"
                    mp3_path.write_bytes(sfx_content)
                    wav_path = task_dir / "audio.wav"
                    mp3_to_wav(mp3_path, wav_path)
                else:
                    original_wav_path = engine.generate_sfx(
                        prompt=prompt,
                        duration=duration_sec,
                        model_name=model_name,
                    )
                    # Move SFX WAV to task dir so it can be downloaded
                    wav_path = task_dir / original_wav_path.name
                    if original_wav_path != wav_path:
                        shutil.copy(original_wav_path, wav_path)

            else:
                raise HTTPException(400, f"Unknown mode: {mode}")

            mp3_path = task_dir / "audio.mp3"
            wav_to_mp3(wav_path, mp3_path)

            files = {
                "wav": f"/api/download/{task_id}/{wav_path.name}",
                "mp3": f"/api/download/{task_id}/audio.mp3",
            }

            TASKS.set_status(task_id, "done", files=files)


            append_history({
                "id": task_id,
                "task_id": task_id,
                "prompt": prompt,
                "mode": mode,
                "model": model_name,
                "seed": effective_seed,
                "duration": duration_sec,
                "created_at": datetime.utcnow().isoformat(),
                "files": files,
            })

            print(f"✅ Task {task_id} completed")

        except Exception:
            print("❌ JOB FAILED\n", traceback.format_exc())
            TASKS.set_status(task_id, "error", error=traceback.format_exc())

    background.add_task(job)
    return GenerateResponse(task_id=task_id, status="queued")


# -----------------------------------------------------------
# RESULT
# -----------------------------------------------------------

@app.get("/api/result/{task_id}", response_model=ResultResponse)
def get_result(task_id: str):
    task = TASKS.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    return ResultResponse(
        task_id=task_id,
        status=task["status"],
        files=task.get("files"),
        meta=task.get("meta"),
        error=task.get("error"),
    )



# -----------------------------------------------------------
# ISOLATE API
# -----------------------------------------------------------

@app.post("/api/isolate", response_model=GenerateResponse)
@limiter.limit("5/minute")
async def isolate_audio(
    request: Request,
    background: BackgroundTasks,
    audio_file: UploadFile = File(...),
    use_paid: bool = Form(False),
    x_api_key: str = Header(None),
):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    task_id = uuid.uuid4().hex[:12]
    task_dir = OUTPUT_ROOT / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    
    # Save input file
    input_path = task_dir / audio_file.filename
    with open(input_path, "wb") as f:
        f.write(await audio_file.read())
        
    TASKS.create(task_id, {
        "status": "queued",
        "files": None,
        "meta": {
            "mode": "isolation",
            "use_paid": use_paid,
            "original_file": audio_file.filename,
            "created_at": datetime.utcnow().isoformat(),
        }
    })
    
    async def job():
        try:
            print(f"🎤 Isolation Task {task_id} started (Paid={use_paid})")
            
            if use_paid:
                # ElevenLabs
                isolated_content = elevenlabs.isolate_voice(str(input_path))
                output_path = task_dir / "audio.mp3" # ElevenLabs usually mp3
                output_path.write_bytes(isolated_content)
                final_mp3 = output_path
                final_wav = task_dir / "audio.wav"
                mp3_to_wav(mp3_path=final_mp3, wav_path=final_wav)

            else:
                # Local Demucs
                vocals_path = isolation.isolate_voice_local(str(input_path), str(task_dir))
                # output is wav
                final_wav = task_dir / "audio.wav"
                shutil.copy(vocals_path, final_wav)
                
                final_mp3 = task_dir / "audio.mp3"
                wav_to_mp3(final_wav, final_mp3)

            files = {
                "wav": f"/api/download/{task_id}/audio.wav",
                "mp3": f"/api/download/{task_id}/audio.mp3",
                "original": f"/api/download/{task_id}/{audio_file.filename}"
            }
            
            TASKS.set_status(task_id, "done", files=files)
            print(f"✅ Isolation Task {task_id} completed")
            
        except Exception:
             print("❌ JOB FAILED\n", traceback.format_exc())
             TASKS.set_status(task_id, "error", error=traceback.format_exc())

    background.add_task(job)
    return GenerateResponse(task_id=task_id, status="queued")


# -----------------------------------------------------------
# PROCESS API (TRANSPOSE, etc)
# -----------------------------------------------------------

@app.post("/api/process/transpose", response_model=GenerateResponse)
async def transpose_audio(
    background: BackgroundTasks,
    audio_file: UploadFile = File(...),
    semitones: float = Form(...),
    x_api_key: str = Header(None),
):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    task_id = uuid.uuid4().hex[:12]
    task_dir = OUTPUT_ROOT / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    
    input_path = task_dir / f"input_{audio_file.filename}"
    with open(input_path, "wb") as f:
        f.write(await audio_file.read())

    TASKS.create(task_id, {
        "status": "queued",
        "meta": {
            "mode": "transpose",
            "semitones": semitones,
            "original_file": audio_file.filename,
            "created_at": datetime.utcnow().isoformat(),
        }
    })

    async def job():
        try:
            print(f"🎹 Transpose Task {task_id} started ({semitones} semitones)")
            from engine.audio_utils import pitch_shift_file, wav_to_mp3
            
            output_wav = task_dir / "audio.wav"
            pitch_shift_file(input_path, output_wav, semitones)
            
            output_mp3 = task_dir / "audio.mp3"
            wav_to_mp3(output_wav, output_mp3)

            files = {
                "wav": f"/api/download/{task_id}/audio.wav",
                "mp3": f"/api/download/{task_id}/audio.mp3",
            }
            TASKS.set_status(task_id, "done", files=files)
            print(f"✅ Transpose Task {task_id} completed")
            
        except Exception:
             print("❌ TRANSPOSE JOB FAILED\n", traceback.format_exc())
             TASKS.set_status(task_id, "error", error=traceback.format_exc())

    background.add_task(job)
    return GenerateResponse(task_id=task_id, status="queued")


# -----------------------------------------------------------
# DOWNLOAD
# -----------------------------------------------------------

@app.get("/api/download/{task_id}/{filename}")
def download_file(task_id: str, filename: str):
    file_path = OUTPUT_ROOT / task_id / filename
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(file_path)


# -----------------------------------------------------------
# HEALTH
# -----------------------------------------------------------

@app.get("/api/health")
def health():
    # Get disk space
    total, used, free = shutil.disk_usage(OUTPUT_ROOT)
    free_gb = free // (2**30)
    
    # Count active tasks
    active_tasks = sum(1 for t in TASKS._tasks.values() if t.get("status") == "processing")
    
    return {
        "status": "ok",
        "base_url": BASE_URL,
        "version": "2.3.1",
        "active_tasks": active_tasks,
        "disk_space_gb": free_gb,
        "models": ["musicgen-small", "audioldm2p"],
    }



# -----------------------------------------------------------
# CHAT ASSISTANT
# -----------------------------------------------------------

from services.chat_service import chat_service
from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    history: list = []
    project_context: dict = None

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    # Dynamic key reload check
    current_key = os.getenv("GOOGLE_API_KEY")
    if current_key and current_key != getattr(chat_service, 'api_key', None):
         print("🔄 GOOGLE_API_KEY change detected, re-initializing ROOBO...")
         chat_service.__init__() 

    response = chat_service.chat(req.message, req.history, req.project_context)
    if isinstance(response, dict):
        return response
    return {"reply": response}

# -----------------------------------------------------------
# CONFIG MGMT
# -----------------------------------------------------------

class ConfigUpdate(BaseModel):
    google_api_key: str | None = None
    elevenlabs_api_key: str | None = None

@app.get("/api/config")
async def get_config_keys(x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    
    def mask(s):
        if not s or len(s) < 8: return "****"
        return s[:4] + "...." + s[-4:]

    return {
        "google_api_key": mask(os.getenv("GOOGLE_API_KEY")),
        "elevenlabs_api_key": mask(os.getenv("ELEVENLABS_API_KEY"))
    }

@app.post("/api/config")
async def update_config_keys(config: ConfigUpdate, x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        print(f"❌ Config Auth Failed: Header was {x_api_key}, expected {API_KEY}")
        raise HTTPException(status_code=401, detail="Invalid API Key")
    
    try:
        from config import BASE_DIR
        env_path = BASE_DIR / ".env"
        
        print(f"📝 Updating config at {env_path}")
        
        lines = []
        if env_path.exists():
            lines = env_path.read_text().splitlines()
        
        def update_val(key, val):
            if val is None: return
            found = False
            for i, line in enumerate(lines):
                if line.startswith(f"{key}="):
                    lines[i] = f"{key}={val}"
                    found = True
                    break
            if not found:
                lines.append(f"{key}={val}")
            os.environ[key] = val
            print(f"✅ Set {key} in environment")

        if config.google_api_key:
            update_val("GOOGLE_API_KEY", config.google_api_key)
        if config.elevenlabs_api_key:
            update_val("ELEVENLABS_API_KEY", config.elevenlabs_api_key)
        
        env_path.write_text("\n".join(lines) + "\n")
        print("💾 .env file saved successfully")
        
        # Reload chat service if Google key changed
        if config.google_api_key:
            chat_service.__init__()

        return {"status": "ok", "message": "API keys updated and services reloaded"}
    except Exception as e:
        print(f"❌ FAILED TO UPDATE CONFIG: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



