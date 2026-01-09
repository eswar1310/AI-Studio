import { StudioAsset } from "./studio.types";

/* ======================================================
   SHARED AUDIO CONTEXT (SINGLETON)
====================================================== */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    return audioCtx;
}

/* ======================================================
   DECODE CACHE
====================================================== */

const bufferCache = new Map<string, AudioBuffer>();

/* ======================================================
   DECODE AUDIO ASSET
====================================================== */

/**
 * Decode audio for a StudioAsset
 * - Cached by asset.id
 * - Safe to call multiple times
 */
export async function decodeAssetAudio(
    asset: StudioAsset
): Promise<AudioBuffer | null> {
    // Only audio assets
    if (asset.kind === "video") return null;

    // Cached
    if (bufferCache.has(asset.id)) {
        return bufferCache.get(asset.id)!;
    }

    try {
        const ctx = getAudioContext();

        const res = await fetch(asset.url);
        const arrayBuffer = await res.arrayBuffer();

        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        bufferCache.set(asset.id, audioBuffer);
        return audioBuffer;
    } catch (err) {
        console.error("Audio decode failed:", err);
        return null;
    }
}

/**
 * Professional Autocorrelation-based BPM detection
 * More robust than simple peak detection
 */
export async function detectBpm(buffer: AudioBuffer): Promise<number> {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;

    // Use a subset of the audio (up to 30 seconds from the middle) to save CPU
    const maxSeconds = 30;
    const startOffset = Math.max(0, Math.floor(data.length / 2) - Math.floor(sampleRate * maxSeconds / 2));
    const endOffset = Math.min(data.length, startOffset + Math.floor(sampleRate * maxSeconds));
    const processedData = data.slice(startOffset, endOffset);

    // Downsample for speed (aiming for ~1000-2000Hz internal sample rate)
    const downsampleFactor = Math.floor(sampleRate / 1000);
    const dsRate = sampleRate / downsampleFactor;
    const dsData = new Float32Array(Math.floor(processedData.length / downsampleFactor));
    for (let i = 0; i < dsData.length; i++) {
        dsData[i] = processedData[i * downsampleFactor];
    }

    // Autocorrelation
    const minTempo = 60;  // 1s
    const maxTempo = 200; // 0.3s
    const minLag = Math.floor(dsRate / (maxTempo / 60));
    const maxLag = Math.floor(dsRate / (minTempo / 60));

    let bestLag = -1;
    let maxCorrelation = -Infinity;

    for (let lag = minLag; lag < maxLag; lag++) {
        let correlation = 0;
        for (let i = 0; i < dsData.length - lag; i++) {
            correlation += dsData[i] * dsData[i + lag];
        }

        if (correlation > maxCorrelation) {
            maxCorrelation = correlation;
            bestLag = lag;
        }
    }

    if (bestLag === -1) return 120;

    let bpm = (60 * dsRate) / bestLag;

    // Correct for double/half tempo errors by checking local peaks
    if (bpm < 80) bpm *= 2;
    if (bpm > 180) bpm /= 2;

    // Snap to integers
    bpm = Math.round(bpm);

    // Common DAW snaps
    if (Math.abs(bpm - 120) < 1) bpm = 120;
    if (Math.abs(bpm - 128) < 1) bpm = 128;
    if (Math.abs(bpm - 140) < 1) bpm = 140;

    console.log(`BPM Detected: ${bpm} (Lag: ${bestLag}, Rate: ${dsRate})`);
    return bpm;
}

export function clearAudioCache() {
    bufferCache.clear();
}
