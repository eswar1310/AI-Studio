import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { HistoryItem } from "./HistoryPanel";

// ✅ SINGLE SOURCE OF TRUTH FOR PAGES
// ❌ dashboard REMOVED
// ✅ studio ADDED
export type Page = "studio" | "create" | "history" | "settings" | "isolate";

interface AppShellProps {
  children: React.ReactNode;
  audioUrl: string | null;
  model: string;
  onModelChange: (m: string) => void;
  activePage: Page;
  setActivePage: React.Dispatch<React.SetStateAction<Page>>;
  history: HistoryItem[];
  onPlayHistory: (it: HistoryItem) => void;
  onClearHistory: () => void;
  mode: "music" | "sfx";
}

export default function AppShell({
  children,
  audioUrl,
  model,
  onModelChange,
  activePage,
  setActivePage,
  history,
  onPlayHistory,
  onClearHistory,
  mode,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div
      className="
        w-full h-screen flex overflow-hidden text-white
        bg-gradient-to-br from-[#0d0d12] via-[#1b1b28] to-[#24243d]
      "
    >
      {/* SIDEBAR */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activePage={activePage}
        setActivePage={setActivePage}
      />

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* TOP BAR */}
        <TopBar
          model={model}
          onModelChange={onModelChange}
          mode={mode}
          onToggleHistory={() => setHistoryOpen((v) => !v)}
        />

        {/* PAGE TRANSITION */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`flex-1 ${activePage === "studio" ? "overflow-hidden p-0" : "overflow-y-auto p-8"}`}
          >
            {children}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
