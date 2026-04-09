# Obsidian GitHub

A markdown note-taking app with GitHub sync, built with Tauri + React.

## Features

- File explorer with folder tree
- Markdown editor with live preview
- GitHub repository sync (clone, pull, push)
- Split-pane interface
- Dark theme

## Tech Stack

- **Desktop Shell**: Tauri 2.0 (Rust)
- **Frontend**: React 18 + TypeScript
- **Editor**: CodeMirror 6
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Git Operations**: git2 (Rust)

## Setup

### AI
- Model: MiniMax M2.5 Free
- CLI Tool: Opencode

### Prerequisites

- Node.js 18+
- Rust 1.70+
- npm or yarn

### Installation

```bash
cd obsidian-github
npm install
```

### Development

```bash
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

## GitHub Token Setup

1. Go to https://github.com/settings/tokens/new
2. Select `repo` scope
3. Generate token
4. Enter token in the app's GitHub setup screen

## Project Structure

```
obsidian-github/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── Editor.tsx     # Markdown editor
│   │   ├── Preview.tsx    # Live preview
│   │   ├── Sidebar.tsx    # File explorer
│   │   └── ...
│   ├── store/             # Zustand state
│   └── App.tsx            # Main app
├── src-tauri/             # Tauri backend
│   ├── src/
│   │   └── lib.rs         # Rust commands
│   └── Cargo.toml
└── package.json
```
