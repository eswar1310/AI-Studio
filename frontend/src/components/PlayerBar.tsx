import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause } from "lucide-react";

export default function PlayerBar({ audioUrl }: { audioUrl: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;

    setReady(false);
    setPlaying(false);
    setCur(0);
    setDur(0);

    const onLoaded = () => {
      setReady(true);
      setDur(el.duration || 0);
      setPlaying(true);
      el.play().catch(() => {});
    };

    const onTime = () => setCur(el.currentTime);
    const onEnd = () => setPlaying(false);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, [audioUrl]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    playing ? el.play().catch(() => {}) : el.pause();
  }, [playing]);

  if (!audioUrl) return null;

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <AnimatePresence>
      {audioUrl && (
        <motion.div
          key="playerbar"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          <div className="mx-4 mb-4 rounded-2xl border border-white/10 bg-black/70 backdrop-blur-2xl shadow-lg p-4">
            <div className="flex items-center gap-4">
              <button
                className="p-3 rounded-xl bg-white/15 text-white hover:bg-white/25 transition shadow-md"
                onClick={() => setPlaying((p) => !p)}
                disabled={!ready}
                title={playing ? 'Pause' : 'Play'}
              >
                {playing ? (
                  <Pause className="w-5 h-5 text-orange-400" />
                ) : (
                  <Play className="w-5 h-5 text-orange-400" />
                )}
              </button>

              <div className="text-white/80 text-sm w-24 text-center">
                {fmt(cur)} / {fmt(dur)}
              </div>

              <input
                type="range"
                min={0}
                max={dur || 0}
                step={0.01}
                value={cur}
                onChange={(e) => {
                  const el = audioRef.current;
                  if (el) el.currentTime = Number(e.target.value);
                }}
                className="flex-1 accent-orange-400"
              />
            </div>

            {/* Removed waveform visualizer */}
            <audio ref={audioRef} src={audioUrl} preload="metadata" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
