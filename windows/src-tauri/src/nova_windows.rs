//! Fixed Windows operations only. No webview-provided shell commands.
use std::sync::atomic::{AtomicBool, Ordering};

static VOICE_BUSY: AtomicBool = AtomicBool::new(false);
static VOICE_CANCEL: AtomicBool = AtomicBool::new(false);

/// OS notification availability; no screen capture or window-title inspection.
#[tauri::command]
pub fn nova_attention_state() -> Result<i32, String> {
    #[cfg(windows)]
    { unsafe { windows::Win32::UI::Shell::SHQueryUserNotificationState() }.map(|s| s.0).map_err(|e| e.to_string()) }
    #[cfg(not(windows))]
    { Ok(5) }
}

#[tauri::command]
pub fn nova_export_doctor_report(report: String) -> Result<String, String> {
    if report.len() > 65536 { return Err("Отчёт слишком большой.".into()); }
    let dir = crate::settings::local_dir().join("reports");
    crate::platform::ensure_private_dir(&dir).map_err(|e| e.to_string())?;
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|e| e.to_string())?.as_nanos();
    let path = dir.join(format!("KiroPiko-System-Doctor-{stamp}.txt"));
    std::fs::write(&path, report.as_bytes()).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

/// Only media keys; never accepts arbitrary keyboard input from the webview.
#[tauri::command]
pub fn nova_music_control(action: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows::Win32::UI::Input::KeyboardAndMouse::*;
        let key = match action.as_str() {
            "playPause" => VK_MEDIA_PLAY_PAUSE,
            "previous" => VK_MEDIA_PREV_TRACK,
            "next" => VK_MEDIA_NEXT_TRACK,
            "volumeUp" => VK_VOLUME_UP,
            "volumeDown" => VK_VOLUME_DOWN,
            "mute" => VK_VOLUME_MUTE,
            _ => return Err("Неизвестная музыкальная команда.".into()),
        };
        let input = |flags| INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 { ki: KEYBDINPUT { wVk: key, dwFlags: flags, ..Default::default() } },
        };
        let inputs = [input(KEYEVENTF_EXTENDEDKEY), input(KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP)];
        let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };
        if sent != inputs.len() as u32 { return Err("Windows не приняла музыкальную команду.".into()); }
        Ok(())
    }
    #[cfg(not(windows))]
    { let _ = action; Err("Управление музыкой доступно в Windows.".into()) }
}

#[cfg(windows)]
pub(crate) fn run_script(script: &str, output_path: Option<&std::path::Path>, cancel: Option<&AtomicBool>) -> Result<String, String> {
    use std::os::windows::process::CommandExt;
    use std::process::{Command, Stdio};
    use std::time::{Duration, Instant};
    let root = std::env::var_os("SystemRoot").ok_or("Windows directory unavailable")?;
    let mut cmd = Command::new(std::path::PathBuf::from(root).join("System32/WindowsPowerShell/v1.0/powershell.exe"));
    cmd.args(["-NoProfile", "-NonInteractive", "-Command", script])
        .creation_flags(0x08000000).stdout(Stdio::piped()).stderr(Stdio::piped());
    if let Some(path) = output_path { cmd.env("NOVA_CAPTURE_PATH", path); }
    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    let deadline = Instant::now() + Duration::from_secs(25);
    loop {
        if cancel.is_some_and(|flag| flag.load(Ordering::Relaxed)) || Instant::now() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err("Операция остановлена или превышено время ожидания.".into());
        }
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => std::thread::sleep(Duration::from_millis(50)),
            Err(e) => { let _ = child.kill(); let _ = child.wait(); return Err(e.to_string()); }
        }
    }
    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim_start_matches('\u{feff}').trim().to_string())
}

#[tauri::command]
pub async fn nova_voice_listen(shared: tauri::State<'_, crate::Shared>) -> Result<String, String> {
    if !shared.settings.lock().map_err(|e| e.to_string())?.nova_allow_microphone {
        return Err("Разрешите использование микрофона в настройках KiroPiko.".into());
    }
    #[cfg(windows)]
    {
        if VOICE_BUSY.swap(true, Ordering::SeqCst) { return Err("Распознавание уже идёт.".into()); }
        VOICE_CANCEL.store(false, Ordering::SeqCst);
        tauri::async_runtime::spawn_blocking(|| {
            struct Reset;
            impl Drop for Reset { fn drop(&mut self) { VOICE_BUSY.store(false, Ordering::SeqCst); } }
            let _reset = Reset;
            run_script(include_str!("nova_voice.ps1"), None, Some(&VOICE_CANCEL))
        }).await.map_err(|e| e.to_string())?
    }
    #[cfg(not(windows))]
    Err("Voice supports Windows only.".into())
}

#[tauri::command]
pub fn nova_voice_stop() { VOICE_CANCEL.store(true, Ordering::SeqCst); }

#[tauri::command]
pub fn nova_open_program(program: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let root = std::env::var_os("SystemRoot").ok_or("Windows directory unavailable")?;
        let relative = match program.as_str() {
            "notepad" => "System32/notepad.exe",
            "calculator" => "System32/calc.exe",
            "explorer" => "explorer.exe",
            _ => return Err("Эта программа не входит в список разрешённых.".into()),
        };
        std::process::Command::new(std::path::PathBuf::from(root).join(relative))
            .creation_flags(0x08000000).spawn().map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(windows))]
    { let _ = program; Err("Program launch supports Windows only.".into()) }
}

#[tauri::command]
pub async fn nova_capture_screen(app: tauri::AppHandle, shared: tauri::State<'_, crate::Shared>) -> Result<crate::files::DroppedFile, String> {
    if !shared.settings.lock().map_err(|e| e.to_string())?.nova_allow_screen_capture {
        return Err("Разрешите захват экрана в настройках KiroPiko.".into());
    }
    #[cfg(windows)]
    {
        use tauri::Manager;
        let window = app.get_webview_window("island").ok_or("KiroPiko window unavailable")?;
        window.hide().map_err(|e| e.to_string())?;
        struct Restore(tauri::WebviewWindow);
        impl Drop for Restore { fn drop(&mut self) { let _ = self.0.show(); } }
        let _restore = Restore(window);
        tokio::time::sleep(std::time::Duration::from_millis(250)).await;
        tauri::async_runtime::spawn_blocking(|| {
            let dir = crate::files::inbox_dir();
            crate::platform::ensure_private_dir(&crate::settings::local_dir()).map_err(|e| e.to_string())?;
            std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
            let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|e| e.to_string())?.as_nanos();
            let name = format!("nova-screen-{stamp}.png");
            let path = dir.join(&name);
            run_script(include_str!("nova_capture.ps1"), Some(&path), None)?;
            let size = std::fs::metadata(&path).map_err(|e| e.to_string())?.len();
            Ok(crate::files::DroppedFile { name, path: path.to_string_lossy().to_string(), size })
        }).await.map_err(|e| e.to_string())?
    }
    #[cfg(not(windows))]
    { let _ = app; Err("Vision capture supports Windows only.".into()) }
}
