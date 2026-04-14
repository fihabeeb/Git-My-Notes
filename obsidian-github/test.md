# Test Document for Obsidian GitHub

Use this document to test the app's features. After testing each section, note whether it works or has issues.

---

## ✅ Completed Features (Test These)

### 1. Welcome Screen & Vault Selection
- [ ] App opens to welcome screen
- [ ] Can enter vault path manually
- [ ] Can browse for folder with "Browse" button
- [ ] Can open a vault from "Recent Folders"
- [ ] "Reset Settings" clears all stored data

### 2. GitHub Setup
- [ ] GitHub setup screen appears after selecting vault
- [ ] Can enter Personal Access Token
- [ ] Can enter repository Owner and Name
- [ ] Can clone a new repository
- [ ] Can connect to existing local repository
- [ ] "Skip for now" works for local-only mode

### 3. File Explorer (Sidebar)
- [ ] Shows .md files in tree structure
- [ ] Folders can be expanded/collapsed
- [ ] Clicking a file opens it in editor
- [ ] Can create new file with "+" button
- [ ] Back button returns to welcome screen

### 4. Markdown Editor
- [ ] CodeMirror editor loads with dark theme
- [ ] Syntax highlighting works for markdown
- [ ] Line numbers are visible
- [ ] Auto-save triggers after 2 seconds of typing
- [ ] Manual save with Ctrl+S or Save button
- [ ] Shows save status (Saved/Saving/Unsaved)

### 5. Live Preview
- [ ] Preview panel shows rendered markdown
- [ ] Headers (# ## ###) render correctly
- **Bold** and *italic* render correctly
- [[wiki links]] display in blue (but not clickable yet)

### 6. GitHub Sync
- [ ] Sync button in status bar works
- [ ] Pull and push complete successfully
- [ ] Sync status shows in status bar
- [ ] Auto-sync runs on configured interval (if enabled)

### 7. Auto-Commit
- [ ] Auto-commit triggers on file save (if enabled)
- [ ] Custom commit message template works

### 8. Conflict Detection
- [ ] Conflict banner appears when conflicts detected
- [ ] Shows number of conflicted files

### 9. Commit History
- [ ] Click "⏱" button shows commit history popup
- [ ] Shows commit ID, message, author, time

### 10. Settings (NEW)
- [ ] Click gear icon ⚙ in status bar opens Settings
- [ ] Toggle auto-commit on/off
- [ ] Toggle auto-sync on/off
- [ ] Change sync interval dropdown
- [ ] Edit commit message template
- [ ] Close settings with X button

---

## 🚧 Next Steps (Test & Verify)

### Priority 1

#### 1. Settings UI
- Already implemented, test all toggles work

#### 2. Conflict Resolution UI
- [ ] Clicking "Resolve →" does nothing (not implemented yet)
- [ ] No diff view for conflicted files

#### 3. Folder Management
- [ ] No "New Folder" button in sidebar
- [ ] No right-click context menu

#### 4. File Operations
- [ ] No delete file option
- [ ] No rename file option

### Priority 2

#### 5. Enhanced Markdown Preview
- [ ] Only basic regex rendering (not full markdown parser)
- [ ] Tables don't render
- [ ] Code blocks don't have syntax highlighting

#### 6. Wiki Links
- [ ] [[links]] show in blue but aren't clickable

#### 7. Search Functionality
- [ ] No global search (Ctrl+P)

#### 8. Editor Toolbar
- [ ] No formatting buttons

### Priority 3

#### 9. Tag System
- [ ] #tags not parsed or shown anywhere

#### 10. Branch Management
- [ ] No branch UI shown

#### 11. Keyboard Shortcuts
- [ ] No command palette

#### 12. Export Options
- [ ] No export to PDF/HTML

---

## 📝 Known Issues

1. Preview uses basic regex, not a proper markdown parser
2. Auto-sync interval should validate minimum 1 minute
3. File tree doesn't auto-refresh when files change outside the app
4. Git operations have limited error handling

---

## 🧪 How to Test

1. Open the app and select a vault folder
2. Go through each section above
3. Mark [x] for working features
4. Note any bugs or unexpected behavior in the blanks below:

### Your Notes:



