import { Volume2, VolumeX, Trash2 } from "lucide-react";
import { TrackData } from "./studio.types";
import { useStudio } from "./StudioContext";

interface TrackControlProps {
    track: TrackData;
    height: number;
}

export default function TrackControl({ track, height }: TrackControlProps) {
    const { updateTrackVolume, updateTrackPan, updateTrackTranspose, toggleTrackMute, toggleTrackSolo, deleteTrack, isTracksExpanded, selectedTrackId, selectTrack, pushHistory } = useStudio();

    const volPercent = Math.round(track.volume * 100);

    const handlePanDoubleClick = () => {
        pushHistory();
        updateTrackPan(track.id, 0);
    };

    const isSelected = selectedTrackId === track.id;

    if (!isTracksExpanded) {
        return (
            <div
                onClick={() => selectTrack(track.id)}
                className={`
                    border-b border-white/10
                    flex items-center gap-2 px-2
                    ${isSelected ? "bg-white/10" : "bg-[#111318]"}
                    border-l-[4px]
                    relative
                    group
                    cursor-pointer
                    overflow-hidden
                `}
                style={{ height, borderLeftColor: track.color || "#3b82f6" }}
            >
                <div className="text-[10px] font-mono text-gray-500 w-4 shrink-0">
                    {track.id.substring(0, 1).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="text-[11px] font-bold truncate text-gray-200 uppercase tracking-tight">
                        {track.name}
                    </div>
                </div>

                <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleTrackMute(track.id); }}
                        className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold ${track.muted ? "bg-red-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
                    >
                        M
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleTrackSolo(track.id); }}
                        className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold ${track.solo ? "bg-yellow-500 text-black font-black" : "bg-gray-800 text-gray-400 hover:text-white"}`}
                    >
                        S
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); deleteTrack(track.id); }}
                        className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-red-500 bg-gray-800"
                    >
                        <Trash2 size={10} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={() => selectTrack(track.id)}
            className={`
                border-b border-white/10
                flex flex-col justify-between px-3 py-3
                ${isSelected ? "bg-white/10 shadow-inner shadow-white/5" : "bg-[#111318]"}
                border-l-[6px]
                relative
                group
                cursor-pointer
                overflow-hidden
            `}
            style={{ height, borderLeftColor: track.color || "#3b82f6" }}
        >
            {/* Row 1: Name and Delete */}
            <div className="flex items-center justify-between min-w-0">
                <div className="flex flex-col min-w-0 leading-tight">
                    <div className="text-[13px] font-bold truncate text-gray-100 uppercase tracking-tight" title={track.name}>
                        {track.name}
                    </div>
                    <div className="text-[9px] text-gray-400 uppercase tracking-widest opacity-80 font-medium">
                        {track.type}
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); deleteTrack(track.id); }}
                    className="text-gray-500 hover:text-red-500 transition opacity-0 group-hover:opacity-100 p-1"
                    title="Delete Track"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Row 2: Pan (with Reset on Double Click) */}
            <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px] text-gray-300 font-bold uppercase tracking-wide">
                    <span>Panning</span>
                    <span className="text-blue-400 font-mono">
                        {track.pan === 0
                            ? "CENTER"
                            : track.pan && track.pan > 0
                                ? `R ${Math.round(track.pan * 35)}°`
                                : `L ${Math.round(Math.abs(track.pan || 0) * 35)}°`
                        }
                    </span>
                </div>
                <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.01}
                    value={track.pan ?? 0}
                    onChange={(e) => updateTrackPan(track.id, Number(e.target.value))}
                    onMouseDown={pushHistory}
                    onTouchStart={pushHistory}
                    onDoubleClick={handlePanDoubleClick}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                    title="Double-click to reset to Center"
                />
            </div>

            {/* Row 3: Mute | Sound (Gain/Vol) | Solo */}
            <div className="flex items-center gap-2 h-8">
                {/* MUTE */}
                <button
                    onClick={(e) => { e.stopPropagation(); toggleTrackMute(track.id); }}
                    className={`
                        w-8 h-7 flex items-center justify-center rounded text-[11px] font-black transition-all shrink-0 border
                        ${track.muted ? "bg-red-500 text-white border-red-400" : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border-white/5"}
                    `}
                    title="Mute"
                >
                    M
                </button>

                {/* SOUND / GAIN */}
                <div className="flex-1 flex flex-col gap-0.5 group/vol">
                    <div className="flex justify-between text-[8px] text-gray-400 font-black uppercase tracking-tighter mb-[-2px]">
                        <span>Sound Level</span>
                        <span>{volPercent}%</span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.001}
                        value={track.volume}
                        onChange={(e) => updateTrackVolume(track.id, Number(e.target.value))}
                        onMouseDown={pushHistory}
                        onTouchStart={pushHistory}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full min-w-0 accent-orange-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer hover:bg-gray-600 transition-all font-bold"
                        title={`Sound Level: ${volPercent}%`}
                    />
                </div>

                {/* SOLO */}
                <button
                    onClick={(e) => { e.stopPropagation(); toggleTrackSolo(track.id); }}
                    className={`
                        w-8 h-7 flex items-center justify-center rounded text-[11px] font-black transition-all shrink-0 border
                        ${track.solo ? "bg-yellow-500 text-black border-yellow-400 shadow-md shadow-yellow-500/30" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border-white/5"}
                    `}
                    title="Solo"
                >
                    S
                </button>
            </div>
        </div>
    );
}
