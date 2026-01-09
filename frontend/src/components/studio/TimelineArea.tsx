import React, { useRef, useState, useEffect } from "react";
import { Plus, Undo, Redo, ZoomIn, ZoomOut } from "lucide-react";
import { useStudio } from "./StudioContext";
import TimelineRuler from "./TimelineRuler";
import TrackControl from "./TrackControl";
import TrackClipsRow from "./TrackClipsRow";

export default function TimelineArea() {
    const {
        assets,
        tracks,
        playing,
        addClip,
        currentTime,
        seek,
        zoom,
        setZoom,
        duration,
        addTrack,
        updateClip,
        deleteClip,
        duplicateClip,
        selectedClipIds,
        selectClip,
        moveClip,
        splitClip,
        reorderTrack,
        undo,
        redo,
        canUndo,
        canRedo,
        isTracksExpanded,
        setIsTracksExpanded,
    } = useStudio();

    const tracksAreaRef = useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const [scrubbing, setScrubbing] = useState(false);

    const TRACK_HEIGHT = isTracksExpanded ? 100 : 40;
    const SIDEBAR_WIDTH = isTracksExpanded ? 240 : 140;
    const timelineWidth = Math.max(1, duration * zoom);

    /* ======================================================
       HELPER: Get Timeline Time from Mouse
    ====================================================== */

    const getTimeAtMouse = (clientX: number) => {
        const rect = tracksAreaRef.current?.getBoundingClientRect();
        if (!rect) return 0;
        const x = clientX - rect.left;
        return Math.max(0, Math.min(duration, x / zoom));
    };

    /* ======================================================
       DROP AUDIO ASSET
    ====================================================== */

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();

        const assetId = e.dataTransfer.getData("text/plain");
        if (!assetId) return;

        const asset = assets.find((a) => a.id === assetId);
        if (!asset) return;

        const startTime = getTimeAtMouse(e.clientX);
        addClip(asset, startTime);
    };

    /* ======================================================
       CLICK TO SEEK
    ====================================================== */

    const onTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Don't seek if clicking a clip (drag-to-move handled by ClipView)
        const isClipping = (e.target as HTMLElement).closest("[data-clip]");
        if (isClipping && !e.altKey) return;

        const t = getTimeAtMouse(e.clientX);
        seek(t);
    };

    /* ======================================================
       PLAYHEAD DRAG / SCRUB
    ====================================================== */

    const onPlayheadMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setScrubbing(true);

        const onMove = (ev: MouseEvent) => {
            const t = getTimeAtMouse(ev.clientX);
            seek(t);
        };

        const onUp = () => {
            setScrubbing(false);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    /* ======================================================
       ZOOM WITH MOUSE WHEEL
    ====================================================== */

    useEffect(() => {
        const div = tracksAreaRef.current;
        if (!div) return;

        const handleWheel = (e: WheelEvent) => {
            // Zoom only if Alt or Ctrl is held
            if (e.altKey || e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY;
                const zoomFactor = delta > 0 ? 0.9 : 1.1;

                // Keep the time under the mouse consistent
                const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.1), 2000);
                setZoom(newZoom);
            }
        };

        div.addEventListener("wheel", handleWheel, { passive: false });
        return () => div.removeEventListener("wheel", handleWheel);
    }, [zoom, setZoom, duration]);

    /* ======================================================
       KEYBOARD SHORTCUTS
    ====================================================== */

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

            if (ctrlOrCmd && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if (ctrlOrCmd && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redo();
            }

            if (e.key === 'Delete' && selectedClipIds.size > 0) {
                e.preventDefault();
                selectedClipIds.forEach(id => {
                    tracks.forEach(track => {
                        if (track.clips.some(c => c.id === id)) deleteClip(track.id, id);
                    });
                });
            }

            if ((e.key === '+' || e.key === '=') && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                setZoom(Math.min(zoom * 1.2, 2000));
            }
            if (e.key === '-' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                setZoom(Math.max(zoom / 1.2, 0.1));
            }

            if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                tracks.forEach(track => {
                    track.clips.forEach(clip => {
                        const clipEnd = clip.offset + (clip.endTime - clip.startTime);
                        if (currentTime > clip.offset && currentTime < clipEnd) splitClip(track.id, clip.id, currentTime);
                    });
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, tracks, currentTime, selectedClipIds, splitClip, zoom, setZoom]);

    const playheadRef = useRef<HTMLDivElement | null>(null);
    const { currentTimeRef } = useStudio();

    useEffect(() => {
        let raf: number;
        const updatePlayhead = () => {
            if (playheadRef.current) {
                const time = currentTimeRef.current;
                const playheadX = time * zoom;
                playheadRef.current.style.left = `${playheadX}px`;

                // AUTO-SCROLL LOGIC
                if (playing && scrollContainerRef.current) {
                    const container = scrollContainerRef.current;
                    const scrollLeft = container.scrollLeft;
                    const viewportWidth = container.clientWidth;

                    // Usable width is what's left after the sidebar
                    const usableWidth = viewportWidth - SIDEBAR_WIDTH;

                    // Position of playhead relative to the current scroll (after sidebar)
                    const playheadRelativeX = playheadX - scrollLeft;

                    // Continuous Centering Logic
                    const centerOffset = SIDEBAR_WIDTH + (usableWidth / 2);
                    const currentScreenPos = playheadX - scrollLeft;

                    // If playhead is at or past the center, scroll to keep it centered
                    // But don't scroll if we are near the start (playhead < centerOffset)
                    if (playheadX > (usableWidth / 2)) {
                        // Calculate target scroll to put playhead in center
                        const targetScroll = playheadX - (usableWidth / 2);

                        // Apply immediately for smooth look
                        if (Math.abs(targetScroll - scrollLeft) > 1) {
                            container.scrollLeft = targetScroll;
                        }
                    } else {
                        // If we are at the very start, ensure we are scrolled to 0
                        if (scrollLeft > 0 && playheadX < (usableWidth / 2)) {
                            container.scrollLeft = 0;
                        }
                    }
                }
            }
            raf = requestAnimationFrame(updatePlayhead);
        };
        raf = requestAnimationFrame(updatePlayhead);
        return () => cancelAnimationFrame(raf);
    }, [zoom, currentTimeRef, playing, SIDEBAR_WIDTH]);

    const isEmpty = tracks.every((t) => t.clips.length === 0);

    return (
        <div className="flex-1 flex flex-col bg-[#0b0d12] select-none overflow-hidden">
            <div ref={scrollContainerRef} className="flex-1 overflow-auto relative">
                <div className="flex flex-col min-w-full" style={{ width: SIDEBAR_WIDTH + timelineWidth }}>
                    <div className="flex sticky top-0 z-40 h-8 bg-[#111318] border-b border-white/10">
                        <div className="sticky left-0 top-0 z-50 bg-[#111318] border-r border-white/10 shrink-0 flex items-center justify-between px-2" style={{ width: SIDEBAR_WIDTH }}>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={undo} disabled={!canUndo} className={`p-1 rounded transition ${canUndo ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'text-gray-600'}`}>
                                    <Undo size={14} />
                                </button>
                                <button type="button" onClick={redo} disabled={!canRedo} className={`p-1 rounded transition ${canRedo ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'text-gray-600'}`}>
                                    <Redo size={14} />
                                </button>
                            </div>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => setIsTracksExpanded(!isTracksExpanded)} className={`p-1 rounded transition ${isTracksExpanded ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                                <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
                                <button type="button" onClick={() => setZoom(Math.min(zoom * 1.2, 2000))} className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 transition">
                                    <ZoomIn size={14} />
                                </button>
                                <button type="button" onClick={() => setZoom(Math.max(zoom / 1.2, 0.1))} className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 transition">
                                    <ZoomOut size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="relative flex-1 bg-[#0b0d12]">
                            <TimelineRuler zoom={zoom} duration={duration} />
                        </div>
                    </div>

                    <div className="flex flex-1">
                        <div className="sticky left-0 z-40 bg-[#111318] border-r border-white/10 shrink-0 flex flex-col shadow-2xl" style={{ width: SIDEBAR_WIDTH }}>
                            {tracks.map((track) => <TrackControl key={track.id} track={track} height={TRACK_HEIGHT} />)}
                            <div className="p-2 border-t border-white/10">
                                <button type="button" onClick={() => addTrack("music")} className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition border border-white/5">
                                    <Plus size={14} /> Add Track
                                </button>
                            </div>
                        </div>

                        <div ref={tracksAreaRef} className="relative flex-1 bg-[#0b0d12] cursor-pointer" onDragOver={(e) => e.preventDefault()} onDrop={onDrop} onMouseDown={onTimelineMouseDown} style={{ height: (tracks.length * TRACK_HEIGHT) + 100 }}>
                            {isEmpty && <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm pointer-events-none sticky left-0"><span className="ml-[200px]">Drag audio here to start</span></div>}
                            <div ref={playheadRef} onMouseDown={onPlayheadMouseDown} className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-50 cursor-ew-resize hover:w-[4px] transition-all will-change-transform">
                                <div className="absolute top-0 -left-1.5 w-4 h-4 bg-red-500 transform rotate-45 -mt-2 rounded-sm shadow-md" />
                            </div>

                            {tracks.map((track, index) => (
                                <TrackClipsRow
                                    key={track.id}
                                    track={track}
                                    trackIndex={index}
                                    allTracks={tracks}
                                    height={TRACK_HEIGHT}
                                    zoom={zoom}
                                    duration={duration}
                                    assets={assets}
                                    selectedClipIds={selectedClipIds}
                                    addClip={addClip}
                                    updateClip={updateClip}
                                    deleteClip={deleteClip}
                                    duplicateClip={duplicateClip}
                                    selectClip={selectClip}
                                    moveClip={moveClip}
                                    splitClip={splitClip}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
