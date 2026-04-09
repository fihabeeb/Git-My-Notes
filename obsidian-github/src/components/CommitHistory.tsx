import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store";

interface CommitInfo {
  id: string;
  message: string;
  author: string;
  time: number;
}

export default function CommitHistory() {
  const { vaultPath, isGitHubConnected } = useAppStore();
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCommits = async () => {
    if (!vaultPath) return;
    setIsLoading(true);
    try {
      const result = await invoke<CommitInfo[]>("get_commit_history", { localPath: vaultPath, limit: 20 });
      setCommits(result);
    } catch (e) {
      console.error("Failed to fetch commits:", e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen && vaultPath) {
      fetchCommits();
    }
  }, [isOpen, vaultPath]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!isGitHubConnected) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-[#6e7681] hover:text-[#c9d1d9] text-xs"
        title="Commit History"
      >
        ⏱
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg w-[500px] max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#30363d] flex justify-between items-center">
              <h2 className="text-lg font-semibold text-[#c9d1d9]">Commit History</h2>
              <button onClick={() => setIsOpen(false)} className="text-[#6e7681] hover:text-[#c9d1d9]">✕</button>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              {isLoading ? (
                <div className="p-4 text-center text-[#6e7681]">Loading...</div>
              ) : commits.length === 0 ? (
                <div className="p-4 text-center text-[#6e7681]">No commits yet</div>
              ) : (
                <div className="divide-y divide-[#30363d]">
                  {commits.map(commit => (
                    <div key={commit.id} className="p-3 hover:bg-[#30363d]/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-[#58a6ff] font-mono">{commit.id}</span>
                        <span className="text-xs text-[#6e7681]">{formatTime(commit.time)}</span>
                      </div>
                      <p className="text-sm text-[#c9d1d9] truncate">{commit.message}</p>
                      <p className="text-xs text-[#6e7681] mt-1">{commit.author}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
