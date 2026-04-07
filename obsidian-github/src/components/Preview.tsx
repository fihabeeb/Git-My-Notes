import { useAppStore } from "../store";

export default function Preview() {
  const { editorContent, activeFile } = useAppStore();

  if (!activeFile) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0d1117] text-[#6e7681]">
        <p>No file selected</p>
      </div>
    );
  }

  const htmlContent = editorContent
    .replace(/^# (.*$)/gim, "<h1 class='text-3xl font-bold text-[#c9d1d9] mb-4'>$1</h1>")
    .replace(/^## (.*$)/gim, "<h2 class='text-2xl font-semibold text-[#c9d1d9] mb-3'>$1</h2>")
    .replace(/^### (.*$)/gim, "<h3 class='text-xl font-semibold text-[#c9d1d9] mb-2'>$1</h3>")
    .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*)\*/gim, "<em>$1</em>")
    .replace(/\[\[(.*?)\]\]/gim, "<span class='text-[#58a6ff] cursor-pointer hover:underline'>$1</span>")
    .replace(/\n/gim, "<br />");

  return (
    <div className="h-full bg-[#0d1117] p-6 overflow-y-auto">
      <div
        className="prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
