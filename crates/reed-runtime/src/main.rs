use clap::Parser;
use reed_runtime::{router, validate_listen_address};
use std::net::SocketAddr;
use tokio::net::TcpListener;

#[derive(Parser)]
#[command(
    name = "reedd",
    version,
    about = "Standalone Reed Core foundation diagnostics"
)]
struct Options {
    #[arg(long, default_value = "127.0.0.1:47821", value_parser = parse_listen)]
    listen: SocketAddr,
}

fn parse_listen(value: &str) -> Result<SocketAddr, String> {
    let address = value
        .parse()
        .map_err(|error| format!("invalid listen address: {error}"))?;
    validate_listen_address(address)
}

#[tokio::main(worker_threads = 2)]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let options = Options::parse();
    let listener = TcpListener::bind(options.listen).await?;
    println!(
        "{}",
        serde_json::json!({
            "event": "core.listening", "address": listener.local_addr()?.to_string(),
            "mode": "foundation"
        })
    );
    axum::serve(listener, router())
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn shutdown_signal() {
    let interrupt = async {
        tokio::signal::ctrl_c()
            .await
            .expect("install interrupt handler");
    };
    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("install termination handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { () = interrupt => {}, () = terminate => {} }
}
