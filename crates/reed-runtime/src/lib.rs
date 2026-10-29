//! Desktop-independent foundation service. No profiles or business storage yet.
use axum::{Json, Router, routing::get};
use reed_protocol::CoreHealth;
use std::net::SocketAddr;

pub fn router() -> Router {
    Router::new().route(
        "/health",
        get(|| async { Json(CoreHealth::foundation(env!("CARGO_PKG_VERSION"))) }),
    )
}

pub fn validate_listen_address(address: SocketAddr) -> Result<SocketAddr, String> {
    if !address.ip().is_loopback() {
        return Err("the foundation diagnostic listener must use a loopback address".into());
    }
    Ok(address)
}
