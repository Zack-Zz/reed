use axum::{
    body::Body,
    http::{Method, Request, StatusCode},
};
use http_body_util::BodyExt;
use reed_runtime::{router, validate_listen_address};
use serde_json::json;
use tower::ServiceExt;

#[tokio::test]
async fn standalone_router_serves_only_foundation_diagnostics() {
    let response = router()
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(payload["service"], "reed-core");
    assert_eq!(payload["mode"], "foundation");
    assert_eq!(payload["protocolVersion"], 1);
    assert_eq!(payload["capabilities"], json!([]));
}

#[tokio::test]
async fn foundation_does_not_expose_task_or_write_endpoints() {
    let response = router()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
    let response = router()
        .oneshot(
            Request::builder()
                .uri("/tasks")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test]
fn diagnostic_listener_rejects_non_loopback_addresses() {
    assert!(validate_listen_address("0.0.0.0:47821".parse().unwrap()).is_err());
    assert!(validate_listen_address("192.0.2.1:47821".parse().unwrap()).is_err());
    assert!(validate_listen_address("127.0.0.1:0".parse().unwrap()).is_ok());
    assert!(validate_listen_address("[::1]:47821".parse().unwrap()).is_ok());
}
