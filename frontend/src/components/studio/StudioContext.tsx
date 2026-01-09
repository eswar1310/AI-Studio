import {
    createContext,
    useContext,
    useState,
    useRef,
    ReactNode,
    useEffect,
    useMemo,
    useCallback,
} from "react";

import {
    TrackData,
    StudioContextValue,
    TrackType,
    StudioAsset,
    ClipData,
    ProjectData,
} from "./studio.types";
import { decodeAssetAudio, detectBpm } from "./audioDecode";

// Helper for ID generation (compat with non-secure context)
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Professional DAW color palette - muted, darker tones
const TRACK_COLORS = [
    "#e70a0aff", // Dark Blue (like Bass Guitar in image)
    "#f07212ff", // Orange/Brown (like Drums/Percussion)
    "#be640fff", // Muted Green
    "#ee09e6ff", // Purple/Magenta
    "#ddc133ff", // Olive/Yellow-Green
    "#753ed3ff", // Deep Purple
    "#49e9f5ff", // Brown
    "#00f3f3ff", // Teal
    "#7C4A5C", // Mauve
    "#5C7C4A", // Sage Green
    "#4A5C7C", // Steel Blue
    "#ff4d4dff", // Tan/Beige
    "#6B4A7C", // Violet
    "#4A7C6B", // Sea Green
    "#db0694ff", // Rose
    "#ddec54ff", // Dark Gray
];

// History state for undo/redo
interface HistoryState {
    tracks: TrackData[];
}

const MAX_HISTORY_SIZE = 100;

/* ======================================================
   CONTEXT
====================================================== */

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
    const ctx = useContext(StudioContext);
    if (!ctx) throw new Error("useStudio must be used inside StudioProvider");
    return ctx;
}

/* ======================================================
   AUDIO ENGINE (SINGLE CONTEXT)
====================================================== */

const audioCtx = new AudioContext();

/* ======================================================
   PROVIDER
====================================================== */

/* ======================================================
   PROVIDER
====================================================== */

export function StudioProvider({ children }: { children: ReactNode }) {
    /* ================= PERSISTENCE KEYS ================= */
    const STORAGE_KEY_ASSETS = "aimusic.studio.assets";
    const STORAGE_KEY_TRACKS = "aimusic.studio.tracks";
    const STORAGE_KEY_PROJECTS = "aimusic.studio.projects";
    const STORAGE_KEY_ACTIVE_PROJECT_ID = "aimusic.studio.activeProjectId";

    /* ================= ASSETS ================= */

    const [assets, setAssets] = useState<StudioAsset[]>([]);

    /* ================= TRACKS ================= */

    const [tracks, setTracks] = useState<TrackData[]>([
        { id: "music", name: "Music", type: "music", volume: 1, gain: 1, muted: false, solo: false, pan: 0, transpose: 0, clips: [], color: TRACK_COLORS[0] },
        { id: "sfx", name: "SFX", type: "sfx", volume: 1, gain: 1, muted: false, solo: false, pan: 0, transpose: 0, clips: [], color: TRACK_COLORS[1] },
        { id: "voice", name: "Voice", type: "voice", volume: 1, gain: 1, muted: false, solo: false, pan: 0, transpose: 0, clips: [], color: TRACK_COLORS[2] },
    ]);

    /* ================= UNDO/REDO HISTORY ================= */

    const [history, setHistory] = useState<HistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);

    /* ================= SELECTION ================= */
    const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set());
    const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

    /* ================= TRANSPORT ================= */

    const [playing, setPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [seekTrigger, setSeekTrigger] = useState<number>(0);

    /* ================= TIMELINE ================= */

    const [duration, setDuration] = useState<number>(120);
    const [zoom, setZoom] = useState<number>(5);

    /* ================= PROJECTS ================= */
    const [projects, setProjects] = useState<ProjectData[]>([]);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

    /* ================= PANEL STATES ================= */
    const [isAssetPanelCollapsed, setAssetPanelCollapsed] = useState<boolean>(false);
    const [isVideoAreaCollapsed, setVideoAreaCollapsed] = useState<boolean>(false);
    const [isTracksExpanded, setIsTracksExpanded] = useState<boolean>(false);

    /* ================= VIDEO STATE ================= */
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    const [bpm, setBpmState] = useState<number>(120);



    /* ================= AUDIO STATE ================= */

    const scheduledSources = useRef<{ source: AudioBufferSourceNode; trackId: string }[]>([]);
    const trackInputGains = useRef<Record<string, GainNode>>({}); // New: Input Gain (Trim)
    const trackGains = useRef<Record<string, GainNode>>({});      // Volume Fader & Mute
    const trackPanners = useRef<Record<string, StereoPannerNode>>({});
    const currentTimeRef = useRef<number>(0);



    /* ======================================================
       INIT / HYDRATION
    ====================================================== */



    // Sync ref when state changes (e.g. manual seek)
    useEffect(() => {
        currentTimeRef.current = currentTime;
    }, [currentTime]);

    // HYDRATE FROM LOCAL STORAGE
    useEffect(() => {
        const loadState = async () => {
            try {
                // 1. Load Projects
                const rawProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
                const rawActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_PROJECT_ID);

                let loadedProjects: ProjectData[] = [];
                let activeId: string | null = null;

                if (rawProjects) {
                    try {
                        loadedProjects = JSON.parse(rawProjects);
                        activeId = rawActiveId;
                    } catch (e) {
                        console.error("Failed to parse projects", e);
                    }
                }

                // 2. Migration: If no projects but legacy data exists, create "Main Project"
                const legacyAssets = localStorage.getItem(STORAGE_KEY_ASSETS);
                const legacyTracks = localStorage.getItem(STORAGE_KEY_TRACKS);

                if (loadedProjects.length === 0 && (legacyAssets || legacyTracks)) {
                    const migrationId = generateId();
                    const mainProject: ProjectData = {
                        id: migrationId,
                        name: "Main Project",
                        assets: legacyAssets ? JSON.parse(legacyAssets) : [],
                        tracks: legacyTracks ? JSON.parse(legacyTracks) : tracks,
                        videoUrl: null,
                        duration: duration,
                        bpm: 120,
                        selectedTrackId: null,
                        updatedAt: Date.now()
                    };
                    loadedProjects = [mainProject];
                    activeId = migrationId;
                }

                // 3. Fallback: If still no projects, create a default one
                if (loadedProjects.length === 0) {
                    const defaultId = generateId();
                    loadedProjects = [{
                        id: defaultId,
                        name: "New Project",
                        assets: [],
                        tracks: tracks,
                        videoUrl: null,
                        duration: 120,
                        bpm: 120,
                        selectedTrackId: null,
                        updatedAt: Date.now()
                    }];
                    activeId = defaultId;
                }

                setProjects(loadedProjects);
                setCurrentProjectId(activeId);

                // 4. Load Active Project Data
                const activeProject = loadedProjects.find(p => p.id === activeId) || loadedProjects[0];
                if (activeProject) {
                    activeId = activeProject.id;
                    setCurrentProjectId(activeId);
                    setAssets(activeProject.assets);

                    if (activeProject.videoUrl) setVideoUrl(activeProject.videoUrl);
                    if (activeProject.duration) setDuration(activeProject.duration);
                    if (activeProject.bpm) setBpm(activeProject.bpm);
                    if (activeProject.selectedTrackId) setSelectedTrackId(activeProject.selectedTrackId);

                    // Hydrate tracks (decode audio)
                    const assetMap = new Map(activeProject.assets.map(a => [a.id, a]));
                    const hydratedTracks: TrackData[] = [];

                    for (const track of activeProject.tracks) {
                        const hydratedClips: ClipData[] = [];
                        for (const clipMeta of (track.clips as any[])) {
                            const asset = assetMap.get(clipMeta.assetId);
                            if (asset && asset.kind !== "video") {
                                try {
                                    const res = await fetch(asset.url);
                                    const arr = await res.arrayBuffer();
                                    const buffer = await audioCtx.decodeAudioData(arr);
                                    hydratedClips.push({ ...clipMeta, buffer });
                                } catch (e) {
                                    console.warn("Failed to rehydrate clip", clipMeta.id, e);
                                }
                            }
                        }
                        hydratedTracks.push({ ...track, clips: hydratedClips });
                    }
                    setTracks(hydratedTracks);
                }
            } catch (err) {
                console.error("Hydration failed", err);
            }
        };
        loadState();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ======================================================
       PERSISTENCE (DEBOUNCED or ON OPTIMISTIC UPDATE)
    ====================================================== */

    // Helper to save current state to active project
    const saveActiveProject = useCallback(() => {
        if (!currentProjectId) return;

        setProjects(prev => {
            const updated = prev.map(p => {
                if (p.id === currentProjectId) {
                    return {
                        ...p,
                        assets,
                        tracks: tracks.map(t => ({
                            ...t,
                            clips: t.clips.map(c => {
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                const { buffer, ...meta } = c;
                                return meta;
                            })
                        })),
                        videoUrl,
                        duration,
                        bpm,
                        selectedTrackId,
                        updatedAt: Date.now(),
                    };
                }
                return p;
            });
            localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updated));
            localStorage.setItem(STORAGE_KEY_ACTIVE_PROJECT_ID, currentProjectId);
            return updated;
        });
    }, [assets, tracks, videoUrl, duration, bpm, currentProjectId, selectedTrackId]);

    // Update effect to save whenever relevant state changes
    useEffect(() => {
        const timer = setTimeout(() => {
            saveActiveProject();
        }, 1000); // 1s debounce
        return () => clearTimeout(timer);
    }, [assets, tracks, videoUrl, duration, bpm, selectedTrackId, saveActiveProject]);

    /* ======================================================
       LIVE TRANSPOSE SYNC
    ====================================================== */

    useEffect(() => {
        scheduledSources.current.forEach(({ source, trackId }) => {
            const track = tracks.find(t => t.id === trackId);
            if (track) {
                // Use setTargetAtTime for smooth, pop-free pitch shifts
                source.detune.setTargetAtTime((track.transpose || 0) * 100, audioCtx.currentTime, 0.05);
            }
        });
    }, [tracks]);

    /* ======================================================
       PROJECT MANAGEMENT
    ====================================================== */

    const switchProject = useCallback(async (id: string) => {
        // Stop playing
        setPlaying(false);

        // Find targeted project
        const project = projects.find(p => p.id === id);
        if (!project) return;

        // Set active ID
        setCurrentProjectId(id);
        localStorage.setItem(STORAGE_KEY_ACTIVE_PROJECT_ID, id);

        // Load targeted data
        setAssets(project.assets);
        setVideoUrl(project.videoUrl);
        setDuration(project.duration);
        setBpm(project.bpm || 120);
        setSelectedTrackId(project.selectedTrackId || null);

        // Re-hydrate tracks
        const assetMap = new Map(project.assets.map(a => [a.id, a]));
        const hydratedTracks: TrackData[] = [];
        for (const track of project.tracks) {
            const hydratedClips: ClipData[] = [];
            for (const clipMeta of (track.clips as any[])) {
                const asset = assetMap.get(clipMeta.assetId);
                if (asset && asset.kind !== "video") {
                    try {
                        const res = await fetch(asset.url);
                        const arr = await res.arrayBuffer();
                        const buffer = await audioCtx.decodeAudioData(arr);
                        hydratedClips.push({ ...clipMeta, buffer });
                    } catch (e) {
                        console.warn("Failed to switch project clip", clipMeta.id, e);
                    }
                }
            }
            hydratedTracks.push({ ...track, clips: hydratedClips });
        }
        setTracks(hydratedTracks);
    }, [projects]);

    const createProject = useCallback((name: string) => {
        const id = generateId();
        const newProject: ProjectData = {
            id,
            name,
            assets: [],
            tracks: [
                { id: "music", name: "Music", type: "music", volume: 1, gain: 1, muted: false, solo: false, pan: 0, clips: [], color: TRACK_COLORS[0] },
                { id: "sfx", name: "SFX", type: "sfx", volume: 1, gain: 1, muted: false, solo: false, pan: 0, clips: [], color: TRACK_COLORS[1] },
                { id: "voice", name: "Voice", type: "voice", volume: 1, gain: 1, muted: false, solo: false, pan: 0, clips: [], color: TRACK_COLORS[2] },
            ],
            videoUrl: null,
            duration: 120,
            bpm: 120,
            selectedTrackId: null,
            updatedAt: Date.now()
        };
        setProjects(prev => [...prev, newProject]);
        switchProject(id);
    }, [switchProject]);

    const deleteProject = useCallback((id: string) => {
        if (projects.length <= 1) {
            alert("Cannot delete the only project.");
            return;
        }
        const filtered = projects.filter(p => p.id !== id);
        setProjects(filtered);
        if (id === currentProjectId) {
            switchProject(filtered[0].id);
        }
    }, [currentProjectId, projects, switchProject]);

    const renameProject = useCallback((id: string, newName: string) => {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
    }, []);

    const duplicateProject = useCallback((id: string) => {
        const original = projects.find(p => p.id === id);
        if (!original) return;
        const copy: ProjectData = {
            ...original,
            id: generateId(),
            name: `${original.name} (Copy)`,
            updatedAt: Date.now()
        };
        setProjects(prev => [...prev, copy]);
    }, [projects]);


    /* ======================================================
       UPDATE GAIN ON VOLUME / MUTE
    ====================================================== */

    useEffect(() => {
        tracks.forEach((track) => {
            // 1. Ensure Input Gain (Trim)
            if (!trackInputGains.current[track.id]) {
                const inputGain = audioCtx.createGain();
                trackInputGains.current[track.id] = inputGain;
            }

            // 2. Ensure Volume/Mute Gain
            if (!trackGains.current[track.id]) {
                const volGain = audioCtx.createGain();
                trackGains.current[track.id] = volGain;

                // Connect Input -> Volume
                trackInputGains.current[track.id].connect(volGain);
            }

            // 3. Ensure Panner Node
            if (!trackPanners.current[track.id]) {
                const panner = audioCtx.createStereoPanner();
                trackPanners.current[track.id] = panner;

                // Connect Volume -> Panner -> Destination
                const volGain = trackGains.current[track.id];
                volGain.connect(panner);
                panner.connect(audioCtx.destination);
            }

            // Update Values Smoothly (Prevent Clicks and create professional feel)
            const inputGain = trackInputGains.current[track.id];
            const targetGain = track.gain ?? 1;
            // setTargetAtTime provides a smooth exponential transition
            inputGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.05);

            const volGain = trackGains.current[track.id];
            const targetVol = track.muted ? 0 : track.volume;
            volGain.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.05);

            const panner = trackPanners.current[track.id];
            const targetPan = track.pan ?? 0;
            // Standard Web Audio Pan is -1 to 1. 
            // The user's request for a 70-degree angle (vs 60) implies a slightly more aggressive/wider distribution.
            // We use the standard panner but ensure smooth transition.
            panner.pan.setTargetAtTime(targetPan, audioCtx.currentTime, 0.05);
        });
    }, [tracks]);

    /* ======================================================
       HISTORY MANAGEMENT (UNDO/REDO)
    ====================================================== */

    // Deep clone tracks (without buffers, we keep references)
    const cloneTracks = (tracks: TrackData[]): TrackData[] => {
        return tracks.map(t => ({
            ...t,
            clips: t.clips.map(c => ({ ...c })) // Shallow clone clips, buffer is reference
        }));
    };

    const pushHistory = useCallback(() => {
        setHistory(prev => {
            // Remove any future history if we're not at the end
            const newHistory = prev.slice(0, historyIndex + 1);

            // Add current state
            newHistory.push({ tracks: cloneTracks(tracks) });

            // Limit history size
            if (newHistory.length > MAX_HISTORY_SIZE) {
                newHistory.shift();
                setHistoryIndex(prev => prev); // Keep same index since we removed from start
                return newHistory;
            }

            setHistoryIndex(newHistory.length - 1);
            return newHistory;
        });
    }, [tracks, historyIndex]);

    const setBpm = useCallback((newBpm: number) => {
        pushHistory();
        setBpmState(newBpm);
    }, [pushHistory]);

    // Sync all clips when project BPM changes
    useEffect(() => {
        setTracks(prev => prev.map(track => ({
            ...track,
            clips: track.clips.map(clip => {
                if (clip.detectedBpm) {
                    return { ...clip, playbackRate: bpm / clip.detectedBpm };
                }
                return clip;
            })
        })));
    }, [bpm]);

    const undo = useCallback(() => {
        if (historyIndex <= 0) return;

        const prevState = history[historyIndex - 1];
        if (prevState) {
            setTracks(cloneTracks(prevState.tracks));
            setHistoryIndex(prev => prev - 1);
        }
    }, [history, historyIndex]);

    const redo = useCallback(() => {
        if (historyIndex >= history.length - 1) return;

        const nextState = history[historyIndex + 1];
        if (nextState) {
            setTracks(cloneTracks(nextState.tracks));
            setHistoryIndex(prev => prev + 1);
        }
    }, [history, historyIndex]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    /* ======================================================
       ASSET API
    ====================================================== */

    const addAsset = useCallback(async (asset: StudioAsset) => {
        let finalAsset = { ...asset };

        if (asset.kind !== "video") {
            try {
                // Decode to get duration and BPM
                const buffer = await decodeAssetAudio(asset);
                if (buffer) {
                    finalAsset.duration = buffer.duration;
                    finalAsset.detectedBpm = await detectBpm(buffer);
                }
            } catch (e) {
                console.warn("BPM Detection failed for asset", e);
            }
        }

        setAssets((prev) => {
            if (prev.some(a => a.id === asset.id)) return prev;

            // Auto-set project BPM if this is the first audio asset and we are at default 120
            if (finalAsset.detectedBpm && bpm === 120 && prev.filter(a => a.kind !== 'video').length === 0) {
                setBpm(finalAsset.detectedBpm);
            }

            return [...prev, finalAsset];
        });

        if (asset.kind === "video" && asset.duration > 0) {
            setDuration(asset.duration);
        }
    }, [setAssets, setDuration]);

    /* ======================================================
       CLIP API (SAFE ASYNC)
    ====================================================== */

    const removeAsset = useCallback((id: string) => {
        setAssets((prev) => prev.filter((a) => a.id !== id));
        // Note: We do not remove clips that use this asset, 
        // they will just persist but maybe warn if we rehydrate? 
        // For now, it's fine.
    }, [setAssets]);

    const clearAssets = useCallback(() => {
        setAssets([]);
    }, [setAssets]);

    /* ======================================================
       CLIP API (SAFE ASYNC)
    ====================================================== */

    const addClip = useCallback(async (asset: StudioAsset, startTime: number, trackId?: string) => {
        if (asset.kind === "video") return;

        try {
            console.log("Adding clip from URL:", asset.url);
            const res = await fetch(asset.url);
            if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);

            const arr = await res.arrayBuffer();
            const buffer = await audioCtx.decodeAudioData(arr);

            // Detect BPM (Prefer asset value if already detected)
            const detectedValue = asset.detectedBpm || await detectBpm(buffer);
            const pbRate = bpm / detectedValue;

            const clip: ClipData = {
                id: generateId(),
                assetId: asset.id,
                buffer,
                startTime: 0,
                endTime: buffer.duration,
                offset: startTime,
                playbackRate: pbRate,
                detectedBpm: detectedValue,
            };

            pushHistory(); // Save state before mutation

            setTracks((prev) => {
                const next = [...prev];
                let targetIdx = -1;
                if (trackId) {
                    targetIdx = next.findIndex(t => t.id === trackId);
                } else {
                    targetIdx = next.findIndex(t => t.type === asset.kind);
                }

                if (targetIdx !== -1) {
                    next[targetIdx] = {
                        ...next[targetIdx],
                        clips: [...next[targetIdx].clips, clip]
                    };
                }
                return next;
            });

            const stretchedDuration = buffer.duration / pbRate;
            setDuration((d) => Math.max(d, startTime + stretchedDuration));
        } catch (err) {
            console.error("❌ Audio decode failed:", err);
            alert(`Failed to load audio file: ${err instanceof Error ? err.message : String(err)}`);
        }
    }, [setTracks, setDuration, pushHistory]);

    const updateClip = useCallback((trackId: string, clip: ClipData, skipHistory = false) => {
        if (!skipHistory) pushHistory();
        setTracks((prev) =>
            prev.map((track) =>
                track.id === trackId
                    ? {
                        ...track,
                        clips: track.clips.map((c) =>
                            c.id === clip.id ? clip : c
                        ),
                    }
                    : track
            )
        );
    }, [setTracks, pushHistory]);

    const deleteClip = useCallback((trackId: string, clipId: string) => {
        pushHistory();
        setTracks((prev) =>
            prev.map((track) =>
                track.id === trackId
                    ? {
                        ...track,
                        clips: track.clips.filter((c) => c.id !== clipId),
                    }
                    : track
            )
        );
        // Clear selection if deleted
        if (selectedClipIds.has(clipId)) {
            // Note: Accessing state directly here is tricky with useCallback []
            // unless we add selectedClipIds to dependency.
            // But setSelectedClipIds can accept a callback.
            setSelectedClipIds(prev => {
                if (prev.has(clipId)) {
                    const next = new Set(prev);
                    next.delete(clipId);
                    return next;
                }
                return prev;
            });
        }
    }, [setTracks, selectedClipIds, pushHistory]); // Ideally remove selectedClipIds dep if we use functional update fully, but we check 'has' outside.

    // NEW: Vertical move + time update
    const moveClip = useCallback((srcTrackId: string, destTrackId: string, clipId: string, newOffset: number) => {
        pushHistory();
        setTracks(prev => {
            // If same track, just update offset
            if (srcTrackId === destTrackId) {
                return prev.map(t =>
                    t.id === srcTrackId
                        ? {
                            ...t,
                            clips: t.clips.map(c =>
                                c.id === clipId
                                    ? { ...c, offset: newOffset }
                                    : c
                            )
                        }
                        : t
                );
            }

            // If different tracks, need to find, remove, and add
            const srcTrack = prev.find(t => t.id === srcTrackId);
            if (!srcTrack) return prev;

            const clip = srcTrack.clips.find(c => c.id === clipId);
            if (!clip) return prev;

            return prev.map(t => {
                if (t.id === srcTrackId) {
                    return {
                        ...t,
                        clips: t.clips.filter(c => c.id !== clipId)
                    };
                }
                if (t.id === destTrackId) {
                    return {
                        ...t,
                        clips: [...t.clips, { ...clip, offset: newOffset }]
                    };
                }
                return t;
            });
        });
    }, [setTracks, pushHistory]);

    // NEW: Split Clip
    const splitClip = useCallback((trackId: string, clipId: string, splitTime: number) => {
        pushHistory();
        setTracks(prev => {
            const track = prev.find(t => t.id === trackId);
            if (!track) return prev;

            const original = track.clips.find(c => c.id === clipId);
            if (!original) return prev;

            // splitTime is GLOBAL timeline time
            // Relative time in clip playback
            const relativeTime = splitTime - original.offset;

            // Check bounds
            const clipDur = original.endTime - original.startTime;
            if (relativeTime <= 0.05 || relativeTime >= clipDur - 0.05) return prev;

            // Create two new clips
            const leftClip: ClipData = {
                ...original,
                // ID must be kept for selection continuity? No, usually create new or keep one.
                // Let's keep original ID for left.
                endTime: original.startTime + relativeTime
            };

            const rightClip: ClipData = {
                ...original,
                id: generateId(),
                offset: splitTime,
                startTime: original.startTime + relativeTime,
                endTime: original.endTime // unchanged
            };

            return prev.map(t =>
                t.id === trackId
                    ? {
                        ...t,
                        clips: t.clips.flatMap(c =>
                            c.id === clipId ? [leftClip, rightClip] : [c]
                        )
                    }
                    : t
            );
        });
    }, [setTracks, pushHistory]);

    /* ======================================================
       SELECTION API
    ====================================================== */

    const selectClip = useCallback((id: string, mode: "single" | "add" | "toggle") => {
        // Use functional update to avoid dependency on selectedClipIds
        setSelectedClipIds(prev => {
            const next = new Set(mode === "single" ? [] : prev);

            if (mode === "toggle") {
                if (next.has(id)) next.delete(id);
                else next.add(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, [setSelectedClipIds]);

    const duplicateClip = useCallback((trackId: string, clipId: string) => {
        // We need to access tracks. We'll use dependency.
        const track = tracks.find(t => t.id === trackId);
        if (!track) return;
        const original = track.clips.find(c => c.id === clipId);
        if (!original) return;

        const newClip: ClipData = {
            ...original,
            id: generateId(),
            offset: original.offset + (original.endTime - original.startTime) // Place right after
        };

        pushHistory();
        setTracks(prev => prev.map(t =>
            t.id === trackId
                ? { ...t, clips: [...t.clips, newClip] }
                : t
        ));

        // Select the new clip
        setSelectedClipIds(new Set([newClip.id]));
    }, [tracks, setTracks, setSelectedClipIds, pushHistory]);

    /* ======================================================
       TRACK MIX CONTROLS
    ====================================================== */

    const updateTrackVolume = useCallback((trackId: string, volume: number) => {
        // pushHistory(); // Removed for performance (called onMouseDown)
        setTracks((prev) =>
            prev.map((t) =>
                t.id === trackId ? { ...t, volume } : t
            )
        );
    }, [pushHistory]);

    const updateTrackGain = useCallback((trackId: string, gain: number) => {
        // pushHistory(); // Removed for performance
        setTracks((prev) =>
            prev.map((t) =>
                t.id === trackId ? { ...t, gain } : t
            )
        );
    }, [pushHistory]);

    const updateTrackTranspose = useCallback((trackId: string, transpose: number) => {
        pushHistory();
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, transpose } : t));
    }, [pushHistory]);

    const toggleTrackMute = useCallback((trackId: string) => {
        pushHistory();
        setTracks((prev) =>
            prev.map((t) =>
                t.id === trackId ? { ...t, muted: !t.muted } : t
            )
        );
    }, [pushHistory]);

    const updateTrackPan = useCallback((trackId: string, pan: number) => {
        // pushHistory(); // Removed for performance
        setTracks((prev) =>
            prev.map((t) =>
                t.id === trackId ? { ...t, pan } : t
            )
        );
    }, [pushHistory]);

    const toggleTrackSolo = useCallback((trackId: string) => {
        pushHistory();
        setTracks((prev) =>
            prev.map((t) =>
                t.id === trackId ? { ...t, solo: !t.solo } : t
            )
        );
    }, [pushHistory]);

    /* ======================================================
       TRACK MANAGEMENT
    ====================================================== */

    const addTrack = useCallback((type: TrackType) => {
        const id = generateId();
        // NOTE: we need access to 'tracks' to determine color?
        // If we use 'tracks' in dependency, it will change often.
        // Instead, use functional update to read previous length.
        // BUT we need 'TRACK_COLORS'.
        // Let's rely on functional update for length.

        pushHistory();
        setTracks(prev => {
            const colorIndex = prev.length % TRACK_COLORS.length;
            const color = TRACK_COLORS[colorIndex];

            const newTrack: TrackData = {
                id,
                name: type === "music" ? "Music" : type === "sfx" ? "SFX" : "Voice",
                type,
                volume: 1,
                gain: 1,
                muted: false,
                solo: false,
                pan: 0,
                transpose: 0,
                clips: [],
                color
            };
            return [...prev, newTrack];
        });
    }, [pushHistory]); // No need for [tracks] dependency!

    const deleteTrack = useCallback((trackId: string) => {
        pushHistory();
        setTracks(prev => prev.filter(t => t.id !== trackId));

        if (selectedTrackId === trackId) setSelectedTrackId(null);

        // Cleanup selection
        setSelectedClipIds(new Set());

        // Cleanup Audio Nodes
        if (trackInputGains.current[trackId]) {
            try { trackInputGains.current[trackId].disconnect(); delete trackInputGains.current[trackId]; } catch (e) { }
        }
        if (trackGains.current[trackId]) {
            try { trackGains.current[trackId].disconnect(); delete trackGains.current[trackId]; } catch (e) { }
        }
        if (trackPanners.current[trackId]) {
            try { trackPanners.current[trackId].disconnect(); delete trackPanners.current[trackId]; } catch (e) { }
        }
    }, [pushHistory, selectedTrackId]);

    const reorderTrack = useCallback((fromIndex: number, toIndex: number) => {
        pushHistory();
        setTracks(prev => {
            if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) return prev;
            const next = [...prev];
            const [removed] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, removed);
            return next;
        });
    }, [pushHistory]);

    const selectTrack = useCallback((id: string | null) => {
        setSelectedTrackId(id);
    }, []);

    const resetBpmToTrack = useCallback((trackId: string | null) => {
        let track = tracks.find(t => t.id === trackId);

        // If no track selected, find the first track that actually has clips
        if (!track) {
            track = tracks.find(t => t.clips.length > 0);
        }

        if (!track) return;

        // Find the first clip with a detected BPM
        const firstClipWithBpm = track.clips.find(c => c.detectedBpm);
        if (firstClipWithBpm && firstClipWithBpm.detectedBpm) {
            setBpm(firstClipWithBpm.detectedBpm);
        } else {
            console.warn("No clips with detected BPM found on track", track.id);
        }
    }, [tracks, setBpm]);



    /* ======================================================
       PLAYBACK ENGINE (STABLE)
    ====================================================== */

    useEffect(() => {
        // stop previous sources
        scheduledSources.current.forEach(({ source }) => {
            try { source.stop(); } catch { }
        });
        scheduledSources.current = [];

        if (!playing) return;

        // 🔥 required browser unlock
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }

        tracks.forEach((track) => {
            // Logic: If ANY track is soloed, play ONLY soloed tracks (and not muted ones).
            // If NO track is soloed, play all non-muted.

            const anySolo = tracks.some(t => t.solo);
            const shouldPlay = anySolo ? (track.solo && !track.muted) : (!track.muted);

            if (!shouldPlay) return;

            // Connect to Input Gain (first in chain)
            const inputGain = trackInputGains.current[track.id];
            if (!inputGain) return;

            track.clips.forEach((clip) => {
                const playbackRate = clip.playbackRate || 1.0;
                const clipStart = clip.offset;
                const clipDuration = (clip.endTime - clip.startTime) / playbackRate;
                const clipEnd = clipStart + clipDuration;

                if (clipEnd <= currentTime || !clip.buffer) return;

                const source = audioCtx.createBufferSource();
                source.buffer = clip.buffer;
                source.playbackRate.value = playbackRate;

                // Set Transpose (Detune)
                const transpose = track.transpose || 0;
                source.detune.value = transpose * 100; // 100 cents per semitone

                // CLIP GAIN (For Fades)
                const clipGain = audioCtx.createGain();
                source.connect(clipGain);
                clipGain.connect(inputGain);

                const when = Math.max(0, clipStart - currentTime);
                const offset = clip.startTime + Math.max(0, (currentTime - clipStart) * playbackRate);
                const dur = (clip.endTime - (clip.startTime + Math.max(0, (currentTime - clipStart) * playbackRate))) / playbackRate;

                // ##### FADE SCHEDULING (PREMIUM S-CURVES) #####
                const now = audioCtx.currentTime;
                const playStart = now + when;
                const clipTimelineDur = (clip.endTime - clip.startTime) / playbackRate;
                const clipTimelineEnd = clip.offset + clipTimelineDur;

                // 1. Initial State: Start at 0 if there's any fade in
                const hasFadeIn = clip.fadeIn && clip.fadeIn > 0.001;
                const fadeInEnd = clip.offset + (clip.fadeIn || 0);

                // If we are starting before or during fade-in, the very first potential sample at 'now' should be mute.
                const initialGainAtNow = (currentTime >= fadeInEnd) ? 1.0 : 0.0;
                clipGain.gain.setValueAtTime(initialGainAtNow, now);

                // Professional S-Curve Interpolator (startV to endV)
                const applySCurve = (param: AudioParam, startV: number, endV: number, startTime: number, duration: number) => {
                    const segments = 32; // High precision for professional feel
                    param.setValueAtTime(startV, startTime);
                    for (let i = 1; i <= segments; i++) {
                        const t = i / segments;
                        // S-curve position (0 to 1)
                        const sCurvePos = 0.5 - 0.5 * Math.cos(t * Math.PI);
                        // Linear interpolation between startV and endV using the S-curve
                        const val = startV + (endV - startV) * sCurvePos;
                        param.linearRampToValueAtTime(val, startTime + (t * duration));
                    }
                };

                // Fade In
                if (hasFadeIn) {
                    if (currentTime < fadeInEnd) {
                        if (currentTime <= clip.offset) {
                            // Playhead is before clip: Ensure absolute mute at playStart
                            clipGain.gain.setValueAtTime(0, playStart);
                            applySCurve(clipGain.gain, 0, 1, playStart, clip.fadeIn!);
                        } else {
                            // Playhead is mid-fade: Calculate current S-curve position precisely
                            const progress = (currentTime - clip.offset) / clip.fadeIn!;
                            const currentV = 0.5 - 0.5 * Math.cos(progress * Math.PI);
                            const remainingT = fadeInEnd - currentTime;
                            clipGain.gain.setValueAtTime(currentV, now);
                            applySCurve(clipGain.gain, currentV, 1, now, remainingT);
                        }
                    }
                }

                // Fade Out
                if (clip.fadeOut && clip.fadeOut > 0.001) {
                    const fadeOutStart = clipTimelineEnd - clip.fadeOut;
                    if (currentTime < clipTimelineEnd) {
                        const fadeStartTime = now + Math.max(0, fadeOutStart - currentTime);
                        const remainingDuration = clipTimelineEnd - Math.max(currentTime, fadeOutStart);

                        if (currentTime < fadeOutStart) {
                            // Normal future fade-out
                            clipGain.gain.setValueAtTime(1.0, fadeStartTime);
                            applySCurve(clipGain.gain, 1, 0, fadeStartTime, clip.fadeOut);
                        } else {
                            // Playhead starts mid-fade-out
                            const progress = (currentTime - fadeOutStart) / clip.fadeOut;
                            const currentV = 1.0 - (0.5 - 0.5 * Math.cos(progress * Math.PI));
                            clipGain.gain.setValueAtTime(currentV, now);
                            applySCurve(clipGain.gain, currentV, 0, now, remainingDuration);
                        }
                    }
                }

                source.start(playStart, offset, dur);
                scheduledSources.current.push({ source, trackId: track.id });
            });
        });

        // CLOCK LOOP (Moves the playhead)
        let animationFrameId: number;
        const startCtxTime = audioCtx.currentTime;
        const startTimelineTime = currentTime;

        const loop = () => {
            const elapsed = audioCtx.currentTime - startCtxTime;
            const newTime = startTimelineTime + elapsed;

            // Update ref (FAST, no re-render)
            currentTimeRef.current = newTime;

            // Update state (Slower, for UI components that need to know)
            // Throttle state update to ~10fps to keep CPU low, while Ref stays 60fps
            if (Math.floor(elapsed * 10) !== Math.floor((elapsed - 0.02) * 10)) {
                setCurrentTime(newTime);
            }

            // Loop or Stop if end reached
            if (newTime >= duration) {
                setPlaying(false);
                setCurrentTime(newTime);
            } else {
                animationFrameId = requestAnimationFrame(loop);
            }
        };

        animationFrameId = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(animationFrameId);

    }, [playing, tracks, seekTrigger]); // ✅ Re-run on seek or track changes

    /* ======================================================
       SEEK API
    ====================================================== */

    const seek = useCallback((t: number) => {
        const clamped = Math.max(0, Math.min(duration, t));
        setCurrentTime(clamped);
        currentTimeRef.current = clamped;
        setSeekTrigger(n => n + 1);
    }, [duration]);

    /* ======================================================
       CONTEXT VALUE
    ====================================================== */

    const value: StudioContextValue = useMemo(() => ({
        assets,
        tracks,
        videoUrl,
        setVideoUrl,

        addAsset,
        removeAsset,
        clearAssets,
        addClip,
        updateClip,
        deleteClip,
        moveClip,
        splitClip,

        updateTrackVolume,
        updateTrackGain,
        updateTrackPan,
        updateTrackTranspose,
        toggleTrackMute,
        toggleTrackSolo,

        playing,
        setPlaying,

        currentTime,
        currentTimeRef,
        setCurrentTime,
        seek,

        duration,
        setDuration,

        zoom,
        setZoom,

        selectedClipIds,
        selectClip,
        duplicateClip,

        addTrack,
        deleteTrack,
        reorderTrack,
        selectedTrackId,
        selectTrack,
        resetBpmToTrack,
        undo,
        redo,
        canUndo,
        canRedo,
        pushHistory,

        isAssetPanelCollapsed,
        setAssetPanelCollapsed,
        isVideoAreaCollapsed,
        setVideoAreaCollapsed,

        isTracksExpanded,
        setIsTracksExpanded,

        /* ===== PROJECTS ===== */
        projects,
        currentProjectId,
        switchProject,
        createProject,
        deleteProject,
        renameProject,
        duplicateProject,

        bpm,
        setBpm,
    }), [
        assets, tracks, videoUrl, playing, currentTime, duration, zoom, selectedClipIds,
        addAsset, removeAsset, clearAssets, addClip, updateClip, deleteClip,
        moveClip, splitClip,
        updateTrackVolume, updateTrackGain, updateTrackPan, updateTrackTranspose, toggleTrackMute, toggleTrackSolo,
        seek, selectClip, duplicateClip, addTrack, deleteTrack, reorderTrack, selectedTrackId, selectTrack, resetBpmToTrack,
        undo, redo, canUndo, canRedo, pushHistory,
        isAssetPanelCollapsed, isVideoAreaCollapsed, isTracksExpanded,
        projects, currentProjectId, switchProject, createProject, deleteProject, renameProject, duplicateProject,
        bpm, setBpm,
    ]);

    return (
        <StudioContext.Provider value={value}>
            {children}
        </StudioContext.Provider>
    );
}
