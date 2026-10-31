use std::{
    fs::OpenOptions,
    io::{ErrorKind, Write},
    path::Path,
};

const MAX_CONTENT_BYTES: usize = 1024 * 1024;

fn validate_export(name: &str, content: &str) -> Result<(), String> {
    if content.len() > MAX_CONTENT_BYTES {
        return Err("too-large".into());
    }
    let stem = name
        .split('.')
        .next()
        .unwrap_or("")
        .trim()
        .to_ascii_uppercase();
    let reserved = ["CON", "PRN", "AUX", "NUL"].contains(&stem.as_str())
        || ["COM", "LPT"].iter().any(|prefix| {
            stem.strip_prefix(prefix).is_some_and(|suffix| {
                ["1", "2", "3", "4", "5", "6", "7", "8", "9"].contains(&suffix)
            })
        });
    if name.len() > 180
        || reserved
        || name.trim() != name
        || name.is_empty()
        || name.starts_with('.')
        || name.chars().any(|character| {
            matches!(
                character,
                '/' | '\\' | ':' | '<' | '>' | '"' | '|' | '?' | '*'
            ) || character.is_control()
        })
        || !name.rsplit_once('.').is_some_and(|(_, extension)| {
            ["json", "md", "txt"]
                .iter()
                .any(|allowed| extension.eq_ignore_ascii_case(allowed))
        })
    {
        return Err("invalid-name".into());
    }
    Ok(())
}

fn save_to_directory(directory: &Path, name: &str, content: &str) -> Result<String, String> {
    validate_export(name, content)?;
    let (stem, extension) = name.rsplit_once('.').ok_or("invalid-name")?;
    for index in 0..=99 {
        let filename = if index == 0 {
            name.to_string()
        } else {
            format!("{stem} ({index}).{extension}")
        };
        let destination = directory.join(&filename);
        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&destination)
        {
            Ok(mut file) => {
                if file.write_all(content.as_bytes()).is_err() {
                    drop(file);
                    // Only this successful create_new branch owns a file to remove.
                    let _ = std::fs::remove_file(&destination);
                    return Err("write-failed".into());
                }
                return Ok(filename);
            }
            Err(error) if error.kind() == ErrorKind::AlreadyExists => continue,
            Err(_) => return Err("write-failed".into()),
        }
    }
    Err("write-failed".into())
}

#[cfg(test)]
#[path = "preview_export_tests.rs"]
mod tests;

// Tauri adapter: the pure save implementation above can be tested without a WebView.
use tauri::Manager;

#[tauri::command(rename_all = "camelCase")]
pub async fn export_preview_file(
    app: tauri::AppHandle,
    name: String,
    content: String,
) -> Result<String, String> {
    validate_export(&name, &content)?;
    let directory = app
        .path()
        .download_dir()
        .map_err(|_| "unavailable".to_string())?;
    tauri::async_runtime::spawn_blocking(move || save_to_directory(&directory, &name, &content))
        .await
        .map_err(|_| "write-failed".to_string())?
}
