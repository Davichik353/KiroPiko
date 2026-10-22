//! Official account-authenticated CLI entry points. No arbitrary commands or tokens over IPC.
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};

static BUSY: AtomicBool = AtomicBool::new(false);
#[derive(Serialize, Deserialize)]
pub struct Report {
    agent: String,
    found: bool,
    authenticated: Option<bool>,
    mode: String,
    state: String,
    at: u64,
    duration: u64,
}

#[tauri::command]
pub async fn cli_agent(agent: String, action: String) -> Result<Report, String> {
    if !["codex","cursor","claude"].contains(&agent.as_str()) || !["status","login","open","test"].contains(&action.as_str()) {
        return Err("Unsupported CLI operation".into());
    }
    if BUSY.swap(true, Ordering::AcqRel) { return Err("CLI operation in progress".into()); }
    tauri::async_runtime::spawn_blocking(move || {
        struct Reset;
        impl Drop for Reset { fn drop(&mut self) { BUSY.store(false, Ordering::Release); } }
        let _reset = Reset;
        run(&agent, &action)
    }).await.map_err(|_| "CLI worker failed".to_string())?
}

#[cfg(windows)]
fn run(agent: &str, action: &str) -> Result<Report, String> {
    use std::{io::Read, process::{Command, Stdio}, sync::mpsc, time::{Duration,Instant}};
    let root = std::env::var_os("SystemRoot").ok_or("Windows unavailable")?;
    let shell = std::path::PathBuf::from(&root).join("System32/WindowsPowerShell/v1.0/powershell.exe");
    // Both values are fixed allowlisted identifiers, never shell fragments from the UI.
    let script = format!("& {{ {} }} -Agent '{}' -Action '{}'",include_str!("cli_agents.ps1"),agent,action);
    let mut command = Command::new(shell);
    command.args(["-NoLogo","-NoProfile","-NonInteractive","-Command",&script])
        .stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::null());
    crate::platform::no_console(&mut command);
    let mut child = command.spawn().map_err(|_| "Could not start CLI check")?;
    let output = child.stdout.take().ok_or("CLI output unavailable")?;
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let mut bytes = Vec::new();
        let read = output.take(65537).read_to_end(&mut bytes);
        let _ = tx.send(if read.is_ok() && bytes.len()<=65536 {Some(bytes)} else {None});
    });
    let deadline = Instant::now()+Duration::from_secs(75);
    let success = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status.success(),
            Ok(None) if Instant::now()<deadline => std::thread::sleep(Duration::from_millis(50)),
            _ => {
                let mut kill = Command::new(std::path::PathBuf::from(&root).join("System32/taskkill.exe"));
                kill.args(["/T","/F","/PID",&child.id().to_string()]).stdout(Stdio::null()).stderr(Stdio::null());
                crate::platform::no_console(&mut kill);
                let _ = kill.status(); let _ = child.kill(); let _ = child.wait();
                return Err("CLI check timed out".into());
            }
        }
    };
    if !success { return Err("CLI check failed".into()); }
    let bytes = rx.recv_timeout(Duration::from_secs(2)).ok().flatten().ok_or("CLI report unavailable")?;
    let report: Report = serde_json::from_slice(&bytes).map_err(|_| "Invalid CLI report")?;
    if report.agent!=agent { return Err("Unexpected CLI report".into()); }
    Ok(report)
}

#[cfg(not(windows))]
fn run(_agent: &str, _action: &str) -> Result<Report,String> {
    Err("Account CLI connection currently supports Windows".into())
}
