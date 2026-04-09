import { useAppStore } from "../store";

export default function ConflictBanner() {
  const { conflicts } = useAppStore();

  if (conflicts.length === 0) return null;

  return (
    <div className="bg-yellow-600/20 border-b border-yellow-600 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-yellow-500">⚠️</span>
        <span className="text-yellow-500 text-sm">
          {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""} detected: {conflicts.map(c => c.path).join(", ")}
        </span>
      </div>
      <button className="text-xs text-yellow-500 hover:text-yellow-400">
        Resolve →
      </button>
    </div>
  );
}
