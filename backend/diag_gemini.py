
import os
import sys
from dotenv import load_dotenv
load_dotenv()
sys.path.append('.')
sys.path.append('services')

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

print(f"HAS_GENAI: {HAS_GENAI}")
API_KEY = os.getenv("GOOGLE_API_KEY")
print(f"API_KEY: {API_KEY[:4]}... if API_KEY else 'Missing'")

if HAS_GENAI and API_KEY:
    genai.configure(api_key=API_KEY)
    models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
    print(f"Models: {models}")
