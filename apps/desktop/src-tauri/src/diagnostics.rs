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
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;

    fn response(body: String, status: &str) -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let endpoint = listener.local_addr().unwrap();
        let status = status.to_owned();
        std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            stream
                .set_read_timeout(Some(std::time::Duration::from_secs(3)))
                .unwrap();
            let mut request = [0; 2048];
            let _ = stream.read(&mut request);
            let bytes = format!(
                "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            );
            let _ = stream.write_all(bytes.as_bytes());
        });
        endpoint
    }

    #[tokio::test]
    async fn reads_foundation_diagnostics_from_an_independent_process() {
        let body = serde_json::to_string(&CoreHealth::foundation("0.1.0")).unwrap();
        assert_eq!(
            fetch_health(response(body, "200 OK")).await.unwrap().mode,
            "foundation"
        );
    }

    #[tokio::test]
    async fn rejects_non_core_and_oversized_responses() {
        let mut other = CoreHealth::foundation("0.1.0");
        other.service = "other".into();
        let body = serde_json::to_string(&other).unwrap();
        assert!(fetch_health(response(body, "200 OK")).await.is_err());
        assert!(
            fetch_health(response("x".repeat(16385), "200 OK"))
                .await
                .is_err()
        );
    }

    #[tokio::test]
    async fn refuses_redirects_instead_of_leaving_the_fixed_endpoint() {
        assert!(
            fetch_health(response("{}".into(), "302 Found"))
                .await
                .is_err()
        );
    }
    #[tokio::test]
    async fn protocol_mismatch_has_a_distinct_diagnostic() {
        let mut health = CoreHealth::foundation("0.1.0");
        health.protocol_version = 99;
        let body = serde_json::to_string(&health).unwrap();
        assert_eq!(
            fetch_health(response(body, "200 OK")).await.unwrap_err(),
            "incompatible-protocol"
        );
    }
}
