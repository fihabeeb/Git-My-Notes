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
  
  setVaultPath: (path: string | null) => void;
  setFiles: (files: FileNode[]) => void;
  setActiveFile: (path: string | null) => void;
  setEditorContent: (content: string) => void;
  setGitHubConfig: (config: GitHubConfig | null) => void;
  setIsSyncing: (syncing: boolean) => void;
  setSyncStatus: (status: string) => void;
  setGithubSetupComplete: (complete: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      vaultPath: null,
      files: [],
      activeFile: null,
      editorContent: "",
      isGitHubConnected: false,
      gitHubConfig: null,
      isSyncing: false,
      syncStatus: "Not connected",
      githubSetupComplete: false,
      
      setVaultPath: (path) => set({ vaultPath: path }),
      setFiles: (files) => set({ files }),
      setActiveFile: (file) => set({ activeFile: file }),
      setEditorContent: (content) => set({ editorContent: content }),
      setGitHubConfig: (config) => set({ gitHubConfig: config, isGitHubConnected: config !== null }),
      setIsSyncing: (syncing) => set({ isSyncing: syncing }),
      setSyncStatus: (status) => set({ syncStatus: status }),
      setGithubSetupComplete: (complete) => set({ githubSetupComplete: complete }),
    }),
    {
      name: "obsidian-github-storage",
    }
  )
);
