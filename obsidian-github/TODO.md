# TODO - Obsidian GitHub

## Completed Features
- Welcome screen with vault selection
- GitHub repository connection and cloning
- File explorer with tree view
- Markdown editor with CodeMirror 6
- Live preview panel
- GitHub sync (pull/push)
- Auto-commit on save
- Conflict detection banner
- Split-pane resizable interface
- Dark theme (GitHub-inspired)
- Recent folders persistence
- Commit history viewer

## Next Steps (Priority Order)

### High Priority

1. **Settings UI**
   - Create Settings component
   - Add auto-commit toggle
   - Add auto-sync toggle with interval selector
   - Custom commit message template
   - Settings accessible from status bar or menu

2. **Conflict Resolution UI**
   - Implement proper conflict resolution flow
   - Show diff view for conflicted files
   - Options to keep local/remote/both versions

3. **Folder Management**
   - Add "New Folder" button in sidebar
   - Right-click context menu for rename/delete

4. **File Operations**
   - Delete file functionality
   - Rename file functionality
   - Context menu in sidebar

### Medium Priority

5. **Enhanced Markdown Preview**
   - Use proper markdown parser (marked or remark)
   - Support more markdown features (tables, code blocks, lists)
   - Proper syntax highlighting in preview

6. **Wiki Links Support**
   - Make `[[link]]` clickable in editor and preview
   - Navigate to linked file on click

7. **Search Functionality**
   - Global search (Ctrl+P)
   - Search across all notes
   - Quick file switcher

8. **Editor Toolbar**
   - Add formatting buttons (bold, italic, headers, etc.)
   - Insert link dialog

### Lower Priority

9. **Tag System**
   - Parse #tags in markdown
   - Tag browser in sidebar

10. **Branch Management**
    - Show current branch
    - Switch branches
    - Create new branches

11. **Keyboard Shortcuts**
    - Command palette (Ctrl+Shift+P)
    - More keyboard navigation

12. **Export Options**
    - Export to PDF/HTML

## Known Issues to Fix

1. Preview rendering is very basic regex-based
2. No proper error handling for Git operations
3. Auto-sync interval validation needed
4. File tree doesn't auto-refresh on external changes

## Future Enhancements

- Mobile companion app
- Multiple vaults support
- Plugin system
- Encrypted notes
- Publish to web