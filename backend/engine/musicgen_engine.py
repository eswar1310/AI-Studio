from pathlib import Path
from datetime import datetime

import torch
import soundfile as sf
import numpy as np
from audiocraft.models import MusicGen

from .audio_utils import ensure_wav_32k_mono
from .sfx import generate_sfx as generate_sfx_diffusers


# ---------------------------------------------------------------
# PARAMETER WRAPPER
# ---------------------------------------------------------------
class GenParams:
    def __init__(self, temperature: float, top_k: int, top_p: float, seed: int):
        self.temperature = temperature      # randomness
        self.top_k = top_k                  # token limit
        self.top_p = top_p                  # nucleus sampling
        self.seed = seed                    # reproducibility


# ---------------------------------------------------------------
# MUSIC ENGINE (MusicGen only)
# ---------------------------------------------------------------
class MusicEngine:
    def __init__(self, model_name: str, device: str, output_dir: Path):
        """
        Handles:
        - Text → Music (MusicGen)
        - Text + Reference → Music (MusicGen Melody)
        - Delegates SFX to sfx.py (AudioLDM / AudioLDM2)

        SFX models are NOT loaded here.
        """
        self.model_name = model_name
        self.device = device
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Load MusicGen only if requested
        if "musicgen" in model_name:
            print(f"🎧 Loading MusicGen model: {model_name} on {device}")
            self.music_model = MusicGen.get_pretrained(
                model_name,
                device=self.device
            )
        else:
            self.music_model = None

    # -----------------------------------------------------------
    # TEXT → MUSIC (MusicGen)
    # -----------------------------------------------------------
    def generate_text(
        self,
        prompt: str,
        duration: int,
        params: GenParams
    ) -> Path:
        if self.music_model is None:
            raise RuntimeError("MusicGen model not loaded.")

        if params.seed > 0:
            torch.manual_seed(params.seed)

        self.music_model.set_generation_params(
            duration=duration,
            temperature=params.temperature,
            top_k=params.top_k,
            top_p=params.top_p,
        )

        print(f"🎶 Generating music from text: {prompt}")

        with torch.inference_mode():
            wavs = self.music_model.generate([prompt])

        wav = wavs[0].cpu().numpy()

        if wav.ndim > 1:
            wav = np.mean(wav, axis=0)

        wav = np.clip(wav, -1.0, 1.0)

        filename = f"musicgen_{datetime.now().strftime('%Y%m%d_%H%M%S')}.wav"
        out_path = self.output_dir / filename

        sf.write(out_path, wav, self.music_model.sample_rate)

        print(f"✅ Music saved: {out_path}")
        return out_path

    # -----------------------------------------------------------
    # TEXT + REFERENCE → MUSIC (MusicGen Melody)
    # -----------------------------------------------------------
    def generate_with_reference(
        self,
        prompt: str,
        ref_audio_path: Path,
        duration: int,
        params: GenParams
    ) -> Path:
        print("🎼 Loading MusicGen Melody model: facebook/musicgen-melody")

        if params.seed > 0:
            torch.manual_seed(params.seed)

        model = MusicGen.get_pretrained(
            "facebook/musicgen-melody",
            device=self.device
        )

        model.set_generation_params(
            duration=duration,
            temperature=params.temperature,
            top_k=params.top_k,
            top_p=params.top_p,
        )

        # Ensure reference audio is mono + 32kHz
        ref_mono = self.output_dir / "reference_32k.wav"
        ensure_wav_32k_mono(ref_audio_path, ref_mono)

        print(f"🎵 Generating melody-based music using reference audio")

        with torch.inference_mode():
            wavs = model.generate_with_chroma(
                descriptions=[prompt],
                melody_wavs=[str(ref_mono)],
                melody_sample_rate=32000,
            )

        wav = wavs[0].cpu().numpy()

        if wav.ndim > 1:
            wav = np.mean(wav, axis=0)

        wav = np.clip(wav, -1.0, 1.0)

        filename = f"melody_{datetime.now().strftime('%Y%m%d_%H%M%S')}.wav"
        out_path = self.output_dir / filename

        sf.write(out_path, wav, model.sample_rate)

        print(f"✅ Melody music saved: {out_path}")
        return out_path

    # -----------------------------------------------------------
    # SFX MODE (Delegated to sfx.py)
    # -----------------------------------------------------------
    def generate_sfx(
        self,
        prompt: str,
        duration: int,
        model_name: str = "audioldm2p"
    ) -> Path:
        """
        Delegates SFX generation to sfx.py (Diffusers AudioLDM).

        Supported models:
        - audioldm2p
        - audioldmp
        - audioldm-s-full-v2

        Duration: 5 / 10 / 15 / 20 seconds
        """

        print("🔊 Delegating SFX generation to sfx.py")
        print(f"🧠 Model: {model_name}")
        print(f"⏱ Duration: {duration}s")

        relative_path = generate_sfx_diffusers(
            prompt=prompt,
            model_name=model_name,
            duration=duration
        )

        # Convert returned relative path to absolute Path
        out_path = Path(__file__).parent / "outputs" / relative_path

        print(f"✅ SFX generated: {out_path}")
        return out_path
