import { Page } from "./AppShell";
import { motion } from "framer-motion";
import {
  SlidersHorizontal,
  Music2,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Mic2,
} from "lucide-react";

// ---------------- MENU ITEM ----------------
const MenuItem = ({
  label,
  icon: Icon,
  page,
  active,
  collapsed,
  onClick,
}: {
  label: string;
  icon: React.FC<any>;
  page: Page;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all
        ${active
          ? "bg-blue-500 text-white shadow-sm"
          : "text-gray-400 hover:text-white hover:bg-white/10"
        }
          `}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: active ? 1.05 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <Icon size={20} />
      </motion.div>

      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="text-sm font-medium"
        >
          {label}
        </motion.span>
      )}
    </button>
  );
};

export default function Sidebar({
  collapsed,
  setCollapsed,
  activePage,
  setActivePage,
}: {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  activePage: Page;
  setActivePage: React.Dispatch<React.SetStateAction<Page>>;
}) {

  // ---------------- SIDEBAR ----------------
  return (
    <motion.div
      animate={{ width: collapsed ? 70 : 240 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-full bg-black/40 backdrop-blur-xl border-r border-white/10 p-4 flex flex-col"
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="mb-6 flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {collapsed ? (
          <ChevronRight size={20} />
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <ChevronLeft size={20} />
            <span>Collapse</span>
          </div>
        )}
      </button>

      {/* Navigation */}
      <div className="flex flex-col gap-2">
        <MenuItem
          label="Studio"
          page="studio"
          icon={SlidersHorizontal}
          active={activePage === "studio"}
          collapsed={collapsed}
          onClick={() => setActivePage("studio")}
        />
        <MenuItem
          label="Create Music"
          page="create"
          icon={Music2}
          active={activePage === "create"}
          collapsed={collapsed}
          onClick={() => setActivePage("create")}
        />
        <MenuItem
          label="Voice Isolator"
          page="isolate"
          icon={Mic2}
          active={activePage === "isolate"}
          collapsed={collapsed}
          onClick={() => setActivePage("isolate")}
        />
        <MenuItem
          label="History"
          page="history"
          icon={History}
          active={activePage === "history"}
          collapsed={collapsed}
          onClick={() => setActivePage("history")}
        />
        <MenuItem
          label="Settings"
          page="settings"
          icon={Settings}
          active={activePage === "settings"}
          collapsed={collapsed}
          onClick={() => setActivePage("settings")}
        />
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="mt-auto pt-4 text-xs text-gray-500 text-center opacity-75">
          Vinu Music Studio v1.0
        </div>
      )}
    </motion.div>
  );
}
