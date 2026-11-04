#[tauri::command]
fn native_runtime_status() -> &'static str {
    "tauri-ready"
}

#[tauri::command]
fn audio_capture_status() -> &'static str {
    // WASAPI loopback is intentionally not reported as available until the
    // native capture implementation and device lifecycle are complete.
    "not-implemented"
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            native_runtime_status,
            audio_capture_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running PIERCE Tauri application");
}
