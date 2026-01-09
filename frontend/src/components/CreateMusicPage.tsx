import { useRef } from "react";
import { Wand2, Music, Volume2, Sparkles, Sliders, Download } from "lucide-react";
import { startGeneration, getSfxPromptLibrary } from "../api";
import { useEffect, useState } from "react";

export interface CreateMusicProps {
  audioUrl: string | null;
  prompt: string;
  style: string;
  duration: number;
  temperature: number;
  topK: number;
  topP: number;
  seed: number;
  locked: boolean;
  loading: boolean;
  status: string;
  audioFile: File | null;

  mode: "music" | "sfx";
  model: string;

  setPrompt: (v: string) => void;
  setStyle: (v: string) => void;
  setDuration: (v: number) => void;
  setTemperature: (v: number) => void;
  setTopK: (v: number) => void;
  setTopP: (v: number) => void;
  setSeed: (v: number) => void;
  setLocked: (v: boolean) => void;
  setAudioFile: (f: File | null) => void;
  setMode: (v: "music" | "sfx") => void;
  setModel: (v: string) => void;

  usePaid?: boolean;
  setUsePaid?: (v: boolean) => void;

  handleGenerate: () => void;
}

export default function CreateMusicPage(props: CreateMusicProps) {
  const {
    audioUrl,
    prompt,
    style,
    duration,
    temperature,
    topK,
    topP,
    seed,
    locked,
    loading,
    status,
    mode,
    model,
    setPrompt,
    setStyle,
    setDuration,
    setTemperature,
    setTopK,
    setTopP,
    setSeed,
    setLocked,
    setMode,
    setModel,
    usePaid,
    setUsePaid,
    handleGenerate,
  } = props;

  // SFX Library State
  const [sfxLibrary, setSfxLibrary] = useState<Record<string, any>>({});
  const [sfxCategory, setSfxCategory] = useState("");
  const [sfxSubCategory, setSfxSubCategory] = useState("");
  const [sfxItem, setSfxItem] = useState("");

  // Load Library on Mount
  useEffect(() => {
    getSfxPromptLibrary().then((data) => {
      console.log("CreateMusicPage: Loaded SFX Library", Object.keys(data).length);
      setSfxLibrary(data);
    });
  }, []);

  // Helper: format key to readable string
  const formatKey = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  // Reconstruct WAV URL if possible (fallback for Create page)
  const wavUrl = audioUrl ? audioUrl.replace("audio.mp3", "audio.wav") : null;

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
            <Wand2 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Generate Audio
          </h2>
        </div>
        <p className="text-gray-400 text-sm ml-14">
          Create professional music and sound effects with AI
        </p>
      </div>

      {/* MODE SWITCH */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setMode("music")}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all ${mode === "music"
            ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/30 scale-105"
            : "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10"
            }`}
        >
          <Music size={20} />
          Music Generation
        </button>

        <button
          onClick={() => setMode("sfx")}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all ${mode === "sfx"
            ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/30 scale-105"
            : "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10"
            }`}
        >
          <Volume2 size={20} />
          Sound Effects
        </button>
      </div>

      {/* Main Form */}
      <div className="space-y-6 bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">

        {/* SFX LIBRARY SELECTOR (Create Page Version) */}
        {mode === "sfx" && (
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
            <label className="text-sm text-orange-400 font-bold uppercase tracking-wider block mb-3">SFX Prompt Library</label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category */}
              <select
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-gray-300 outline-none focus:border-orange-500 transition-colors"
                value={sfxCategory}
                onChange={(e) => {
                  setSfxCategory(e.target.value);
                  setSfxSubCategory("");
                  setSfxItem("");
                }}
              >
                <option value="">-- Select Category --</option>
                {Object.keys(sfxLibrary).map(cat => (
                  <option key={cat} value={cat}>{formatKey(cat)}</option>
                ))}
              </select>

              {/* SubCategory */}
              <select
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-gray-300 outline-none focus:border-orange-500 transition-colors disabled:opacity-50"
                value={sfxSubCategory}
                disabled={!sfxCategory}
                onChange={(e) => {
                  setSfxSubCategory(e.target.value);
                  setSfxItem("");
                }}
              >
                <option value="">-- Select Type --</option>
                {sfxCategory && Object.keys(sfxLibrary[sfxCategory] || {}).map(sub => (
                  <option key={sub} value={sub}>{formatKey(sub)}</option>
                ))}
              </select>

              {/* Item */}
              <select
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-gray-300 outline-none focus:border-orange-500 transition-colors disabled:opacity-50"
                value={sfxItem}
                disabled={!sfxSubCategory}
                onChange={(e) => {
                  const key = e.target.value;
                  setSfxItem(key);
                  if (key && sfxLibrary[sfxCategory]?.[sfxSubCategory]?.[key]) {
                    setPrompt(sfxLibrary[sfxCategory][sfxSubCategory][key]);
                  }
                }}
              >
                <option value="">-- Select Sound --</option>
                {sfxSubCategory && Object.keys(sfxLibrary[sfxCategory]?.[sfxSubCategory] || {}).map(itm => (
                  <option key={itm} value={itm}>{formatKey(itm)}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* PROMPT */}
        <div>
          <label className="flex items-center gap-2 font-semibold text-white mb-2">
            <Sparkles size={16} className="text-orange-400" />
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={mode === "music" ? "e.g., Epic orchestral music with powerful drums" : "e.g., Thunder and rain sound effect"}
            className="w-full p-4 rounded-xl bg-black/40 text-white border border-white/10 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-gray-500"
            rows={3}
          />
        </div>

        {/* DURATION */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="font-semibold text-white">Duration</label>
            <span className="text-orange-400 font-mono text-sm">{duration}s</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1s</span>
            <span>20s</span>
          </div>
        </div>

        {/* MODEL SELECTOR */}
        {/* Hide AI Model if using Paid SFX */}
        {!(mode === "sfx" && usePaid) && (
          <div>
            <label className="font-semibold text-white mb-2 block">AI Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/40 text-white border border-white/10 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer"
            >
              {mode === "music" ? (
                <>
                  <option value="facebook/musicgen-small">MusicGen Small (Fast)</option>
                  <option value="facebook/musicgen-medium">MusicGen Medium (Quality)</option>
                  <option value="facebook/musicgen-melody">MusicGen Melody</option>
                </>
              ) : (
                <>
                  <option value="audioldm2p">AudioLDM 2 (Best Quality)</option>
                  <option value="audioldmp">AudioLDM 1</option>
                  <option value="audioldm-s-full-v2">AudioLDM Lite (Fast)</option>
                </>
              )}
            </select>
          </div>
        )}

        {/* SFX PAID TOGGLE */}
        {mode === "sfx" && setUsePaid && (
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">Pro Mode (ElevenLabs)</span>
              <span className="text-xs text-gray-400">Higher quality sound effects</span>
            </div>
            <div
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${usePaid ? "bg-orange-500" : "bg-gray-600"}`}
              onClick={() => setUsePaid(!usePaid)}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${usePaid ? "translate-x-6" : ""}`} />
            </div>
          </div>
        )}

        {/* ADVANCED SETTINGS */}
        {mode === "music" && (
          <details className="group">
            <summary className="flex items-center gap-2 font-semibold text-white cursor-pointer hover:text-orange-400 transition-colors">
              <Sliders size={16} />
              Advanced Settings
              <span className="ml-auto text-xs text-gray-500 group-open:hidden">Click to expand</span>
            </summary>

            <div className="mt-4 space-y-4 pl-6 border-l-2 border-white/10">
              {/* Temperature */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-300">Temperature</label>
                  <span className="text-orange-400 font-mono text-sm">{temperature.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">Controls creativity (higher = more random)</p>
              </div>

              {/* Top-K and Top-P */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Top-K</label>
                  <input
                    type="number"
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    className="w-full p-2 bg-black/40 text-white rounded-lg border border-white/10 focus:border-orange-500/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Top-P</label>
                  <input
                    type="number"
                    step={0.01}
                    value={topP}
                    onChange={(e) => setTopP(Number(e.target.value))}
                    className="w-full p-2 bg-black/40 text-white rounded-lg border border-white/10 focus:border-orange-500/50"
                  />
                </div>
              </div>
            </div>
          </details>
        )}
      </div>

      {/* GENERATE BUTTON */}
      <button
        onClick={handleGenerate}
        disabled={status === "processing" || !prompt}
        className={`w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all vinu-glow ${status === "processing" || !prompt
          ? "bg-gray-700 text-gray-500 cursor-not-allowed"
          : "bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-lg shadow-orange-500/30 hover:scale-[1.02] glow-orange"
          }`}
      >
        {status === "processing" ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating Magic...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Wand2 size={20} />
            Generate {mode === "music" ? "Music" : "Sound Effect"}
          </span>
        )}
      </button>

      {/* STATUS & RESULTS */}
      {(status || audioUrl) && (
        <div className="mt-6 p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status === 'done' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-blue-500 animate-pulse'}`} />
              <span className="text-sm font-medium text-gray-300 uppercase tracking-wider">
                Status: <span className={status === 'done' ? 'text-green-400' : 'text-blue-400'}>{status}</span>
              </span>
            </div>
          </div>

          {status === "done" && audioUrl && (
            <div className="space-y-4">
              <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                <audio src={audioUrl} controls className="w-full h-10" />
              </div>

              <div className="flex gap-3">
                <a
                  href={audioUrl}
                  download="generated_music.mp3"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all border border-white/10"
                >
                  <Download size={18} />
                  Download MP3
                </a>
                {wavUrl && (
                  <a
                    href={wavUrl}
                    download="generated_music.wav"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all border border-white/10"
                  >
                    <Download size={18} />
                    Download WAV
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

