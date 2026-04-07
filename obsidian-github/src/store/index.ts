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

export interface RecentFolder {
  path: string;
  gitHubConfig?: GitHubConfig;
  lastOpened: number;
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
  recentFolders: RecentFolder[];
  
  setVaultPath: (path: string | null) => void;
  setFiles: (files: FileNode[]) => void;
  setActiveFile: (path: string | null) => void;
  setEditorContent: (content: string) => void;
  setGitHubConfig: (config: GitHubConfig | null) => void;
  setIsSyncing: (syncing: boolean) => void;
  setSyncStatus: (status: string) => void;
  setGithubSetupComplete: (complete: boolean) => void;
  setRecentFolders: (folders: RecentFolder[]) => void;
  addRecentFolder: (path: string, gitHubConfig?: GitHubConfig) => void;
  getRecentFolder: (path: string) => RecentFolder | undefined;
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
      addRecentFolder: (path, gitHubConfig) => {
        const { recentFolders } = get();
        const filtered = recentFolders.filter(f => f.path !== path);
        const newFolder: RecentFolder = {
          path,
          gitHubConfig,
          lastOpened: Date.now(),
        };
        const updated = [newFolder, ...filtered].slice(0, 10);
        set({ recentFolders: updated });
      },
      getRecentFolder: (path) => {
        const { recentFolders } = get();
        return recentFolders.find(f => f.path === path);
      },
    }),
    {
      name: "obsidian-github-storage",
    }
  )
);
