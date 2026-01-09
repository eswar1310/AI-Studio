
import React from "react";
import ClipView from "./ClipView";
import { TrackData, StudioAsset, ClipData } from "./studio.types"; // Ensure StudioAsset is imported

interface TrackClipsRowProps {
    track: TrackData;
    trackIndex: number;
    allTracks: TrackData[];
    height: number;
    zoom: number;
    duration: number;
    assets: StudioAsset[];
    selectedClipIds: Set<string>;
    addClip: (asset: StudioAsset, startTime: number, trackId?: string) => void;
    updateClip: (trackId: string, clip: ClipData) => void;
    deleteClip: (trackId: string, clipId: string) => void;
    duplicateClip: (trackId: string, clipId: string) => void;
    selectClip: (id: string, mode: "single" | "add" | "toggle") => void;
    moveClip: (srcTrackId: string, destTrackId: string, clipId: string, newOffset: number) => void;
    splitClip: (trackId: string, clipId: string, splitTime: number) => void;
}

function TrackClipsRow({
    track,
    trackIndex,
    allTracks,
    height,
    zoom,
    duration,
    assets,
    selectedClipIds,
    addClip,
    updateClip,
    deleteClip,
    duplicateClip,
    selectClip,
    moveClip,
    splitClip
}: TrackClipsRowProps) {

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const dropTime = Math.max(0, Math.min(duration, x / zoom));

        // 1. Try to get existing clip for move
        try {
            const clipDataRaw = e.dataTransfer.getData("application/json");
            if (clipDataRaw) {
                const data = JSON.parse(clipDataRaw);
                const { clipId, trackId: srcTrackId, grabOffset } = data;

                if (clipId && srcTrackId) {
                    const finalOffset = Math.max(0, dropTime - (grabOffset || 0));
                    moveClip(srcTrackId, track.id, clipId, finalOffset);
                    return;
                }
            }
        } catch (err) {
            // ignore JSON parse error
        }

        // 2. Fallback: Asset Drop
        const assetId = e.dataTransfer.getData("text/plain");
        if (assetId) {
            const asset = assets.find((a) => a.id === assetId);
            if (asset) {
                addClip(asset, dropTime, track.id);
            }
        }
    };

    return (
        <div
            className="relative border-b border-white/10 w-full"
            style={{ height }}
            onDragOver={onDragOver}
            onDrop={onDrop}
            data-track-id={track.id}
        >
            {/* Background Track Name (Sticky so it stays visible after scrolling) */}
            <div className="sticky left-0 h-full flex items-center justify-start pl-4 pointer-events-none opacity-20 select-none overflow-hidden z-0 w-fit whitespace-nowrap">
                <span className="text-4xl font-bold text-white/10 uppercase tracking-widest">
                    {track.name}
                </span>
            </div>

            {track.clips.map((clip) => {
                const assetName = assets.find((a) => a.id === clip.assetId)?.name || "Clip";
                return (
                    <ClipView
                        key={clip.id}
                        clip={clip}
                        zoom={zoom}
                        trackHeight={height}
                        color={track.color || "#3b82f6"}
                        selected={selectedClipIds.has(clip.id)}
                        onSelect={(mode) => selectClip(clip.id, mode)}
                        onUpdate={(updated) => updateClip(track.id, updated)}
                        onDelete={() => deleteClip(track.id, clip.id)}
                        onDuplicate={() => duplicateClip(track.id, clip.id)}
                        onSplit={(splitTime) => splitClip(track.id, clip.id, splitTime)}
                        onMove={(srcId, destId, cId, offset) => moveClip(srcId, destId, cId, offset)}
                        trackId={track.id}
                        trackIndex={trackIndex}
                        allTracks={allTracks}
                        name={assetName}
                    />
                );
            })}
        </div>
    );
}

export default React.memo(TrackClipsRow);
