import { useEffect, useRef } from "react";
import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";
import CommitHistory from "./CommitHistory";

export default function StatusBar() {
  const { isGitHubConnected, gitHubConfig, syncStatus, isSyncing, setIsSyncing, setSyncStatus, vaultPath, settings, setConflicts, setShowSettings, setShowConflictResolution, currentBranch, setShowBranchManager } = useAppStore();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkConflicts = async () => {
    if (!vaultPath) return;
    try {
      const conflicts = await invoke<{ path: string }[]>("check_for_conflicts", { localPath: vaultPath });
      setConflicts(conflicts);
      if (conflicts.length > 0) {
        setShowConflictResolution(true);
      }
    } catch (e) {
      console.error("Failed to check conflicts:", e);
    }
  };

  const handleSync = async (showStatus = true) => {
    if (!gitHubConfig || !vaultPath) return;
    if (showStatus) setIsSyncing(true);
    setSyncStatus("Pulling...");
    
    try {
      const result = await invoke<{ success: boolean; message: string; has_conflict: boolean }>("pull_repo", { 
        localPath: vaultPath,
        token: gitHubConfig.token,
      });
      
      if (!result.success) {
        setSyncStatus("Pull failed: " + result.message);
        if (showStatus) setIsSyncing(false);
        return;
      }
      
      setSyncStatus("Pushing...");
      
      const pushResult = await invoke<{ success: boolean; message: string }>("push_repo", { 
        localPath: vaultPath,
        token: gitHubConfig.token,
        message: "Auto-sync commit",
      });
      
      if (!pushResult.success) {
        setSyncStatus("Push failed: " + pushResult.message);
      } else {
        setSyncStatus("Synced");
      }
      
      await checkConflicts();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSyncStatus("Sync failed: " + msg);
    }
    
    if (showStatus) setIsSyncing(false);
  };

  useEffect(() => {
    if (settings.autoSync && isGitHubConnected && settings.syncInterval > 0) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      syncIntervalRef.current = setInterval(() => {
        handleSync(false);
      }, settings.syncInterval);
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [settings.autoSync, settings.syncInterval, isGitHubConnected, gitHubConfig]);

  return (
    <div className="h-6 bg-[#161b22] border-t border-[#30363d] flex items-center justify-between px-3 text-xs text-[#6e7681]">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${isGitHubConnected ? "bg-green-500" : "bg-gray-500"}`} />
          {isGitHubConnected ? gitHubConfig?.repo : "Not connected"}
        </span>
        {isGitHubConnected && currentBranch && (
          <button 
            onClick={() => setShowBranchManager(true)}
            className="hover:text-[#c9d1d9] transition-colors flex items-center gap-1"
          >
            <span className="text-[#8b949e]">⎇</span>
            <span>{currentBranch}</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        {isGitHubConnected && (
          <CommitHistory />
        )}
        {isGitHubConnected && (
          <button
            onClick={() => handleSync(true)}
            disabled={isSyncing}
            className="hover:text-[#c9d1d9] transition-colors disabled:opacity-50"
          >
            {isSyncing ? "⟳ Syncing..." : "⟳ Sync"}
          </button>
        )}
        <button
          onClick={() => setShowSettings(true)}
          className="hover:text-[#c9d1d9] transition-colors"
          title="Settings"
        >
          ⚙
        </button>
        <span>{syncStatus}</span>
      </div>
    </div>
  );
}
