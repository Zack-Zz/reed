mod diagnostics;
mod preview_export;
use reed_protocol::CoreHealth;
#[cfg(target_os = "macos")]
use tauri::Manager;

#[tauri::command]
async fn core_health() -> Result<CoreHealth, String> {
    diagnostics::fetch_health("127.0.0.1:47821".parse().expect("fixed loopback endpoint")).await
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            core_health,
            preview_export::export_preview_file
        ])
        .build(tauri::generate_context!())
        .expect("build Reed desktop shell")
        .run(|handle, event| {
            #[cfg(target_os = "macos")]
            if matches!(
                event,
                tauri::RunEvent::Reopen {
                    has_visible_windows: false,
                    ..
                }
            ) {
                if let Some(window) = handle.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                } else if let Some(config) = handle
                    .config()
                    .app
                    .windows
                    .iter()
                    .find(|window| window.label == "main")
                    && let Err(error) = tauri::WebviewWindowBuilder::from_config(handle, config)
                        .and_then(|builder| builder.build())
                {
                    eprintln!("Unable to reopen Reed window: {error}");
                }
            }
            #[cfg(not(target_os = "macos"))]
            let _ = (handle, event);
        });
}
