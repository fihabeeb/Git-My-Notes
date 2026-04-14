import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";

export default function BranchManager() {
  const { vaultPath, gitHubConfig, currentBranch, setCurrentBranch, showBranchManager } = useAppStore();
  const [branches, setBranches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (showBranchManager && vaultPath) {
      loadBranches();
    }
  }, [showBranchManager, vaultPath]);

  const loadBranches = async () => {
    if (!vaultPath) return;
    setIsLoading(true);
    try {
      const branchList = await invoke<string[]>("get_all_branches", { localPath: vaultPath });
      setBranches(branchList);
      
      const current = await invoke<string>("get_current_branch", { localPath: vaultPath });
      setCurrentBranch(current);
    } catch (e) {
      console.error("Failed to load branches:", e);
    }
    setIsLoading(false);
  };

  const handleSwitchBranch = async (branch: string) => {
    if (!vaultPath || !gitHubConfig) return;
    setIsLoading(true);
    try {
      await invoke("switch_branch", {
        localPath: vaultPath,
        branchName: branch,
        token: gitHubConfig.token,
      });
      setCurrentBranch(branch);
    } catch (e) {
      console.error("Failed to switch branch:", e);
      alert("Failed to switch branch: " + e);
    }
    setIsLoading(false);
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim() || !vaultPath || !gitHubConfig) return;
    setIsCreating(true);
    try {
      await invoke("switch_branch", {
        localPath: vaultPath,
        branchName: newBranchName.trim(),
        token: gitHubConfig.token,
      });
      setCurrentBranch(newBranchName.trim());
      setNewBranchName("");
      await loadBranches();
    } catch (e) {
      console.error("Failed to create branch:", e);
      alert("Failed to create branch: " + e);
    }
    setIsCreating(false);
  };

  const handleClose = () => {
    useAppStore.getState().setShowBranchManager(false);
  };

  if (!showBranchManager) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg w-[400px] max-h-[500px] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[#30363d] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-[#c9d1d9]">Branches</h2>
          <button onClick={handleClose} className="text-[#6e7681] hover:text-[#c9d1d9] text-xl">✕</button>
        </div>

        <div className="p-4 border-b border-[#30363d]">
          <div className="flex gap-2">
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="new-branch-name"
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-[#c9d1d9] placeholder-[#6e7681] focus:border-[#58a6ff] outline-none"
            />
            <button
              onClick={handleCreateBranch}
              disabled={!newBranchName.trim() || isCreating}
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded text-sm disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-[#6e7681]">Loading...</div>
          ) : branches.length === 0 ? (
            <div className="p-4 text-center text-[#6e7681]">No branches found</div>
          ) : (
            <div className="py-2">
              {branches.map((branch) => (
                <button
                  key={branch}
                  onClick={() => handleSwitchBranch(branch)}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between ${
                    currentBranch === branch
                      ? "bg-[#30363d] text-[#c9d1d9]"
                      : "text-[#8b949e] hover:bg-[#0d1117]"
                  }`}
                >
                  <span>{branch}</span>
                  {currentBranch === branch && (
                    <span className="text-xs text-green-500">current</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}