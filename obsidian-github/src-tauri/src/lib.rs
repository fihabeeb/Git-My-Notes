use git2::{Repository, RemoteCallbacks};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

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
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_file(path: String) -> Result<(), String> {
    let path = Path::new(&path);
    if path.exists() {
        return Err("File already exists".to_string());
    }
    fs::write(&path, "").map_err(|e| e.to_string())
}

#[tauri::command]
async fn clone_repo(
    url: String,
    local_path: String,
    _token: String,
) -> Result<CloneResult, String> {
    let path = Path::new(&local_path);
    
    match Repository::clone(&url, path) {
        Ok(_) => Ok(CloneResult {
            success: true,
            message: "Repository cloned successfully".to_string(),
        }),
        Err(e) => Ok(CloneResult {
            success: false,
            message: e.to_string(),
        }),
    }
}

#[tauri::command]
async fn pull_repo(local_path: String, token: String) -> Result<CloneResult, String> {
    let repo = Repository::open(&local_path).map_err(|e| e.to_string())?;
    let mut remote = repo.find_remote("origin").map_err(|e| e.to_string())?;

    let token_clone = token.clone();
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(move |_url, _username_from_url, _cred_type| {
        git2::Cred::userpass_plaintext("oauth2", &token_clone)
    });

    let mut opts = git2::FetchOptions::new();
    opts.remote_callbacks(callbacks);

    remote.fetch(&[&repo.head().unwrap().name().unwrap()], Some(&mut opts), None)
        .map_err(|e| e.to_string())?;

    let fetch_head = repo.find_reference("FETCH_HEAD").map_err(|e| e.to_string())?;
    let commit = repo.reference_to_annotated_commit(&fetch_head).map_err(|e| e.to_string())?;
    
    let (analysis, _) = repo.merge_analysis(&[&commit]).map_err(|e| e.to_string())?;
    
    if analysis.is_up_to_date() {
        return Ok(CloneResult { success: true, message: "Already up to date".to_string() });
    }
    
    if analysis.is_normal() {
        repo.checkout_head(None).map_err(|e| e.to_string())?;
    }

    Ok(CloneResult {
        success: true,
        message: "Pull successful".to_string(),
    })
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

    let refspec = "HEAD:refs/heads/main";
    remote.push(&[refspec], Some(&mut opts)).map_err(|e| e.to_string())?;

    Ok(CloneResult {
        success: true,
        message: "Push successful".to_string(),
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
