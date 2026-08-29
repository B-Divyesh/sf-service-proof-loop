use axum::{
    body::Body,
    http::{header, Request, StatusCode},
    routing::get,
    Json, Router,
};
use chrono::{Duration, Utc};
use http_body_util::BodyExt;
use service_proof_loop::app::{build_app, AppConfig};
use sha2::{Digest, Sha256};
use sqlx::{sqlite::SqlitePoolOptions, Row, SqlitePool};
use tempfile::TempDir;
use tower::ServiceExt;

async fn test_app(rate_limit: u32) -> (Router, SqlitePool, TempDir) {
    test_app_with_billing(rate_limit, "http://127.0.0.1:9").await
}

async fn test_app_with_billing(
    rate_limit: u32,
    billing_base_url: &str,
) -> (Router, SqlitePool, TempDir) {
    let pool = SqlitePoolOptions::new()
        .max_connections(4)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    sqlx::migrate!().run(&pool).await.unwrap();
    let static_dir = tempfile::tempdir().unwrap();
    std::fs::write(static_dir.path().join("index.html"), "<main>app</main>").unwrap();
    std::fs::write(static_dir.path().join("404.html"), "<main>missing</main>").unwrap();
    std::fs::create_dir(static_dir.path().join("assets")).unwrap();
    std::fs::write(static_dir.path().join("assets/index-abc.js"), "export{};").unwrap();
    let app = build_app(
        pool.clone(),
        AppConfig {
            build_sha: "test-sha".into(),
            static_dir: static_dir.path().into(),
            rate_limit,
            billing_base_url: billing_base_url.into(),
        },
    );
    (app, pool, static_dir)
}

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).unwrap()
}

async fn create_workspace(app: &Router) -> String {
    let response = app
        .clone()
        .oneshot(
            Request::post("/api/workspaces")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(r#"{"name":"Northstar"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    response_json(response).await["access_token"]
        .as_str()
        .unwrap()
        .to_string()
}

fn visit_request(token: &str) -> Request<Body> {
    let next_visit = (Utc::now() + Duration::days(30)).date_naive().to_string();
    visit_request_with(token, &next_visit, "Kitchen")
}

fn visit_request_with(token: &str, next_visit_at: &str, checklist_label: &str) -> Request<Body> {
    Request::post("/api/visits")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::AUTHORIZATION, format!("Bearer {token}"))
        .body(Body::from(
            serde_json::json!({
                "client_name": "Maya",
                "location_label": "Willow Street",
                "next_visit_at": next_visit_at,
                "technician": "Elena",
                "checklist": [{"label": checklist_label, "done": true}],
                "notes": "",
                "photos": [],
                "photo_consent": false
            })
            .to_string(),
        ))
        .unwrap()
}

#[tokio::test]
async fn health_returns_build_identity() {
    let (app, _, _) = test_app(40).await;
    let response = app
        .oneshot(Request::get("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response_json(response).await["build_sha"], "test-sha");
}

#[tokio::test]
async fn demo_provisions_an_isolated_seeded_workspace() {
    let (app, _, _) = test_app(40).await;
    let created = app
        .clone()
        .oneshot(Request::post("/api/demo").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(created.status(), StatusCode::OK);
    let access = response_json(created).await;
    assert_eq!(access["demo"], true);
    assert!(access["expires_at"].as_str().is_some());
    let visits = app
        .oneshot(
            Request::get("/api/visits")
                .header(
                    header::AUTHORIZATION,
                    format!("Bearer {}", access["access_token"].as_str().unwrap()),
                )
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(visits.status(), StatusCode::OK);
    assert!(response_json(visits)
        .await
        .to_string()
        .contains("Willow Street"));
}

#[tokio::test]
async fn durable_database_survives_app_restart() {
    let db_dir = tempfile::tempdir().unwrap();
    let database_url = format!(
        "sqlite://{}?mode=rwc",
        db_dir.path().join("shared.db").display()
    );
    let first_pool = SqlitePoolOptions::new()
        .connect(&database_url)
        .await
        .unwrap();
    sqlx::migrate!().run(&first_pool).await.unwrap();
    let static_dir = tempfile::tempdir().unwrap();
    std::fs::write(static_dir.path().join("index.html"), "app").unwrap();
    std::fs::write(static_dir.path().join("404.html"), "missing").unwrap();
    let config = AppConfig {
        build_sha: "shared".into(),
        static_dir: static_dir.path().into(),
        rate_limit: 40,
        billing_base_url: "http://127.0.0.1:9".into(),
    };
    let first = build_app(first_pool, config.clone());
    let created = first
        .oneshot(Request::post("/api/demo").body(Body::empty()).unwrap())
        .await
        .unwrap();
    let access = response_json(created).await;
    let second_pool = SqlitePoolOptions::new()
        .connect(&database_url)
        .await
        .unwrap();
    let second = build_app(second_pool, config);
    let response = second
        .oneshot(
            Request::get("/api/visits")
                .header(
                    header::AUTHORIZATION,
                    format!("Bearer {}", access["access_token"].as_str().unwrap()),
                )
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert!(response_json(response)
        .await
        .to_string()
        .contains("Willow Street"));
}

#[tokio::test]
/// @claim:access-token-hashing
async fn claim_access_tokens_are_stored_only_as_hashes() {
    let (app, pool, _) = test_app(100).await;
    let created = app
        .clone()
        .oneshot(
            Request::post("/api/workspaces")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(r#"{"name":"Hash Test"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    let workspace = response_json(created).await;
    let access_token = workspace["access_token"].as_str().unwrap();
    let stored_workspace: String =
        sqlx::query_scalar("SELECT token_hash FROM workspaces WHERE id = ?")
            .bind(workspace["workspace_id"].as_str().unwrap())
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_ne!(stored_workspace, access_token);
    assert_eq!(
        stored_workspace,
        format!("{:x}", Sha256::digest(access_token.as_bytes()))
    );

    let visit = app.oneshot(visit_request(access_token)).await.unwrap();
    assert_eq!(visit.status(), StatusCode::CREATED);
    let visit = response_json(visit).await;
    let proof_token = visit["proof_token"].as_str().unwrap();
    let row = sqlx::query("SELECT proof_token_hash, proof_token_demo FROM visits WHERE id = ?")
        .bind(visit["id"].as_str().unwrap())
        .fetch_one(&pool)
        .await
        .unwrap();
    let stored_proof: String = row.get("proof_token_hash");
    let demo_token: Option<String> = row.get("proof_token_demo");
    assert_ne!(stored_proof, proof_token);
    assert_eq!(
        stored_proof,
        format!("{:x}", Sha256::digest(proof_token.as_bytes()))
    );
    assert!(
        demo_token.is_none(),
        "real proof tokens must not be retained"
    );
}

#[tokio::test]
async fn valid_spa_routes_are_200_unknown_routes_are_404_and_assets_cache() {
    let (app, _, _static_dir) = test_app(100).await;
    for path in ["/", "/demo", "/app", "/privacy", "/terms", "/proof/token"] {
        let response = app
            .clone()
            .oneshot(Request::get(path).body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK, "{path}");
    }
    let missing = app
        .clone()
        .oneshot(
            Request::get("/definitely-missing")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
    let asset = app
        .oneshot(
            Request::get("/assets/index-abc.js")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(
        asset.headers()[header::CACHE_CONTROL],
        "public, max-age=31536000, immutable"
    );
}

#[tokio::test]
/// @claim:proof-expiry
async fn claim_proof_expiry_rejects_an_expired_proof() {
    let (app, pool, _) = test_app(100).await;
    app.clone()
        .oneshot(Request::post("/api/demo").body(Body::empty()).unwrap())
        .await
        .unwrap();
    let row = sqlx::query("SELECT proof_token_demo FROM visits LIMIT 1")
        .fetch_one(&pool)
        .await
        .unwrap();
    let token: String = row.get("proof_token_demo");
    sqlx::query("UPDATE visits SET proof_expires_at = ?")
        .bind((Utc::now() - Duration::minutes(1)).to_rfc3339())
        .execute(&pool)
        .await
        .unwrap();
    let response = app
        .oneshot(
            Request::get(format!("/api/proof/{token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::GONE);
}

#[tokio::test]
/// @claim:demo-expiry
async fn claim_demo_expiry_is_24_hours_and_expired_access_is_rejected() {
    let (app, pool, _) = test_app(100).await;
    let created = app
        .clone()
        .oneshot(Request::post("/api/demo").body(Body::empty()).unwrap())
        .await
        .unwrap();
    let access = response_json(created).await;
    let expiry = chrono::DateTime::parse_from_rfc3339(access["expires_at"].as_str().unwrap())
        .unwrap()
        .with_timezone(&Utc);
    let remaining = expiry - Utc::now();
    assert!(remaining > Duration::hours(23));
    assert!(remaining <= Duration::hours(24));
    sqlx::query("UPDATE workspaces SET expires_at = ? WHERE id = ?")
        .bind((Utc::now() - Duration::minutes(1)).to_rfc3339())
        .bind(access["workspace_id"].as_str().unwrap())
        .execute(&pool)
        .await
        .unwrap();
    let response = app
        .oneshot(
            Request::get("/api/visits")
                .header(
                    header::AUTHORIZATION,
                    format!("Bearer {}", access["access_token"].as_str().unwrap()),
                )
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
/// @claim:plan-limit
async fn claim_plan_limit_is_server_enforced_and_a_valid_license_allows_more() {
    let verifier = Router::new().route(
        "/verify",
        get(|| async { Json(serde_json::json!({"valid": true})) }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let verifier_url = format!("http://{}", listener.local_addr().unwrap());
    tokio::spawn(async move { axum::serve(listener, verifier).await.unwrap() });
    let (app, _, _) = test_app_with_billing(100, &verifier_url).await;
    let token = create_workspace(&app).await;
    for _ in 0..3 {
        let response = app.clone().oneshot(visit_request(&token)).await.unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);
    }
    let blocked = app.clone().oneshot(visit_request(&token)).await.unwrap();
    assert_eq!(blocked.status(), StatusCode::PAYMENT_REQUIRED);
    let mut licensed = visit_request(&token);
    licensed
        .headers_mut()
        .insert("x-product-license", "valid-license".parse().unwrap());
    let allowed = app.oneshot(licensed).await.unwrap();
    assert_eq!(allowed.status(), StatusCode::CREATED);

    let (concurrent_app, pool, _) = test_app(100).await;
    let concurrent_token = create_workspace(&concurrent_app).await;
    let mut requests = tokio::task::JoinSet::new();
    for _ in 0..8 {
        let app = concurrent_app.clone();
        let token = concurrent_token.clone();
        requests.spawn(async move { app.oneshot(visit_request(&token)).await.unwrap().status() });
    }

    let mut statuses = Vec::new();
    while let Some(result) = requests.join_next().await {
        statuses.push(result.unwrap());
    }
    assert_eq!(
        statuses
            .iter()
            .filter(|status| **status == StatusCode::CREATED)
            .count(),
        3,
        "only three simultaneous free visits may be created: {statuses:?}"
    );
    assert_eq!(
        statuses
            .iter()
            .filter(|status| **status == StatusCode::PAYMENT_REQUIRED)
            .count(),
        5,
        "every request after the atomic allowance must be rejected: {statuses:?}"
    );
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM visits")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 3);
}

#[tokio::test]
async fn controller_regression_rejects_past_dates_and_blank_checklist_labels() {
    let (app, _, _) = test_app(100).await;
    let token = create_workspace(&app).await;
    let yesterday = (Utc::now() - Duration::days(1)).date_naive().to_string();

    let past = app
        .clone()
        .oneshot(visit_request_with(&token, &yesterday, "Kitchen"))
        .await
        .unwrap();
    assert_eq!(past.status(), StatusCode::BAD_REQUEST);

    let future = (Utc::now() + Duration::days(1)).date_naive().to_string();
    let blank = app
        .oneshot(visit_request_with(&token, &future, "   \t"))
        .await
        .unwrap();
    assert_eq!(blank.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn api_rate_limit_uses_forwarded_client_and_sets_retry_after() {
    let (app, _, _) = test_app(2).await;
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
            assert!(response.headers().contains_key(header::RETRY_AFTER));
        }
    }
}

#[test]
fn deployment_contract_requires_durable_sqlite_and_one_replica() {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let contract: serde_json::Value =
        serde_json::from_slice(&std::fs::read(root.join(".factory/deployment.json")).unwrap())
            .unwrap();
    assert_eq!(contract["deployment_class"], "container");
    assert_eq!(contract["active_revisions_mode"], "Single");
    assert_eq!(contract["scale"]["min_replicas"], 1);
    assert_eq!(contract["scale"]["max_replicas"], 1);
    assert_eq!(contract["state_backend"], "durable-single-writer-sqlite");
    assert_eq!(contract["storage_name"], "service-proof-loop-data");
    assert_eq!(contract["storage_mount"], "/data");
    assert_eq!(contract["rollout"]["drain_writers"], true);

    let deploy = std::fs::read_to_string(root.join("scripts/deploy-container.sh")).unwrap();
    assert!(deploy.contains(".factory/deployment.json"));
    assert!(deploy.contains("storageType\":\"AzureFile"));
    assert!(deploy.contains(".containers[0].volumeMounts = [{"));
    assert!(deploy.contains(".scale.maxReplicas = $max"));
    assert!(deploy.contains("replica_count"));
    assert!(deploy.contains("revision deactivate"));
    assert!(deploy.contains("Existing SQLite writers did not drain"));
    assert!(!deploy.contains(".containers[0].volumeMounts = null"));
    assert!(!deploy.contains("/opt/fleet/lib/deploy-container.sh"));
    let main = std::fs::read_to_string(root.join("src/main.rs")).unwrap();
    assert!(main.contains(".vfs(\"unix-none\")"));
}

#[test]
fn commercial_scope_deviation_is_explicit() {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let brief: serde_json::Value =
        serde_json::from_slice(&std::fs::read(root.join(".factory/brief.json")).unwrap()).unwrap();
    assert_eq!(
        brief["monetization"],
        "$59 per business each month plus technician seats"
    );
    let handoff = std::fs::read_to_string(root.join(".factory/handoff.md"))
        .unwrap()
        .replace("**", "")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    assert!(handoff.contains("Commercial scope deviation"));
    assert!(handoff.contains("$59 per business each month plus technician seats"));
    assert!(handoff.contains("$59 one-time business license"));
}
