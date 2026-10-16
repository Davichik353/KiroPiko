//! On-demand, read-only Windows diagnostics. No arbitrary shell input or repairs.

#[tauri::command]
pub async fn nova_system_snapshot() -> Result<serde_json::Value, String> {
    #[cfg(windows)]
    {
        tauri::async_runtime::spawn_blocking(|| {
            let output = crate::nova_windows::run_script(include_str!("nova_doctor.ps1"), None, None)?;
            serde_json::from_str(&output).map_err(|e| format!("Invalid diagnostic response: {e}"))
        }).await.map_err(|e| e.to_string())?
    }
    #[cfg(not(windows))]
    Err("System Doctor currently supports Windows only.".into())
}
