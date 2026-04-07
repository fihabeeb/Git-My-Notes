import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

interface AppState {
  vaultPath: string | null;
  files: FileNode[];
  activeFile: string | null;
  editorContent: string;
  isGitHubConnected: boolean;
  gitHubConfig: GitHubConfig | null;
  isSyncing: boolean;
  syncStatus: string;
  githubSetupComplete: boolean;
  recentFolders: string[];
  
  setVaultPath: (path: string | null) => void;
  setFiles: (files: FileNode[]) => void;
  setActiveFile: (path: string | null) => void;
  setEditorContent: (content: string) => void;
  setGitHubConfig: (config: GitHubConfig | null) => void;
  setIsSyncing: (syncing: boolean) => void;
  setSyncStatus: (status: string) => void;
  setGithubSetupComplete: (complete: boolean) => void;
  setRecentFolders: (folders: string[]) => void;
  addRecentFolder: (path: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      vaultPath: null,
      files: [],
      activeFile: null,
      editorContent: "",
      isGitHubConnected: false,
      gitHubConfig: null,
      isSyncing: false,
      syncStatus: "Not connected",
      githubSetupComplete: false,
      recentFolders: [],
      
      setVaultPath: (path) => set({ vaultPath: path }),
      setFiles: (files) => set({ files }),
      setActiveFile: (file) => set({ activeFile: file }),
      setEditorContent: (content) => set({ editorContent: content }),
      setGitHubConfig: (config) => set({ gitHubConfig: config, isGitHubConnected: config !== null }),
      setIsSyncing: (syncing) => set({ isSyncing: syncing }),
      setSyncStatus: (status) => set({ syncStatus: status }),
      setGithubSetupComplete: (complete) => set({ githubSetupComplete: complete }),
      setRecentFolders: (folders) => set({ recentFolders: folders }),
      addRecentFolder: (path) => {
        const { recentFolders } = get();
        const filtered = recentFolders.filter(f => f !== path);
        const updated = [path, ...filtered].slice(0, 10);
        set({ recentFolders: updated });
      },
    }),
    {
      name: "obsidian-github-storage",
    }
  )
);
