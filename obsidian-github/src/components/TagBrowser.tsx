import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";

export default function TagBrowser() {
  const { vaultPath, showTagBrowser, setTags, tags } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (showTagBrowser && vaultPath) {
      loadTags();
    }
  }, [showTagBrowser, vaultPath]);

  const loadTags = async () => {
    if (!vaultPath) return;
    setIsLoading(true);
    try {
      const tagList = await invoke<string[]>("get_all_tags", { localPath: vaultPath });
      setTags(tagList);
    } catch (e) {
      console.error("Failed to load tags:", e);
    }
    setIsLoading(false);
  };

  const handleClose = () => {
    useAppStore.getState().setShowTagBrowser(false);
  };

  if (!showTagBrowser) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg w-[350px] max-h-[400px] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[#30363d] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-[#c9d1d9]">Tags</h2>
          <button onClick={handleClose} className="text-[#6e7681] hover:text-[#c9d1d9] text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="p-4 text-center text-[#6e7681]">Loading...</div>
          ) : tags.length === 0 ? (
            <div className="p-4 text-center text-[#6e7681]">No tags found</div>
          ) : (
            <div className="flex flex-wrap gap-2 p-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-[#30363d] text-[#c9d1d9] rounded-full text-sm cursor-pointer hover:bg-[#484f58]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}