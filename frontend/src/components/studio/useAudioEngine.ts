import { useRef } from "react";
import { TrackData, ClipData } from "./studio.types";

/* ======================================================
   AUDIO ENGINE HOOK
====================================================== */

export function useAudioEngine() {
    const ctxRef = useRef<AudioContext | null>(null);
    const playingNodes = useRef<AudioBufferSourceNode[]>([]);
    const startTimeRef = useRef<number>(0);

    /* ======================================================
       INIT
    ====================================================== */

    const getContext = () => {
        if (!ctxRef.current) {
            ctxRef.current = new AudioContext();
        }
        return ctxRef.current;
    };

    /* ======================================================
       PLAY
    ====================================================== */

    const play = (tracks: TrackData[], fromTime = 0) => {
        stop(); // stop any existing playback

        const ctx = getContext();
        startTimeRef.current = ctx.currentTime - fromTime;

        tracks.forEach((track) => {
            if (track.muted) return;

            track.clips.forEach((clip) => {
                scheduleClip(ctx, track, clip, fromTime);
            });
        });
    };

    /* ======================================================
       SCHEDULE CLIP
    ====================================================== */

    const scheduleClip = (
        ctx: AudioContext,
        track: TrackData,
        clip: ClipData,
        fromTime: number
    ) => {
        const durationSec = clip.endTime - clip.startTime;
        const clipStart = clip.offset;
        const clipEnd = clip.offset + durationSec;

        // Skip clips before playhead
        if (clipEnd <= fromTime) return;
        if (!clip.buffer) return;

        const source = ctx.createBufferSource();
        source.buffer = clip.buffer;

        // Fades Gain Stage (0 to 1)
        const fadeGain = ctx.createGain();
        fadeGain.gain.setValueAtTime(0, ctx.currentTime);

        // Track Volume Stage
        const volumeGain = ctx.createGain();
        volumeGain.gain.value = track.volume;

        // Connect everything: source -> fade -> track volume -> destination
        source.connect(fadeGain).connect(volumeGain).connect(ctx.destination);

        const scheduledStart = Math.max(0, clipStart - fromTime);
        const playStartTime = ctx.currentTime + scheduledStart;

        const bufferOffset = clip.startTime + Math.max(0, fromTime - clipStart);
        const playDuration = durationSec - Math.max(0, fromTime - clipStart);

        // --- FADES LOGIC (RELIABLE S-CURVES) ---
        const fadeIn = Math.max(0.001, clip.fadeIn || 0.001);
        const fadeOut = Math.max(0.001, clip.fadeOut || 0.001);

        const absoluteFadeInEnd = clipStart + fadeIn;
        const absoluteFadeOutStart = clipEnd - fadeOut;

        // Professional S-Curve Interpolator (startV to endV)
        const applySCurve = (param: AudioParam, startV: number, endV: number, startTime: number, duration: number) => {
            const segments = 32; // Professional precision
            param.setValueAtTime(startV, startTime);
            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                const sCurvePos = 0.5 - 0.5 * Math.cos(t * Math.PI);
                const val = startV + (endV - startV) * sCurvePos;
                param.linearRampToValueAtTime(val, startTime + (t * duration));
            }
        };

        // 1. Fade In
        const fadeEndRel = (clipStart + fadeIn) - fromTime;
        if (fromTime < absoluteFadeInEnd) {
            if (fromTime < clipStart) {
                // Starts before clip: Silence -> Curve
                fadeGain.gain.setValueAtTime(0, ctx.currentTime);
                fadeGain.gain.setValueAtTime(0, playStartTime);
                applySCurve(fadeGain.gain, 0, 1, playStartTime, fadeIn);
            } else {
                // Starts mid-fade: Precise calculation
                const progress = (fromTime - clipStart) / fadeIn;
                const currentV = 0.5 - 0.5 * Math.cos(progress * Math.PI);
                const remainingT = absoluteFadeInEnd - fromTime;
                fadeGain.gain.setValueAtTime(currentV, ctx.currentTime);
                applySCurve(fadeGain.gain, currentV, 1, ctx.currentTime, remainingT);
            }
            // Hold at 1.0 after fade
            fadeGain.gain.setValueAtTime(1, ctx.currentTime + Math.max(0, fadeEndRel));
        } else {
            fadeGain.gain.setValueAtTime(1, ctx.currentTime);
        }

        // 2. Fade Out
        if (clipEnd > fromTime) {
            const fadeOutStartT = Math.max(fromTime, absoluteFadeOutStart);
            const timeUntilFadeOut = fadeOutStartT - fromTime;
            const scheduledFadeOutStart = ctx.currentTime + timeUntilFadeOut;
            const remainingDuration = clipEnd - fromTime;

            if (fromTime < absoluteFadeOutStart) {
                fadeGain.gain.setValueAtTime(1, scheduledFadeOutStart);
                applySCurve(fadeGain.gain, 1, 0, scheduledFadeOutStart, fadeOut);
            } else {
                const progress = (fromTime - absoluteFadeOutStart) / fadeOut;
                const currentV = 1.0 - (0.5 - 0.5 * Math.cos(progress * Math.PI));
                fadeGain.gain.setValueAtTime(currentV, ctx.currentTime);
                applySCurve(fadeGain.gain, currentV, 0, ctx.currentTime, remainingDuration);
            }
        }

        try {
            source.start(playStartTime, bufferOffset, playDuration);
            playingNodes.current.push(source);
        } catch {
            // ignore scheduling errors
        }
    };

    /* ======================================================
       STOP
    ====================================================== */

    const stop = () => {
        playingNodes.current.forEach((n) => {
            try {
                n.stop();
            } catch { }
        });
        playingNodes.current = [];
    };

    /* ======================================================
       GET CURRENT TIME
    ====================================================== */

    const getCurrentTime = () => {
        const ctx = ctxRef.current;
        if (!ctx) return 0;
        return ctx.currentTime - startTimeRef.current;
    };

    /* ======================================================
       API
    ====================================================== */

    return {
        play,
        stop,
        getCurrentTime,
    };
}
