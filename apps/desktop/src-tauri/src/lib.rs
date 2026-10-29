mod diagnostics;
use reed_protocol::CoreHealth;

#[tauri::command]
async fn core_health() -> Result<CoreHealth, String> {
    diagnostics::fetch_health("127.0.0.1:47821".parse().expect("fixed loopback endpoint")).await
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![core_health])
        .run(tauri::generate_context!())
        .expect("run Reed desktop shell");
}
