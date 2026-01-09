export default function Dashboard({
  onGoCreate,
}: {
  onGoCreate: () => void;
}) {
  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-3xl font-extrabold mb-4">Welcome back 👋</h2>
      <p className="text-gray-300">
        Generate studio-quality background scores with AI. Choose a style and prompt,
        then export in WAV/MP3/MP4 (soon).
      </p>

      <div className="grid grid-cols-3 gap-4 mt-8">
        {[
          { label: "Telugu BGM", val: "telugu_bgm", emoji: "🔥" },
          { label: "Classic", val: "classic", emoji: "🎻" },
          { label: "Electronic", val: "electronic", emoji: "⚡" },
        ].map((s) => (
          <button
            key={s.val}
            onClick={onGoCreate}
            className="p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-left"
          >
            <div className="text-2xl">{s.emoji}</div>
            <div className="font-bold">{s.label}</div>
            <div className="text-gray-400 text-sm">Click to start</div>
          </button>
        ))}
      </div>
    </div>
  );
}
