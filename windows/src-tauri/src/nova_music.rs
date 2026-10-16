//! Windows media sessions include desktop players and participating browser tabs.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaSnapshot {
    source: String, title: String, artist: String, album: String, playing: bool,
    position: f64, duration: f64, shuffle: Option<bool>, repeat: Option<i32>,
    can_toggle: bool, can_previous: bool, can_next: bool, can_seek: bool,
    can_shuffle: bool, can_repeat: bool,
    yandex_shuffle: bool, yandex_repeat: bool,
}

#[cfg(windows)]
macro_rules! finish {
    ($operation:expr) => {{
        let operation = $operation.map_err(|e| e.to_string())?;
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(3);
        while operation.Status().map_err(|e| e.to_string())?.0 == 0 {
            if std::time::Instant::now() >= deadline { let _ = operation.Cancel(); return Err("Плеер не ответил вовремя.".into()); }
            std::thread::sleep(std::time::Duration::from_millis(10));
        }
        operation.GetResults().map_err(|e| e.to_string())?
    }};
}

#[cfg(windows)]
fn active_session(manager: &windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager) -> Option<windows::Media::Control::GlobalSystemMediaTransportControlsSession> {
    use windows::Media::Control::GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status;
    let current = manager.GetCurrentSession().ok();
    let playing = |s: &windows::Media::Control::GlobalSystemMediaTransportControlsSession| s.GetPlaybackInfo().and_then(|p| p.PlaybackStatus()).is_ok_and(|status| status == Status::Playing);
    if current.as_ref().is_some_and(&playing) { return current; }
    if let Ok(sessions) = manager.GetSessions() {
        let mut fallback = None;
        for index in 0..sessions.Size().unwrap_or(0) {
            if let Ok(session) = sessions.GetAt(index) {
                if playing(&session) { return Some(session); }
                if fallback.is_none() { fallback = Some(session); }
            }
        }
        return current.or(fallback);
    }
    current
}

#[cfg(windows)]
fn with_media<T>(work: impl FnOnce(windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager) -> Result<T, String>) -> Result<T, String> {
    use windows::Win32::System::WinRT::{RoInitialize, RoUninitialize, RO_INIT_MULTITHREADED};
    unsafe { RoInitialize(RO_INIT_MULTITHREADED) }.map_err(|e| e.to_string())?;
    struct Apartment;
    impl Drop for Apartment { fn drop(&mut self) { unsafe { RoUninitialize() }; } }
    let _apartment = Apartment;
    let manager = finish!(windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager::RequestAsync());
    work(manager)
}

#[tauri::command]
pub async fn nova_media_snapshot() -> Result<Option<MediaSnapshot>, String> {
    #[cfg(windows)]
    { tauri::async_runtime::spawn_blocking(|| with_media(|manager| {
        let session = match active_session(&manager) { Some(s) => s, None => return Ok(None) };
        let properties = finish!(session.TryGetMediaPropertiesAsync());
        let info = session.GetPlaybackInfo().map_err(|e| e.to_string())?;
        let controls = info.Controls().map_err(|e| e.to_string())?;
        let playing = info.PlaybackStatus().map_err(|e| e.to_string())?
            == windows::Media::Control::GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing;
        let timeline = session.GetTimelineProperties().ok();
        let start = timeline.as_ref().and_then(|t| t.StartTime().ok()).map(|t| t.Duration).unwrap_or(0);
        let end = timeline.as_ref().and_then(|t| t.EndTime().ok()).map(|t| t.Duration).unwrap_or(start);
        let duration = (end.saturating_sub(start).max(0) as f64) / 10_000_000.0;
        let sampled_position = timeline.as_ref().and_then(|t| t.Position().ok()).map(|t| t.Duration.saturating_sub(start).max(0) as f64 / 10_000_000.0).unwrap_or(0.0);
        let elapsed = if playing {
            timeline.as_ref().and_then(|t| t.LastUpdatedTime().ok()).filter(|t| t.UniversalTime > 0).map(|updated| {
                let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos() as i128 / 100 + 116_444_736_000_000_000;
                (now - updated.UniversalTime as i128).max(0) as f64 / 10_000_000.0
            }).unwrap_or(0.0)
        } else { 0.0 };
        let rate = info.PlaybackRate().ok().and_then(|v| v.Value().ok()).filter(|r| r.is_finite() && *r > 0.0).unwrap_or(1.0);
        let position = (sampled_position + elapsed * rate).min(duration);
        let source = session.SourceAppUserModelId().map_err(|e| e.to_string())?.to_string();
        let yandex = crate::yandex_music::is_yandex(&source);
        Ok(Some(MediaSnapshot { source,
            title: properties.Title().map_err(|e| e.to_string())?.to_string(),
            artist: properties.Artist().map_err(|e| e.to_string())?.to_string(),
            album: properties.AlbumTitle().map_err(|e| e.to_string())?.to_string(), playing, position, duration,
            shuffle: info.IsShuffleActive().ok().and_then(|v| v.Value().ok()),
            repeat: info.AutoRepeatMode().ok().and_then(|v| v.Value().ok()).map(|v| v.0),
            can_toggle: controls.IsPlayPauseToggleEnabled().unwrap_or(false) || if playing { controls.IsPauseEnabled().unwrap_or(false) } else { controls.IsPlayEnabled().unwrap_or(false) },
            can_previous: controls.IsPreviousEnabled().unwrap_or(false), can_next: controls.IsNextEnabled().unwrap_or(false),
            can_seek: duration > 0.0 && controls.IsPlaybackPositionEnabled().unwrap_or(false),
            can_shuffle: controls.IsShuffleEnabled().unwrap_or(false), can_repeat: controls.IsRepeatEnabled().unwrap_or(false),
            yandex_shuffle: yandex && crate::yandex_music::button("shuffle", false).unwrap_or(false),
            yandex_repeat: yandex && crate::yandex_music::button("repeat", false).unwrap_or(false),
        }))
    })).await.map_err(|e| e.to_string())? }
    #[cfg(not(windows))]
    { Ok(None) }
}

#[tauri::command]
pub async fn nova_media_artwork(source: String, title: String) -> Result<Option<String>, String> {
    #[cfg(windows)]
    { tauri::async_runtime::spawn_blocking(move || with_media(|manager| {
        let session = match active_session(&manager) { Some(s) => s, None => return Ok(None) };
        if session.SourceAppUserModelId().map_err(|e| e.to_string())?.to_string() != source { return Ok(None); }
        let properties = finish!(session.TryGetMediaPropertiesAsync());
        if properties.Title().map_err(|e| e.to_string())?.to_string() != title { return Ok(None); }
        let reference = match properties.Thumbnail() { Ok(r) => r, Err(_) => return Ok(None) };
        let stream = finish!(reference.OpenReadAsync());
        let size = stream.Size().map_err(|e| e.to_string())?;
        if size == 0 || size > 3 * 1024 * 1024 { let _ = stream.Close(); return Ok(None); }
        let input = stream.GetInputStreamAt(0).map_err(|e| e.to_string())?;
        let reader = windows::Storage::Streams::DataReader::CreateDataReader(&input).map_err(|e| e.to_string())?;
        let loaded = finish!(reader.LoadAsync(size as u32));
        let mut bytes = vec![0u8; loaded as usize];
        reader.ReadBytes(&mut bytes).map_err(|e| e.to_string())?;
        let _ = reader.Close(); let _ = stream.Close();
        let mime = if bytes.starts_with(b"\x89PNG\r\n\x1a\n") { "image/png" }
            else if bytes.starts_with(&[0xff, 0xd8, 0xff]) { "image/jpeg" }
            else if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") { "image/webp" }
            else { return Ok(None); };
        Ok(Some(format!("data:{mime};base64,{}", crate::claude::base64_for(&bytes))))
    })).await.map_err(|e| e.to_string())? }
    #[cfg(not(windows))]
    { let _ = (source, title); Ok(None) }
}

#[tauri::command]
pub async fn nova_media_control(action: String, source: String, value: Option<f64>, expected_title: Option<String>) -> Result<(), String> {
    #[cfg(windows)]
    { tauri::async_runtime::spawn_blocking(move || with_media(|manager| {
        let session = active_session(&manager).ok_or("Нет активного плеера.".to_string())?;
        if session.SourceAppUserModelId().map_err(|e| e.to_string())?.to_string() != source {
            return Err("Активный плеер сменился. Повторите действие после обновления панели.".into());
        }
        if let Some(expected) = expected_title {
            let properties = finish!(session.TryGetMediaPropertiesAsync());
            if properties.Title().map_err(|e| e.to_string())?.to_string() != expected {
                return Err("Трек сменился. Повторите действие после обновления панели.".into());
            }
        }
        let accepted = match action.as_str() {
            "yandexShuffle" | "yandexRepeat" => {
                if !crate::yandex_music::is_yandex(&source) { return Err("Эта команда доступна только приложению Яндекс Музыки.".into()); }
                crate::yandex_music::button(if action == "yandexShuffle" { "shuffle" } else { "repeat" }, true)?
            },
            "play" => finish!(session.TryPlayAsync()),
            "pause" => finish!(session.TryPauseAsync()),
            "playPause" => {
                let info = session.GetPlaybackInfo().map_err(|e| e.to_string())?;
                if info.Controls().and_then(|c| c.IsPlayPauseToggleEnabled()).unwrap_or(false) { finish!(session.TryTogglePlayPauseAsync()) }
                else if info.PlaybackStatus().map_err(|e| e.to_string())? == windows::Media::Control::GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing { finish!(session.TryPauseAsync()) }
                else { finish!(session.TryPlayAsync()) }
            },
            "previous" => finish!(session.TrySkipPreviousAsync()),
            "next" => finish!(session.TrySkipNextAsync()),
            "seek" => {
                let seconds = value.filter(|v| v.is_finite() && *v >= 0.0).ok_or("Некорректная позиция трека.")?;
                let timeline = session.GetTimelineProperties().map_err(|e| e.to_string())?;
                let start = timeline.StartTime().map_err(|e| e.to_string())?.Duration;
                let end = timeline.EndTime().map_err(|e| e.to_string())?.Duration;
                let offset = (seconds * 10_000_000.0).min(end.saturating_sub(start).max(0) as f64) as i64;
                finish!(session.TryChangePlaybackPositionAsync(start.saturating_add(offset)))
            },
            "shuffle" => {
                let on = value.ok_or("Нужно значение shuffle.")?;
                if on != 0.0 && on != 1.0 { return Err("Некорректное значение shuffle.".into()); }
                finish!(session.TryChangeShuffleActiveAsync(on == 1.0))
            },
            "repeat" => {
                use windows::Media::MediaPlaybackAutoRepeatMode as Repeat;
                let mode = match value { Some(0.0) => Repeat::None, Some(1.0) => Repeat::Track, Some(2.0) => Repeat::List, _ => return Err("Некорректный режим повтора.".into()) };
                finish!(session.TryChangeAutoRepeatModeAsync(mode))
            },
            _ => return Err("Неизвестная музыкальная команда.".into()),
        };
        if accepted { Ok(()) } else { Err("Плеер не поддерживает эту команду.".into()) }
    })).await.map_err(|e| e.to_string())? }
    #[cfg(not(windows))]
    { let _ = (action, source, value, expected_title); Err("Медиасессии доступны в Windows.".into()) }
}
