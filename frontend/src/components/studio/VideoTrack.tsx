import React, { useEffect, useRef } from "react";

interface VideoTrackProps {
    src: string | null;
    playing: boolean;
    playhead: number;
    onDuration?: (d: number) => void;
}

const VideoTrack = React.memo(function VideoTrack({
    src,
    playing,
    playhead,
    onDuration,
}: VideoTrackProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    /* ================= SYNC PLAYHEAD ================= */
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) return;

        // If difference is significant, seek
        if (Math.abs(video.currentTime - playhead) > 0.1) {
            video.currentTime = playhead;
        }

        // Keep play state in sync
        if (playing && video.paused) {
            video.play().catch(() => { });
        } else if (!playing && !video.paused) {
            video.pause();
        }
    }, [playhead, playing, src]);

    /* ================= DURATION ================= */
    const onLoaded = () => {
        const video = videoRef.current;
        if (!video || !onDuration) return;
        onDuration(video.duration);
    };

    /* ================= RENDER ================= */
    if (!src) {
        return (
            <div className="h-56 flex items-center justify-center bg-black/50 text-gray-500 border-b border-white/10">
                Drop a video to sync music
            </div>
        );
    }

    return (
        <div className="h-56 bg-black border-b border-white/10 flex justify-center">
            <video
                ref={videoRef}
                src={src}
                className="h-full w-auto object-contain"
                onLoadedMetadata={onLoaded}
                controls={false}
                muted={false} // Maybe mute if we want user to control it? 
            // Actually, StudioContext has "Track" for video usually...?
            // But VideoTrack is separate. 
            // Let's keep it unmuted for now, or assume audio comes from separate audio track?
            // Usually video has its own audio. 
            />
        </div>
    );
});

export default VideoTrack;
