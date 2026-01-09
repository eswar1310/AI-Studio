import { TrackData } from "./studio.types";

/**
 * Encodes an AudioBuffer to a WAV Blob
 */
function bufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this example)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // write interleaved data
    for (i = 0; i < buffer.numberOfChannels; i++)
        channels.push(buffer.getChannelData(i));

    while (pos < buffer.length) {
        for (i = 0; i < numOfChan; i++) {
            // interleave channels
            sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(44 + offset, sample, true); // write 16-bit sample
            offset += 2;
        }
        pos++;
    }

    return new Blob([bufferArr], { type: "audio/wav" });

    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}

/**
 * Renders the current tracks to a single WAV file
 */
export async function exportMixToWav(
    tracks: TrackData[],
    duration: number
): Promise<Blob> {
    // 1. Setup Offline Context
    const sampleRate = 44100;
    const length = Math.ceil(duration * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

    // 2. Schedule Sources
    for (const track of tracks) {
        if (track.muted || track.clips.length === 0) continue;

        // Track Gain
        const trackGain = offlineCtx.createGain();
        trackGain.gain.value = track.volume;
        trackGain.connect(offlineCtx.destination);

        for (const clip of track.clips) {
            if (!clip.buffer) continue;

            const source = offlineCtx.createBufferSource();
            source.buffer = clip.buffer;

            // Apply Transpose
            source.detune.value = (track.transpose || 0) * 100;

            // Create per-clip gain for fades
            const clipGain = offlineCtx.createGain();
            const clipDuration = clip.endTime - clip.startTime;
            const clipStart = clip.offset;
            const clipEnd = clip.offset + clipDuration;

            const fadeIn = Math.max(0.005, clip.fadeIn || 0.005);
            const fadeOut = Math.max(0.005, clip.fadeOut || 0.005);

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

            // Automate Fades
            applySCurve(clipGain.gain, 0, 1, clipStart, fadeIn);
            clipGain.gain.setValueAtTime(1, clipStart + fadeIn);
            clipGain.gain.setValueAtTime(1, Math.max(clipStart + fadeIn, clipEnd - fadeOut));
            applySCurve(clipGain.gain, 1, 0, clipEnd - fadeOut, fadeOut);
            clipGain.gain.setValueAtTime(0, clipEnd);

            source.connect(clipGain).connect(trackGain);
            source.start(clipStart, clip.startTime, clipDuration);
        }
    }

    // 3. Render
    const renderedBuffer = await offlineCtx.startRendering();

    // 4. Encode to WAV
    return bufferToWav(renderedBuffer);
}

/**
 * Renders a specific time range of tracks to a WAV file
 */
export async function renderRangeToWav(
    tracks: TrackData[],
    start: number,
    end: number
): Promise<Blob> {
    const duration = end - start;
    if (duration <= 0) throw new Error("Invalid range");

    const sampleRate = 44100;
    const length = Math.ceil(duration * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

    for (const track of tracks) {
        if (track.muted || track.clips.length === 0) continue;

        const trackGain = offlineCtx.createGain();
        trackGain.gain.value = track.volume;
        trackGain.connect(offlineCtx.destination);

        for (const clip of track.clips) {
            const clipEndGlobal = clip.offset + (clip.endTime - clip.startTime);

            // Check intersection with selection range [start, end]
            const intersectStart = Math.max(start, clip.offset);
            const intersectEnd = Math.min(end, clipEndGlobal);

            if (intersectStart < intersectEnd) {
                if (!clip.buffer) continue;

                const source = offlineCtx.createBufferSource();
                source.buffer = clip.buffer;
                source.detune.value = (track.transpose || 0) * 100;

                // Time in the actual buffer to start playing from
                const bufferStart = clip.startTime + (intersectStart - clip.offset);
                const playDuration = intersectEnd - intersectStart;

                // Time in the offline context to start (relative to selection start)
                const contextDelay = intersectStart - start;

                // Create per-clip gain for crossfades/pops
                const clipGain = offlineCtx.createGain();
                const renderFade = 0.01; // 10ms fade to avoid pops
                clipGain.gain.setValueAtTime(0, contextDelay);
                clipGain.gain.linearRampToValueAtTime(1, contextDelay + renderFade);
                clipGain.gain.setValueAtTime(1, Math.max(contextDelay + renderFade, contextDelay + playDuration - renderFade));
                clipGain.gain.linearRampToValueAtTime(0, contextDelay + playDuration);

                source.connect(clipGain).connect(trackGain);
                source.start(contextDelay, bufferStart, playDuration);
            }
        }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return bufferToWav(renderedBuffer);
}
