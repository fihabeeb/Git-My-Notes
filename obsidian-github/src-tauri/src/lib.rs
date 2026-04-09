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
    fn conflict(message: &str) -> Self {
        Self { success: true, message: message.to_string(), has_conflict: true }
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
async fn pull_repo(local_path: String, token: String) -> Result<CloneResult, String> {
    eprintln!("[PULL] Starting pull for: {}", local_path);
    let repo = Repository::open(&local_path).map_err(|e| e.to_string())?;
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
    
    let refspec = format!("refs/heads/{}:refs/heads/{}", branch_name, branch_name);
    eprintln!("[PULL] Using refspec: {}", refspec);
    
    if let Err(e) = remote.fetch(&[&refspec], Some(&mut opts), None) {
        eprintln!("[PULL] Fetch error: {}", e);
        return Err(e.to_string());
    }
    
    eprintln!("[PULL] Fetch completed");

    let (analysis, _) = {
        let fetch_head = match repo.find_reference("FETCH_HEAD") {
            Ok(r) => r,
            Err(e) => {
                eprintln!("[PULL] FETCH_HEAD not found, assuming up to date: {}", e);
                return Ok(CloneResult::success("Already up to date"));
            }
        };
        let commit = match repo.reference_to_annotated_commit(&fetch_head) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("[PULL] Could not get commit from FETCH_HEAD: {}", e);
                return Ok(CloneResult::success("Already up to date"));
            }
        };
        repo.merge_analysis(&[&commit]).map_err(|e| e.to_string())?
    };
    
    eprintln!("[PULL] Merge analysis: up_to_date={}, normal={}, fast_forward={}", analysis.is_up_to_date(), analysis.is_normal(), analysis.is_fast_forward());
    
    if analysis.is_up_to_date() {
        return Ok(CloneResult::success("Already up to date"));
    }
    
    if analysis.is_fast_forward() {
        repo.checkout_head(None).map_err(|e| e.to_string())?;
        return Ok(CloneResult::success("Fast forward successful"));
    }
    
    if analysis.is_normal() {
        repo.checkout_head(None).map_err(|e| e.to_string())?;
    }

    Ok(CloneResult::success("Pull successful"))
}

#[tauri::command]
fn check_for_conflicts(local_path: String) -> Result<Vec<ConflictFile>, String> {
    let repo = Repository::open(&local_path).map_err(|e| e.to_string())?;
    
    let head = repo.head().map_err(|e| e.to_string())?.peel_to_commit().map_err(|e| e.to_string())?;
    let head_tree = head.tree().map_err(|e| e.to_string())?;
    
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let index_tree = index.write_tree().map_err(|e| e.to_string())?;
    let index_tree = repo.find_tree(index_tree).map_err(|e| e.to_string())?;
    
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

#[tauri::command]
async fn push_repo(local_path: String, token: String, message: String) -> Result<CloneResult, String> {
    let repo = Repository::open(&local_path).map_err(|e| e.to_string())?;
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
    let head_commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    let branch_name = head.shorthand().unwrap_or("main");

    let mut index = repo.index().map_err(|e| e.to_string())?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| e.to_string())?;
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;

    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &message,
        &tree,
        &[&head_commit],
    ).map_err(|e| e.to_string())?;

    let refspec = format!("HEAD:refs/heads/{}", branch_name);
    remote.push(&[&refspec], Some(&mut opts)).map_err(|e| e.to_string())?;

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
fn check_repo_exists(localPath: String) -> Result<bool, String> {
    let normalized = normalize_path(&localPath);
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
            check_path,
            get_current_dir,
            make_absolute,
            check_repo_exists,
            commit_changes,
            get_commit_history,
            check_for_conflicts,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
