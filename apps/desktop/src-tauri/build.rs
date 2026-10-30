fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&["core_health", "export_preview_file"]),
    ))
    .expect("build Reed desktop shell");
}
