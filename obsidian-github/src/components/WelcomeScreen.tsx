import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "../store";

export default function WelcomeScreen() {
  const { setVaultPath, setGitHubConfig, setGithubSetupComplete } = useAppStore();
  const [localPath, setLocalPath] = useState("");

  const handleReset = () => {
    setVaultPath(null);
    setGitHubConfig(null);
    setGithubSetupComplete(false);
    localStorage.removeItem("obsidian-github-storage");
    window.location.reload();
  };

  const handleSelectFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Vault Folder",
    });
    
    if (selected && typeof selected === "string") {
      setLocalPath(selected);
    }
  };

  const handleCreateVault = () => {
    if (localPath) {
      const normalizedPath = localPath.replace(/\\/g, "/");
      setVaultPath(normalizedPath);
    }
  };

  const handleCloneRepo = async () => {
    // Will be handled in GitHubSetup
    setVaultPath(localPath || "./vault");
  };

  return (
    <div className="h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#c9d1d9] mb-2">Obsidian GitHub</h1>
          <p className="text-[#6e7681]">Your notes, synced to GitHub</p>
        </div>

        <div className="space-y-6">
          <div className="bg-[#161b22] p-6 rounded-lg border border-[#30363d]">
            <h2 className="text-lg font-semibold text-[#c9d1d9] mb-4">Open Local Vault</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="Path to vault folder..."
                className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-[#c9d1d9] placeholder-[#6e7681] focus:border-[#58a6ff] outline-none"
              />
              <button
                onClick={handleSelectFolder}
                className="px-4 py-2 bg-[#30363d] hover:bg-[#484f58] text-[#c9d1d9] rounded transition-colors"
              >
                Browse
              </button>
            </div>
            <button
              onClick={handleCreateVault}
              disabled={!localPath}
              className="w-full mt-4 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Open Vault
            </button>
          </div>

          <div className="text-center text-[#6e7681]">
            <p>or</p>
          </div>

          <div className="bg-[#161b22] p-6 rounded-lg border border-[#30363d]">
            <h2 className="text-lg font-semibold text-[#c9d1d9] mb-4">Connect to GitHub</h2>
            <p className="text-sm text-[#6e7681] mb-4">
              Clone a repository or sync your existing vault
            </p>
            <button
              onClick={handleCloneRepo}
              className="w-full px-4 py-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white rounded transition-colors"
            >
              Set Up GitHub Sync
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={handleReset}
            className="text-xs text-[#6e7681] hover:text-red-400 transition-colors"
          >
            Reset Settings
          </button>
        </div>
      </div>
    </div>
  );
}
