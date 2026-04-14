import { useMemo, useCallback, useEffect } from "react";
import { marked } from "marked";
import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";

marked.setOptions({
  gfm: true,
  breaks: true,
});

export default function Preview() {
  const { editorContent, activeFile, setActiveFile, setEditorContent } = useAppStore();

  const processWikiLinks = (content: string): string => {
    return content.replace(/\[\[(.*?)\]\]/g, '<span class="wiki-link" data-link="$1">$1</span>');
  };

  const renderedContent = useMemo(() => {
    if (!editorContent) return "";
    try {
      const parsed = marked.parse(editorContent);
      if (typeof parsed === "string") {
        return processWikiLinks(parsed);
      }
      return processWikiLinks(String(parsed));
    } catch (e) {
      console.error("Markdown parse error:", e);
      return processWikiLinks(editorContent);
    }
  }, [editorContent]);

  const handleClick = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("wiki-link")) {
      const linkName = target.getAttribute("data-link");
      if (!linkName || !activeFile) return;
      
      const basePath = activeFile.substring(0, activeFile.lastIndexOf("/") + 1);
      const linkedFile = `${basePath}${linkName}.md`;
      
      (async () => {
        try {
          const content = await invoke<string>("read_file", { path: linkedFile });
          setActiveFile(linkedFile);
          setEditorContent(content);
        } catch (err) {
          console.error("Wiki link file not found:", linkedFile);
        }
      })();
    }
  }, [activeFile, setActiveFile, setEditorContent]);

  useEffect(() => {
    const container = document.querySelector(".markdown-preview");
    if (container) {
      container.addEventListener("click", handleClick);
      return () => { container.removeEventListener("click", handleClick); };
    }
  }, [handleClick]);

  if (!activeFile) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0d1117] text-[#6e7681]">
        <p>No file selected</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0d1117] p-6 overflow-y-auto">
      <div
        className="prose prose-invert max-w-none markdown-preview"
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />
    </div>
  );
}