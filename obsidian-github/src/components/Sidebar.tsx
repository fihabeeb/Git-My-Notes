import { useState, useEffect } from "react";
import { useAppStore, FileNode } from "../store";
import { invoke } from "@tauri-apps/api/core";
import { readDir } from "@tauri-apps/plugin-fs";

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

async function loadDirectory(path: string): Promise<FileNode[]> {
  try {
    const normalizedPath = normalizePath(path);
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
    console.error("Error loading directory:", e);
    return [];
  }
}

function FileTree({ nodes, depth = 0 }: { nodes: FileNode[]; depth?: number }) {
  const { activeFile, setActiveFile, setEditorContent } = useAppStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  return (
    <ul className="pl-2">
      {nodes.map((node) => (
        <li key={node.path}>
          <div
            className={`flex items-center gap-1 py-1 px-2 cursor-pointer rounded hover:bg-[#30363d] ${
              activeFile === node.path ? "bg-[#30363d]" : ""
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => handleFileClick(node)}
          >
            <span className="text-xs">{node.isDirectory ? "📁" : "📄"}</span>
            <span className="text-sm truncate">{node.name.replace(".md", "")}</span>
          </div>
          {node.isDirectory && expanded[node.path] && node.children && (
            <FileTree nodes={node.children} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Sidebar() {
  const { vaultPath, files, setFiles, setActiveFile, setEditorContent, setVaultPath, setGitHubConfig, setGithubSetupComplete } = useAppStore();
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoBack = () => {
    setVaultPath(null);
    setGitHubConfig(null);
    setGithubSetupComplete(false);
  };

  useEffect(() => {
    if (vaultPath) {
      setIsLoading(true);
      loadDirectory(vaultPath).then((loadedFiles) => {
        setFiles(loadedFiles);
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    }
  }, [vaultPath, setFiles]);

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
      const updatedFiles = await loadDirectory(normalizedVaultPath);
      setFiles(updatedFiles);
    } catch (e) {
      console.error("Failed to create file:", e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateFile();
    } else if (e.key === "Escape") {
      setShowNewFileInput(false);
      setNewFileName("");
    }
  };

  return (
    <div className="h-full obsidian-sidebar flex flex-col">
      <div className="p-3 border-b border-[#30363d] flex justify-between items-center">
        <h2 className="text-sm font-semibold text-[#c9d1d9]">Explorer</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGoBack}
            className="text-[#6e7681] hover:text-[#c9d1d9] text-xs"
            title="Back to Welcome"
          >
            Back
          </button>
          <button
            onClick={() => setShowNewFileInput(true)}
            className="text-[#6e7681] hover:text-[#c9d1d9] text-lg"
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
          <FileTree nodes={files} />
        )}
      </div>
      {showNewFileInput && (
        <div className="p-2 border-t border-[#30363d]">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={handleKeyDown}
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
