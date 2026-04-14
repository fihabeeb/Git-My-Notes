# TODO - Obsidian GitHub

## Completed Features
- Welcome screen with vault selection
- GitHub repository connection and cloning
- File explorer with tree view
- Markdown editor with CodeMirror 6
- Live preview panel with proper markdown rendering (using marked)
- GitHub sync (pull/push)
- Auto-commit on save
- Conflict detection banner
- Conflict resolution UI (ours/theirs/both)
- Split-pane resizable interface
- Dark theme (GitHub-inspired)
- Recent folders persistence
- Commit history viewer
- Settings UI (auto-commit, auto-sync, sync interval, commit message)
- Folder management (create new folders)
- File operations (rename, delete via right-click context menu)
- Wiki links `[[link]]` support - clickable in preview
- Search palette (Ctrl+P) - file and content search
- Editor toolbar with formatting buttons
- Branch management (view/switch/create branches)
- Git tags browser
- Export to HTML/Markdown
- Keyboard shortcuts (Ctrl+Shift+P search, Ctrl+, settings, Ctrl+B branches)

## Remaining Features

### Auto-refresh file tree
- Would require file system watching
- Lower priority as most changes happen through the app

### Future Enhancements (Lower Priority)
- Multiple vaults support
- Plugin system
- Encrypted notes
- Mobile companion app

## Known Issues to Fix
1. File tree doesn't auto-refresh on external changes
2. Search doesn't search file contents by default (Tab to switch to content search)

## Completed!
All high and medium priority items from the original TODO have been implemented.