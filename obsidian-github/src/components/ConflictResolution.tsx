import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";

interface ConflictContent {
  path: string;
  our_content: string;
  their_content: string;
}

export default function ConflictResolution() {
  const { vaultPath, conflicts, setConflicts, showConflictResolution } = useAppStore();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [conflictContent, setConflictContent] = useState<ConflictContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  if (!showConflictResolution || conflicts.length === 0) return null;

  useEffect(() => {
    if (conflicts.length > 0 && !selectedFile) {
      setSelectedFile(conflicts[0].path);
    }
  }, [conflicts, selectedFile]);

  useEffect(() => {
    if (selectedFile && vaultPath) {
      loadConflictContent();
    }
  }, [selectedFile, vaultPath]);

  const loadConflictContent = async () => {
    if (!selectedFile || !vaultPath) return;
    setIsLoading(true);
    try {
      const content = await invoke<ConflictContent>("get_conflicted_file_content", {
        localPath: vaultPath,
        filePath: selectedFile,
      });
      setConflictContent(content);
    } catch (e) {
      console.error("Failed to load conflict content:", e);
    }
    setIsLoading(false);
  };

  const handleResolve = async (resolution: string) => {
    if (!selectedFile || !vaultPath) return;
    setResolving(true);
    try {
      await invoke("resolve_conflict", {
        localPath: vaultPath,
        filePath: selectedFile,
        resolution,
      });
      
      const remaining = conflicts.filter(c => c.path !== selectedFile);
      setConflicts(remaining);
      setSelectedFile(remaining.length > 0 ? remaining[0].path : null);
      setConflictContent(null);
    } catch (e) {
      console.error("Failed to resolve conflict:", e);
      alert("Failed to resolve conflict: " + e);
    }
    setResolving(false);
  };

  const handleClose = () => {
    setConflicts([]);
    setSelectedFile(null);
    setConflictContent(null);
    useAppStore.getState().setShowConflictResolution(false);
  };

  if (conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg w-[900px] max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-[#30363d] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-yellow-500 text-xl">⚠️</span>
            <h2 className="text-lg font-semibold text-[#c9d1d9]">Resolve Conflicts</h2>
            <span className="text-sm text-[#6e7681]">({conflicts.length} file{conflicts.length > 1 ? "s" : ""})</span>
          </div>
          <button onClick={handleClose} className="text-[#6e7681] hover:text-[#c9d1d9] text-xl">✕</button>
        </div>

        <div className="flex border-b border-[#30363d]">
          {conflicts.map((conflict) => (
            <button
              key={conflict.path}
              onClick={() => setSelectedFile(conflict.path)}
              className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                selectedFile === conflict.path
                  ? "border-yellow-500 text-[#c9d1d9]"
                  : "border-transparent text-[#6e7681] hover:text-[#c9d1d9]"
              }`}
            >
              {conflict.path.split("/").pop()}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden flex">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-[#6e7681]">Loading...</div>
          ) : conflictContent ? (
            <>
              <div className="flex-1 border-r border-[#30363d] flex flex-col">
                <div className="p-2 bg-[#0d1117] text-xs text-[#6e7681] font-semibold">OURS (local)</div>
                <pre className="flex-1 p-4 text-sm text-[#c9d1d9] font-mono overflow-auto whitespace-pre-wrap">
                  {conflictContent.our_content || "(empty)"}
                </pre>
              </div>
              <div className="flex-1 flex flex-col">
                <div className="p-2 bg-[#0d1117] text-xs text-[#6e7681] font-semibold">THEIRS (remote)</div>
                <pre className="flex-1 p-4 text-sm text-[#c9d1d9] font-mono overflow-auto whitespace-pre-wrap">
                  {conflictContent.their_content || "(empty)"}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#6e7681]">No content</div>
          )}
        </div>

        <div className="p-4 border-t border-[#30363d] flex justify-between items-center">
          <div className="text-sm text-[#6e7681]">
            Select which version to keep
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleResolve("ours")}
              disabled={resolving}
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors disabled:opacity-50"
            >
              Keep Ours
            </button>
            <button
              onClick={() => handleResolve("theirs")}
              disabled={resolving}
              className="px-4 py-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white rounded transition-colors disabled:opacity-50"
            >
              Keep Theirs
            </button>
            <button
              onClick={() => handleResolve("both")}
              disabled={resolving}
              className="px-4 py-2 bg-[#30363d] hover:bg-[#484f58] text-white rounded transition-colors disabled:opacity-50"
            >
              Keep Both
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}