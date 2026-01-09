import { useEffect, useState } from "react";
import { Sun, Moon, Trash2, Save, Settings as SettingsIcon, Palette, Database, Info, Keyboard, Key } from "lucide-react";
import { clearHistory, checkHealth, getConfig, updateConfig } from "../api";

export default function Settings() {

  const [defaultDuration, setDefaultDuration] = useState(
    () => localStorage.getItem("aimusic.default_duration") || "10"
  );

  const [serverInfo, setServerInfo] = useState<any>(null);
  const [googleKey, setGoogleKey] = useState("");
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [maskedKeys, setMaskedKeys] = useState({ google: "****", eleven: "****" });


  // Load server info and current keys
  useEffect(() => {
    checkHealth().then(setServerInfo);
    getConfig().then(data => {
      setMaskedKeys({
        google: data.google_api_key,
        eleven: data.elevenlabs_api_key
      });
    });
  }, []);

  const handleSaveApiKeys = async () => {
    if (!googleKey && !elevenLabsKey) {
      alert("Please enter at least one API key to update.");
      return;
    }
    try {
      await updateConfig({
        google_api_key: googleKey || undefined,
        elevenlabs_api_key: elevenLabsKey || undefined
      });
      alert("✅ API Keys updated successfully!");
      setGoogleKey("");
      setElevenLabsKey("");
      // Refresh masks
      const data = await getConfig();
      setMaskedKeys({
        google: data.google_api_key,
        eleven: data.elevenlabs_api_key
      });
    } catch (e) {
      alert("❌ Failed to update API keys.");
    }
  };


  const handleSaveDefaults = () => {
    localStorage.setItem("aimusic.default_duration", defaultDuration);
    alert("✅ Defaults saved successfully!");
  };

  const handleClearHistory = async () => {
    if (!confirm("⚠️ Are you sure you want to delete all history? This cannot be undone.")) return;
    try {
      await clearHistory();
      // Also clear local storage
      localStorage.removeItem("aimusic.history");
      alert("✅ History cleared successfully.");
      window.location.reload(); // Reload to refresh state
    } catch (e) {
      alert("❌ Failed to clear history");
      console.error(e);
    }
  };

  return (
    <div className="text-white p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Settings
          </h2>
        </div>
        <p className="text-gray-400 text-sm ml-14">
          Customize your Vinu Music Studio experience
        </p>
      </div>

      <div className="space-y-6">

        {/* SECTION: SERVER INFO */}
        {serverInfo && (
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-blue-400" />
              <h3 className="text-xl font-semibold text-blue-400">Server Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <p className="text-xs text-gray-400 mb-1">Status</p>
                <p className="text-lg font-bold text-green-400">● Online</p>
              </div>

              <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <p className="text-xs text-gray-400 mb-1">Version</p>
                <p className="text-lg font-bold text-white">{serverInfo.version}</p>
              </div>

              <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <p className="text-xs text-gray-400 mb-1">Active Tasks</p>
                <p className="text-lg font-bold text-orange-400">{serverInfo.active_tasks}</p>
              </div>

              <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <p className="text-xs text-gray-400 mb-1">Disk Space</p>
                <p className="text-lg font-bold text-white">{serverInfo.disk_space_gb} GB</p>
              </div>

              <div className="bg-black/20 rounded-xl p-4 border border-white/5 md:col-span-2">
                <p className="text-xs text-gray-400 mb-1">Server URL</p>
                <p className="text-sm font-mono text-blue-400 truncate">{serverInfo.base_url}</p>
              </div>
            </div>
          </div>
        )}


        {/* SECTION: DEFAULTS */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4">
            <Save className="w-5 h-5 text-orange-400" />
            <h3 className="text-xl font-semibold text-orange-400">Default Settings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Default Duration</label>
              <select
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer"
              >
                <option value="5">5 seconds</option>
                <option value="10">10 seconds</option>
                <option value="15">15 seconds</option>
                <option value="20">20 seconds</option>
                <option value="30">30 seconds</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">Default duration for new audio generations</p>
            </div>
          </div>

          <button
            onClick={handleSaveDefaults}
            className="flex items-center gap-2 mt-6 px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-xl text-sm font-medium transition-all hover:scale-105 shadow-lg shadow-orange-500/20"
          >
            <Save size={16} />
            Save Defaults
          </button>
        </div>

        {/* SECTION: API KEYS */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-blue-400" />
            <h3 className="text-xl font-semibold text-blue-400">External API Keys</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Google Generative AI Key</label>
                <div className="text-[10px] text-gray-500 mb-2 font-mono">Current: {maskedKeys.google}</div>
                <input
                  type="password"
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                  placeholder="Enter new Google API Key..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">ElevenLabs API Key</label>
                <div className="text-[10px] text-gray-500 mb-2 font-mono">Current: {maskedKeys.eleven}</div>
                <input
                  type="password"
                  value={elevenLabsKey}
                  onChange={(e) => setElevenLabsKey(e.target.value)}
                  placeholder="Enter new ElevenLabs API Key..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/10 self-start">
              <h4 className="text-xs font-bold text-blue-400 uppercase mb-2">Instructions</h4>
              <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4">
                <li>Keys are saved to the server's <code className="text-blue-300">.env</code> file.</li>
                <li>ROOBO Chat and Music/SFX services will reload automatically.</li>
                <li>Ensure your keys have appropriate permissions.</li>
              </ul>
            </div>
          </div>

          <button
            onClick={handleSaveApiKeys}
            className="flex items-center gap-2 mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl text-sm font-medium transition-all hover:scale-105 shadow-lg shadow-blue-500/20"
          >
            <Save size={16} />
            Update API Keys
          </button>
        </div>


        {/* SECTION: KEYBOARD SHORTCUTS */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4">
            <Keyboard className="w-5 h-5 text-purple-400" />
            <h3 className="text-xl font-semibold text-purple-400">Keyboard Shortcuts</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {/* Navigation */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1">Navigation</h4>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Create Music</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">1</kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Studio</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">2</kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Voice Isolator</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">3</kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">History</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">4</kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Settings</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">5</kbd>
              </div>
            </div>

            {/* Studio & General */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1">Studio & General</h4>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Play/Pause</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">Space</kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Toggle Chat</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">/</kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Generate Music</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">Alt+G</kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Toggle Assets</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">[</kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Toggle Video</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">]</kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Load Video</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">Ctrl+L</kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Split Clip</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">T</kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Delete Clip</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">Del</kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Zoom In/Out</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">+ / -</kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Undo/Redo</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">Ctrl+Z / Ctrl+Y</kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Export WAV</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">Ctrl+E</kbd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Export MP4</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-xs">Ctrl+Shift+E</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION: DANGER ZONE */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-red-400" />
            <h3 className="text-xl font-semibold text-red-400">Danger Zone</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Clear All History</h4>
              <p className="text-gray-400 text-sm">Delete all generation history and files from the server</p>
            </div>

            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium transition-all hover:scale-105"
            >
              <Trash2 size={16} />
              Clear History
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
