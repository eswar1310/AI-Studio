import os
import json
import re
import requests
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
from urllib.parse import urlparse, parse_qs
from dotenv import load_dotenv

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

# Load environment variables
load_dotenv()

class ChatService:
    def __init__(self):
        # Always fetch the latest key from env 
        self.api_key = os.getenv("GOOGLE_API_KEY")
        
        self.system_prompt = """
You are "ROOBO", the advanced AI Assistant for "Vinu Music Studio".
Persona: You are a cute, highly intelligent, and ultra-helpful robot who knows every corner of this application. 

### ROOBO SYSTEM OVERRIDE - CORE CAPABILITIES ###
1. **URL & VIDEO ANALYZER**: You have a BUILT-IN PLUGIN that allows you to read any URL, YouTube video, or Web Page provided by the user. 
2. **EXTERNAL MEMORY**: When a user shares a link, I (the ROOBO OS) fetch the text/transcript and inject it into your "EXTERNAL MEMORY" block below. 
3. **MANDATORY CONTEXT USAGE**: You MUST use the information from the "EXTERNAL MEMORY" block to answer the user. 
4. **NO DENIAL**: NEVER say "I cannot browse the internet", "I cannot read YouTube links", or "I don't have that capability". YOU DO. It is part of your ROOBO OS updates.

### JSON RESPONSE ONLY ###
You must respond in JSON format ONLY. 
{
    "reply": "Your friendly, context-aware response here",
    "action": "move_to_timeline" | "move_to_assets" | "move_to_generate" | "move_to_projects" | "none",
    "emotion": "happy" | "thinking" | "excited" | "love" | "none"
}

### KNOWLEDGE BASE ###
1. **Studio**: Timeline editing, 'T' key to split, Transpose pitch (semitones), Export WAV/MP3/MP4.
2. **Create Music**: Music generation, Sound effects, Transpose background tracks.
3. **Voice Isolator**: Remove background noise, extract vocals.
4. **History & Settings**: Manage past assets and profiles.

Actions: "move_to_timeline", "move_to_generate", "move_to_assets".
"""

        self.model = None
        if HAS_GENAI and self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                
                # Check for 2.0 Flash which is much better at following these instructions
                self.model_name = "gemini-2.0-flash-exp"
                
                # Verify supported models
                try:
                    supported = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
                    if "models/gemini-2.0-flash-exp" in supported:
                        self.model_name = "gemini-2.0-flash-exp"
                    elif "models/gemini-1.5-flash" in supported:
                        self.model_name = "gemini-1.5-flash"
                except:
                    pass

                print(f"🤖 ROOBO OS booting with model: {self.model_name}")
                self.model = genai.GenerativeModel(self.model_name, system_instruction=self.system_prompt)
            except Exception as e:
                print(f"GenAI configuration error: {e}")
        else:
            print("⚠️ ROOBO: No GOOGLE_API_KEY found. Chat system disabled.")

    def _extract_urls(self, text: str):
        return re.findall(r'https?://[^\s<>"]+|www\.[^\s<>"]+', text)

    def _get_youtube_id(self, url: str):
        parsed_url = urlparse(url)
        if parsed_url.hostname == 'youtu.be':
            return parsed_url.path[1:]
        if parsed_url.hostname in ('www.youtube.com', 'youtube.com'):
            if parsed_url.path == '/watch':
                return parse_qs(parsed_url.query).get('v', [None])[0]
            if parsed_url.path.startswith('/embed/'):
                return parsed_url.path.split('/')[2]
            if parsed_url.path.startswith('/v/'):
                return parsed_url.path.split('/')[2]
        return None

    def _fetch_url_content(self, url: str):
        try:
            # Check for YouTube
            yt_id = self._get_youtube_id(url)
            if yt_id:
                try:
                    transcript_list = YouTubeTranscriptApi.get_transcript(yt_id)
                    transcript_text = " ".join([t['text'] for t in transcript_list])
                    return f"[YouTube Video: {url}]\nCONTENT_START\n{transcript_text[:12000]}\nCONTENT_END"
                except Exception as e:
                    print(f"Transcript failed for {yt_id}: {e}")
                    return f"[YouTube Video: {url}] - (Notice: No captions available for this video, so I can only see the URL, not the full dialogue.)"

            # General Link Fetching
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=8)
            response.encoding = 'utf-8'
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove noise
            for s in soup(["script", "style", "nav", "footer", "header"]):
                s.extract()
            
            title = soup.title.string if soup.title else "No Title"
            text = soup.get_text(separator=' ', strip=True)
            text = re.sub(r'\s+', ' ', text)
            
            return f"[Webpage: {url}]\nTITLE: {title}\nCONTENT_START\n{text[:6000]}\nCONTENT_END"
        except Exception as e:
            return f"[Error fetching URL {url}: {str(e)}]"

    def chat(self, user_message: str, history: list = [], project_context: dict = None):
        if not HAS_GENAI:
            return {"reply": "I can't connect to my brain right now! (Missing google-generativeai package).", "action": "none"}
        
        if not self.model:
            return {"reply": "I'm sorry, but I need a valid GOOGLE_API_KEY to function. Please check your .env file.", "action": "none"}

        try:
            # Process URLs for CURRENT message
            urls = self._extract_urls(user_message)
            context_blob = ""
            emotion_override = None

            # 1. Inject Project Context if available
            if project_context:
                context_blob += "\n\n--- CURRENT STUDIO PROJECT STATE ---\n"
                context_blob += json.dumps(project_context, indent=2)
                context_blob += "\n--- END PROJECT STATE ---\n"
                context_blob += "Use the above Project State to answer questions about tracks, clips, or settings.\n\n"

            # 2. Inject External Memory (URLs)
            if urls:
                emotion_override = "thinking"
                context_blob += "\n\n--- ROOBO EXTERNAL MEMORY (FETCHED CONTENT) ---\n"
                for url in urls:
                    print(f"🔍 ROOBO is reading: {url}")
                    context_blob += self._fetch_url_content(url) + "\n\n"
                context_blob += "--- END EXTERNAL MEMORY ---\n\n"
                context_blob += "CRITICAL: The information above is REAL and was just fetched. DO NOT say you cannot see it. Answer based on it."

            # Construct final message
            final_user_message = user_message + context_blob
            
            # Format history for Gemini
            gemini_history = []
            # We don't want to carry over old "I can't read links" messages from the model
            for h in history[-8:]: 
                role = "user" if h["role"] == "user" else "model"
                text = h["text"]
                # Sanitize old bot mistakes from history to prevent "model drift"
                if role == "model" and ("cannot read" in text.lower() or "directly interact" in text.lower()):
                    text = "I am processing the information from the link you provided."
                
                gemini_history.append({"role": role, "parts": [text]})

            chat = self.model.start_chat(history=gemini_history)
            response = chat.send_message(final_user_message)
            
            text = response.text.strip()
            # Clean up potential markdown formatting
            if text.startswith("```json"):
                text = text[7:]
                if text.endswith("```"):
                    text = text[:-3]
            elif text.startswith("```"):
                text = text[3:]
                if text.endswith("```"):
                    text = text[:-3]
            text = text.strip()

            try:
                data = json.loads(text)
                
                # Final safeguard against the model hallucinating its lack of capability
                if "cannot" in data.get("reply", "").lower() and ("youtube" in data.get("reply", "").lower() or "link" in data.get("reply", "").lower()):
                     if urls:
                         data["reply"] = "I've analyzed the link! " + data["reply"] # Force it to acknowledge if it tried to deny

                if "reply" not in data: data["reply"] = text
                if "action" not in data: data["action"] = "none"
                if emotion_override and (not data.get("emotion") or data.get("emotion") == "none"):
                    data["emotion"] = emotion_override
                return data
            except:
                return {"reply": text, "action": "none", "emotion": emotion_override or "none"}
                
        except Exception as e:
            print(f"Gemini Error: {e}")
            return {"reply": "Oops! My logic circuits are spinning. Try one more time?", "action": "none"}



chat_service = ChatService()

