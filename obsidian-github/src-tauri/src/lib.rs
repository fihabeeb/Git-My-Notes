use git2::{Repository, RemoteCallbacks};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

fn normalize_path(path: &str) -> String {
    if cfg!(windows) {
        path.replace('/', "\\")
    } else {
        path.to_string()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatus {
    pub is_repo: bool,
    pub branch: Option<String>,
    pub ahead: usize,
    pub behind: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloneResult {
    pub success: bool,
    pub message: String,
    pub has_conflict: bool,
}

impl CloneResult {
    fn success(message: &str) -> Self {
        Self { success: true, message: message.to_string(), has_conflict: false }
    }
    fn error(message: &str) -> Self {
        Self { success: false, message: message.to_string(), has_conflict: false }
    }
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    let normalized = normalize_path(&path);
    eprintln!("[READ] Path: {} -> Normalized: {}", path, normalized);
    fs::read_to_string(&normalized).map_err(|e| format!("Failed to read {}: {}", path, e))
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    let normalized = normalize_path(&path);
    eprintln!("[WRITE] Path: {} -> Normalized: {}", path, normalized);
    if let Some(parent) = Path::new(&normalized).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    fs::write(&normalized, content).map_err(|e| format!("Failed to write {}: {}", path, e))
}

#[tauri::command]
fn create_file(path: String) -> Result<(), String> {
    let normalized = normalize_path(&path);
    eprintln!("[CREATE] Path: {} -> Normalized: {}", path, normalized);
    let path_ref = Path::new(&normalized);
    if path_ref.exists() {
        return Ok(());
    }
    if let Some(parent) = path_ref.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    fs::write(&normalized, "").map_err(|e| format!("Failed to create file: {}", e))
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    let normalized = normalize_path(&path);
    let path_ref = Path::new(&normalized);
    if path_ref.is_dir() {
        fs::remove_dir_all(&normalized).map_err(|e| format!("Failed to delete folder: {}", e))
    } else {
        fs::remove_file(&normalized).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[tauri::command]
fn rename_file(old_path: String, new_name: String) -> Result<String, String> {
    let normalized_old = normalize_path(&old_path);
    let old_path_ref = Path::new(&normalized_old);
    let parent = old_path_ref.parent().ok_or("No parent directory")?;
    let new_path = parent.join(&new_name);
    let new_path_str = normalize_path(&new_path.to_string_lossy().to_string());
    fs::rename(&normalized_old, &new_path_str).map_err(|e| format!("Failed to rename: {}", e))?;
    Ok(new_path_str)
}

#[tauri::command]
fn create_folder(path: String) -> Result<(), String> {
    let normalized = normalize_path(&path);
    fs::create_dir_all(&normalized).map_err(|e| format!("Failed to create folder: {}", e))
}

#[tauri::command]
fn check_path(path: String) -> Result<String, String> {
    let normalized = normalize_path(&path);
    let path_ref = Path::new(&normalized);
    if path_ref.exists() {
        Ok(format!("Exists: {} (type: {})", normalized, if path_ref.is_dir() { "directory" } else { "file" }))
    } else {
        Ok(format!("Does not exist: {}", normalized))
    }
}

#[tauri::command]
fn get_current_dir() -> String {
    std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string())
}

#[tauri::command]
fn make_absolute(path: String) -> Result<String, String> {
    let normalized = normalize_path(&path);
    let p = Path::new(&normalized);
    if p.is_absolute() {
        Ok(normalized)
    } else {
        dirs::document_dir()
            .or_else(|| dirs::home_dir())
            .ok_or_else(|| "Could not find home or documents directory".to_string())
            .map(|base| {
                let abs = base.join(&normalized);
                abs.to_string_lossy().to_string()
            })
    }
}

#[tauri::command]
async fn clone_repo(
    url: String,
    local_path: String,
    _token: String,
) -> Result<CloneResult, String> {
    let path = Path::new(&local_path);
    
    if path.exists() {
        match Repository::open(path) {
            Ok(_) => {
                return Ok(CloneResult {
                    success: true,
                    message: "Repository already exists, opened successfully".to_string(),
                    has_conflict: false,
                });
            },
            Err(_) => {
            }
        }
    }
    
    match Repository::clone(&url, path) {
        Ok(_) => Ok(CloneResult::success("Repository cloned successfully")),
        Err(e) => Ok(CloneResult::error(&e.to_string())),
    }
}

#[tauri::command]
async fn pull_repo(local_path: String, token: String, _subfolder: Option<String>) -> Result<CloneResult, String> {
    let local_path_normalized = normalize_path(&local_path);
    let git_dir = Path::new(&local_path_normalized).join(".git");
    if !git_dir.exists() {
        eprintln!("[PULL] No .git folder found! Initializing new repo...");
        
        Repository::init(&local_path_normalized).map_err(|e| e.to_string())?;
        eprintln!("[PULL] Git repo initialized");
        
        return Ok(CloneResult::success("Repository initialized. Use sync to push your files to GitHub."));
    }
    
    let repo = Repository::open(&local_path_normalized).map_err(|e| e.to_string())?;
    let mut remote = repo.find_remote("origin").map_err(|e| e.to_string())?;

    let token_clone = token.clone();
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(move |_url, _username_from_url, _cred_type| {
        eprintln!("[PULL] Using credentials");
        git2::Cred::userpass_plaintext("oauth2", &token_clone)
    });

    let mut opts = git2::FetchOptions::new();
    opts.remote_callbacks(callbacks);

    let head_branch = repo.head().map_err(|e| e.to_string())?;
    let branch_name = head_branch.shorthand().unwrap_or("main");
    eprintln!("[PULL] Current branch: {}", branch_name);
    
    eprintln!("[PULL] Fetching all refs...");
    let empty_refspecs: [&str; 0] = [];
    let fetch_result = remote.fetch(&empty_refspecs, Some(&mut opts), None);
    
    if let Err(fetch_err) = fetch_result {
        eprintln!("[PULL] Fetch failed (non-critical): {}", fetch_err);
    }
    
    eprintln!("[PULL] Continuing with merge analysis...");

    let mut pull_successful = false;
    
    if let Ok(fetch_head) = repo.find_reference("FETCH_HEAD") {
        if let Ok(commit) = repo.reference_to_annotated_commit(&fetch_head) {
            let (analysis, _) = repo.merge_analysis(&[&commit]).map_err(|e| e.to_string())?;
            eprintln!("[PULL] Merge analysis: up_to_date={}, normal={}, fast_forward={}", analysis.is_up_to_date(), analysis.is_normal(), analysis.is_fast_forward());
            
            if analysis.is_up_to_date() {
                return Ok(CloneResult::success("Already up to date"));
            }
            
            if analysis.is_fast_forward() || analysis.is_normal() {
                repo.checkout_head(None).map_err(|e| e.to_string())?;
                pull_successful = true;
            }
        }
    }

    if pull_successful {
        Ok(CloneResult::success("Pull successful"))
    } else {
        Ok(CloneResult::success("Already up to date"))
    }
}

#[tauri::command]
fn check_for_conflicts(local_path: String) -> Result<Vec<ConflictFile>, String> {
    let repo = Repository::open(&local_path).map_err(|e| e.to_string())?;
    
    let head = repo.head().map_err(|e| e.to_string())?.peel_to_commit().map_err(|e| e.to_string())?;
    let head_tree = head.tree().map_err(|e| e.to_string())?;
    
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let index_tree = index.write_tree().map_err(|e| e.to_string())?;
    let _index_tree = repo.find_tree(index_tree).map_err(|e| e.to_string())?;
    
    let diff = repo.diff_tree_to_index(Some(&head_tree), Some(&index), None).map_err(|e| e.to_string())?;
    
    let mut conflicts: Vec<ConflictFile> = Vec::new();
    for delta in diff.deltas() {
        if delta.status() == git2::Delta::Conflicted {
            let path = delta.old_file().path()
                .or(delta.new_file().path())
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();
            conflicts.push(ConflictFile { path });
        }
    }
    
    Ok(conflicts)
}

#[derive(Serialize, Deserialize)]
pub struct ConflictFile {
    pub path: String,
}

#[derive(Serialize, Deserialize)]
pub struct ConflictContent {
    pub path: String,
    pub our_content: String,
    pub their_content: String,
}

#[tauri::command]
fn get_conflicted_file_content(local_path: String, file_path: String) -> Result<ConflictContent, String> {
    let repo = Repository::open(&local_path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    
    let path = std::path::Path::new(&file_path);
    let index_entry = index.get_path(path).ok_or("File not in index")?;
    
    let our_content = if let Some(ancestor) = index_entry.ancestor() {
        let blob = repo.find_blob(ancestor).map_err(|e| e.to_string())?;
        std::str::from_utf8(blob.content()).unwrap_or("").to_string()
    } else {
        String::new()
    };
    
    let their_content = if let Some(other) = index_entry.other() {
        let blob = repo.find_blob(other).map_err(|e| e.to_string())?;
        std::str::from_utf8(blob.content()).unwrap_or("").to_string()
    } else {
        String::new()
    };
    
    Ok(ConflictContent {
        path: file_path,
        our_content,
        their_content,
    })
}

#[tauri::command]
fn resolve_conflict(local_path: String, file_path: String, resolution: String) -> Result<(), String> {
    let repo = Repository::open(&local_path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    
    let path = std::path::Path::new(&file_path);
    let entry_index = index.get_path(path).ok_or("File not in index")?;
    
    let content = match resolution.as_str() {
        "ours" => {
            if let Some(ancestor) = entry_index.ancestor() {
                let blob = repo.find_blob(ancestor).map_err(|e| e.to_string())?;
                std::str::from_utf8(blob.content()).unwrap_or("").to_string()
            } else {
                return Err("No 'ours' version available".to_string());
            }
        }
        "theirs" => {
            if let Some(other) = entry_index.other() {
                let blob = repo.find_blob(other).map_err(|e| e.to_string())?;
                std::str::from_utf8(blob.content()).unwrap_or("").to_string()
            } else {
                return Err("No 'theirs' version available".to_string());
            }
        }
        "both" => {
            let mut result = String::new();
            if let Some(ancestor) = entry_index.ancestor() {
                let blob = repo.find_blob(ancestor).map_err(|e| e.to_string())?;
                result.push_str("<<<<<<< ours\n");
                result.push_str(std::str::from_utf8(blob.content()).unwrap_or(""));
                result.push_str("=======\n");
            }
            if let Some(other) = entry_index.other() {
                let blob = repo.find_blob(other).map_err(|e| e.to_string())?;
                result.push_str(std::str::from_utf8(blob.content()).unwrap_or(""));
                result.push_str(">>>>>>> theirs\n");
            }
            result
        }
        _ => return Err("Invalid resolution option".to_string()),
    };
    
    std::fs::write(path, &content).map_err(|e| e.to_string())?;
    index.add_path(path).map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn push_repo(local_path: String, token: String, message: String, subfolder: Option<String>) -> Result<CloneResult, String> {
    let local_path_normalized = normalize_path(&local_path);
    let git_dir = Path::new(&local_path_normalized).join(".git");
    eprintln!("[PUSH] Checking for .git in: {}", local_path_normalized);
    
    let subfolder_path = subfolder.clone().unwrap_or_default();
    
    if !git_dir.exists() {
        eprintln!("[PUSH] .git not found! Initializing...");
        
        let repo = match Repository::init(&local_path_normalized) {
            Ok(r) => r,
            Err(e) => return Err(format!("Failed to init repo: {}", e)),
        };
        
        eprintln!("[PUSH] Repo initialized");
        
        let auth_url = format!("https://x-access-token:{}@github.com/", token);
        
        let mut remote = match repo.remote("origin", &auth_url) {
            Ok(r) => r,
            Err(e) => return Err(format!("Failed to create remote: {}", e)),
        };
        
        let token_clone = token.clone();
        let mut callbacks = RemoteCallbacks::new();
        callbacks.credentials(move |_url, _username_from_url, _cred_type| {
            git2::Cred::userpass_plaintext("oauth2", &token_clone)
        });

        let mut opts = git2::PushOptions::new();
        opts.remote_callbacks(callbacks);

        repo.config().unwrap().set_str("user.email", "obsidian-github@local").ok();
        repo.config().unwrap().set_str("user.name", "Obsidian GitHub").ok();

        let sig = repo.signature().unwrap();

        let mut index = repo.index().unwrap();
        
        if subfolder_path.is_empty() {
            index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None).ok();
        } else {
            let local_subfolder = Path::new(&local_path_normalized).join(&subfolder_path);
            if local_subfolder.exists() {
                let prefix = format!("{}/*", subfolder_path);
                index.add_all([prefix.as_str()].iter(), git2::IndexAddOption::DEFAULT, None).ok();
            }
        }
        
        let diff = repo.diff_index_to_workdir(None, None).unwrap();
        if diff.deltas().len() == 0 {
            return Ok(CloneResult { success: true, message: "No changes to push".to_string(), has_conflict: false });
        }
        
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();

        repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &[]).ok();

        let branch_name = repo.head().ok().and_then(|h| h.shorthand().map(String::from)).unwrap_or_else(|| "main".to_string());
        let refspec = format!("HEAD:refs/heads/{}", branch_name);
        
        if let Err(e) = remote.push(&[&refspec], Some(&mut opts)) {
            eprintln!("[PUSH] Push to {} failed, trying main: {}", branch_name, e);
            if branch_name != "main" {
                let fallback_refspec = "HEAD:refs/heads/main";
                if let Err(fallback_err) = remote.push(&[fallback_refspec], Some(&mut opts)) {
                    eprintln!("[PUSH] Push to main also failed: {}", fallback_err);
                    return Err(format!("Push failed: {}", fallback_err));
                }
            } else {
                return Err(format!("Push failed: {}", e));
            }
        }
        
        return Ok(CloneResult {
            success: true,
            message: "Repository initialized and pushed!".to_string(),
            has_conflict: false,
        });
    }
    
    let repo = Repository::open(&local_path_normalized).map_err(|e| e.to_string())?;
    let mut remote = repo.find_remote("origin").map_err(|e| e.to_string())?;

    let token_clone = token.clone();
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(move |_url, _username_from_url, _cred_type| {
        git2::Cred::userpass_plaintext("oauth2", &token_clone)
    });

    let mut opts = git2::PushOptions::new();
    opts.remote_callbacks(callbacks);

    repo.config().map_err(|e| e.to_string())?
        .set_str("user.email", "obsidian-github@local")
        .map_err(|e| e.to_string())?;
    repo.config().map_err(|e| e.to_string())?
        .set_str("user.name", "Obsidian GitHub")
        .map_err(|e| e.to_string())?;

    let sig = repo.signature().map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let branch_name = head.shorthand().unwrap_or("main");
    eprintln!("[PUSH] Local branch: {}", branch_name);
    eprintln!("[PUSH] Is branch: {}", head.is_branch());
    eprintln!("[PUSH] Target: {:?}", head.target());
    eprintln!("[PUSH] Subfolder: {}", subfolder_path);

    let refspec = format!("HEAD:refs/heads/{}", branch_name);
    eprintln!("[PUSH] Using refspec: {}", refspec);

    let mut index = repo.index().map_err(|e| e.to_string())?;
    
    if subfolder_path.is_empty() {
        index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
            .map_err(|e| e.to_string())?;
    } else {
        let local_subfolder = Path::new(&local_path_normalized).join(&subfolder_path);
        if local_subfolder.exists() {
            let prefix = format!("{}/*", subfolder_path);
            index.add_all([prefix.as_str()].iter(), git2::IndexAddOption::DEFAULT, None)
                .map_err(|e| e.to_string())?;
        } else {
            index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
                .map_err(|e| e.to_string())?;
        }
    }
    
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;

    let head_commit = head.peel_to_commit();
    eprintln!("[PUSH] Head commit: {:?}", head_commit.is_ok());
    
    if head_commit.is_err() {
        eprintln!("[PUSH] ERROR: Cannot get head commit - repository might be in bad state");
        return Err("Cannot get head commit - repository might be in bad state".to_string());
    }
    
    let c = head_commit.unwrap();
    
    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &message,
        &tree,
        &[&c],
    ).map_err(|e| e.to_string())?;

    eprintln!("[PUSH] Commit done, about to push...");

    let push_result = remote.push(&[&refspec], Some(&mut opts));
    
    if let Err(push_err) = push_result {
        eprintln!("[PUSH] Push failed: {}", push_err);
        return Err(format!("Push failed: {}", push_err));
    }
    
    eprintln!("[PUSH] Completed successfully");

    Ok(CloneResult {
        success: true,
        message: "Push successful".to_string(),
        has_conflict: false,
    })
}

#[tauri::command]
fn get_git_status(local_path: String) -> Result<GitStatus, String> {
    match Repository::open(&local_path) {
        Ok(repo) => {
            let branch = repo.head().ok().and_then(|h| h.shorthand().map(String::from));
            Ok(GitStatus {
                is_repo: true,
                branch,
                ahead: 0,
                behind: 0,
            })
        }
        Err(_) => Ok(GitStatus {
            is_repo: false,
            branch: None,
            ahead: 0,
            behind: 0,
        }),
    }
}

#[tauri::command]
fn check_repo_exists(local_path: String) -> Result<bool, String> {
    let normalized = normalize_path(&local_path);
    let path = Path::new(&normalized);
    match Repository::open(path) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
fn commit_changes(local_path: String, message: String) -> Result<CloneResult, String> {
    let repo = Repository::open(&local_path).map_err(|e| e.to_string())?;
    
    repo.config().map_err(|e| e.to_string())?
        .set_str("user.email", "obsidian-github@local")
        .map_err(|e| e.to_string())?;
    repo.config().map_err(|e| e.to_string())?
        .set_str("user.name", "Obsidian GitHub")
        .map_err(|e| e.to_string())?;

    let mut index = repo.index().map_err(|e| e.to_string())?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| e.to_string())?;
    
    let diff = repo.diff_index_to_workdir(None, None).map_err(|e| e.to_string())?;
    if diff.deltas().len() == 0 {
        return Ok(CloneResult { success: true, message: "No changes to commit".to_string(), has_conflict: false });
    }
    
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;

    let sig = repo.signature().map_err(|e| e.to_string())?;
    
    let parent_commit = repo.head().ok().and_then(|h| h.peel_to_commit().ok());
    
    if let Some(c) = parent_commit {
        repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            &message,
            &tree,
            &[&c],
        ).map_err(|e| e.to_string())?;
    } else {
        repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            &message,
            &tree,
            &[],
        ).map_err(|e| e.to_string())?;
    }

    Ok(CloneResult {
        success: true,
        message: "Changes committed".to_string(),
        has_conflict: false,
    })
}

#[tauri::command]
fn get_commit_history(local_path: String, limit: usize) -> Result<Vec<CommitInfo>, String> {
    let repo = Repository::open(&local_path).map_err(|e| e.to_string())?;
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push_head().map_err(|e| e.to_string())?;
    
    let mut commits: Vec<CommitInfo> = Vec::new();
    for oid in revwalk.take(limit) {
        let oid = match oid {
            Ok(o) => o,
            Err(_) => continue,
        };
        let commit = match repo.find_commit(oid) {
            Ok(c) => c,
            Err(_) => continue,
        };
        commits.push(CommitInfo {
            id: commit.id().to_string()[..8].to_string(),
            message: commit.message().unwrap_or("").to_string(),
            author: commit.author().name().unwrap_or("unknown").to_string(),
            time: commit.time().seconds(),
        });
    }
    
    Ok(commits)
}

#[derive(Serialize, Deserialize)]
pub struct CommitInfo {
    pub id: String,
    pub message: String,
    pub author: String,
    pub time: i64,
}

#[tauri::command]
fn get_current_branch(local_path: String) -> Result<String, String> {
    let repo = Repository::open(&local_path).map_err(|e| e.to_string())?;
    let branch = repo.head().map_err(|e| e.to_string())?;
    branch.shorthand().map(String::from).ok_or_else(|| "Not on a branch".to_string())
}

#[tauri::command]
fn get_all_branches(local_path: String) -> Result<Vec<String>, String> {
    let repo = Repository::open(&local_path).map_err(|e| e.to_string())?;
    let mut branches = Vec::new();
    
    for branch_result in repo.branches().map_err(|e| e.to_string())? {
        if let Ok((branch, _)) = branch_result {
            if let Some(name) = branch.shorthand() {
                branches.push(name.to_string());
            }
        }
    }
    
    Ok(branches)
}

#[tauri::command]
fn switch_branch(local_path: String, branch_name: String, token: String) -> Result<CloneResult, String> {
    let repo = Repository::open(&local_path).map_err(|e| e.to_string())?;
    
    let reference_name = format!("refs/heads/{}", branch_name);
    
    match repo.find_reference(&reference_name) {
        Ok(branch_ref) => {
            let commit = branch_ref.peel_to_commit().map_err(|e| e.to_string())?;
            repo.checkout_tree(commit.as_object(), None).map_err(|e| e.to_string())?;
            repo.set_head(&reference_name).map_err(|e| e.to_string())?;
            
            Ok(CloneResult {
                success: true,
                message: format!("Switched to branch: {}", branch_name),
                has_conflict: false,
            })
        }
        Err(_) => {
            let token_clone = token.clone();
            let mut remote = repo.find_remote("origin").map_err(|e| e.to_string())?;
            
            let mut callbacks = RemoteCallbacks::new();
            callbacks.credentials(move |_url, _username_from_url, _cred_type| {
                git2::Cred::userpass_plaintext("oauth2", &token_clone)
            });
            
            let mut fetch_opts = git2::FetchOptions::new();
            fetch_opts.remote_callbacks(callbacks);
            
            let refspec = format!("refs/heads/{}:refs/heads/{}", branch_name, branch_name);
            remote.fetch(&[&refspec], Some(&mut fetch_opts), None).map_err(|e| e.to_string())?;
            
            let reference_name = format!("refs/heads/{}", branch_name);
            let branch_ref = repo.find_reference(&reference_name).map_err(|e| e.to_string())?;
            let commit = branch_ref.peel_to_commit().map_err(|e| e.to_string())?;
            repo.checkout_tree(commit.as_object(), None).map_err(|e| e.to_string())?;
            repo.set_head(&reference_name).map_err(|e| e.to_string())?;
            
            Ok(CloneResult {
                success: true,
                message: format!("Switched to branch: {}", branch_name),
                has_conflict: false,
            })
        }
    }
}

#[tauri::command]
fn get_all_tags(local_path: String) -> Result<Vec<String>, String> {
    let repo = Repository::open(&local_path).map_err(|e| e.to_string())?;
    let mut tags = Vec::new();
    
    for tag_result in repo.tag_names(None).map_err(|e| e.to_string())? {
        if let Some(name) = tag_result {
            tags.push(name.to_string());
        }
    }
    
    Ok(tags)
}

#[tauri::command]
fn search_files_content(local_path: String, query: String) -> Result<Vec<SearchResult>, String> {
    let normalized = normalize_path(&local_path);
    let query_lower = query.to_lowercase();
    let mut results = Vec::new();
    
    fn search_dir(dir: &Path, query: &str, results: &mut Vec<SearchResult>, normalized: &str) -> Result<(), String> {
        let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;
        
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            
            if name.starts_with(".") {
                continue;
            }
            
            if path.is_dir() {
                search_dir(&path, query, results, normalized)?;
            } else if name.ends_with(".md") {
                let full_path = path.to_string_lossy().to_string().replace("\\", "/");
                if let Ok(content) = fs::read_to_string(&path) {
                    if content.to_lowercase().contains(query) {
                        let relative_path = full_path.strip_prefix(normalized)
                            .map(|p| p.trim_start_matches('/'))
                            .unwrap_or(&full_path);
                        
                        let lines: Vec<&str> = content.lines()
                            .enumerate()
                            .filter(|(_, line)| line.to_lowercase().contains(query))
                            .map(|(i, _)| i + 1)
                            .take(3)
                            .collect();
                        
                        results.push(SearchResult {
                            path: full_path,
                            name: name.replace(".md", ""),
                            matches: lines.len(),
                            line_numbers: lines,
                        });
                    }
                }
            }
        }
        Ok(())
    }
    
    let base_path = Path::new(&normalized);
    search_dir(base_path, &query_lower, &mut results, &normalized)?;
    
    results.sort_by(|a, b| b.matches.cmp(&a.matches));
    Ok(results)
}

#[derive(Serialize, Deserialize)]
pub struct SearchResult {
    pub path: String,
    pub name: String,
    pub matches: usize,
    pub line_numbers: Vec<usize>,
}

#[tauri::command]
fn convert_markdown_to_html(content: String) -> Result<String, String> {
    let mut html = content.clone();
    
    html = regex::Regex::new(r"(?m)^###### (.+)$")
        .map(|re| re.replace_all(&html, "<h6>$1</h6>").to_string())
        .unwrap_or(html);
    html = regex::Regex::new(r"(?m)^##### (.+)$")
        .map(|re| re.replace_all(&html, "<h5>$1</h5>").to_string())
        .unwrap_or(html);
    html = regex::Regex::new(r"(?m)^#### (.+)$")
        .map(|re| re.replace_all(&html, "<h4>$1</h4>").to_string())
        .unwrap_or(html);
    html = regex::Regex::new(r"(?m)^### (.+)$")
        .map(|re| re.replace_all(&html, "<h3>$1</h3>").to_string())
        .unwrap_or(html);
    html = regex::Regex::new(r"(?m)^## (.+)$")
        .map(|re| re.replace_all(&html, "<h2>$1</h2>").to_string())
        .unwrap_or(html);
    html = regex::Regex::new(r"(?m)^# (.+)$")
        .map(|re| re.replace_all(&html, "<h1>$1</h1>").to_string())
        .unwrap_or(html);
    
    html = regex::Regex::new(r"\*\*\*(.+?)\*\*\*")
        .map(|re| re.replace_all(&html, "<strong><em>$1</em></strong>").to_string())
        .unwrap_or(html);
    html = regex::Regex::new(r"\*\*(.+?)\*\*")
        .map(|re| re.replace_all(&html, "<strong>$1</strong>").to_string())
        .unwrap_or(html);
    html = regex::Regex::new(r"\*(.+?)\*")
        .map(|re| re.replace_all(&html, "<em>$1</em>").to_string())
        .unwrap_or(html);
    
    html = regex::Regex::new(r"(?m)^> (.+)$")
        .map(|re| re.replace_all(&html, "<blockquote>$1</blockquote>").to_string())
        .unwrap_or(html);
    
    html = regex::Regex::new(r"(?m)^- (.+)$")
        .map(|re| re.replace_all(&html, "<li>$1</li>").to_string())
        .unwrap_or(html);
    
    html = regex::Regex::new(r"(?m)^(\d+)\. (.+)$")
        .map(|re| re.replace_all(&html, "<li>$2</li>").to_string())
        .unwrap_or(html);
    
    html = regex::Regex::new(r"\[(.+?)\]\((.+?)\)")
        .map(|re| re.replace_all(&html, "<a href=\"$2\">$1</a>").to_string())
        .unwrap_or(html);
    
    html = regex::Regex::new(r"(?s)```(\w*)\n(.*?)```")
        .map(|re| re.replace_all(&html, "<pre><code>$2</code></pre>").to_string())
        .unwrap_or(html);
    
    html = regex::Regex::new(r"`([^`]+)`")
        .map(|re| re.replace_all(&html, "<code>$1</code>").to_string())
        .unwrap_or(html);
    
    html = regex::Regex::new(r"(?m)^(.+)$")
        .map(|re| re.replace_all(&html, "$1<br/>").to_string())
        .unwrap_or(html);
    
    Ok(html)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            clone_repo,
            pull_repo,
            push_repo,
            get_git_status,
            read_file,
            write_file,
            create_file,
            delete_file,
            rename_file,
            create_folder,
            check_path,
            get_current_dir,
            make_absolute,
            check_repo_exists,
            commit_changes,
            get_commit_history,
            check_for_conflicts,
            get_conflicted_file_content,
            resolve_conflict,
            get_current_branch,
            get_all_branches,
            switch_branch,
            get_all_tags,
            search_files_content,
            convert_markdown_to_html,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
