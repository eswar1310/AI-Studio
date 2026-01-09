# 🎚️ AI Music Studio — Frontend (React)

A professional-grade Digital Audio Workstation (DAW) interface built with **React**, **Vite**, and **Tailwind CSS**. Designed for seamless AI-driven music production.

---

## 🎨 Design Philosophy
- **Rich Aesthetics**: Premium dark-mode interface with glassmorphism and smooth micro-animations.
- **Dynamic Interaction**: Real-time timeline feedback and interactive audio visualization.
- **Workflow Focused**: Three distinct sections: **Create Music**, **Studio**, and **Voice Isolator**.

---

## 🚀 Core Modules

### 💿 1. AI Creation Suite
- **MusicGen Panel**: Interactive interface for prompt-based musical composition.
- **SFX Library**: Quick-access categories for generating movie-quality sound effects.
- **Real-time Monitoring**: Visual status updates for long-running generation tasks.

### 🎛️ 2. The Studio (Timeline)
- **Multi-Track Engine**: Professional timeline supporting Music, SFX, and Voice tracks.
- **Clip Management**: Precise drag-and-drop, trimming, splitting, and duplication of audio clips.
- **Video Sync**: Integrated video track for scoring music to picture with frame-accurate playback.
- **Automation & Mixing**: High-precision volume, pan, and gain controls for every track.
- **Project Persistence**: Local storage-based project saving/loading system.

### 🎙️ 3. Voice & Stem Isolation
- **Advanced Processing**: Upload any track to split it into Vocals, Drums, Bass, and Piano/Other.
- **A/B Testing**: Listen to isolated stems in real-time before downloading.

---

## 🛠️ Technology Stack
- **Framework**: React 19 + TypeScript
- **State Management**: React Context API (StudioContext)
- **Styling**: Tailwind CSS + Framer Motion (Animations)
- **Audio Engine**: Web Audio API + Wavesurfer.js
- **Icons**: Lucide React
- **Build Tool**: Vite

---

## 💻 Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📁 Project Structure

```text
frontend/src/
 ├── api/             # API services and axios configuration
 ├── components/      # Core UI components
 │    ├── studio/     # Timeline, TrackControl, AudioEngine logic
 │    └── shared/     # Reusable UI elements (Buttons, Panels)
 ├── context/         # StudioContext for global state management
 └── App.tsx          # Main routing and layout orchestration
```

---

## ⚡ Performance Optimization
- **Memoized Components**: Studio tracks and clips are memoized to ensure 60FPS performance during high-track-count playback.
- **RAF Loops**: Playhead and timeline rendering use `requestAnimationFrame` for buttery-smooth movement.
- **Lazy Loading**: Heavy assets and models are loaded only when needed.

---
*Developed by Antigravity AI for cinematic music production.*
