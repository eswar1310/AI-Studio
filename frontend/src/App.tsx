import { useEffect, useState } from "react";
import LoginPage from "./components/LoginPage";
import AppShell from "./components/AppShell";
import CreateMusicPage from "./components/CreateMusicPage";
import { HistoryItem } from "./components/HistoryPanel";
import { startGeneration, getResult, getHistory } from "./api";
import Settings from "./components/Settings";
import StudioPage from "./components/StudioPage";
import VoiceIsolatorPage from "./components/VoiceIsolatorPage";

import { useStudio } from "./components/studio/StudioContext";
import ChatAssistant from "./components/ChatAssistant";


const BASE_URL = "";

const toAbs = (u?: string | null): string => {
  if (!u) return "";
  return u.startsWith("http") ? u : `${BASE_URL}${u}`;
};

function App() {
  const [loggedIn, setLoggedIn] = useState(
    !!localStorage.getItem("aimusic.apikey")
  );

  // Apply dark mode by default
  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  }, []);

  // ---------------- STUDIO ----------------
  const { addAsset } = useStudio();

  // ---------------- GENERATION STATE ----------------
  const [prompt, setPrompt] = useState("");
  // const [style, setStyle] = useState("none"); // REMOVED
  const [duration, setDuration] = useState(10);
  const [temperature, setTemperature] = useState(1.0);
  const [topK, setTopK] = useState(250);
  const [topP, setTopP] = useState(0.95);
  const [seed, setSeed] = useState(0);
  const [locked, setLocked] = useState(false);

  const [model, setModel] = useState("facebook/musicgen-small");
  const [mode, setMode] = useState<"music" | "sfx">("music");
  const [usePaid, setUsePaid] = useState(false);

  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ---------------- NAVIGATION ----------------
  const [activePage, setActivePage] =
    useState<"studio" | "create" | "history" | "settings" | "isolate">("create");

  // ---------------- HISTORY ----------------
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load from Backend on mount
  useEffect(() => {
    getHistory()
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;

        const mapped: HistoryItem[] = data.map((d) => {
          // Robust URL fixer for LAN:
          // If URL contains "/api/download", force it to use current BASE_URL.
          // This handles legacy "localhost" paths.
          const fixUrl = (u: string) => {
            if (!u) return "";
            if (u.includes("/api/download/")) {
              const parts = u.split("/api/download/");
              return `${BASE_URL}/api/download/${parts[1]}`;
            }
            // Fallback for full absolute URLs (S3 etc) or other paths
            return u.startsWith("http") ? u : `${BASE_URL}${u}`;
          };

          return {
            id: d.id || d.task_id,
            prompt: d.prompt,
            style: d.style || "Normal",
            model: d.model,
            duration: d.duration || 10,
            createdAt: d.created_at || new Date().toISOString(),
            audioMp3: fixUrl(d.files?.mp3),
            audioWav: fixUrl(d.files?.wav),
            mode: d.mode || "music"
          };
        });
        setHistory(mapped);
      })
      .catch(err => console.error("Failed to fetch history", err));
  }, []);

  // Sync to local storage for backup
  useEffect(() => {
    localStorage.setItem("aimusic.history", JSON.stringify(history));
  }, [history]);

  // ---------------- AUTO MODEL SWITCH ----------------
  useEffect(() => {
    if (mode === "music") {
      setModel("facebook/musicgen-small");
    } else {
      setModel("audioldm2p");
    }
  }, [mode]);

  // ---------------- POLL RESULT ----------------
  useEffect(() => {
    if (!taskId) return;

    const interval = setInterval(async () => {
      try {
        const res = await getResult(taskId);

        if (res.status === "done") {
          clearInterval(interval);

          const mp3Abs = toAbs(res.files?.mp3);
          const wavAbs = toAbs(res.files?.wav);

          setAudioUrl(mp3Abs);
          setStatus("done");
          setLoading(false);

          const item: HistoryItem = {
            id: taskId,
            prompt,
            style: "none",
            model,
            duration,
            createdAt: new Date().toISOString(),
            audioMp3: mp3Abs,
            audioWav: wavAbs,
            mode,
          };

          // ✅ SAVE TO HISTORY (Prevent Duplicates)
          setHistory((prev) => {
            if (prev.some((h) => h.id === taskId)) return prev;
            return [item, ...prev].slice(0, 200);
          });


          // ✅ ADD TO STUDIO ASSET STORE
          addAsset({
            id: taskId,
            name: prompt.slice(0, 40) || "Generated Audio",
            kind: mode === "music" ? "music" : "sfx",
            url: mp3Abs,
            duration,
            source: "generated",
          });
        } else if (res.status === "failed" || res.status === "error") {
          clearInterval(interval);
          setStatus("failed");
          setLoading(false);
        } else {
          setStatus(res.status);
        }
      } catch {
        clearInterval(interval);
        setStatus("error");
        setLoading(false);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [taskId]);

  // ---------------- GENERATE ----------------
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert("Please enter a prompt!");
      return;
    }

    setLoading(true);
    setStatus("starting");

    const fd = new FormData();
    fd.append("prompt", prompt);
    // fd.append("style", style); // REMOVED
    fd.append("duration_sec", String(duration));
    fd.append("temperature", String(temperature));
    fd.append("top_k", String(topK));
    fd.append("top_p", String(topP));
    fd.append("seed", String(seed));
    fd.append("seed_lock", locked ? "true" : "false");

    if (mode === "music") {
      let chosen = model;
      if (!chosen.startsWith("facebook/musicgen")) {
        chosen = "facebook/musicgen-small";
      }
      fd.append("model_name", chosen);
      fd.append("mode", "music");
    }

    if (mode === "sfx") {
      fd.append("model_name", "audioldm2p");
      fd.append("mode", "sfx");
      fd.append("use_paid", String(usePaid));
    }

    try {
      const res = await startGeneration(fd);
      setTaskId(res.task_id);
      setActivePage("create");
    } catch (e: any) {
      alert(`Error starting generation: ${e.message}`);
      setLoading(false);
    }
  };

  // ---------------- PLAY FROM HISTORY ----------------
  const onPlayHistory = (it: HistoryItem) => {
    setAudioUrl(it.audioMp3);
    setPrompt(it.prompt);
    // setStyle(it.style); // REMOVED
    setModel(it.model);
    setDuration(it.duration);
    setMode(it.mode ?? "music");
    setActivePage("create");
  };

  // ---------------- GLOBAL KEYBOARD SHORTCUTS ----------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Page Navigation (1-5)
      if (e.key === "1") setActivePage("create");
      if (e.key === "2") setActivePage("studio");
      if (e.key === "3") setActivePage("isolate");
      if (e.key === "4") setActivePage("history");
      if (e.key === "5") setActivePage("settings");

      // Chat Assistant (/)
      if (e.key === "/") {
        e.preventDefault();
        // Since ChatAssistant might be closed, we need a way to trigger it.
        // For now, let's just use a custom event or let ChatAssistant handle it globally.
        window.dispatchEvent(new CustomEvent("toggle-chat"));
      }

      // Generate (Alt + G)
      if (e.altKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (activePage === "create") {
          handleGenerate();
        } else {
          setActivePage("create");
          // Small delay to ensure state update before calling handleGenerate if needed, 
          // but better to just switch page first.
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePage, handleGenerate]);

  // ---------------- RENDER ----------------
  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }
  return (
    <AppShell
      audioUrl={audioUrl}
      model={model}
      onModelChange={setModel}
      activePage={activePage}
      setActivePage={setActivePage}
      history={history}
      onPlayHistory={onPlayHistory}
      onClearHistory={() => setHistory([])}
      mode={mode}
    >
      {activePage === "studio" && <StudioPage />}

      {activePage === "create" && (
        <CreateMusicPage
          audioUrl={audioUrl}
          prompt={prompt}
          style={""}
          duration={duration}
          temperature={temperature}
          topK={topK}
          topP={topP}
          seed={seed}
          locked={locked}
          loading={loading}
          status={status}
          audioFile={audioFile}
          mode={mode}
          model={model}
          setMode={setMode}
          setModel={setModel}
          setPrompt={setPrompt}
          setStyle={() => { }} // No-op
          setDuration={setDuration}
          setTemperature={setTemperature}
          setTopK={setTopK}
          setTopP={setTopP}
          setSeed={setSeed}
          setLocked={setLocked}
          setAudioFile={setAudioFile}
          usePaid={usePaid}
          setUsePaid={setUsePaid}
          handleGenerate={handleGenerate}
        />
      )}

      {activePage === "isolate" && <VoiceIsolatorPage />}

      {activePage === "history" && (
        <div className="w-full px-10 py-8 text-white">
          <h2 className="text-3xl font-bold mb-6 text-center">
            📀 Your Music History
          </h2>

          {history.length === 0 ? (
            <p className="text-center text-gray-400 mt-10">
              No history yet. Generate some tracks!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((it) => (
                <div
                  key={it.id}
                  className="bg-neutral-800 rounded-xl shadow-md p-4 flex flex-col justify-between"
                >
                  <div>
                    <p className="text-sm text-gray-300 line-clamp-4 mb-2">
                      {it.prompt}
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      {it.model} • {it.duration}s •{" "}
                      {new Date(it.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <button
                      onClick={() => onPlayHistory(it)}
                      className="bg-orange-500 hover:bg-orange-600 text-black font-semibold py-2 px-4 rounded-lg text-sm"
                    >
                      ▶ Play
                    </button>

                    <div className="flex gap-2">
                      <a
                        href={it.audioMp3}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg text-xs"
                      >
                        MP3
                      </a>

                      <a
                        href={it.audioWav}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg text-xs"
                      >
                        WAV
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {activePage === "settings" && <Settings />}

      <ChatAssistant />
    </AppShell>

  );
}

export default App;
