import os
import requests
import json

ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"

def generate_sfx(prompt: str, duration_seconds: float = 10):
    """
    Generates SFX using ElevenLabs API.
    Returns the binary audio content.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise ValueError("ELEVENLABS_API_KEY is not set.")

    url = f"{ELEVENLABS_API_URL}/sound-generation"
    
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }
    
    data = {
        "text": prompt,
        "duration_seconds": duration_seconds,
        "prompt_influence": 0.3 # Default value
    }
    
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code != 200:
        raise RuntimeError(f"ElevenLabs SFX generation failed {response.status_code}: {response.text}")
        
    return response.content

def isolate_voice(audio_file_path: str):
    """
    Isolates voice using ElevenLabs API (Audio Isolation).
    Returns the binary audio content of the isolated voice.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise ValueError("ELEVENLABS_API_KEY is not set.")

    url = f"{ELEVENLABS_API_URL}/audio-isolation"
    
    headers = {
        "xi-api-key": api_key
    }
    
    files = {
        'audio': open(audio_file_path, 'rb')
    }
    
    response = requests.post(url, headers=headers, files=files)
    
    if response.status_code != 200:
        raise RuntimeError(f"ElevenLabs Voice Isolation failed {response.status_code}: {response.text}")
        
    return response.content
