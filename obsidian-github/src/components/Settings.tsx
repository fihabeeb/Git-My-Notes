import { useAppStore } from "../store";

export default function Settings() {
  const { settings, updateSettings, setShowSettings, isGitHubConnected, gitHubConfig } = useAppStore();

  const handleSyncIntervalChange = (value: string) => {
    const interval = parseInt(value, 10);
    if (!isNaN(interval) && interval >= 60000) {
      updateSettings({ syncInterval: interval });
    }
  };

  return (
    <div className="h-full bg-[#0d1117] flex flex-col">
      <div className="p-4 border-b border-[#30363d] flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[#c9d1d9]">Settings</h2>
        <button
          onClick={() => setShowSettings(false)}
          className="text-[#6e7681] hover:text-[#c9d1d9] text-xl"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-8">
          <section>
            <h3 className="text-sm font-semibold text-[#c9d1d9] mb-4 uppercase tracking-wider">Git</h3>
            <div className="bg-[#161b22] rounded-lg border border-[#30363d] divide-y divide-[#30363d]">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#c9d1d9]">Auto-commit changes</p>
                  <p className="text-xs text-[#6e7681] mt-1">Automatically commit changes when saving files</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoCommit}
                    onChange={(e) => updateSettings({ autoCommit: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#30363d] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#58a6ff] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#238636]"></div>
                </label>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#c9d1d9]">Auto-sync</p>
                  <p className="text-xs text-[#6e7681] mt-1">Automatically pull and push changes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoSync}
                    onChange={(e) => updateSettings({ autoSync: e.target.checked })}
                    disabled={!isGitHubConnected}
                    className="sr-only peer disabled:opacity-50"
                  />
                  <div className="w-11 h-6 bg-[#30363d] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#58a6ff] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#238636] disabled:opacity-50"></div>
                </label>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-[#c9d1d9]">Sync interval</p>
                    <p className="text-xs text-[#6e7681] mt-1">How often to auto-sync (in minutes)</p>
                  </div>
                  <select
                    value={Math.floor(settings.syncInterval / 60000)}
                    onChange={(e) => handleSyncIntervalChange((parseInt(e.target.value) * 60000).toString())}
                    disabled={!settings.autoSync || !isGitHubConnected}
                    className="bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-[#c9d1d9] focus:border-[#58a6ff] outline-none disabled:opacity-50"
                  >
                    <option value="1">1 min</option>
                    <option value="5">5 min</option>
                    <option value="10">10 min</option>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#c9d1d9]">Commit message template</p>
                    <p className="text-xs text-[#6e7681] mt-1">Use {"{filename}"} as placeholder</p>
                  </div>
                </div>
                <input
                  type="text"
                  value={settings.commitMessage}
                  onChange={(e) => updateSettings({ commitMessage: e.target.value })}
                  placeholder="Update {filename}"
                  className="w-full mt-2 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-[#c9d1d9] placeholder-[#6e7681] focus:border-[#58a6ff] outline-none"
                />
              </div>
            </div>
          </section>

          {isGitHubConnected && gitHubConfig && (
            <section>
              <h3 className="text-sm font-semibold text-[#c9d1d9] mb-4 uppercase tracking-wider">Repository</h3>
              <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#6e7681] text-sm">Owner:</span>
                    <span className="text-[#c9d1d9] text-sm">{gitHubConfig.owner}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#6e7681] text-sm">Repository:</span>
                    <span className="text-[#c9d1d9] text-sm">{gitHubConfig.repo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#6e7681] text-sm">Status:</span>
                    <span className="text-green-500 text-sm">Connected</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold text-[#c9d1d9] mb-4 uppercase tracking-wider">About</h3>
            <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
              <p className="text-sm text-[#c9d1d9]">Obsidian GitHub</p>
              <p className="text-xs text-[#6e7681] mt-1">Version 0.1.0</p>
              <p className="text-xs text-[#6e7681] mt-2">
                A markdown note-taking app with GitHub sync, built with Tauri + React.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}