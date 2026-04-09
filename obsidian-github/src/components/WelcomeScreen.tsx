import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store";

export default function WelcomeScreen() {
  const { vaultPath, setVaultPath, setGitHubConfig, setGithubSetupComplete, setRecentFolders, addRecentFolder, recentFolders, getRecentFolder } = useAppStore();
  const [localPath, setLocalPath] = useState("");

  useEffect(() => {
    const checkAndAutoOpen = async () => {
      if (localPath && localPath.length > 2) {
        try {
          const absPath = await invoke<string>("make_absolute", { path: localPath });
          const normalizedPath = absPath.replace(/\\/g, "/");
          const exists = await invoke<boolean>("check_repo_exists", { localPath: normalizedPath });
          if (exists) {
            const recentFolder = getRecentFolder(normalizedPath);
            setVaultPath(normalizedPath);
            if (recentFolder?.gitHubConfig) {
              setGitHubConfig(recentFolder.gitHubConfig);
              setGithubSetupComplete(true);
            } else {
              addRecentFolder(normalizedPath);
            }
          }
        } catch (e) {
        }
      }
    };
    checkAndAutoOpen();
  }, [localPath, setVaultPath, setGitHubConfig, setGithubSetupComplete, addRecentFolder, getRecentFolder]);

  useEffect(() => {
    const validateRecentFolders = async () => {
      const validFolders = [];
      for (const folder of recentFolders) {
        try {
          const absPath = await invoke<string>("make_absolute", { path: folder.path });
          const normalizedPath = absPath.replace(/\\/g, "/");
          const pathCheck = await invoke<string>("check_path", { path: normalizedPath });
          if (pathCheck.includes("Exists") && pathCheck.includes("directory")) {
            validFolders.push(folder);
          }
        } catch (e) {
        }
      }
      if (validFolders.length !== recentFolders.length) {
        setRecentFolders(validFolders);
      }
    };
    if (recentFolders.length > 0) {
      validateRecentFolders();
    }
  }, []);

  const handleReset = () => {
    setVaultPath(null);
    setGitHubConfig(null);
    setGithubSetupComplete(false);
    setRecentFolders([]);
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
      const absPath = await invoke<string>("make_absolute", { path: selected });
      setLocalPath(absPath);
    }
  };

  const handleOpenVault = async (folder: { path: string; gitHubConfig?: { token: string; owner: string; repo: string } }) => {
    const absPath = await invoke<string>("make_absolute", { path: folder.path });
    const normalizedPath = absPath.replace(/\\/g, "/");
    setVaultPath(normalizedPath);
    
    if (folder.gitHubConfig) {
      setGitHubConfig(folder.gitHubConfig);
      setGithubSetupComplete(true);
    } else {
      const recentFolder = getRecentFolder(normalizedPath);
      if (recentFolder?.gitHubConfig) {
        setGitHubConfig(recentFolder.gitHubConfig);
        setGithubSetupComplete(true);
      }
    }
  };

  const handleCreateVault = async () => {
    if (localPath) {
      const absPath = await invoke<string>("make_absolute", { path: localPath });
      const normalizedPath = absPath.replace(/\\/g, "/");
      const recentFolder = getRecentFolder(normalizedPath);
      setVaultPath(normalizedPath);
      addRecentFolder(normalizedPath, recentFolder?.gitHubConfig);
    }
  };

  const handleCloneRepo = async () => {
    if (localPath) {
      const absPath = await invoke<string>("make_absolute", { path: localPath });
      const normalizedPath = absPath.replace(/\\/g, "/");
      const recentFolder = getRecentFolder(normalizedPath);
      setVaultPath(normalizedPath);
      addRecentFolder(normalizedPath, recentFolder?.gitHubConfig);
    } else if (!vaultPath) {
      alert("Please select a vault folder first using 'Browse'");
      return;
    }
  };

  return (
    <div className="h-screen bg-[#0d1117] flex items-center justify-center overflow-y-auto">
      <div className="max-w-lg w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#c9d1d9] mb-2">Obsidian GitHub</h1>
          <p className="text-[#6e7681]">Your notes, synced to GitHub</p>
        </div>

        {recentFolders.length > 0 && (
          <div className="bg-[#161b22] p-4 rounded-lg border border-[#30363d] mb-6">
            <h3 className="text-sm font-semibold text-[#c9d1d9] mb-3">Recent Folders</h3>
            <div className="space-y-1">
              {recentFolders.map((folder) => (
                <button
                  key={folder.path}
                  onClick={() => handleOpenVault(folder)}
                  className="w-full text-left px-3 py-2 text-sm text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#30363d] rounded transition-colors truncate flex items-center justify-between"
                  title={folder.path}
                >
                  <span className="truncate">{(folder.path || "").split("/").pop() || folder.path}</span>
                  {folder.gitHubConfig && (
                    <span className="text-xs text-[#238636] ml-2 shrink-0">GitHub</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

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
            {vaultPath && (
              <p className="text-xs text-[#6e7681] mt-2 truncate" title={vaultPath}>
                Current: {vaultPath}
              </p>
            )}
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
