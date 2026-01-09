import React, { useRef, useEffect, useState, useCallback } from "react";
import { Play, Pause, Upload, Download, Loader2, Trash2, Plus, Minus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { useStudio } from "./studio/StudioContext";
import AssetPanel from "./studio/AssetPanel";
import TimelineArea from "./studio/TimelineArea";
import VideoTrack from "./studio/VideoTrack";
import { exportMixToWav } from "./studio/audioExport";
import { exportVideo } from "./studio/videoExport";
import { Video as VideoIcon } from "lucide-react";

function StudioPage() {
    const {
        playing,
        setPlaying,
        currentTime,
        setCurrentTime,
        duration,
        setDuration,
        zoom,
        setZoom,
        tracks,
        videoUrl,
        setVideoUrl,
        reorderTrack,
        isAssetPanelCollapsed,
        setAssetPanelCollapsed,
        isVideoAreaCollapsed,
        setVideoAreaCollapsed,
        bpm,
        setBpm,
        selectedTrackId,
        updateTrackTranspose,
        resetBpmToTrack,
        seek,
    } = useStudio();

    const [bpmMode, setBpmMode] = useState<'manual' | 'follow'>('manual');

    const [exporting, setExporting] = useState(false);
    const [exportingVideo, setExportingVideo] = useState(false);

    /* ======================================================
       LOAD VIDEO
    ====================================================== */

    const onVideoSelect = (file: File) => {
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
    };

    const onVideoDuration = (d: number) => {
        setDuration(d);
    };

    const removeVideo = () => {
        setVideoUrl(null);
        setDuration(120);
    };

    /* ======================================================
       EXPORT
    ====================================================== */

    const handleExport = async () => {
        if (tracks.length === 0) return;
        setExporting(true);
        try {
            const blob = await exportMixToWav(tracks, duration);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "studio_mix.wav";
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Export failed", e);
            alert("Export failed. See console.");
        } finally {
            setExporting(false);
        }
    };

    const handleExportVideo = async () => {
        if (!videoUrl) return;
        setExportingVideo(true);
        try {
            const blob = await exportVideo(tracks, videoUrl, duration);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "studio_video.mp4";
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Video export failed", e);
            alert("Video export failed.");
        } finally {
            setExportingVideo(false);
        }
    };

    /* ======================================================
       KEYBOARD SHORTCUTS
    ====================================================== */

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Ignore if typing in input/textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // Space: Play/Pause
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                setPlaying(!playing);
            }

            // [ : Toggle Asset Panel
            if (e.key === '[') {
                e.preventDefault();
                setAssetPanelCollapsed(!isAssetPanelCollapsed);
            }

            // ] : Toggle Video Area
            if (e.key === ']') {
                e.preventDefault();
                setVideoAreaCollapsed(!isVideoAreaCollapsed);
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

            // Ctrl/Cmd+E: Export WAV or MP4
            if (ctrlOrCmd && e.key.toLowerCase() === 'e') {
                e.preventDefault();
                if (e.shiftKey) handleExportVideo(); // Ctrl/Cmd+Shift+E: Export Video
                else handleExport(); // Ctrl/Cmd+E: Export WAV
            }

            // Ctrl+L: Load Video
            if (e.ctrlKey && e.key.toLowerCase() === 'l') {
                e.preventDefault();
                document.getElementById('studio-video-input')?.click();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [playing, setPlaying, isAssetPanelCollapsed, isVideoAreaCollapsed, handleExport, handleExportVideo, setAssetPanelCollapsed, setVideoAreaCollapsed]);

    // Auto-sync BPM if in follow mode
    useEffect(() => {
        if (bpmMode === 'follow') {
            resetBpmToTrack(selectedTrackId);
        }
    }, [selectedTrackId, bpmMode, resetBpmToTrack, tracks]); // Added tracks to trigger follow on new clips

    /* ======================================================
       UI
    ====================================================== */

    return (
        <div className="w-full h-full flex bg-[#0a0c12] text-white overflow-hidden">

            {/* ================= LEFT : ASSETS ================= */}
            {!isAssetPanelCollapsed && <AssetPanel />}

            {/* ================= RIGHT : STUDIO ================= */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* ===== VIDEO PREVIEW ===== */}
                {!isVideoAreaCollapsed && (
                    <div className="w-full h-56 bg-black border-b border-white/10 flex justify-center shrink-0 relative z-10">
                        <VideoTrack
                            src={videoUrl}
                            playing={playing}
                            playhead={currentTime}
                            onDuration={onVideoDuration}
                        />
                    </div>
                )}

                {/* ===== TRANSPORT BAR ===== */}
                <div className="h-14 border-b border-white/10 flex items-center justify-between px-3 bg-[#0d0f14] shrink-0 z-20 shadow-lg">

                    {/* LEFT GROUP: VIEW TOGGLES & TRANSPORT */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white/5 rounded p-0.5 border border-white/5">
                            <button
                                onClick={() => setAssetPanelCollapsed(!isAssetPanelCollapsed)}
                                className={`p-1.5 rounded-sm transition ${isAssetPanelCollapsed ? "bg-orange-500/20 text-orange-400" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                                title="Toggle Asset Panel ([)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="9" x2="9" y1="3" y2="21" /></svg>
                            </button>
                            <button
                                onClick={() => setVideoAreaCollapsed(!isVideoAreaCollapsed)}
                                className={`p-1.5 rounded-sm transition ${isVideoAreaCollapsed ? "bg-orange-500/20 text-orange-400" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                                title="Toggle Video Area (])"
                            >
                                <VideoIcon size={16} />
                            </button>
                        </div>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        {/* TRANSPORT CONTROLS */}
                        <div className="flex items-center gap-0.5 bg-white/5 rounded-full px-1 py-0.5 border border-white/5">
                            <button onClick={() => seek(Math.max(0, currentTime - 10))} className="p-1.5 text-gray-500 hover:text-white transition" title="Rewind 10s"><ChevronsLeft size={16} /></button>
                            <button onClick={() => seek(Math.max(0, currentTime - 1))} className="p-1.5 text-gray-500 hover:text-white transition" title="Back 1s"><ChevronLeft size={16} /></button>

                            <button
                                onClick={() => setPlaying(!playing)}
                                className={`
                                    mx-1 w-9 h-9 rounded-full flex items-center justify-center transition shadow-lg
                                    ${playing ? "bg-red-500 hover:bg-red-600 text-white" : "bg-orange-500 hover:bg-orange-600 text-black"}
                                `}
                            >
                                {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                            </button>

                            <button onClick={() => seek(Math.min(duration, currentTime + 1))} className="p-1.5 text-gray-500 hover:text-white transition" title="Forward 1s"><ChevronRight size={16} /></button>
                            <button onClick={() => seek(Math.min(duration, currentTime + 10))} className="p-1.5 text-gray-500 hover:text-white transition" title="Fast Forward 10s"><ChevronsRight size={16} /></button>
                        </div>
                    </div>

                    {/* CENTER GROUP: TIME & TEMPO */}
                    <div className="flex items-center gap-4 bg-white/5 py-1 px-4 rounded-full border border-white/5 shadow-inner">
                        {/* TIME DISPLAY */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-mono font-bold text-orange-400 w-[60px] text-right">
                                {new Date(currentTime * 1000).toISOString().substr(14, 5)}
                            </span>
                            <span className="text-[10px] text-gray-600 font-mono">/</span>
                            <span className="text-[10px] text-gray-500 font-mono">
                                {new Date(duration * 1000).toISOString().substr(14, 5)}
                            </span>
                        </div>

                        <div className="w-px h-4 bg-white/10" />

                        {/* BPM & SYNC */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">BPM</span>
                                <input
                                    type="number"
                                    value={bpm}
                                    onChange={(e) => {
                                        setBpm(Number(e.target.value));
                                        setBpmMode('manual');
                                    }}
                                    className="w-10 bg-transparent text-sm font-bold font-mono focus:outline-none text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>

                            <div className="flex bg-black/40 rounded p-0.5 border border-white/5">
                                <button
                                    onClick={() => setBpmMode('follow')}
                                    className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase transition ${bpmMode === 'follow' ? "bg-orange-500 text-black" : "text-gray-500 hover:text-gray-300"}`}
                                >
                                    Follow
                                </button>
                                <button
                                    onClick={() => setBpmMode('manual')}
                                    className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase transition ${bpmMode === 'manual' ? "bg-orange-500 text-black" : "text-gray-500 hover:text-gray-300"}`}
                                >
                                    Manual
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT GROUP: PITCH & ACTIONS */}
                    <div className="flex items-center gap-3">
                        {/* TRANSPOSE (ST) */}
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded border border-white/5 group relative">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">ST</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        if (!selectedTrackId) return;
                                        const track = tracks.find(t => t.id === selectedTrackId);
                                        if (track) updateTrackTranspose(track.id, (track.transpose || 0) - 1);
                                    }}
                                    disabled={!selectedTrackId}
                                    className={`hover:text-white transition ${selectedTrackId ? "text-gray-400" : "text-gray-800 cursor-not-allowed"}`}
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="text-xs font-bold font-mono w-4 text-center text-orange-400">
                                    {selectedTrackId ? (tracks.find(t => t.id === selectedTrackId)?.transpose || 0) : 0}
                                </span>
                                <button
                                    onClick={() => {
                                        if (!selectedTrackId) return;
                                        const track = tracks.find(t => t.id === selectedTrackId);
                                        if (track) updateTrackTranspose(track.id, (track.transpose || 0) + 1);
                                    }}
                                    disabled={!selectedTrackId}
                                    className={`hover:text-white transition ${selectedTrackId ? "text-gray-400" : "text-gray-800 cursor-not-allowed"}`}
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                            {!selectedTrackId && (
                                <div className="absolute top-12 right-0 bg-black/90 text-[10px] px-2 py-1 rounded-sm opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 border border-white/10 shadow-2xl">
                                    Select a track to transpose
                                </div>
                            )}
                        </div>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        {/* ACTIONS */}
                        <div className="flex items-center gap-1">
                            <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded transition cursor-pointer" title="Load Video">
                                <Upload size={14} />
                                <span>Load</span>
                                <input id="studio-video-input" type="file" accept="video/*" hidden onChange={(e) => e.target.files && onVideoSelect(e.target.files[0])} />
                            </label>

                            <div className="flex items-center bg-orange-500/10 rounded border border-orange-500/20">
                                {videoUrl && (
                                    <button
                                        onClick={handleExportVideo}
                                        disabled={exportingVideo}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-400 hover:bg-orange-500/10 transition disabled:opacity-50"
                                    >
                                        {exportingVideo ? <Loader2 size={12} className="animate-spin" /> : <VideoIcon size={12} />}
                                        MP4
                                    </button>
                                )}
                                <button
                                    onClick={handleExport}
                                    disabled={exporting}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-400 hover:bg-orange-500/10 transition disabled:opacity-50 ${videoUrl ? 'border-l border-orange-500/20' : ''}`}
                                >
                                    {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                    WAV
                                </button>
                            </div>

                            {videoUrl && (
                                <button onClick={removeVideo} className="p-1.5 text-gray-500 hover:text-red-500 transition" title="Remove Video">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>


                {/* ===== TIMELINE ===== */}
                <div id="timeline-area" className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
                    <TimelineArea />
                </div>
            </div>
        </div>
    );
}

// Memoize to prevent re-renders when App updates
export default React.memo(StudioPage);
