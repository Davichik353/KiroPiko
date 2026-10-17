//! Explicit, user-confirmed file email, matching Coucou's Resend transport.
use serde_json::json;

fn valid_address(value: &str) -> bool {
    value.len() <= 254 && !value.chars().any(|c| c.is_whitespace() || c.is_control() || matches!(c, ',' | ';' | '<' | '>' | '"'))
        && value.split('@').count() == 2
        && value.split_once('@').is_some_and(|(a, b)| !a.is_empty() && b.contains('.') && !b.ends_with('.'))
}

#[tauri::command]
pub async fn nova_send_mail(to: String, from: String, subject: String, body: String, path: String, request_id: String) -> Result<String, String> {
    if !valid_address(&to) || !valid_address(&from) { return Err("Укажите корректные адреса отправителя и получателя.".into()); }
    if subject.trim().is_empty() || subject.len() > 998 || subject.contains(['\r', '\n']) || body.len() > 65536 {
        return Err("Проверьте тему и длину письма.".into());
    }
    if request_id.len() > 80 || request_id.len() < 16 || !request_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err("Некорректный идентификатор письма.".into());
    }
    let key = crate::secrets::get("resend-api-key").filter(|k| !k.trim().is_empty()).ok_or("Добавьте API-ключ Resend в форме письма или настройках интеграции.")?;
    let file_path = std::path::PathBuf::from(path);
    if !file_path.is_absolute() { return Err("Вложение должно быть локальным файлом.".into()); }
    let metadata = std::fs::symlink_metadata(&file_path).map_err(|_| "Вложение недоступно.")?;
    if !metadata.is_file() || metadata.len() > 10 * 1024 * 1024 { return Err("Выберите обычный файл до 10 МБ.".into()); }
    use std::io::Read;
    let mut bytes = Vec::new();
    std::fs::File::open(&file_path).map_err(|_| "Не удалось открыть вложение.")?.take(10 * 1024 * 1024 + 1).read_to_end(&mut bytes).map_err(|_| "Не удалось прочитать вложение.")?;
    if bytes.len() > 10 * 1024 * 1024 { return Err("Вложение превышает 10 МБ.".into()); }
    let filename = file_path.file_name().and_then(|n| n.to_str()).ok_or("Некорректное имя вложения.")?;
    let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(30)).build().map_err(|e| e.to_string())?;
    let response = client.post("https://api.resend.com/emails").bearer_auth(key)
        .header("Idempotency-Key", format!("kiropiko-{request_id}"))
        .json(&json!({"from": from, "to": [to], "subject": subject, "text": body,
            "attachments": [{"filename": filename, "content": crate::claude::base64_for(&bytes)}]}))
        .send().await.map_err(|_| "Нет ответа Resend. Повторите без изменения письма, чтобы избежать дубликата.")?;
    if !response.status().is_success() {
        return Err(format!("Resend отклонил письмо (HTTP {}). Проверьте ключ, подтверждённый домен отправителя и ограничения аккаунта.", response.status().as_u16()));
    }
    let bytes = crate::net::read_capped(response, 64 * 1024).await.map_err(|_| "Слишком большой ответ Resend. Проверьте журнал сервиса перед повторной отправкой.")?;
    let value: serde_json::Value = serde_json::from_slice(&bytes).map_err(|_| "Не удалось прочитать подтверждение Resend. Не создавайте новое письмо: проверьте журнал сервиса.")?;
    value["id"].as_str().map(str::to_owned).ok_or("Resend не вернул идентификатор письма.".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn recipient_must_be_one_address_without_header_injection() {
        assert!(valid_address("user@example.com"));
        for invalid in ["", "user", "@example.com", "a@@example.com", "a@example.com\r\nBcc:b@example.com", "a@example.com b@example.com"] {
            assert!(!valid_address(invalid));
        }
    }
}
