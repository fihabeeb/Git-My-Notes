import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";

interface FileResult {
  name: string;
  path: string;
  type: "file";
}

interface ContentResult {
  name: string;
  path: string;
  type: "content";
  matches: number;
  line_numbers: number[];
}

export default function SearchPalette() {
  const { files, setActiveFile, setEditorContent, showSearch, vaultPath } = useAppStore();
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"files" | "content">("files");
  const [results, setResults] = useState<(FileResult | ContentResult)[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const allFiles = useMemo(() => {
    const flatten = (nodes: typeof files): FileResult[] => {
      return nodes.flatMap(node => {
        if (node.isDirectory && node.children) {
          return flatten(node.children).map(f => ({
            ...f,
            name: `${node.name}/${f.name}`,
          }));
        }
        return [{ name: node.name.replace(".md", ""), path: node.path, type: "file" as const }];
      });
    };
    return flatten(files);
  }, [files]);

  useEffect(() => {
    if (query.trim() === "") {
      setResults(searchMode === "files" ? allFiles.slice(0, 20) : []);
      return;
    }

    if (searchMode === "files") {
      const filtered = allFiles.filter(f => 
        f.name.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered.slice(0, 20));
    } else {
      if (!vaultPath) return;
      setIsSearching(true);
      invoke<ContentResult[]>("search_files_content", { localPath: vaultPath, query })
        .then(contentResults => {
          setResults(contentResults.slice(0, 20));
        })
        .catch(e => {
          console.error("Search failed:", e);
          setResults([]);
        })
        .finally(() => setIsSearching(false));
    }
    setSelectedIndex(0);
  }, [query, allFiles, searchMode, vaultPath]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        useAppStore.getState().setShowSearch(true);
      }
      if (!showSearch) return;
      
      if (e.key === "Escape") {
        useAppStore.getState().setShowSearch(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex].path);
      } else if (e.key === "Tab") {
        e.preventDefault();
        setSearchMode(prev => prev === "files" ? "content" : "files");
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearch, results, selectedIndex]);

  const handleSelect = async (path: string) => {
    try {
      const content = await invoke<string>("read_file", { path });
      setActiveFile(path);
      setEditorContent(content);
      useAppStore.getState().setShowSearch(false);
      setQuery("");
    } catch (e) {
      console.error("Failed to open file:", e);
    }
  };

  if (!showSearch) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[100px] z-50"
      onClick={() => useAppStore.getState().setShowSearch(false)}
    >
      <div 
        className="bg-[#161b22] border border-[#30363d] rounded-lg w-[600px] max-h-[500px] flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-3 border-b border-[#30363d] flex gap-2">
          <div className="flex rounded overflow-hidden border border-[#30363d]">
            <button
              onClick={() => setSearchMode("files")}
              className={`px-3 py-1.5 text-xs ${
                searchMode === "files" 
                  ? "bg-[#30363d] text-[#c9d1d9]" 
                  : "bg-[#0d1117] text-[#6e7681] hover:text-[#c9d1d9]"
              }`}
            >
              Files
            </button>
            <button
              onClick={() => setSearchMode("content")}
              className={`px-3 py-1.5 text-xs ${
                searchMode === "content" 
                  ? "bg-[#30363d] text-[#c9d1d9]" 
                  : "bg-[#0d1117] text-[#6e7681] hover:text-[#c9d1d9]"
              }`}
            >
              Content
            </button>
          </div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchMode === "files" ? "Search files... (Ctrl+P)" : "Search in files..."}
            autoFocus
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-[#c9d1d9] placeholder-[#6e7681] focus:border-[#58a6ff] outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-[#6e7681] text-sm">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-[#6e7681] text-sm">
              {query.trim() === "" ? "Start typing to search" : "No results found"}
            </div>
          ) : (
            <div className="py-1">
              {results.map((result, index) => (
                <button
                  key={result.path}
                  onClick={() => handleSelect(result.path)}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                    index === selectedIndex 
                      ? "bg-[#30363d] text-[#c9d1d9]" 
                      : "text-[#8b949e] hover:bg-[#0d1117]"
                  }`}
                >
                  <span className="text-[#6e7681]">📄</span>
                  <span className="truncate flex-1 text-left">{result.name}</span>
                  {result.type === "content" && (
                    <span className="text-xs text-[#58a6ff]">{result.matches} matches</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-2 border-t border-[#30363d] text-xs text-[#6e7681] flex justify-between">
          <span>↑↓ Navigate</span>
          <span>Tab: Switch mode</span>
          <span>Enter to open</span>
        </div>
      </div>
    </div>
  );
}