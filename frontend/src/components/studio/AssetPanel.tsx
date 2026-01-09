import { useState, useEffect, useRef } from "react";
import { Upload, Volume2, Video, Trash2, Wand2, Loader2, Folder, Plus, Edit2, Copy, Mic, Square } from "lucide-react";
import { useStudio } from "./StudioContext";
import { StudioAsset } from "./studio.types";
import { startGeneration, waitForTask, getSfxPromptLibrary } from "../../api";

// Helper for ID generation
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export default function AssetPanel() {
    const {
        assets, addAsset, removeAsset, clearAssets, setAssetPanelCollapsed,
        projects, currentProjectId, switchProject, createProject, deleteProject, renameProject, duplicateProject,
        tracks, addClip, selectedClipIds
    } = useStudio();

    const [tab, setTab] = useState<"assets" | "generate" | "projects">("assets");

    // Generation State
    const [genPrompt, setGenPrompt] = useState("");
    const [genDuration, setGenDuration] = useState(10);
    const [genMode, setGenMode] = useState<"music" | "sfx" | "record">("music");
    const [genModel, setGenModel] = useState("facebook/musicgen-small");
    const [generating, setGenerating] = useState(false);
    const [status, setStatus] = useState("");

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordTime, setRecordTime] = useState(0);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<any>(null);
    const startTimeRef = useRef<number>(0);

    // SFX Library State
    const [sfxLibrary, setSfxLibrary] = useState<Record<string, any>>({});
    const [sfxCategory, setSfxCategory] = useState("");
    const [sfxSubCategory, setSfxSubCategory] = useState("");
    const [sfxItem, setSfxItem] = useState("");

    // Load Library
    useEffect(() => {
        if (!localStorage.getItem("aimusic.apikey")) {
            localStorage.setItem("aimusic.apikey", "PTG2025");
        }
        getSfxPromptLibrary().then(data => {
            setSfxLibrary(data);
        });
    }, []);

    // Helper: format key to readable string
    const formatKey = (key: string) => {
        return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    // Update model options when mode changes
    const getModelOptions = () => {
        if (genMode === "music") {
            return [
                { value: "facebook/musicgen-small", label: "MusicGen Small (Fast)" },
                { value: "facebook/musicgen-medium", label: "MusicGen Medium (Quality)" },
                { value: "facebook/musicgen-melody", label: "MusicGen Melody" },
            ];
        } else {
            return [
                { value: "audioldm2p", label: "AudioLDM 2 (Best)" },
                { value: "audioldmp", label: "AudioLDM 1" },
                { value: "audioldm-s-full-v2", label: "AudioLDM Lite (Fast)" },
            ];
        }
    };

    // Reset model when mode changes
    const onGenModeChange = (newMode: "music" | "sfx" | "record") => {
        if (isRecording) stopRecording();
        setGenMode(newMode);
        if (newMode === "music") setGenModel("facebook/musicgen-small");
        else if (newMode === "sfx") setGenModel("audioldm2p");
    };

    const startRecording = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Microphone access is not supported by your browser or in this connection.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            recorderRef.current = recorder;
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                const finalDuration = (Date.now() - startTimeRef.current) / 1000;
                const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
                const url = URL.createObjectURL(blob);
                const asset: StudioAsset = {
                    id: generateId(),
                    name: `Recording ${new Date().toLocaleTimeString()}`,
                    url,
                    duration: Math.round(finalDuration * 10) / 10,
                    kind: "voice",
                    source: "uploaded",
                };
                addAsset(asset);
                setIsRecording(false);
                setRecordTime(0);
                setTab("assets");
                stream.getTracks().forEach(track => track.stop());
            };
            recorder.start();
            startTimeRef.current = Date.now();
            setIsRecording(true);
            setRecordTime(0);
            timerRef.current = setInterval(() => {
                setRecordTime(t => t + 1);
            }, 1000);
        } catch (err) {
            console.error("Mic access denied", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
            recorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const onDragStart = (e: React.DragEvent<HTMLDivElement>, assetId: string) => {
        e.dataTransfer.clearData();
        e.dataTransfer.setData("text/plain", assetId);
        e.dataTransfer.effectAllowed = "copy";
    };

    const onUpload = (file: File) => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        const isVideo = file.type.startsWith("video/");
        const asset: StudioAsset = {
            id: generateId(),
            name: file.name,
            url,
            duration: 0,
            kind: isVideo ? "video" : "music",
            source: "uploaded",
        };
        addAsset(asset);
    };

    const handleGenerate = async () => {
        if (!genPrompt.trim()) return;
        setGenerating(true);
        setStatus("Queuing...");
        try {
            const fd = new FormData();
            fd.append("prompt", genPrompt);
            fd.append("mode", genMode);
            fd.append("duration_sec", String(genDuration));
            fd.append("model_name", genModel);
            const res = await startGeneration(fd);
            const taskId = res.task_id;
            setStatus("Processing...");
            const result = await waitForTask(taskId, (s) => setStatus(s));
            if (result.files) {
                const asset: StudioAsset = {
                    id: result.task_id,
                    name: genPrompt,
                    url: result.files.mp3,
                    duration: genDuration,
                    kind: genMode === "music" ? "music" : "sfx",
                    source: "generated",
                };
                addAsset(asset);
                setTab("assets");
                setGenPrompt("");
            }
        } catch (e) {
            console.error("Generation failed", e);
        } finally {
            setGenerating(false);
            setStatus("");
        }
    };

    const iconFor = (asset: StudioAsset) => {
        if (asset.kind === "video") return <Video size={14} className="text-purple-400 shrink-0" />;
        if (asset.kind === "sfx") return <Wand2 size={14} className="text-blue-400 shrink-0" />;
        if (asset.kind === "voice") return <Mic size={14} className="text-red-400 shrink-0" />;
        return <Volume2 size={14} className="text-gray-400 shrink-0" />;
    };

    return (
        <div id="asset-panel" className="w-64 h-full border-r border-white/10 bg-black/50 flex flex-col">
            <div className="flex border-b border-white/10">
                <button onClick={() => setTab("assets")} className={`flex-1 py-3 text-[10px] font-bold transition uppercase tracking-tight ${tab === "assets" ? "text-white bg-white/5 border-b-2 border-orange-500" : "text-gray-400 hover:text-white"}`}>Library</button>
                <button onClick={() => setTab("projects")} className={`flex-1 py-3 text-[10px] font-bold transition uppercase tracking-tight ${tab === "projects" ? "text-white bg-white/5 border-b-2 border-orange-500" : "text-gray-400 hover:text-white"}`}>Projects</button>
                <button onClick={() => setTab("generate")} className={`flex-1 py-3 text-[10px] font-bold transition uppercase tracking-tight ${tab === "generate" ? "text-white bg-white/5 border-b-2 border-orange-500" : "text-gray-400 hover:text-white"}`}>Generate</button>
                <button onClick={() => setAssetPanelCollapsed(true)} className="px-3 border-l text-gray-400 hover:text-white transition flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></button>
            </div>

            {tab === "assets" && (
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-2 border-b border-white/5 flex justify-between items-center">
                        <button onClick={() => { if (confirm("Delete all assets?")) clearAssets(); }} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded transition"><Trash2 size={14} /></button>
                        <label className="flex items-center gap-2 text-xs cursor-pointer text-gray-400 hover:text-white transition">
                            <Upload size={14} /> Upload File
                            <input type="file" accept="audio/*,video/*" hidden onChange={(e) => { if (e.target.files && e.target.files[0]) { onUpload(e.target.files[0]); e.target.value = ""; } }} />
                        </label>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {assets.map((asset) => (
                            <div key={asset.id} draggable onDragStart={(e) => onDragStart(e, asset.id)} className="flex items-center gap-2 p-2 rounded-md bg-white/5 hover:bg-white/10 cursor-grab active:cursor-grabbing border border-white/10 select-none group">
                                {iconFor(asset)}
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-xs truncate">{asset.name}</div>
                                    <div className="text-[10px] text-gray-400 uppercase">
                                        {asset.source} · {asset.kind} · {Math.round(asset.duration)}s
                                        {asset.detectedBpm && ` · ${asset.detectedBpm} BPM`}
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); if (confirm("Remove?")) removeAsset(asset.id); }} className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === "projects" && (
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-3 border-b border-white/5 flex justify-between items-center bg-black/20">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Folder size={12} className="text-orange-500" />Projects</span>
                        <button onClick={() => { const name = prompt("Project Name:", "New Project"); if (name) createProject(name); }} className="p-1 rounded bg-orange-600 hover:bg-orange-500 text-white transition flex items-center gap-1 px-2 text-[10px] font-bold"><Plus size={12} />NEW</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {projects.map((p) => (
                            <div key={p.id} onClick={() => switchProject(p.id)} className={`group p-3 rounded-lg border transition cursor-pointer flex items-center gap-3 ${p.id === currentProjectId ? "bg-orange-500/10 border-orange-500/50 shadow-lg" : "bg-white/5 border-white/5 hover:border-white/20"}`}>
                                <div className={`p-2 rounded-md ${p.id === currentProjectId ? "bg-orange-500 text-white" : "bg-black/20 text-gray-400"}`}><Folder size={14} /></div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-white truncate">{p.name}</div>
                                    <div className="text-[10px] text-gray-400">{p.tracks.length} tracks • {Math.round(p.duration || 0)}s</div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={(e) => { e.stopPropagation(); const n = prompt("Rename:", p.name); if (n) renameProject(p.id, n); }} className="p-1.5 text-gray-400 hover:text-white rounded"><Edit2 size={12} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); duplicateProject(p.id); }} className="p-1.5 text-gray-400 hover:text-white rounded"><Copy size={12} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete?")) deleteProject(p.id); }} className="p-1.5 text-gray-400 hover:text-red-400 rounded"><Trash2 size={12} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === "generate" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs text-gray-400 font-medium">Mode</label>
                        <div className="flex bg-black/20 rounded-md p-1 border border-white/10">
                            {["music", "sfx", "record"].map((m) => (
                                <button key={m} onClick={() => onGenModeChange(m as any)} className={`flex-1 py-1.5 text-xs rounded transition uppercase tracking-tighter ${genMode === m ? "bg-white/10 text-white" : "text-gray-500"}`}>{m}</button>
                            ))}
                        </div>
                    </div>

                    {genMode !== "record" ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-medium">Prompt</label>
                                <textarea value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} placeholder={`Describe the ${genMode}...`} className="w-full h-24 bg-black/20 border border-white/10 rounded-md p-2 text-sm text-white focus:outline-none focus:border-orange-500 transition resize-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-medium">Model</label>
                                <select value={genModel} onChange={(e) => setGenModel(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-md p-2 text-xs text-white focus:outline-none focus:border-orange-500">
                                    {getModelOptions().map((opt) => (<option key={opt.value} value={opt.value} className="bg-[#111318]">{opt.label}</option>))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-gray-400"><span>Duration</span><span>{genDuration}s</span></div>
                                <input type="range" min={5} max={30} step={5} value={genDuration} onChange={(e) => setGenDuration(Number(e.target.value))} className="w-full accent-orange-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                            </div>
                            <button onClick={handleGenerate} disabled={generating || !genPrompt.trim()} className="w-full py-2.5 rounded-md bg-orange-600 hover:bg-orange-500 disabled:bg-white/5 disabled:text-gray-500 text-sm font-medium text-white transition flex items-center justify-center gap-2 mt-4">
                                {generating ? <><Loader2 size={16} className="animate-spin" />{status || "Generating..."}</> : <><Wand2 size={16} />Generate</>}
                            </button>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-8">
                            <div onClick={isRecording ? stopRecording : startRecording} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer ${isRecording ? "bg-red-500 animate-pulse" : "bg-orange-600 hover:bg-orange-500"}`}>
                                {isRecording ? <Square size={32} className="text-white fill-white" /> : <Mic size={32} className="text-white" />}
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-mono text-white mb-1">{formatTime(recordTime)}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase">{isRecording ? "Recording..." : "Tap to record"}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
