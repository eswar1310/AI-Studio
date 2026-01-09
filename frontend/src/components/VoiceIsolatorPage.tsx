import { useState, useRef } from "react";
import { Mic2, Upload, Music, Check, Headphones, AlertCircle } from "lucide-react";
import { isolateAudio, waitForTask } from "../api";

export default function VoiceIsolatorPage() {
    const [file, setFile] = useState<File | null>(null);
    const [usePaid, setUsePaid] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [result, setResult] = useState<{ wav: string; mp3: string; original: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setResult(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setError(null);
            setResult(null);
        }
    };

    const handleIsolate = async () => {
        if (!file) {
            setError("Please upload an audio file first.");
            return;
        }

        setLoading(true);
        setStatus("Uploading...");
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append("audio_file", file);
        formData.append("use_paid", String(usePaid));

        try {
            const res = await isolateAudio(formData);
            setStatus("Processing...");

            const task = await waitForTask(res.task_id, (s) => setStatus(s));

            setStatus("Done!");
            if (task.files) {
                // Construct full URLs
                // task.files values are like /api/download/...
                // We need to prepend API base if needed, but assuming relative to current page is fine if served same origin, 
                // however api.ts uses absolute calc usually.
                // Let's assume the component can use relative if proxy is set or absolute.
                // The backend returns /api/download/...
                // The frontend listens on localhost:5173 usually, backend on 8000.
                // We need to construct the full URL.
                setResult({
                    wav: task.files.wav,
                    mp3: task.files.mp3,
                    original: task.files.original
                });
            }
        } catch (err: any) {
            setError(err.message || "Isolation failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                        <Mic2 className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Voice Isolator
                    </h2>
                </div>
                <p className="text-gray-400 text-sm ml-14">
                    Separate vocals from music and background noise.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT COLUMN: CONTROLS */}
                <div className="space-y-6">

                    {/* File Upload */}
                    <div
                        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${file ? "border-green-500/50 bg-green-500/5" : "border-white/10 hover:border-white/20 bg-white/5"
                            }`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="audio/*"
                        />

                        {file ? (
                            <div>
                                <Music className="w-10 h-10 text-green-400 mx-auto mb-2" />
                                <p className="font-semibold text-white truncate">{file.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                    className="text-xs text-red-400 mt-2 hover:underline"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                <p className="font-semibold text-gray-300">Click to Upload Audio</p>
                                <p className="text-xs text-gray-500 mt-1">or drag and drop here</p>
                            </div>
                        )}
                    </div>

                    {/* Settings */}
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
                        <label className="flex items-center justify-between cursor-pointer group">
                            <div>
                                <span className="font-semibold text-white block">Pro Mode (ElevenLabs)</span>
                                <span className="text-xs text-gray-500">Higher quality, faster, requires API Key</span>
                            </div>
                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${usePaid ? "bg-blue-500" : "bg-gray-600"}`}
                                onClick={() => setUsePaid(!usePaid)}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${usePaid ? "translate-x-6" : ""}`} />
                            </div>
                        </label>

                        {!usePaid && (
                            <div className="text-xs text-orange-400 bg-orange-400/10 p-2 rounded-lg flex items-center gap-2">
                                <AlertCircle size={12} />
                                Local mode (Free) uses your CPU/GPU and may be slow.
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleIsolate}
                        disabled={loading || !file}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all vinu-glow ${loading || !file
                            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/30 hover:scale-[1.02] glow-blue"
                            }`}
                    >
                        {loading ? status : "Start Isolation"}
                    </button>

                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-sm border border-red-500/20">
                            {error}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: RESULTS */}
                <div>
                    {result ? (
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 h-full animate-fade-in">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Headphones className="text-blue-400" />
                                Results
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2 block">Original Audio</label>
                                    <audio controls src={result.original} className="w-full" />
                                </div>

                                <div className="border-t border-white/10 pt-6">
                                    <label className="text-xs text-blue-400 uppercase tracking-widest font-bold mb-2 block">
                                        Isolated Vocals
                                    </label>
                                    <audio controls src={result.mp3} className="w-full mb-4" />

                                    <div className="flex gap-2">
                                        <a href={result.mp3} download className="flex-1 bg-white/10 hover:bg-white/20 text-white text-center py-2 rounded-lg text-sm transition-colors">
                                            Download MP3
                                        </a>
                                        <a href={result.wav} download className="flex-1 bg-white/10 hover:bg-white/20 text-white text-center py-2 rounded-lg text-sm transition-colors">
                                            Download WAV
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-gray-600">
                            <div className="text-center">
                                <Music className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p>Results will appear here</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
