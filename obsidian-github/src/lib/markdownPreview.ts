import { ViewPlugin, Decoration, EditorView } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

const headingMark = Decoration.mark({ class: "cm-heading" });
const boldMark = Decoration.mark({ class: "cm-bold" });
const italicMark = Decoration.mark({ class: "cm-italic" });
const linkMark = Decoration.mark({ class: "cm-link" });
const codeMark = Decoration.mark({ class: "cm-code" });

function parseInlineMarkdown(text: string): { from: number; to: number; decoration: Decoration }[] {
  const decorations: { from: number; to: number; decoration: Decoration }[] = [];
  
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let match;
  while ((match = boldRegex.exec(text)) !== null) {
    decorations.push({
      from: match.index,
      to: match.index + match[0].length,
      decoration: boldMark,
    });
  }
  
  const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)|_([^_]+)_/g;
  while ((match = italicRegex.exec(text)) !== null) {
    decorations.push({
      from: match.index,
      to: match.index + match[0].length,
      decoration: italicMark,
    });
  }
  
  const codeRegex = /`([^`]+)`/g;
  while ((match = codeRegex.exec(text)) !== null) {
    decorations.push({
      from: match.index,
      to: match.index + match[0].length,
      decoration: codeMark,
    });
  }
  
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  while ((match = linkRegex.exec(text)) !== null) {
    decorations.push({
      from: match.index,
      to: match.index + match[0].length,
      decoration: linkMark,
    });
  }
  
  return decorations;
}

export const markdownPreview = ViewPlugin.fromClass(
  class {
    decorations: any;

    constructor(view: any) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: any) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: any) {
      const builder = new RangeSetBuilder<Decoration>();
      const doc = view.state.doc.toString();
      
      const lines = doc.split("\n");
      let offset = 0;
      for (const line of lines) {
        const lineStart = offset;
        const lineEnd = offset + line.length;
        
        if (line.startsWith("# ")) {
          builder.add(lineStart, lineEnd, headingMark);
        } else if (line.startsWith("## ")) {
          builder.add(lineStart, lineEnd, headingMark);
        } else if (line.startsWith("### ")) {
          builder.add(lineStart, lineEnd, headingMark);
        }
        
        offset = lineEnd + 1;
      }
      
      const inlineDecorations = parseInlineMarkdown(doc);
      for (const dec of inlineDecorations) {
        builder.add(dec.from, dec.to, dec.decoration);
      }
      
      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

export const markdownPreviewTheme = EditorView.theme({
  ".cm-heading": {
    fontWeight: "bold",
    fontSize: "1.2em",
    color: "#c9d1d9",
  },
  ".cm-bold": {
    fontWeight: "bold",
  },
  ".cm-italic": {
    fontStyle: "italic",
  },
  ".cm-link": {
    color: "#58a6ff",
    textDecoration: "underline",
  },
  ".cm-code": {
    backgroundColor: "#161b22",
    borderRadius: "3px",
    padding: "0 4px",
    fontFamily: "monospace",
  },
});
