import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, Hash, Thermometer, ListFilter } from "lucide-react";

interface RightPanelProps {
  open: boolean;
  temperature: number;
  topK: number;
  topP: number;
  seed: number;
  locked: boolean;
  setTemperature: (v: number) => void;
  setTopK: (v: number) => void;
  setTopP: (v: number) => void;
  setSeed: (v: number) => void;
  setLocked: (v: boolean) => void;
}

export default function RightPanel({
  open,
  temperature,
  topK,
  topP,
  seed,
  locked,
  setTemperature,
  setTopK,
  setTopP,
  setSeed,
  setLocked,
}: RightPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="adv-panel"
          initial={{ x: 350, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 350, opacity: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="
            fixed top-14 right-0
            h-[calc(100%-3.5rem)] w-80
            bg-black/60 backdrop-blur-2xl
            border-l border-white/10
            shadow-xl shadow-black/40
            p-6 z-40
            overflow-y-auto
          "
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <SlidersHorizontal className="text-orange-400 w-6 h-6" />
            <h2 className="text-white font-bold text-lg tracking-wide">
              Advanced Controls
            </h2>
          </div>

          {/* Sliders Section */}
          <div className="space-y-6 mt-4">
            {/* Temperature */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="text-orange-300 w-4 h-4" />
                <h3 className="text-white text-sm font-semibold">
                  Temperature
                </h3>
              </div>
              <input
                type="range"
                min={0.1}
                max={2}
                step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-orange-400"
              />
              <p className="text-gray-400 text-xs mt-1">
                Creativity: {temperature.toFixed(2)}
              </p>
            </div>

            {/* Top K */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ListFilter className="text-orange-300 w-4 h-4" />
                <h3 className="text-white text-sm font-semibold">Top K</h3>
              </div>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full accent-orange-400"
              />
              <p className="text-gray-400 text-xs mt-1">Value: {topK}</p>
            </div>

            {/* Top P */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <SlidersHorizontal className="text-orange-300 w-4 h-4" />
                <h3 className="text-white text-sm font-semibold">Top P</h3>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.01}
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full accent-orange-400"
              />
              <p className="text-gray-400 text-xs mt-1">Value: {topP.toFixed(2)}</p>
            </div>

            {/* Seed */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="text-orange-300 w-4 h-4" />
                <h3 className="text-white text-sm font-semibold">Seed</h3>
              </div>
              <input
                type="number"
                min={0}
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-sm text-white"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={locked}
                  onChange={(e) => setLocked(e.target.checked)}
                  id="seedLock"
                  className="accent-orange-400"
                />
                <label htmlFor="seedLock" className="text-xs text-gray-300">
                  Lock this seed (reproducible)
                </label>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
