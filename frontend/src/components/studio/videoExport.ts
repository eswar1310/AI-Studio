import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { TrackData } from "./studio.types";
import { exportMixToWav } from "./audioExport";

export async function exportVideo(
    tracks: TrackData[],
    videoUrl: string,
    duration: number,
    onProgress?: (progress: number) => void
): Promise<Blob> {
    const ffmpeg = new FFmpeg();

    // 1. Load FFmpeg
    // Load locally from public/ffmpeg/
    const coreURL = await toBlobURL(`/ffmpeg/ffmpeg-core.js`, "text/javascript");
    const wasmURL = await toBlobURL(`/ffmpeg/ffmpeg-core.wasm`, "application/wasm");

    console.log("Loading FFmpeg from:", { coreURL, wasmURL });

    await ffmpeg.load({
        coreURL,
        wasmURL,
    });

    ffmpeg.on("progress", ({ progress }) => {
        if (onProgress) onProgress(Math.round(progress * 100));
    });

    // 2. Prepare Audio
    const audioBlob = await exportMixToWav(tracks, duration);
    const audioData = await fetchFile(audioBlob);
    await ffmpeg.writeFile("audio.wav", audioData);

    // 3. Prepare Video
    const videoData = await fetchFile(videoUrl);
    await ffmpeg.writeFile("video.mp4", videoData);

    // 4. Run FFmpeg command
    // -map 0:v:0 -> use video from first input
    // -map 1:a:0 -> use audio from second input
    // -c:v copy -> copy video stream (fast, no re-encode)
    // -c:a aac -> encode audio to AAC
    // -shortest -> stop when shortest stream ends (usually audio matches duration)
    await ffmpeg.exec([
        "-i", "video.mp4",
        "-i", "audio.wav",
        "-c:v", "copy",
        "-c:a", "aac",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-shortest",
        "output.mp4"
    ]);

    // 5. Read output
    const data = await ffmpeg.readFile("output.mp4");

    // Cleanup
    ffmpeg.terminate();

    if (typeof data === "string") {
        throw new Error("FFmpeg output was string, expected binary");
    }

    return new Blob([data as any], { type: "video/mp4" });
}
