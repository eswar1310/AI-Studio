import os
import sys
import numpy as np
import soundfile as sf
import torch
from pathlib import Path

# -------------------------------------------------
# Add the CORRECT DeepFilterNet package path
# -------------------------------------------------
DF_ROOT = r"D:\DeepFilterNet"
DF_PACKAGE_ROOT = os.path.join(DF_ROOT, "DeepFilterNet")

# Fallback check: if 'df' is directly in DF_ROOT
if not os.path.exists(os.path.join(DF_PACKAGE_ROOT, "df")):
    DF_PACKAGE_ROOT = DF_ROOT

sys.path.insert(0, DF_PACKAGE_ROOT)

# -------------------------------------------------
# Import DeepFilterNet native API
# -------------------------------------------------
from df.enhance import enhance, init_df

# Initialize model ONCE (FastAPI-safe)
model, df_state, suffix, epoch = init_df()

# Enable memory optimization for CPU inference
model.eval()

# Optional: Set to lower precision if supported
try:
    model = model.float()
except Exception:
    pass


def remove_noise(input_path, output_path):
    """
    Remove noise from audio using DeepFilterNet.
    Supports large files via chunked processing with overlap blending.
    
    Args:
        input_path: Path to input audio file
        output_path: Path to save enhanced audio
    """
    audio, sr = sf.read(input_path)

    # Stereo → mono
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)

    # Ensure audio is float32
    audio = audio.astype(np.float32)
    
    # Process audio in chunks to avoid memory issues
    # Max chunk duration: 5 minutes for large files
    max_chunk_duration = 5 * 60  # 5 minutes
    max_chunk_samples = int(sr * max_chunk_duration)
    
    # Overlap: 3 seconds to smooth transitions
    overlap_duration = 3
    overlap_samples = int(sr * overlap_duration)
    
    print(f"🎵 Processing audio: {len(audio)/sr:.2f}s ({len(audio)/sr/60:.2f} minutes)")
    
    if len(audio) <= max_chunk_samples:
        # Small audio file - process directly
        print("✅ Processing as single chunk...")
        audio_tensor = torch.from_numpy(audio).float()  # [T]
        
        # Enhance audio
        enhanced_audio = enhance(
            model,
            df_state,
            audio_tensor.unsqueeze(0),  # Add batch dimension [1, T]
            pad=True
        )
        
        enhanced_array = enhanced_audio.squeeze(0).cpu().numpy()
    else:
        # Large audio file - process in chunks with overlap
        print(f"📦 Processing in chunks of {max_chunk_duration}s with {overlap_duration}s overlap...")
        
        num_chunks = (len(audio) - overlap_samples) // (max_chunk_samples - overlap_samples)
        if (len(audio) - overlap_samples) % (max_chunk_samples - overlap_samples) != 0:
            num_chunks += 1
        
        print(f"📊 Total chunks: {num_chunks}")
        enhanced_parts = []
        
        for i in range(num_chunks):
            print(f"⏳ Processing chunk {i+1}/{num_chunks}...")
            
            start_idx = i * (max_chunk_samples - overlap_samples)
            end_idx = min(start_idx + max_chunk_samples, len(audio))
            
            chunk = audio[start_idx:end_idx].astype(np.float32)
            audio_tensor = torch.from_numpy(chunk).float()
            
            # Enhance chunk
            enhanced_chunk = enhance(
                model,
                df_state,
                audio_tensor.unsqueeze(0),  # Add batch dimension [1, T]
                pad=True
            )
            
            enhanced_part = enhanced_chunk.squeeze(0).cpu().numpy()
            
            if i == 0:
                # First chunk - keep all
                enhanced_parts.append(enhanced_part)
            else:
                # Subsequent chunks - blend the overlapping region
                overlap_start = overlap_samples
                blend_region = enhanced_part[:overlap_start]
                
                # Linear cross-fade between previous chunk tail and current chunk head
                fade_in = np.linspace(0, 1, overlap_start)
                fade_out = np.linspace(1, 0, overlap_start)
                
                blended = enhanced_parts[-1][-overlap_start:] * fade_out + blend_region * fade_in
                enhanced_parts[-1] = enhanced_parts[-1][:-overlap_start]
                enhanced_parts[-1] = np.concatenate([enhanced_parts[-1], blended])
                enhanced_parts.append(enhanced_part[overlap_start:])
        
        # Concatenate all chunks
        enhanced_array = np.concatenate(enhanced_parts)
        # Trim to original length in case of rounding
        enhanced_array = enhanced_array[:len(audio)]
        
        print("✅ Processing complete!")

    sf.write(output_path, enhanced_array, sr)
    print(f"💾 Saved enhanced audio to: {output_path}")


def isolate_voice_local(audio_file_path: str, output_dir: str):
    """
    Isolates vocals from the given audio file using DeepFilterNet (local).
    Returns the path to the isolated vocals file.
    
    Args:
        audio_file_path: Path to input audio file
        output_dir: Directory to save output file
        
    Returns:
        str: Path to the enhanced audio file
    """
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate output filename
    input_filename = Path(audio_file_path).stem
    output_path = os.path.join(output_dir, f"{input_filename}_enhanced.wav")
    
    print(f"🎤 Starting voice isolation for: {audio_file_path}")
    
    try:
        # Use DeepFilterNet to remove noise
        remove_noise(audio_file_path, output_path)
        print(f"✅ Voice isolation complete: {output_path}")
        return output_path
    except Exception as e:
        print(f"❌ DeepFilterNet processing failed: {str(e)}")
        raise RuntimeError(f"DeepFilterNet processing failed: {str(e)}")
