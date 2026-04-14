import { useEffect } from "react";
import { useAppStore } from "../store";

export default function KeyboardShortcuts() {
  const { setShowSearch, setShowSettings, setShowBranchManager } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && e.key === "P") {
          e.preventDefault();
          setShowSearch(true);
        } else if (e.key === ",") {
          e.preventDefault();
          setShowSettings(true);
        } else if (e.key === "b") {
          e.preventDefault();
          setShowBranchManager(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setShowSearch, setShowSettings, setShowBranchManager]);

  return null;
}