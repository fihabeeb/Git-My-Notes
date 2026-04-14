import { useState, useEffect } from "react";
import { useAppStore, FileNode } from "../store";
import { invoke } from "@tauri-apps/api/core";
import { readDir } from "@tauri-apps/plugin-fs";

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

async function loadDirectory(path: string): Promise<FileNode[]> {
  const normalizedPath = normalizePath(path);
  try {
    const entries = await readDir(normalizedPath);
    const nodes: FileNode[] = [];
    
    for (const entry of entries) {
      const fullPath = `${normalizedPath}/${entry.name}`;
      if (entry.isDirectory && !entry.name.startsWith(".")) {
        nodes.push({
          name: entry.name,
          path: fullPath,
          isDirectory: true,
          children: await loadDirectory(fullPath),
        });
      } else if (entry.name.endsWith(".md")) {
        nodes.push({
          name: entry.name,
          path: fullPath,
          isDirectory: false,
        });
      }
    }
    
    return nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (e) {
    return [];
  }
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  node: FileNode | null;
}

function FileTree({ nodes, depth = 0, onRefresh }: { nodes: FileNode[]; depth?: number; onRefresh: () => void }) {
  const { activeFile, setActiveFile, setEditorContent } = useAppStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
  });
  const [renameMode, setRenameMode] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const handleFileClick = async (node: FileNode) => {
    if (node.isDirectory) {
      setExpanded((prev) => ({ ...prev, [node.path]: !prev[node.path] }));
    } else {
      const normalizedPath = normalizePath(node.path);
      setActiveFile(normalizedPath);
      const response = await invoke<string>("read_file", { path: normalizedPath });
      setEditorContent(response);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, node: null });
  };

  const handleRename = () => {
    if (!contextMenu.node) return;
    setRenameMode(contextMenu.node.path);
    setNewName(contextMenu.node.name);
    closeContextMenu();
  };

  const handleDelete = async () => {
    if (!contextMenu.node || !confirm(`Delete "${contextMenu.node.name}"?`)) return;
    try {
      await invoke("delete_file", { path: contextMenu.node.path });
      onRefresh();
    } catch (e) {
      console.error("Failed to delete:", e);
    }
    closeContextMenu();
  };

  const submitRename = async () => {
    if (!renameMode || !newName.trim()) {
      setRenameMode(null);
      return;
    }
    try {
      const newPath = await invoke<string>("rename_file", {
        oldPath: renameMode,
        newName: newName.trim(),
      });
      onRefresh();
      if (activeFile?.startsWith(renameMode)) {
        setActiveFile(newPath);
      }
    } catch (e) {
      console.error("Failed to rename:", e);
    }
    setRenameMode(null);
  };

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <>
      <ul className="pl-2">
        {nodes.map((node) => (
          <li key={node.path}>
            {renameMode === node.path ? (
              <div style={{ paddingLeft: `${depth * 12 + 8}px` }} className="flex items-center gap-1 py-1 px-2">
                <span className="text-xs">{node.isDirectory ? "📁" : "📄"}</span>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitRename();
                    if (e.key === "Escape") setRenameMode(null);
                  }}
                  onBlur={submitRename}
                  autoFocus
                  className="bg-[#0d1117] border border-[#58a6ff] rounded px-1 py-0.5 text-sm text-[#c9d1d9] outline-none"
                />
              </div>
            ) : (
              <div
                className={`flex items-center gap-1 py-1 px-2 cursor-pointer rounded hover:bg-[#30363d] ${
                  activeFile === node.path ? "bg-[#30363d]" : ""
                }`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={() => handleFileClick(node)}
                onContextMenu={(e) => handleContextMenu(e, node)}
              >
                <span className="text-xs">{node.isDirectory ? "📁" : "📄"}</span>
                <span className="text-sm truncate">{node.name.replace(".md", "")}</span>
              </div>
            )}
            {node.isDirectory && expanded[node.path] && node.children && (
              <FileTree nodes={node.children} depth={depth + 1} onRefresh={onRefresh} />
            )}
          </li>
        ))}
      </ul>

      {contextMenu.visible && contextMenu.node && (
        <div
          className="fixed bg-[#161b22] border border-[#30363d] rounded shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-1.5 text-sm text-[#c9d1d9] hover:bg-[#30363d] text-left"
            onClick={handleRename}
          >
            Rename
          </button>
          <button
            className="w-full px-4 py-1.5 text-sm text-red-400 hover:bg-[#30363d] text-left"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      )}
    </>
  );
}

export default function Sidebar() {
  const { vaultPath, files, setFiles, setActiveFile, setEditorContent, setVaultPath, setGitHubConfig, setGithubSetupComplete } = useAppStore();
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoBack = () => {
    setVaultPath(null);
    setGitHubConfig(null);
    setGithubSetupComplete(false);
  };

  const refreshFiles = async () => {
    if (!vaultPath) return;
    const normalizedVaultPath = normalizePath(vaultPath);
    const updatedFiles = await loadDirectory(normalizedVaultPath);
    setFiles(updatedFiles);
  };

  useEffect(() => {
    if (!vaultPath) return;
    setIsLoading(true);
    loadDirectory(vaultPath).then((loadedFiles) => {
      setFiles(loadedFiles);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, [vaultPath]);

  const handleCreateFile = async () => {
    if (!newFileName.trim() || !vaultPath) return;
    
    let fileName = newFileName.trim();
    if (!fileName.endsWith(".md")) {
      fileName += ".md";
    }
    
    const normalizedVaultPath = normalizePath(vaultPath);
    const filePath = `${normalizedVaultPath}/${fileName}`;
    
    try {
      await invoke("create_file", { path: filePath });
      setNewFileName("");
      setShowNewFileInput(false);
      setActiveFile(filePath);
      setEditorContent("");
      await refreshFiles();
    } catch (e) {
      console.error("Failed to create file:", e);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !vaultPath) return;
    
    const normalizedVaultPath = normalizePath(vaultPath);
    const folderPath = `${normalizedVaultPath}/${newFolderName.trim()}`;
    
    try {
      await invoke("create_folder", { path: folderPath });
      setNewFolderName("");
      setShowNewFolderInput(false);
      await refreshFiles();
    } catch (e) {
      console.error("Failed to create folder:", e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, type: "file" | "folder") => {
    if (e.key === "Enter") {
      if (type === "file") handleCreateFile();
      else handleCreateFolder();
    } else if (e.key === "Escape") {
      if (type === "file") {
        setShowNewFileInput(false);
        setNewFileName("");
      } else {
        setShowNewFolderInput(false);
        setNewFolderName("");
      }
    }
  };

  return (
    <div className="h-full obsidian-sidebar flex flex-col">
      <div className="p-3 border-b border-[#30363d] flex justify-between items-center">
        <h2 className="text-sm font-semibold text-[#c9d1d9]">Explorer</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handleGoBack}
            className="text-[#6e7681] hover:text-[#c9d1d9] text-xs px-2"
            title="Back to Welcome"
          >
            Back
          </button>
          <button
            onClick={() => setShowNewFolderInput(true)}
            className="text-[#6e7681] hover:text-[#c9d1d9] text-lg px-1"
            title="New Folder"
          >
            📁+
          </button>
          <button
            onClick={() => setShowNewFileInput(true)}
            className="text-[#6e7681] hover:text-[#c9d1d9] text-lg px-1"
            title="New File"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="p-4 text-center text-[#6e7681] text-sm">Loading...</div>
        ) : files.length === 0 ? (
          <div className="p-4 text-center text-[#6e7681] text-sm">No .md files found</div>
        ) : (
          <FileTree nodes={files} onRefresh={refreshFiles} />
        )}
      </div>

      {showNewFolderInput && (
        <div className="p-2 border-t border-[#30363d]">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "folder")}
            onBlur={() => {
              if (!newFolderName.trim()) {
                setShowNewFolderInput(false);
              }
            }}
            placeholder="folder name"
            autoFocus
            className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-sm text-[#c9d1d9] placeholder-[#6e7681] focus:border-[#58a6ff] outline-none"
          />
          <div className="flex gap-1 mt-1">
            <button
              onClick={handleCreateFolder}
              className="flex-1 px-2 py-1 text-xs bg-[#238636] hover:bg-[#2ea043] text-white rounded"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewFolderInput(false);
                setNewFolderName("");
              }}
              className="flex-1 px-2 py-1 text-xs bg-[#30363d] hover:bg-[#484f58] text-white rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showNewFileInput && (
        <div className="p-2 border-t border-[#30363d]">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "file")}
            onBlur={() => {
              if (!newFileName.trim()) {
                setShowNewFileInput(false);
              }
            }}
            placeholder="filename.md"
            autoFocus
            className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-sm text-[#c9d1d9] placeholder-[#6e7681] focus:border-[#58a6ff] outline-none"
          />
          <div className="flex gap-1 mt-1">
            <button
              onClick={handleCreateFile}
              className="flex-1 px-2 py-1 text-xs bg-[#238636] hover:bg-[#2ea043] text-white rounded"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewFileInput(false);
                setNewFileName("");
              }}
              className="flex-1 px-2 py-1 text-xs bg-[#30363d] hover:bg-[#484f58] text-white rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}