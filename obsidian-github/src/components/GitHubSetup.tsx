import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";

export default function GitHubSetup() {
  const { setGitHubConfig, setVaultPath, setGithubSetupComplete, vaultPath, addRecentFolder } = useAppStore();
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [repoExists, setRepoExists] = useState(false);

  useEffect(() => {
    const checkExists = async () => {
      if (vaultPath && owner && repo) {
        try {
          const exists = await invoke<boolean>("check_repo_exists", { localPath: vaultPath });
          setRepoExists(exists);
          if (exists) {
            setError("");
          }
        } catch (e) {
          setRepoExists(false);
        }
      } else {
        setRepoExists(false);
      }
    };
    checkExists();
  }, [vaultPath, owner, repo]);

  const handleConnect = async () => {
    if (!token || !owner || !repo) {
      setError("All fields are required");
      return;
    }

    if (!vaultPath) {
      setError("Please select a vault folder first");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (repoExists) {
        const config = { token, owner, repo };
        setGitHubConfig(config);
        setGithubSetupComplete(true);
        addRecentFolder(vaultPath, config);
        setIsLoading(false);
        return;
      }

      const authUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
      const result = await invoke<{ success: boolean; message: string }>("clone_repo", {
        url: authUrl,
        localPath: vaultPath,
        token,
      });

      if (result.success) {
        const config = { token, owner, repo };
        setGitHubConfig(config);
        setGithubSetupComplete(true);
        addRecentFolder(vaultPath, config);
      } else {
        setError(result.message);
      }
    } catch (e) {
      setError(String(e));
    }

    setIsLoading(false);
  };

  const handleSkip = () => {
    setGitHubConfig(null);
    setGithubSetupComplete(true);
    if (vaultPath) {
      addRecentFolder(vaultPath);
    }
  };

  const handleBack = () => {
    setVaultPath(null);
  };

  return (
    <div className="h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="max-w-md w-full p-8">
        <button
          onClick={handleBack}
          className="mb-4 text-sm text-[#6e7681] hover:text-[#c9d1d9] transition-colors flex items-center gap-1"
        >
          ← Back
        </button>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#c9d1d9] mb-2">GitHub Configuration</h1>
          <p className="text-[#6e7681]">Connect your GitHub repository to sync your vault</p>
          {vaultPath && (
            <p className="text-xs text-yellow-500 mt-2 truncate" title={vaultPath}>
              Vault: {vaultPath}
            </p>
          )}
        </div>

        <div className="bg-[#161b22] p-6 rounded-lg border border-[#30363d]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#c9d1d9] mb-1">Personal Access Token</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-[#c9d1d9] placeholder-[#6e7681] focus:border-[#58a6ff] outline-none"
              />
              <p className="text-xs text-[#6e7681] mt-1">
                Needs repo scope.{" "}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#58a6ff] hover:underline"
                >
                  Create one
                </a>
              </p>
            </div>

            <div>
              <label className="block text-sm text-[#c9d1d9] mb-1">Repository Owner</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="username or organization"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-[#c9d1d9] placeholder-[#6e7681] focus:border-[#58a6ff] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-[#c9d1d9] mb-1">Repository Name</label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="my-notes"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-[#c9d1d9] placeholder-[#6e7681] focus:border-[#58a6ff] outline-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 p-2 rounded">{error}</p>
            )}

            {repoExists && (
              <p className="text-sm text-green-500 bg-green-500/10 p-2 rounded">
                Repository already exists locally. Click "Connect & Clone" to continue.
              </p>
            )}

            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors disabled:opacity-50"
            >
              {isLoading ? "Connecting..." : "Connect & Clone"}
            </button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={handleSkip}
            className="text-sm text-[#6e7681] hover:text-[#c9d1d9] transition-colors"
          >
            Skip for now (local only)
          </button>
        </div>
      </div>
    </div>
  );
}
