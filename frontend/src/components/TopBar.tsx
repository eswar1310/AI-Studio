// ✅ TopBar.tsx
import { Music2, LogOut } from "lucide-react";
import ConnectionStatus from "./ConnectionStatus";

interface TopBarProps {
  model: string;
  mode: "music" | "sfx";
  onModelChange: (m: string) => void;
  onToggleHistory: () => void;
}

export default function TopBar({
  model,
  mode,
  onModelChange,
  onToggleHistory,
}: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-gradient-to-r from-black/40 via-black/30 to-black/40 backdrop-blur-xl shadow-lg">

      {/* Left Section */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 shadow-lg shadow-orange-500/20">
          <Music2 className="text-white w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-white via-orange-200 to-orange-400 bg-clip-text text-transparent">
            Vinu Music Studio
          </h1>
          <p className="text-[10px] text-gray-500 -mt-0.5">Professional Audio Workstation</p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">

        {/* Connection Status */}
        <ConnectionStatus />

        {/* Logout */}
        <button
          onClick={() => {
            localStorage.removeItem("aimusic.apikey");
            window.location.reload();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-medium transition-all hover:scale-105"
        >
          <LogOut size={14} />
          Logout
        </button>

      </div>
    </div>
  );
}
