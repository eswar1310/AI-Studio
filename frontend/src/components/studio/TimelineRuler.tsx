import { useMemo } from "react";

/* ======================================================
   PROPS
====================================================== */

interface TimelineRulerProps {
    zoom: number;        // pixels per second
    duration: number;    // total timeline seconds
    bpm?: number;        // beats per minute (default 120)
    height?: number;
}

/* ======================================================
   COMPONENT
====================================================== */

export default function TimelineRuler({
    zoom,
    duration,
    bpm = 120,
    height = 28,
}: TimelineRulerProps) {

    /* ======================================================
       GRID CALCULATION
    ====================================================== */

    const { secondMarks, beatMarks } = useMemo(() => {
        // Dynamic interval picking (tiered approach)
        let interval = 60; // Default to 1 minute

        if (zoom < 0.5) interval = 600;      // 10 min
        else if (zoom < 4) interval = 300;   // 5 min
        else if (zoom < 10) interval = 60;   // 1 min
        else if (zoom < 25) interval = 30;  // 30 sec
        else if (zoom < 60) interval = 10;  // 10 sec
        else if (zoom < 150) interval = 5;  // 5 sec
        else if (zoom < 400) interval = 1;  // 1 sec
        else interval = 0.5;                // 0.5 sec

        const marks = [];
        for (let t = 0; t <= duration; t += interval) {
            marks.push({
                time: t,
                left: t * zoom,
            });
        }

        const beatMarks: number[] = [];
        if (zoom >= 80) {
            const beatInterval = 60 / bpm;
            const totalBeats = Math.floor(duration / beatInterval);
            for (let i = 0; i <= totalBeats; i++) {
                beatMarks.push(i * beatInterval * zoom);
            }
        }

        return { secondMarks: marks, beatMarks };
    }, [zoom, duration, bpm]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.round((seconds % 1) * 10);

        if (zoom < 8) {
            // Minutes Only (e.g. 1m, 2m)
            return `${m}m`;
        }

        if (zoom < 200) {
            // Standard M:SS (e.g. 1:30)
            if (s === 0) return `${m}m`;
            return `${m}:${s.toString().padStart(2, "0")}`;
        }

        // Detailed M:SS.ms (e.g. 1:30.5)
        const ss = s.toString().padStart(2, "0");
        return `${m}:${ss}.${ms}`;
    };

    return (
        <div
            className="relative w-full bg-[#111318]/90 border-b border-white/10 select-none overflow-hidden"
            style={{ height }}
        >
            {/* ##### BEAT GRID ##### */}
            {beatMarks.map((left, i) => (
                <div
                    key={`beat-${i}`}
                    className="absolute top-0 h-full border-l border-white/5"
                    style={{ left }}
                />
            ))}

            {/* ##### TIME MARKS ##### */}
            {secondMarks.map((m) => (
                <div
                    key={`mark-${m.time}`}
                    className="absolute top-0 h-full border-l border-white/20"
                    style={{ left: m.left }}
                >
                    <span className="absolute top-1 left-1.5 text-[9px] font-bold text-gray-400 font-mono tracking-tighter whitespace-nowrap">
                        {formatTime(m.time)}
                    </span>
                </div>
            ))}
        </div>
    );
}