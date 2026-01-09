import uuid
from pathlib import Path

import torch
import soundfile as sf

from diffusers import AudioLDM2Pipeline, AudioLDMPipeline
try:
    from transformers.models.gpt2.modeling_gpt2 import GPT2Model
except ImportError:
    GPT2Model = None


# -------------------------------------------------
# MONKEY PATCH FOR TRANSFORMERS COMPATIBILITY
# -------------------------------------------------
# Fix for AttributeError: 'GPT2Model' object has no attribute '_get_initial_cache_position'
# This occurs with newer transformers versions (>4.38) and current diffusers



if GPT2Model is not None:
    if not hasattr(GPT2Model, "_get_initial_cache_position"):
        def _get_initial_cache_position(self, *args, **kwargs):
            return kwargs.get("model_kwargs", {})
        GPT2Model._get_initial_cache_position = _get_initial_cache_position

    if not hasattr(GPT2Model, "_update_model_kwargs_for_generation"):
        def _update_model_kwargs_for_generation(self, outputs, model_kwargs, **kwargs):
            # Minimal implementation to extract past_key_values
            if hasattr(outputs, "past_key_values"):
                model_kwargs["past_key_values"] = outputs.past_key_values
            return model_kwargs
        GPT2Model._update_model_kwargs_for_generation = _update_model_kwargs_for_generation


# -------------------------------------------------
# CONFIG
# -------------------------------------------------

DEVICE = "cpu"                 # change to "cuda" if GPU available
DTYPE = torch.float32          # CPU safe

BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "outputs" / "sfx"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# -------------------------------------------------
# LOAD MODELS ONCE (SERVER STARTUP)
# -------------------------------------------------

print("🔄 Loading SFX models (AudioLDM / AudioLDM2)...")

MODELS = {
    # AudioLDM2 (best quality)
    "audioldm2p": AudioLDM2Pipeline.from_pretrained(
        "cvssp/audioldm2",
        torch_dtype=DTYPE
    ).to(DEVICE),

    # AudioLDM v1
    "audioldmp": AudioLDMPipeline.from_pretrained(
        "cvssp/audioldm",
        torch_dtype=DTYPE
    ).to(DEVICE),

    # Lightweight AudioLDM
    "audioldm-s-full-v2": AudioLDMPipeline.from_pretrained(
        "cvssp/audioldm-s-full-v2",
        torch_dtype=DTYPE
    ).to(DEVICE),
}

print("✅ SFX models loaded successfully")


# -------------------------------------------------
# SFX GENERATION
# -------------------------------------------------

def generate_sfx(
    prompt: str,
    model_name: str = "audioldm2p",
    duration: int = 10
) -> str:
    """
    Generate sound effects using AudioLDM / AudioLDM2.

    Args:
        prompt (str): Text prompt (e.g. "rain and thunder")
        model_name (str): audioldm2p | audioldmp | audioldm-s-full-v2
        duration (int): 5, 10, 15, or 20 seconds

    Returns:
        str: Relative path (e.g. "sfx/abc123.wav")
    """

    model_key = model_name.lower().strip()

    # Alias handling
    if model_key == "audioldm-s-full":
        model_key = "audioldm-s-full-v2"

    if model_key not in MODELS:
        raise ValueError(
            f"Unsupported SFX model '{model_name}'. "
            f"Available models: {list(MODELS.keys())}"
        )

    # Validate duration
    try:
        duration = int(duration)
    except Exception:
        duration = 10

    if duration not in (5, 10, 15, 20):
        raise ValueError("SFX duration must be 5, 10, 15, or 20 seconds")

    pipe = MODELS[model_key]

    # CPU-safe inference steps
    steps = 40 if model_key == "audioldm-s-full-v2" else 30

    print("🔊 Generating SFX")
    print("🧠 Model:", model_key)
    print("📝 Prompt:", prompt)
    print("⏱ Duration:", duration, "seconds")

    with torch.inference_mode():
        audio = pipe(
            prompt=prompt,
            num_inference_steps=steps,
            audio_length_in_s=float(duration)
        ).audios[0]

    # Save output
    filename = f"{uuid.uuid4().hex}.wav"
    out_path = OUTPUT_DIR / filename

    sf.write(out_path, audio, 16000)

    final_duration = len(audio) / 16000
    print(f"✅ SFX generated ({final_duration:.2f}s): {out_path}")

    # IMPORTANT: return relative path for API
    return f"sfx/{filename}"
