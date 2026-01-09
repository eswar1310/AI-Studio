import { useEffect, useRef } from "react";

/* ======================================================
   PROPS
====================================================== */

interface WaveformCanvasProps {
    buffer: AudioBuffer | null;   // ⚠️ MUST ALLOW NULL
    width: number;
    height: number;
    startTime: number;     // buffer start (sec)
    endTime: number;       // buffer end (sec)
    selected: boolean;
}

/* ======================================================
   COMPONENT
====================================================== */

export default function WaveformCanvas({
    buffer,
    width,
    height,
    startTime,
    endTime,
    selected,
}: WaveformCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    /* ======================================================
       DRAW WAVEFORM (SAFE)
    ====================================================== */

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = Math.max(1, Math.floor(width));
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // ---------- CLEAR ----------
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // ---------- NO BUFFER YET ----------
        if (!buffer) {
            // Draw placeholder line
            ctx.strokeStyle = "#374151"; // gray
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            ctx.lineTo(canvas.width, height / 2);
            ctx.stroke();
            return;
        }

        // ---------- DRAW REAL WAVEFORM ----------
        const channelData = buffer.getChannelData(0);

        const startSample = Math.max(
            0,
            Math.floor(startTime * buffer.sampleRate)
        );
        const endSample = Math.min(
            channelData.length,
            Math.floor(endTime * buffer.sampleRate)
        );

        const samples = channelData.slice(startSample, endSample);
        if (samples.length === 0) return;

        const samplesPerPixel = Math.max(
            1,
            Math.floor(samples.length / canvas.width)
        );

        const midY = height / 2;

        ctx.strokeStyle = selected ? "#fb923c" : "#9ca3af";
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let x = 0; x < canvas.width; x++) {
            const start = x * samplesPerPixel;

            let min = 1.0;
            let max = -1.0;

            for (let i = 0; i < samplesPerPixel; i++) {
                const s = samples[start + i];
                if (s === undefined) break;
                if (s < min) min = s;
                if (s > max) max = s;
            }

            ctx.moveTo(x, midY + min * midY);
            ctx.lineTo(x, midY + max * midY);
        }

        ctx.stroke();
    }, [buffer, width, height, startTime, endTime, selected]);

    /* ======================================================
       RENDER
    ====================================================== */

    return (
        <canvas
            ref={canvasRef}
            className="block"
            style={{
                width,
                height,
                pointerEvents: "none",
            }}
        />
    );
}
