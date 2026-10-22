//! Quota evidence only: API response headers, or OpenRouter's read-only key API.
//! No guessed quotas, token counters, keys or prompt contents cross IPC.
use std::{collections::HashMap, hash::{Hash, Hasher}, sync::{Mutex, OnceLock}, time::{Duration, SystemTime, UNIX_EPOCH}};
use serde::Serialize;
use serde_json::Value;
use reqwest::{header::HeaderMap, Url};
use crate::{net, secrets};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Bucket { kind: String, limit: f64, remaining: f64, reset: Option<String> }
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot { provider: String, model: String, at: u64, source: String, buckets: Vec<Bucket> }
type Cache = HashMap<(String,String),(u64,Snapshot)>;
static CACHE: OnceLock<Mutex<Cache>> = OnceLock::new();
fn cache() -> &'static Mutex<Cache> { CACHE.get_or_init(|| Mutex::new(HashMap::new())) }
fn stamp() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64 }
fn fingerprint(key: &str) -> u64 { let mut hash = std::collections::hash_map::DefaultHasher::new(); key.hash(&mut hash); hash.finish() }
fn number(value: Option<&str>) -> Option<f64> { value?.parse::<f64>().ok().filter(|n| n.is_finite() && *n >= 0.0) }
fn bucket(kind: &str, limit: Option<f64>, remaining: Option<f64>, reset: Option<String>) -> Option<Bucket> {
    let (limit,remaining) = (limit?,remaining?);
    if !limit.is_finite() || !remaining.is_finite() || limit < 0.0 || remaining < 0.0 { return None; }
    Some(Bucket { kind:kind.into(), limit, remaining:remaining.min(limit), reset })
}
fn header_buckets(provider: &str, headers: &HeaderMap) -> Vec<Bucket> {
    let prefix = if provider == "anthropic" { "anthropic-ratelimit" } else { "x-ratelimit" };
    let get = |name: &str| headers.get(name).and_then(|value| value.to_str().ok());
    let mut rows = Vec::new();
    for dimension in ["requests","tokens"] {
        let (limit,remaining,reset) = if provider == "anthropic" {
            (format!("{prefix}-{dimension}-limit"),format!("{prefix}-{dimension}-remaining"),format!("{prefix}-{dimension}-reset"))
        } else {
            (format!("{prefix}-limit-{dimension}"),format!("{prefix}-remaining-{dimension}"),format!("{prefix}-reset-{dimension}"))
        };
        let kind = match (provider,dimension) { ("groq","requests") => "requests-day", ("groq","tokens") => "tokens-minute", (_,value) => value };
        if let Some(row) = bucket(kind,number(get(&limit)),number(get(&remaining)),get(&reset).map(|s|s.chars().take(80).collect())) { rows.push(row); }
    }
    rows
}
pub fn capture(provider: &str, model: &str, key: &str, headers: &HeaderMap) {
    if !["groq","openai","anthropic"].contains(&provider) { return; }
    let buckets = header_buckets(provider,headers);
    if buckets.is_empty() { return; }
    if let Ok(mut saved) = cache().lock() {
        if saved.len() >= 32 { saved.clear(); }
        saved.insert((provider.into(),model.into()),(fingerprint(key),Snapshot{provider:provider.into(),model:model.into(),at:stamp(),source:"headers".into(),buckets}));
    }
}
fn openrouter_buckets(body: &Value) -> Vec<Bucket> {
    let mut rows = Vec::new();
    if let Some(row) = bucket("free-requests-day",body.pointer("/data/free_model_daily_requests/limit").and_then(Value::as_f64),body.pointer("/data/free_model_daily_requests/remaining").and_then(Value::as_f64),Some("00:00 UTC".into())) { rows.push(row); }
    if let Some(row) = bucket("credits-usd",body.pointer("/data/limit").and_then(Value::as_f64),body.pointer("/data/limit_remaining").and_then(Value::as_f64),body.pointer("/data/limit_reset").and_then(Value::as_str).map(str::to_string)) { rows.push(row); }
    rows
}
pub async fn read(provider: &str, model: &str) -> Result<Snapshot,String> {
    let key_name = match provider {
        "anthropic" => "anthropic-api-key", "google" => "google-api-key", "openai" => "openai-api-key", "groq" => "groq-api-key", "openrouter" => "openrouter-api-key",
        _ => return Err("Quota is not available for this provider.".into()),
    };
    let key = secrets::get(key_name).ok_or("API key missing.")?;
    if provider == "openrouter" {
        let endpoint = Url::parse("https://openrouter.ai/api/v1/key").map_err(|_|"Invalid quota endpoint.")?;
        let response = net::client(&endpoint,Duration::from_secs(15))?.get(endpoint).bearer_auth(&key).send().await.map_err(|_|"Could not read provider quota.")?;
        if !response.status().is_success() { return Err(format!("Quota API returned {}.",response.status().as_u16())); }
        let bytes = net::read_capped(response,net::MAX_BODY).await?;
        let body: Value = serde_json::from_slice(&bytes).map_err(|_|"Invalid quota response.")?;
        return Ok(Snapshot{provider:provider.into(),model:model.into(),at:stamp(),source:"key".into(),buckets:openrouter_buckets(&body)});
    }
    if let Ok(saved) = cache().lock() {
        if let Some((owner,snapshot)) = saved.get(&(provider.into(),model.into())) {
            if *owner == fingerprint(&key) { return Ok(snapshot.clone()); }
        }
    }
    Ok(Snapshot{provider:provider.into(),model:model.into(),at:stamp(),source:"unavailable".into(),buckets:Vec::new()})
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn groq_headers_are_daily_requests_and_minute_tokens() {
        let mut headers = HeaderMap::new();
        headers.insert("x-ratelimit-limit-requests","1000".parse().unwrap());
        headers.insert("x-ratelimit-remaining-requests","750".parse().unwrap());
        let rows = header_buckets("groq",&headers);
        assert_eq!(rows.len(),1); assert_eq!(rows[0].kind,"requests-day"); assert_eq!(rows[0].remaining,750.0);
        assert!(header_buckets("groq",&HeaderMap::new()).is_empty());
    }
    #[test]
    fn openrouter_uses_returned_limits_without_inventing_free_quota() {
        let rows = openrouter_buckets(&serde_json::json!({"data":{"free_model_daily_requests":{"limit":50,"remaining":12},"limit":null,"limit_remaining":null}}));
        assert_eq!(rows.len(),1); assert_eq!(rows[0].remaining,12.0);
        assert!(openrouter_buckets(&serde_json::json!({"data":{}})).is_empty());
    }
}
