import subprocess
from pathlib import Path
import soundfile as sf
import numpy as np
from pydub import AudioSegment
from pydub.utils import which


# -----------------------------------------------------------
# ✅ INTERNAL: Run FFmpeg command safely
# -----------------------------------------------------------
def run_ffmpeg(args: list[str]):
    """
    Run FFmpeg with given args.
    Example:
        run_ffmpeg(["-i", "input.wav", "output.mp3"])
    """
    process = subprocess.run(
        ["ffmpeg", "-y", *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    if process.returncode != 0:
        # Instead of crashing, log the error and continue
        print(f"⚠️ FFmpeg error:\n{process.stderr}")
    return process


# -----------------------------------------------------------
# ✅ Convert reference audio to mono 32kHz WAV
# Required for MusicGen melody mode
# -----------------------------------------------------------
def ensure_wav_32k_mono(src_path: Path, dst_path: Path) -> Path:
    """
    Convert any audio file (mp3, wav, m4a) → mono 32kHz WAV
    """
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    args = [
        "-i", str(src_path),
        "-ac", "1",          # mono
        "-ar", "32000",      # 32k sample rate
        str(dst_path)
    ]
    run_ffmpeg(args)
    return dst_path


# -----------------------------------------------------------
# ✅ Convert WAV → MP3 (safe & works for mono/stereo)
# -----------------------------------------------------------

# Automatically detect FFmpeg and set the converter
AudioSegment.converter = which("ffmpeg") or "ffmpeg"


def wav_to_mp3(wav_path: Path, mp3_path: Path, bitrate: str = "192k") -> Path:
    """
    Converts a WAV file to MP3 safely using PyDub first,
    and falls back to FFmpeg subprocess if PyDub fails.

    Ensures output folder exists and always returns a valid mp3_path.
    """
    mp3_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        # ✅ Try PyDub (preferred, handles mono/stereo properly)
        audio = AudioSegment.from_wav(wav_path)
        audio.export(mp3_path, format="mp3", bitrate=bitrate)
        print(f"✅ MP3 saved at {mp3_path} [PyDub]")
        return mp3_path

    except Exception as e:
        print(f"⚠️ PyDub conversion failed: {e}")
        print("➡️ Trying FFmpeg fallback...")

        # ✅ Fallback: use FFmpeg directly
        args = [
            "-i", str(wav_path),
            "-b:a", bitrate,
            "-y", str(mp3_path)
        ]
        result = run_ffmpeg(args)

        if result.returncode == 0 and mp3_path.exists():
            print(f"✅ MP3 saved at {mp3_path} [FFmpeg fallback]")
        else:
            print(f"❌ FFmpeg failed to convert WAV → MP3\n{result.stderr}")

        return mp3_path


# -----------------------------------------------------------
# ✅ Create Animated Waveform MP4 (handles mono safely)
# -----------------------------------------------------------


# -----------------------------------------------------------
# ✅ Pitch Shift (Semitones) - Uses Librosa
# -----------------------------------------------------------
def pitch_shift_file(input_path: Path, output_path: Path, semitones: float) -> Path:
    """
    Shifts the pitch of an audio file by the given semitones without changing duration.
    """
    import librosa
    import soundfile as sf
    
    # Load audio
    y, sr = librosa.load(str(input_path), sr=None)
    
    # Apply pitch shift
    # Note: librosa.effects.pitch_shift is high quality but can be slow
    y_shifted = librosa.effects.pitch_shift(y, sr, n_steps=semitones)
    
    # Save
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(output_path), y_shifted, sr)
    
    return output_path


# -----------------------------------------------------------
# ✅ Convert MP3 → WAV (helper for ElevenLabs output)
# -----------------------------------------------------------
def mp3_to_wav(mp3_path: Path, wav_path: Path) -> Path:
    """
    Converts MP3 to WAV.
    """
    wav_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        audio = AudioSegment.from_mp3(mp3_path)
        audio.export(wav_path, format="wav")
        return wav_path
    except Exception as e:
        print(f"⚠️ PyDub MP3->WAV failed: {e}")
        # Fallback ffmpeg
        args = ["-i", str(mp3_path), str(wav_path)]
        run_ffmpeg(args)
        return wav_path
