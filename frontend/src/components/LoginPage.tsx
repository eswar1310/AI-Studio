import { useState } from "react";

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    setError("");
    setLoading(true);

    setTimeout(() => {
      if (key.trim() === "PTG2025") {
        // ✅ Save to localStorage and notify parent
        localStorage.setItem("aimusic.apikey", key.trim());
        onLogin();
      } else {
        setError("❌ Invalid API Key. Please try again.");
        setLoading(false);
      }
    }, 400); // small delay for smooth UX
  };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="bg-white/10 p-8 rounded-2xl border border-white/20 shadow-2xl text-center w-80">
        <h1 className="text-3xl font-bold mb-2">🎵 Vinu Music Studio</h1>
        <p className="text-gray-400 mb-6 text-sm">
          Enter your API key to continue
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter API Key"
            className="p-2 rounded-lg bg-white/10 border border-white/20 w-full text-center text-white outline-none focus:border-orange-400 transition"
          />

          <button
            type="submit"
            disabled={loading}
            className={`mt-4 w-full px-4 py-2 rounded-lg text-sm font-semibold transition
              ${loading ? "bg-orange-700/40 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"}
            `}
          >
            {loading ? "Checking..." : "Continue"}
          </button>
        </form>

        {error && <p className="text-red-400 mt-3 text-sm">{error}</p>}
      </div>

      <p className="mt-6 text-xs text-gray-500">
        Secure access — API key required
      </p>
    </div>
  );
}
