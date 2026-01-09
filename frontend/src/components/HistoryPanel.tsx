import { AnimatePresence, motion } from "framer-motion";
import { Trash2, Play, Download } from "lucide-react";

export interface HistoryItem {
  id: string;
  prompt: string;
  style: string;
  model: string;
  duration: number;
  createdAt: string;  
  audioMp3: string;
  audioWav: string;
  mode?: "music" | "sfx";   // ✅ ADD THIS
}


interface HistoryPanelProps {
  open: boolean;
  items: HistoryItem[];
  onPlay: (item: HistoryItem) => void;
  onClear: () => void;
  embedded?: boolean;
}

export default function HistoryPanel({
  open,
  items,
  onPlay,
  onClear,
  embedded = false,
}: HistoryPanelProps) {
  const content = (
    <div className="flex flex-col h-full p-4 text-white">
      {!embedded && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">📀 History</h2>
          {items.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          No history yet.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {items.map((item) => {
            return (
              <div
                key={item.id}
                className="bg-white/10 hover:bg-white/15 transition-all rounded-xl p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{item.prompt}</span>
                    <span className="text-xs text-gray-400">
                      {item.style} • {item.model} • {Math.round(item.duration)}s
                    </span>
                  </div>

                  {/* ▶ PLAY */}
                  <button
                    onClick={() => onPlay(item)}
                    className="p-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white shadow-md"
                    title="Play this track"
                  >
                    <Play size={14} />
                  </button>
                </div>

                {/* DOWNLOAD BUTTONS — USE REAL URLS */}
                <div className="flex gap-2 mt-2">
                  <a
                    href={item.audioMp3}
                    download={`track_${item.id}.mp3`}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-md border border-white/10 transition"
                  >
                    <Download size={12} /> MP3
                  </a>
                  {item.audioWav && (
                    <a
                      href={item.audioWav}
                      download={`track_${item.id}.wav`}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-md border border-white/10 transition"
                    >
                      <Download size={12} /> WAV
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
        {content}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="history-panel"
          initial={{ x: -280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -280, opacity: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 18 }}
          className="fixed top-0 left-0 h-full w-72 bg-black/70 backdrop-blur-2xl border-r border-white/10 z-40 shadow-xl"
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
