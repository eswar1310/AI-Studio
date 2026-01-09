import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { checkHealth } from "../api";

export default function ConnectionStatus() {
    const [online, setOnline] = useState(true);
    const [serverInfo, setServerInfo] = useState<any>(null);

    useEffect(() => {
        const check = async () => {
            const health = await checkHealth();
            if (health) {
                setOnline(true);
                setServerInfo(health);
            } else {
                setOnline(false);
                setServerInfo(null);
            }
        };

        // Initial check
        check();

        // Check every 10 seconds
        const interval = setInterval(check, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${online
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse"
                }`}
            title={
                online
                    ? `Connected to ${serverInfo?.base_url || "server"}\nVersion: ${serverInfo?.version || "unknown"}\nActive Tasks: ${serverInfo?.active_tasks || 0}\nDisk Space: ${serverInfo?.disk_space_gb || "?"}GB`
                    : "Disconnected from server"
            }
        >
            {online ? (
                <>
                    <Wifi size={14} />
                    <span>Connected</span>
                </>
            ) : (
                <>
                    <WifiOff size={14} />
                    <span>Offline</span>
                </>
            )}
        </div>
    );
}
