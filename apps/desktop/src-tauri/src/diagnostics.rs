use reed_protocol::{CoreHealth, PROTOCOL_VERSION};
use std::{net::SocketAddr, time::Duration};

const MAX_RESPONSE_BYTES: usize = 16 * 1024;

pub async fn fetch_health(endpoint: SocketAddr) -> Result<CoreHealth, String> {
    let unavailable = |error: reqwest::Error| {
        if error.is_timeout() {
            "timeout"
        } else {
            "network"
        }
        .to_string()
    };
    let client = reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(2))
        .build()
        .map_err(unavailable)?;
    let mut response = client
        .get(format!("http://{endpoint}/health"))
        .send()
        .await
        .map_err(unavailable)?;
    if response.status() != reqwest::StatusCode::OK {
        return Err("http".into());
    }
    if response
        .content_length()
        .is_some_and(|length| length > MAX_RESPONSE_BYTES as u64)
    {
        return Err("invalid-response".into());
    }
    let mut body = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(unavailable)? {
        if chunk.len() > MAX_RESPONSE_BYTES.saturating_sub(body.len()) {
            return Err("invalid-response".into());
        }
        body.extend_from_slice(&chunk);
    }
    let health: CoreHealth =
        serde_json::from_slice(&body).map_err(|_| "invalid-response".to_string())?;
    if health.service != "reed-core"
        || health.mode != "foundation"
        || health.version.trim().is_empty()
    {
        return Err("invalid-response".into());
    }
    if health.protocol_version != PROTOCOL_VERSION {
        return Err("incompatible-protocol".into());
    }
    Ok(health)
}

#[cfg(test)]
#[path = "diagnostics_tests.rs"]
mod tests;
