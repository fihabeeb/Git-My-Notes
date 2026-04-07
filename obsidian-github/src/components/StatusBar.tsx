import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";

export default function StatusBar() {
  const { isGitHubConnected, gitHubConfig, syncStatus, isSyncing, setIsSyncing, setSyncStatus } = useAppStore();

  const handleSync = async () => {
    if (!gitHubConfig) return;
    setIsSyncing(true);
    setSyncStatus("Syncing...");
    
    try {
      await invoke("pull_repo", { 
        localPath: gitHubConfig.owner + "-" + gitHubConfig.repo,
        token: gitHubConfig.token 
      });
      setSyncStatus("Synced");
    } catch (e) {
      setSyncStatus("Sync failed");
      console.error(e);
    }
    
    setIsSyncing(false);
  };

  return (
    <div className="h-6 bg-[#161b22] border-t border-[#30363d] flex items-center justify-between px-3 text-xs text-[#6e7681]">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${isGitHubConnected ? "bg-green-500" : "bg-gray-500"}`} />
          {isGitHubConnected ? gitHubConfig?.repo : "Not connected"}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {isGitHubConnected && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="hover:text-[#c9d1d9] transition-colors disabled:opacity-50"
          >
            {isSyncing ? "⟳ Syncing..." : "⟳ Sync"}
          </button>
        )}
        <span>{syncStatus}</span>
      </div>
    </div>
  );
}
