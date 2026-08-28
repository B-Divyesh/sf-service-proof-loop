use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use service_proof_loop::app::{build_app, AppConfig};
use sqlx::sqlite::SqlitePoolOptions;
use tower::ServiceExt;

async fn test_app(rate_limit: u32) -> axum::Router {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    sqlx::migrate!().run(&pool).await.unwrap();
    build_app(
        pool,
        AppConfig {
            build_sha: "test-sha".into(),
            static_dir: "dist".into(),
            rate_limit,
        },
    )
}

#[tokio::test]
async fn health_returns_build_identity() {
    let response = test_app(40)
        .await
        .oneshot(Request::get("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert!(String::from_utf8_lossy(&body).contains("test-sha"));
}

#[tokio::test]
async fn demo_provisions_an_isolated_seeded_workspace() {
    let app = test_app(40).await;
    let created = app
        .clone()
        .oneshot(Request::post("/api/demo").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(created.status(), StatusCode::OK);
    let body = created.into_body().collect().await.unwrap().to_bytes();
    let access: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(access["demo"], true);
    assert!(access["expires_at"].as_str().is_some());
    let token = access["access_token"].as_str().unwrap();
    let visits = app
        .oneshot(
            Request::get("/api/visits")
                .header("authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(visits.status(), StatusCode::OK);
    let body = visits.into_body().collect().await.unwrap().to_bytes();
    assert!(String::from_utf8_lossy(&body).contains("Willow Street"));
}

#[tokio::test]
async fn api_rate_limit_uses_forwarded_client_and_sets_retry_after() {
    let app = test_app(2).await;
    for expected in [
        StatusCode::OK,
        StatusCode::OK,
        StatusCode::TOO_MANY_REQUESTS,
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::post("/api/demo")
                    .header("x-forwarded-for", "203.0.113.8, 10.0.0.1")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), expected);
        if expected == StatusCode::TOO_MANY_REQUESTS {
            assert_eq!(response.headers()["retry-after"], "1");
        }
    }
}
