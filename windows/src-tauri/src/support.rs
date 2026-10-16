//! Explicit local support report and public release discovery; never upload logs.
use serde::Serialize;
use tauri::State;
use crate::{net, settings, Shared};

fn error_counts(log: &str) -> String {
    let mut counts = [0usize; 4];
    for line in log.lines().rev().take(1500) {
        let lower = line.to_ascii_lowercase();
        if !(lower.contains("error") || lower.contains("failed") || lower.contains("timeout")) { continue; }
        let category = if lower.contains("chat") || lower.contains("model") { 0 }
            else if lower.contains("phone") || lower.contains("relay") { 1 }
            else if lower.contains("voice") || lower.contains("speech") { 2 } else { 3 };
        counts[category] += 1;
    }
    format!("AI: {}\nPhone: {}\nVoice: {}\nOther: {}", counts[0], counts[1], counts[2], counts[3])
}

#[tauri::command]
pub fn support_report(shared: State<Shared>) -> String {
    let path = settings::local_dir().join("coucou.log");
    let log = if std::fs::metadata(&path).is_ok_and(|m| m.len() <= 2_000_000) { std::fs::read_to_string(path).unwrap_or_default() } else { String::new() };
    let s = shared.settings.lock().unwrap();
    format!("KiroPiko support v1\nApp: {}\nOS: {} / {}\nPhone enabled: {}\nDo not disturb: {}\nRecent logged failure categories (last 1500 lines):\n{}\n\nRaw logs, keys, messages, commands, projects and addresses are excluded. Counts do not prove current service availability.", env!("CARGO_PKG_VERSION"), std::env::consts::OS, std::env::consts::ARCH, s.phone_link, s.nova_do_not_disturb, error_counts(&log))
}

#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct Release { version: String, url: String, newer: bool }

fn version(raw: &str) -> Option<Vec<u32>> {
    let parts: Vec<_> = raw.split('-').next()?.split('.').map(str::parse::<u32>).collect::<Result<_,_>>().ok()?;
    (parts.len()==3).then_some(parts)
}
fn pick_releases(data: &serde_json::Value, current: &str) -> Option<Release> {
    let current = version(current)?;
    data.as_array()?.iter().filter(|r| r["draft"] != true).flat_map(|r| r["assets"].as_array().into_iter().flatten())
        .filter_map(|asset| {
            let name=asset["name"].as_str()?;
            let v=name.strip_prefix("KiroPiko-Windows-")?.strip_suffix("-setup.exe")?;
            let parsed=version(v)?;
            let url=asset["browser_download_url"].as_str()?;
            if !url.starts_with("https://github.com/Davichik353/KiroPiko/releases/download/") { return None; }
            Some((parsed.clone(), Release { version:v.into(),url:url.into(),newer:parsed>current }))
        }).max_by(|a,b|a.0.cmp(&b.0)).map(|(_,r)|r)
}
#[tauri::command]
pub async fn support_update_check() -> Result<Option<Release>,String> {
    let client=reqwest::Client::builder().timeout(std::time::Duration::from_secs(20)).user_agent("KiroPiko-update-check").build().map_err(|_|"Не удалось подготовить проверку обновлений")?;
    let response=client.get("https://api.github.com/repos/Davichik353/KiroPiko/releases?per_page=20").send().await.map_err(|_|"GitHub недоступен. Проверьте интернет и повторите.")?;
    if !response.status().is_success() { return Err(format!("GitHub: HTTP {}. Повторите позже.",response.status().as_u16())); }
    let bytes=net::read_capped(response,512*1024).await.map_err(|_|"Некорректный ответ GitHub")?;
    let data=serde_json::from_slice(&bytes).map_err(|_|"Некорректный список выпусков")?;
    Ok(pick_releases(&data,env!("CARGO_PKG_VERSION")))
}
#[cfg(test)] mod tests {
    use super::*;
    #[test] fn report_never_copies_arbitrary_log_content() {
        let text=error_counts("chat error API_KEY=secret-token user@example.com C:/private\nphone failed token=secret\nvoice timeout\nfailed");
        assert_eq!(text,"AI: 1\nPhone: 1\nVoice: 1\nOther: 1");
        for secret in ["secret","example","private"] { assert!(!text.contains(secret)); }
    }
    #[test] fn updates_order_numeric_versions_and_reject_foreign_assets() {
        let data=serde_json::json!([{"assets":[
            {"name":"KiroPiko-Windows-0.4.9-setup.exe","browser_download_url":"https://github.com/Davichik353/KiroPiko/releases/download/v/old"},
            {"name":"KiroPiko-Windows-0.4.10-setup.exe","browser_download_url":"https://github.com/Davichik353/KiroPiko/releases/download/v/new"},
            {"name":"KiroPiko-Windows-9.0.0-setup.exe","browser_download_url":"https://evil.test/setup.exe"}]}]);
        let r=pick_releases(&data,"0.4.9").unwrap(); assert_eq!(r.version,"0.4.10"); assert!(r.newer);
        assert!(!pick_releases(&data,"0.4.10").unwrap().newer);
    }
}
