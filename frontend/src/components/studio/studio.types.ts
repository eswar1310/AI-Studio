/* ======================================================
   STUDIO ASSETS
   (Generated / Uploaded / History audio & video)
====================================================== */

/**
 * Logical asset category
 * - music / sfx / voice → audio
 * - video → video
 */
export type StudioAssetKind = "music" | "sfx" | "voice" | "video";

/**
 * Where the asset came from
 */
export type StudioAssetSource = "generated" | "uploaded" | "history";

/**
 * Asset shown in Asset Panel (left side)
 */
export interface StudioAsset {
    id: string;
    name: string;
    url: string;               // Object URL or backend URL
    duration: number;          // seconds (0 allowed before decoding)
    kind: StudioAssetKind;     // music | sfx | voice | video
    source: StudioAssetSource;
    detectedBpm?: number;      // Detected BPM
}

/* ======================================================
   CLIPS (PLACED ON TIMELINE)
====================================================== */

/**
 * A placed portion of an asset on the timeline
 * NOTE: buffer is always AUDIO (video never creates clips)
 */
export interface ClipData {
    id: string;
    assetId: string;           // reference to StudioAsset.id
    buffer?: AudioBuffer;      // decoded audio buffer (optional for serialization)
    startTime: number;         // buffer start (sec)
    endTime: number;           // buffer end (sec)
    offset: number;            // timeline position (sec)
    fadeIn?: number;           // fade-in duration (sec)
    fadeOut?: number;          // fade-out duration (sec)
    playbackRate?: number;     // 1.0 = normal
    detectedBpm?: number;      // Original BPM of the clip
}

/* ======================================================
   TRACKS (TIMELINE LANES)
====================================================== */

/**
 * Timeline track lane type
 */
export type TrackType = "music" | "sfx" | "voice" | "video";

/**
 * A single timeline lane
 */
export interface TrackData {
    id: string;
    name: string;
    type: TrackType;
    volume: number;            // 0–1 (Fader)
    gain?: number;             // 0-2+ (Input Gain / Trim). Default 1.
    muted: boolean;
    solo?: boolean;            // New: Solo mode
    pan?: number;              // -1 (L) to 1 (R). Default 0.
    transpose?: number;        // Semitones (-12 to 12). Default 0.
    color?: string;            // Track display color
    clips: ClipData[];
}

/* ======================================================
   PROJECTS
====================================================== */

export interface ProjectData {
    id: string;
    name: string;
    tracks: TrackData[];
    assets: StudioAsset[];
    videoUrl: string | null;
    duration: number;
    bpm: number;               // Project BPM
    selectedTrackId: string | null;
    updatedAt: number;
}

export interface StudioContextValue {
    /* ================= ASSETS ================= */
    assets: StudioAsset[];
    addAsset: (asset: StudioAsset) => Promise<void>;
    removeAsset: (id: string) => void;
    clearAssets: () => void;

    /* ================= VIDEO ================= */
    videoUrl: string | null;
    setVideoUrl: (url: string | null) => void;

    /* ================= TRACKS / CLIPS ================= */
    tracks: TrackData[];

    addClip: (asset: StudioAsset, startTime: number, trackId?: string) => Promise<void>;
    updateClip: (trackId: string, clip: ClipData, skipHistory?: boolean) => void;
    deleteClip: (trackId: string, clipId: string) => void;
    moveClip: (srcTrackId: string, destTrackId: string, clipId: string, newOffset: number) => void;
    splitClip: (trackId: string, clipId: string, splitTime: number) => void;

    updateTrackVolume: (trackId: string, volume: number) => void;
    updateTrackGain: (trackId: string, gain: number) => void;
    updateTrackPan: (trackId: string, pan: number) => void;
    updateTrackTranspose: (trackId: string, transpose: number) => void;
    toggleTrackMute: (trackId: string) => void;
    toggleTrackSolo: (trackId: string) => void;

    /* ===== TRANSPORT ===== */
    playing: boolean;
    setPlaying: (v: boolean) => void;

    currentTime: number;
    setCurrentTime: (t: number) => void;
    seek: (t: number) => void;

    duration: number;          // timeline / video length
    setDuration: (d: number) => void;

    zoom: number;              // px per second
    setZoom: (z: number) => void;

    /* ===== SELECTION / EDITING ===== */
    selectedClipIds: Set<string>;
    selectClip: (id: string, mode: "single" | "add" | "toggle") => void;
    duplicateClip: (trackId: string, clipId: string) => void;

    /* ===== TRACK OPS ===== */
    addTrack: (type: TrackType) => void;
    deleteTrack: (trackId: string) => void;
    reorderTrack: (fromIndex: number, toIndex: number) => void;
    selectedTrackId: string | null;
    selectTrack: (id: string | null) => void;
    resetBpmToTrack: (trackId: string | null) => void;

    /* ===== UNDO/REDO ===== */
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    pushHistory: () => void;

    /* ===== PANEL STATES ===== */
    isAssetPanelCollapsed: boolean;
    setAssetPanelCollapsed: (v: boolean) => void;
    isVideoAreaCollapsed: boolean;
    setVideoAreaCollapsed: (v: boolean) => void;

    isTracksExpanded: boolean;
    setIsTracksExpanded: (v: boolean) => void;

    currentTimeRef: React.MutableRefObject<number>;

    projects: ProjectData[];
    currentProjectId: string | null;
    switchProject: (id: string) => void;
    createProject: (name: string) => void;
    deleteProject: (id: string) => void;
    renameProject: (id: string, newName: string) => void;
    duplicateProject: (id: string) => void;

    bpm: number;
    setBpm: (v: number) => void;
}
