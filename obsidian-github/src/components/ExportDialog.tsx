import { useState } from "react";
import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";

export default function ExportDialog() {
  const { activeFile, editorContent, showExport, setShowExport } = useAppStore();
  const [format, setFormat] = useState<"html" | "markdown">("html");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!activeFile) return;
    setIsExporting(true);

    try {
      let content = editorContent;
      let filename = activeFile.split("/").pop()?.replace(".md", "") || "export";

      if (format === "html") {
        const parsed = await invoke<string>("convert_markdown_to_html", { content });
        content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${filename}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1, h2, h3 { margin-top: 1.5em; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
    blockquote { border-left: 4px solid #ddd; padding-left: 16px; color: #666; }
  </style>
</head>
<body>
${parsed}
</body>
</html>`;
        filename += ".html";
      } else {
        filename += ".md";
      }

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      setShowExport(false);
    } catch (e) {
      console.error("Export failed:", e);
      alert("Export failed: " + e);
    }

    setIsExporting(false);
  };

  if (!showExport) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowExport(false)}>
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg w-[350px]" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[#30363d] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-[#c9d1d9]">Export</h2>
          <button onClick={() => setShowExport(false)} className="text-[#6e7681] hover:text-[#c9d1d9] text-xl">✕</button>
        </div>
        <div className="p-4">
          <p className="text-sm text-[#c9d1d9] mb-4">Export current file as:</p>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFormat("html")}
              className={`flex-1 px-4 py-2 rounded text-sm ${
                format === "html" 
                  ? "bg-[#30363d] text-[#c9d1d9]" 
                  : "bg-[#0d1117] text-[#6e7681] hover:text-[#c9d1d9]"
              }`}
            >
              HTML
            </button>
            <button
              onClick={() => setFormat("markdown")}
              className={`flex-1 px-4 py-2 rounded text-sm ${
                format === "markdown" 
                  ? "bg-[#30363d] text-[#c9d1d9]" 
                  : "bg-[#0d1117] text-[#6e7681] hover:text-[#c9d1d9]"
              }`}
            >
              Markdown
            </button>
          </div>
          <button
            onClick={handleExport}
            disabled={!activeFile || isExporting}
            className="w-full px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded text-sm disabled:opacity-50"
          >
            {isExporting ? "Exporting..." : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}