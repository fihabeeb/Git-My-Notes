import { useEffect, useRef, useCallback, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";
import { markdownPreview, markdownPreviewTheme } from "../lib/markdownPreview";

type SaveStatus = "saved" | "saving" | "unsaved";

export default function Editor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  
  const { activeFile, editorContent, setEditorContent, vaultPath, gitHubConfig, settings } = useAppStore();

  const saveFile = useCallback(async (content?: string) => {
    if (!activeFile || !vaultPath) return;
    
    const contentToSave = content ?? editorContent;
    setSaveStatus("saving");
    
    try {
      await invoke("write_file", { path: activeFile, content: contentToSave });
      lastSavedContentRef.current = contentToSave;
      setSaveStatus("saved");

      if (settings.autoCommit && gitHubConfig) {
        const fileName = activeFile.split("/").pop()?.replace(".md", "") || "unknown";
        const message = settings.commitMessage.replace("{filename}", fileName);
        try {
          await invoke("commit_changes", { localPath: vaultPath, message });
        } catch (e) {
          console.error("Failed to commit:", e);
        }
      }
    } catch (e) {
      console.error("Failed to save file:", e);
      setSaveStatus("unsaved");
    }
  }, [activeFile, vaultPath, editorContent, settings.autoCommit, settings.commitMessage, gitHubConfig]);

  const scheduleAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus("unsaved");
    saveTimeoutRef.current = setTimeout(() => {
      saveFile();
    }, 2000);
  }, [saveFile]);

  useEffect(() => {
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString();
        setEditorContent(newContent);
        if (newContent !== lastSavedContentRef.current) {
          scheduleAutoSave();
        }
      }
    });

    const saveKeymap = keymap.of([
      {
        key: "Mod-s",
        run: () => {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          saveFile();
          return true;
        },
      },
    ]);

    const theme = EditorView.theme({
      "&": {
        height: "100%",
        backgroundColor: "#0d1117",
      },
      ".cm-content": {
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: "#c9d1d9",
        padding: "16px",
      },
      ".cm-gutters": {
        backgroundColor: "#0d1117",
        borderRight: "1px solid #30363d",
        color: "#6e7681",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "#161b22",
      },
      ".cm-activeLine": {
        backgroundColor: "#161b2280",
      },
      ".cm-cursor": {
        borderLeftColor: "#58a6ff",
      },
      ".cm-selectionBackground": {
        backgroundColor: "#264f78 !important",
      },
      "&.cm-focused .cm-selectionBackground": {
        backgroundColor: "#264f78 !important",
      },
    });

    const state = EditorState.create({
      doc: editorContent,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        markdown(),
        syntaxHighlighting(defaultHighlightStyle),
        markdownPreview,
        markdownPreviewTheme,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        saveKeymap,
        updateListener,
        theme,
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;
    lastSavedContentRef.current = editorContent;

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      view.destroy();
    };
  }, []);

  useEffect(() => {
    if (viewRef.current && viewRef.current.state.doc.toString() !== editorContent) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: editorContent,
        },
      });
      lastSavedContentRef.current = editorContent;
    }
  }, [editorContent, activeFile]);

  const getStatusColor = () => {
    switch (saveStatus) {
      case "saving": return "text-yellow-500";
      case "saved": return "text-green-500";
      case "unsaved": return "text-orange-500";
    }
  };

  const getStatusText = () => {
    switch (saveStatus) {
      case "saving": return "Saving...";
      case "saved": return "Saved";
      case "unsaved": return "Unsaved";
    }
  };

  return (
    <div className="h-full obsidian-editor flex flex-col">
      {activeFile && (
        <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#c9d1d9] font-medium">
              {activeFile.split("/").pop()?.replace(".md", "")}
            </span>
            <span className={`text-xs ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          <button
            onClick={() => saveFile()}
            disabled={saveStatus === "saving"}
            className="px-3 py-1 text-xs bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}
      <div ref={editorRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
