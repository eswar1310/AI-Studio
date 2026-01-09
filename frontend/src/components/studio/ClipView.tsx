import { useRef, useState } from "react";
import WaveformCanvas from "./WaveformCanvas";
import { X, Copy, GripVertical, Scissors } from "lucide-react";
import { ClipData, TrackData } from "./studio.types";
import { useStudio } from "./StudioContext";

/* ======================================================
   PROPS
====================================================== */

interface ClipViewProps {
    clip: ClipData;
    zoom: number; // px per second
    trackHeight: number;
    color: string;
    selected: boolean;
    trackId: string;
    trackIndex: number;
    allTracks: TrackData[];
    name: string;

    onSelect: (mode: "single" | "add" | "toggle") => void;
    onUpdate: (clip: ClipData, skipHistory?: boolean) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onSplit: (time: number) => void;
    onMove: (srcTrackId: string, destTrackId: string, clipId: string, newOffset: number) => void;
}

/* ======================================================
   CONSTANTS
====================================================== */

const MIN_CLIP_LENGTH = 0.05; // seconds

/* ======================================================
   COMPONENT
====================================================== */

export default function ClipView({
    clip,
    zoom,
    trackHeight,
    color,
    selected,
    trackId,
    trackIndex,
    allTracks,
    name,
    onSelect,
    onUpdate,
    onDelete,
    onDuplicate,
    onSplit,
    onMove
}: ClipViewProps) {
    const ref = useRef<HTMLDivElement>(null);

    const [dragMode, setDragMode] =
        useState<"move" | "trimL" | "trimR" | "fadeL" | "fadeR" | null>(null);

    const pxPerSec = zoom;
    const playbackRate = clip.playbackRate || 1.0;
    const duration = (clip.endTime - clip.startTime) / playbackRate;

    const width = Math.max(1, duration * pxPerSec);
    const left = clip.offset * pxPerSec;

    const fadeInWidth = (clip.fadeIn || 0) * pxPerSec;
    const fadeOutWidth = (clip.fadeOut || 0) * pxPerSec;

    /* ======================================================
       SPLIT LOGIC (Context Menu or Button)
    ====================================================== */

    const onContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickTime = clip.offset + (clickX / pxPerSec);

        onSplit(clickTime);
    };

    /* ======================================================
       SELECTION HANDLER
    ====================================================== */

    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (e.shiftKey) {
            onSelect("add");
        } else if (e.metaKey || e.ctrlKey) {
            onSelect("toggle");
        } else {
            onSelect("single");
        }
    };

    /* ======================================================
       DRAG / TRIM / FADE LOGIC (MOUSE-BASED)
    ====================================================== */

    const startDrag = (
        e: React.MouseEvent,
        mode: "move" | "trimL" | "trimR" | "fadeL" | "fadeR"
    ) => {
        e.stopPropagation();
        onSelect("single");
        setDragMode(mode);

        const startX = e.clientX;
        const startY = e.clientY;
        const original = { ...clip };

        const handleMouseMove = (ev: MouseEvent) => {
            const dx = (ev.clientX - startX) / pxPerSec;

            // HORIZONTAL MOVE
            if (mode === "move") {
                const newOffset = Math.max(0, original.offset + dx);
                onUpdate({ ...original, offset: newOffset }, true);
            }

            // TRIM LEFT
            if (mode === "trimL") {
                const bufferDx = dx * playbackRate;
                const newStart = Math.min(
                    original.endTime - (MIN_CLIP_LENGTH * playbackRate),
                    Math.max(0, original.startTime + bufferDx)
                );
                // Adjust offset by the actual change in timeline time
                const actualTimelineDx = (newStart - original.startTime) / playbackRate;
                onUpdate({ ...original, startTime: newStart, offset: original.offset + actualTimelineDx }, true);
            }

            // TRIM RIGHT
            if (mode === "trimR") {
                const bufferDx = dx * playbackRate;
                const newEnd = Math.max(
                    original.startTime + (MIN_CLIP_LENGTH * playbackRate),
                    original.endTime + bufferDx
                );
                onUpdate({ ...original, endTime: newEnd }, true);
            }

            // FADE IN
            if (mode === "fadeL") {
                const newFadeIn = Math.max(0, Math.min(duration - (clip.fadeOut || 0), (original.fadeIn || 0) + dx));
                onUpdate({ ...original, fadeIn: newFadeIn }, true);
            }

            // FADE OUT
            if (mode === "fadeR") {
                const newFadeOut = Math.max(0, Math.min(duration - (clip.fadeIn || 0), (original.fadeOut || 0) - dx));
                onUpdate({ ...original, fadeOut: newFadeOut }, true);
            }
        };

        const onUp = (ev: MouseEvent) => {
            setDragMode(null);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", onUp);

            if (mode === "move") {
                const dx = (ev.clientX - startX) / pxPerSec;
                const dy = ev.clientY - startY;
                const trackDelta = Math.round(dy / (trackHeight + 8)); // adjust for gaps

                const newOffset = Math.max(0, original.offset + dx);
                const newTrackIdx = Math.max(0, Math.min(allTracks.length - 1, trackIndex + trackDelta));
                const destTrackId = allTracks[newTrackIdx].id;

                if (destTrackId !== trackId || newOffset !== original.offset) {
                    onMove(trackId, destTrackId, clip.id, newOffset);
                }
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", onUp);
    };

    /* ======================================================
       RENDER
    ====================================================== */

    return (
        <div
            ref={ref}
            data-clip
            onMouseDown={(e) => startDrag(e, "move")}
            onClick={handleSelect}
            onContextMenu={onContextMenu}
            title="Drag to Move | Right-click to Split"
            className={`
                absolute top-1 rounded-md overflow-hidden
                transition-shadow group
                ${selected ? "ring-2 ring-orange-400 shadow-lg z-20" : "z-10 hover:z-20"}
            `}
            style={{
                left,
                width,
                height: trackHeight - 8,
                background: color,
                cursor: dragMode ? "grabbing" : "grab",
                transition: dragMode ? 'none' : 'all 0.1s ease-out'
            }}
        >
            {/* ##### FADE OVERLAYS ##### */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-30"
                preserveAspectRatio="none"
            >
                <defs>
                    <linearGradient id={`fadeInGradient-${clip.id}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="black" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="black" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id={`fadeOutGradient-${clip.id}`} x1="1" y1="0" x2="0" y2="0">
                        <stop offset="0%" stopColor="black" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="black" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {fadeInWidth > 0 && (
                    <>
                        {/* Fade In Shading - S-Curve (Logarithmic/Equal Power feel) */}
                        <path
                            d={`M 0,${trackHeight - 8} C ${fadeInWidth * 0.4},${trackHeight - 8} ${fadeInWidth * 0.6},0 ${fadeInWidth},0 L 0,0 Z`}
                            fill={`url(#fadeInGradient-${clip.id})`}
                        />
                        {/* Fade In Line */}
                        <path
                            d={`M 0,${trackHeight - 8} C ${fadeInWidth * 0.4},${trackHeight - 8} ${fadeInWidth * 0.6},0 ${fadeInWidth},0`}
                            fill="none"
                            stroke="rgba(255,255,255,0.9)"
                            strokeWidth="2"
                        />
                    </>
                )}

                {fadeOutWidth > 0 && (
                    <>
                        {/* Fade Out Shading - S-Curve */}
                        <path
                            d={`M ${width - fadeOutWidth},0 C ${width - fadeOutWidth * 0.4},0 ${width - fadeOutWidth * 0.6},${trackHeight - 8} ${width},${trackHeight - 8} L ${width},0 Z`}
                            fill={`url(#fadeOutGradient-${clip.id})`}
                        />
                        {/* Fade Out Line */}
                        <path
                            d={`M ${width - fadeOutWidth},0 C ${width - fadeOutWidth * 0.4},0 ${width - fadeOutWidth * 0.6},${trackHeight - 8} ${width},${trackHeight - 8}`}
                            fill="none"
                            stroke="rgba(255,255,255,0.9)"
                            strokeWidth="2"
                        />
                    </>
                )}
            </svg>

            {/* ===== MOVE GRIP (Vertical Drag Icon) ===== */}
            <div
                className="absolute left-0 top-0 bottom-0 w-6 z-50 flex items-center justify-center opacity-30 group-hover:opacity-80 transition-opacity bg-black/10 group-hover:bg-black/20 border-r border-white/5 pointer-events-none"
            >
                <GripVertical size={14} className="text-white" />
            </div>

            {/* ##### FADE HANDLES ##### */}
            {/* Fade In Handle */}
            <div
                onMouseDown={(e) => startDrag(e, "fadeL")}
                className="absolute top-0 w-6 h-6 flex items-center justify-center z-50 opacity-0 group-hover:opacity-100 transition-all cursor-ew-resize hover:scale-110"
                style={{ left: fadeInWidth, transform: 'translateX(-50%)' }}
                title="Adjust Fade In"
            >
                <div className="w-3.5 h-3.5 bg-white border-2 border-orange-500 rounded-full shadow-lg" />
            </div>
            {/* Fade Out Handle */}
            <div
                onMouseDown={(e) => startDrag(e, "fadeR")}
                className="absolute top-0 w-6 h-6 flex items-center justify-center z-50 opacity-0 group-hover:opacity-100 transition-all cursor-ew-resize hover:scale-110"
                style={{ right: fadeOutWidth, transform: 'translateX(50%)' }}
                title="Adjust Fade Out"
            >
                <div className="w-3.5 h-3.5 bg-white border-2 border-orange-500 rounded-full shadow-lg" />
            </div>

            {/* ===== LEFT TRIM HANDLE ===== */}
            <div
                onMouseDown={(e) => startDrag(e, "trimL")}
                className="absolute left-6 top-0 w-3 h-full z-40 cursor-ew-resize hover:bg-orange-500/40"
                title="Trim Left"
            />

            {/* ===== RIGHT TRIM HANDLE ===== */}
            <div
                onMouseDown={(e) => startDrag(e, "trimR")}
                className="absolute right-0 top-0 w-3 h-full z-40 cursor-ew-resize hover:bg-orange-500/40"
                title="Trim Right"
            />

            {/* ===== CLIP NAME ===== */}
            <div className="absolute top-1 left-8 max-w-[calc(100%-40px)] truncate text-[10px] items-center font-bold z-50 pointer-events-none select-none text-white drop-shadow-sm uppercase tracking-wider">
                {name}
            </div>

            {/* ===== WAVEFORM ===== */}
            <div className="pl-4 pr-2 w-full h-full pointer-events-none">
                <WaveformCanvas
                    buffer={clip.buffer ?? null}
                    width={width - 24} // adjust for handles
                    height={trackHeight - 8}
                    startTime={clip.startTime}
                    endTime={clip.endTime}
                    selected={selected}
                />
            </div>

            {/* ===== ACTION BUTTONS ===== */}
            {selected && (
                <div className="absolute top-1 right-1 flex gap-1 z-50">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // Split at 50% for quick button access or just hint?
                            // Better to rely on right click
                        }}
                        className="p-1 bg-black/70 rounded hover:bg-black pointer-events-none opacity-50"
                        title="Right-click to split"
                    >
                        <Scissors size={12} />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate();
                        }}
                        className="p-1 bg-black/70 rounded hover:bg-black"
                        title="Duplicate clip"
                    >
                        <Copy size={12} />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-1 bg-black/70 rounded hover:bg-red-600"
                        title="Delete clip"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}
        </div>
    );
}
