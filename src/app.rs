use axum::{
    body::Body,
    extract::{DefaultBodyLimit, OriginalUri, Path, Request, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{Duration, Utc};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{Row, SqlitePool};
use std::{path::PathBuf, time::Duration as StdDuration};
use tower_governor::{
    errors::GovernorError, governor::GovernorConfigBuilder, key_extractor::KeyExtractor,
    GovernorLayer,
};
use tower_http::services::{ServeDir, ServeFile};
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pool: SqlitePool,
    build_sha: String,
    billing_base_url: String,
    static_dir: PathBuf,
    http: reqwest::Client,
}

#[derive(Clone)]
pub struct AppConfig {
    pub build_sha: String,
    pub static_dir: PathBuf,
    pub rate_limit: u32,
    pub billing_base_url: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            build_sha: option_env!("BUILD_SHA").unwrap_or("dev").to_string(),
            static_dir: std::env::var("STATIC_DIR")
                .unwrap_or_else(|_| "dist".into())
                .into(),
            rate_limit: 40,
            billing_base_url: std::env::var("BILLING_BASE_URL").unwrap_or_else(|_| {
                "https://api.sociobot.in/api/v1/products/service-proof-loop".into()
            }),
        }
    }
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

type ApiResult<T> = Result<T, (StatusCode, Json<ErrorBody>)>;

fn problem(status: StatusCode, message: impl Into<String>) -> (StatusCode, Json<ErrorBody>) {
    (
        status,
        Json(ErrorBody {
            error: message.into(),
        }),
    )
}

pub fn build_app(pool: SqlitePool, config: AppConfig) -> Router {
    let state = AppState {
        pool,
        build_sha: config.build_sha,
        billing_base_url: config.billing_base_url,
        static_dir: config.static_dir.clone(),
        http: reqwest::Client::builder()
            .timeout(StdDuration::from_secs(5))
            .build()
            .expect("build HTTP client"),
    };
    let governor = GovernorConfigBuilder::default()
        .per_second(1)
        .burst_size(config.rate_limit.max(1))
        .key_extractor(ForwardedClientIp)
        .finish()
        .expect("valid rate limit");
    let api = Router::new()
        .route("/demo", post(create_demo))
        .route("/workspaces", post(create_workspace))
        .route("/visits", get(list_visits).post(create_visit))
        .route("/visits/{id}/export.csv", get(export_visit))
        .route("/extras", get(list_extras).post(create_extra))
        .route("/proof/{token}", get(get_proof))
        .route("/proof/{token}/respond", post(respond_to_proof))
        .fallback(|| async { problem(StatusCode::NOT_FOUND, "That API route does not exist.") })
        .layer(DefaultBodyLimit::max(4 * 1024 * 1024))
        .layer(GovernorLayer::new(governor).error_handler(|error| {
            if matches!(error, GovernorError::TooManyRequests { .. }) {
                let mut response = problem(
                    StatusCode::TOO_MANY_REQUESTS,
                    "Too many requests. Try again in one second.",
                )
                .into_response();
                response
                    .headers_mut()
                    .insert(header::RETRY_AFTER, HeaderValue::from_static("1"));
                response
            } else {
                error.into()
            }
        }));
    let fallback = ServeDir::new(&config.static_dir)
        .not_found_service(ServeFile::new(config.static_dir.join("404.html")));
    Router::new()
        .route("/health", get(health))
        .nest("/api", api)
        .route("/", get(app_page))
        .route("/demo", get(app_page))
        .route("/app", get(app_page))
        .route("/privacy", get(app_page))
        .route("/terms", get(app_page))
        .route("/proof/{token}", get(app_page))
        .fallback_service(fallback)
        .layer(middleware::from_fn(security_headers))
        .with_state(state)
}

async fn security_headers(req: Request, next: Next) -> Response {
    let path = req.uri().path().to_string();
    let mut response = next.run(req).await;
    let headers = response.headers_mut();
    headers.insert(
        "x-content-type-options",
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        "referrer-policy",
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    headers.insert("x-frame-options", HeaderValue::from_static("DENY"));
    headers.insert(
        "strict-transport-security",
        HeaderValue::from_static("max-age=31536000; includeSubDomains"),
    );
    headers.insert(
        "permissions-policy",
        HeaderValue::from_static("camera=(), microphone=(), geolocation=()"),
    );
    headers.insert("content-security-policy", HeaderValue::from_static("default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self' https://api.sociobot.in; font-src 'self'; base-uri 'self'; form-action 'self' https://api.sociobot.in; frame-ancestors 'none'"));
    if path.starts_with("/proof/") || path.starts_with("/api/proof/") {
        headers.insert(
            "x-robots-tag",
            HeaderValue::from_static("noindex, nofollow, noarchive"),
        );
        headers.insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("private, no-store"),
        );
    } else if path.starts_with("/assets/") && (path.ends_with(".js") || path.ends_with(".css")) {
        headers.insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=31536000, immutable"),
        );
    } else if path.starts_with("/assets/") {
        headers.insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=86400"),
        );
    }
    response
}

async fn app_page(State(state): State<AppState>, OriginalUri(uri): OriginalUri) -> Response {
    let path = uri.path();
    let (title, description) = match path {
        "/" => (
            "Service Proof Loop — Send proof after each visit",
            "Send visit proof, collect client feedback, and carry approved extras into the next recurring visit.",
        ),
        "/demo" => (
            "Demo — Service Proof Loop",
            "Try a complete proof-to-next-visit loop with isolated sample data.",
        ),
        "/app" => (
            "Start — Service Proof Loop",
            "Create a local business workspace for completed visits.",
        ),
        "/privacy" => (
            "Privacy — Service Proof Loop",
            "How Service Proof Loop handles visit proof and client replies.",
        ),
        "/terms" => ("Terms — Service Proof Loop", "Terms for using Service Proof Loop."),
        _ if path.starts_with("/proof/") => (
            "Visit proof — Service Proof Loop",
            "Review completed work and choose any extras for the next visit.",
        ),
        _ => ("Service Proof Loop", "Send visit proof and plan the next visit."),
    };
    let Ok(mut html) = tokio::fs::read_to_string(state.static_dir.join("index.html")).await else {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    };
    html = html.replace("Service Proof Loop — Send proof after each visit", title);
    html = html.replace(
        "Send visit proof, collect client feedback, and carry approved extras into the next recurring visit.",
        description,
    );
    html = html.replace(
        "Send visit proof and carry approved extras into the next recurring visit.",
        description,
    );
    let canonical = format!("https://service-proof-loop.sociobot.in{path}");
    if path.starts_with("/proof/") {
        html = html.replace(
            "    <link rel=\"canonical\" href=\"https://service-proof-loop.sociobot.in/\">\n",
            "    <meta name=\"robots\" content=\"noindex, nofollow, noarchive\">\n",
        );
    } else {
        html = html.replace(
            "https://service-proof-loop.sociobot.in/\"",
            &format!("{canonical}\""),
        );
        html = html.replace(
            "<meta property=\"og:url\" content=\"https://service-proof-loop.sociobot.in/\">",
            &format!("<meta property=\"og:url\" content=\"{canonical}\">"),
        );
    }
    (
        [(
            header::CONTENT_TYPE,
            HeaderValue::from_static("text/html; charset=utf-8"),
        )],
        html,
    )
        .into_response()
}

#[derive(Clone)]
struct ForwardedClientIp;

impl KeyExtractor for ForwardedClientIp {
    type Key = String;

    fn extract<T>(&self, req: &axum::http::Request<T>) -> Result<Self::Key, GovernorError> {
        Ok(req
            .headers()
            .get("x-forwarded-for")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.split(',').next())
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
            .or_else(|| {
                req.extensions()
                    .get::<axum::extract::ConnectInfo<std::net::SocketAddr>>()
                    .map(|value| value.ip().to_string())
            })
            .unwrap_or_else(|| "local".into()))
    }
}

async fn health(State(state): State<AppState>) -> Json<serde_json::Value> {
    Json(serde_json::json!({"status":"ok", "build_sha": state.build_sha}))
}

#[derive(Deserialize)]
struct WorkspaceInput {
    name: String,
}

#[derive(Serialize)]
struct WorkspaceAccess {
    workspace_id: String,
    access_token: String,
    demo: bool,
    expires_at: Option<String>,
}

async fn create_workspace(
    State(state): State<AppState>,
    Json(input): Json<WorkspaceInput>,
) -> ApiResult<(StatusCode, Json<WorkspaceAccess>)> {
    let name = clean(&input.name, 80)?;
    let access = insert_workspace(&state.pool, &name, false, None).await?;
    seed_extras(&state.pool, &access.workspace_id).await?;
    Ok((StatusCode::CREATED, Json(access)))
}

async fn create_demo(State(state): State<AppState>) -> ApiResult<Json<WorkspaceAccess>> {
    sqlx::query("DELETE FROM workspaces WHERE is_demo = 1 AND expires_at < ?")
        .bind(Utc::now().to_rfc3339())
        .execute(&state.pool)
        .await
        .ok();
    let expires = Utc::now() + Duration::hours(24);
    let access = insert_workspace(
        &state.pool,
        "Northstar Home Care — sample",
        true,
        Some(expires.to_rfc3339()),
    )
    .await?;
    seed_extras(&state.pool, &access.workspace_id).await?;
    let proof_token = random_token();
    let now = Utc::now();
    let completed_at = now - Duration::minutes(35);
    let proof_expires_at = completed_at + Duration::days(14);
    let checklist = serde_json::json!([
        {"label":"Kitchen surfaces and sink", "done":true},
        {"label":"Two bathrooms", "done":true},
        {"label":"Floors vacuumed and mopped", "done":true},
        {"label":"Entry glass", "done":true}
    ]);
    let photos = serde_json::json!([
        {"url":"/assets/sample-kitchen.svg", "caption":"Kitchen after the visit"},
        {"url":"/assets/sample-entry.svg", "caption":"Entry glass after the visit"}
    ]);
    sqlx::query("INSERT INTO visits (id, workspace_id, client_name, location_label, completed_at, next_visit_at, technician, checklist_json, notes, photos_json, proof_token_hash, proof_token_demo, proof_expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(Uuid::new_v4().to_string()).bind(&access.workspace_id).bind("Maya Chen").bind("Willow Street")
        .bind(completed_at.to_rfc3339()).bind((now + Duration::days(14)).date_naive().to_string())
        .bind("Elena").bind(checklist.to_string()).bind("The entry mat was left on the bench to dry.")
        .bind(photos.to_string()).bind(hash_token(&proof_token)).bind(&proof_token)
        .bind(proof_expires_at.to_rfc3339()).bind(now.to_rfc3339())
        .execute(&state.pool).await.map_err(db_error)?;
    Ok(Json(access))
}

async fn insert_workspace(
    pool: &SqlitePool,
    name: &str,
    demo: bool,
    expires_at: Option<String>,
) -> ApiResult<WorkspaceAccess> {
    let id = Uuid::new_v4().to_string();
    let token = random_token();
    sqlx::query("INSERT INTO workspaces (id, name, token_hash, is_demo, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(&id).bind(name).bind(hash_token(&token)).bind(demo).bind(&expires_at).bind(Utc::now().to_rfc3339())
        .execute(pool).await.map_err(db_error)?;
    Ok(WorkspaceAccess {
        workspace_id: id,
        access_token: token,
        demo,
        expires_at,
    })
}

async fn seed_extras(pool: &SqlitePool, workspace_id: &str) -> ApiResult<()> {
    for (name, detail, cents) in [
        ("Inside refrigerator", "Wipe shelves and drawers", 2800),
        ("Inside oven", "Degrease racks and interior", 3500),
        ("Change bed linen", "One bed; clean linen left out", 1800),
    ] {
        sqlx::query("INSERT INTO extras (id, workspace_id, name, detail, price_cents) VALUES (?, ?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string()).bind(workspace_id).bind(name).bind(detail).bind(cents)
            .execute(pool).await.map_err(db_error)?;
    }
    Ok(())
}

#[derive(Serialize)]
struct VisitSummary {
    id: String,
    client_name: String,
    location_label: String,
    completed_at: String,
    next_visit_at: String,
    technician: String,
    response_status: Option<String>,
    rating: Option<i64>,
    proof_token: Option<String>,
    requested_extras: Vec<RequestedExtra>,
}

#[derive(Serialize, Clone)]
struct RequestedExtra {
    name: String,
    detail: String,
    price_cents: i64,
}

async fn list_visits(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Json<Vec<VisitSummary>>> {
    let workspace_id = authenticate(&state.pool, &headers).await?;
    let rows = sqlx::query("SELECT id, client_name, location_label, completed_at, next_visit_at, technician, response_status, rating, proof_token_demo FROM visits WHERE workspace_id = ? ORDER BY completed_at DESC")
        .bind(workspace_id).fetch_all(&state.pool).await.map_err(db_error)?;
    let mut visits = Vec::new();
    for row in rows {
        let id: String = row.get("id");
        let requested_extras = load_requested_extras(&state.pool, &id).await?;
        visits.push(VisitSummary {
            id,
            client_name: row.get("client_name"),
            location_label: row.get("location_label"),
            completed_at: row.get("completed_at"),
            next_visit_at: row.get("next_visit_at"),
            technician: row.get("technician"),
            response_status: row.get("response_status"),
            rating: row.get("rating"),
            proof_token: row.get("proof_token_demo"),
            requested_extras,
        });
    }
    Ok(Json(visits))
}

#[derive(Deserialize)]
struct ChecklistInput {
    label: String,
    done: bool,
}
#[derive(Deserialize, Serialize)]
struct PhotoInput {
    url: String,
    caption: String,
}
#[derive(Deserialize)]
struct VisitInput {
    client_name: String,
    location_label: String,
    next_visit_at: String,
    technician: String,
    checklist: Vec<ChecklistInput>,
    notes: String,
    photos: Vec<PhotoInput>,
    photo_consent: bool,
}
#[derive(Serialize)]
struct CreatedVisit {
    id: String,
    proof_token: String,
    proof_expires_at: String,
}

async fn create_visit(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<VisitInput>,
) -> ApiResult<(StatusCode, Json<CreatedVisit>)> {
    let workspace_id = authenticate(&state.pool, &headers).await?;
    if !input.photo_consent && !input.photos.is_empty() {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "Photo consent is required before photos can be shared.",
        ));
    }
    if input.checklist.is_empty() {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "Add at least one checklist item.",
        ));
    }
    if input.photos.len() > 3
        || input.photos.iter().any(|p| {
            p.url.len() > 1_400_000
                || !(p.url.starts_with("data:image/") || p.url.starts_with("/assets/"))
        })
    {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "Use up to three image files under 1 MB each.",
        ));
    }
    let client_name = clean(&input.client_name, 80)?;
    let location = clean(&input.location_label, 120)?;
    let technician = clean(&input.technician, 80)?;
    let notes = clean_optional(&input.notes, 600)?;
    let next_date = chrono::NaiveDate::parse_from_str(&input.next_visit_at, "%Y-%m-%d")
        .map_err(|_| problem(StatusCode::BAD_REQUEST, "Choose a valid next visit date."))?;
    if next_date < Utc::now().date_naive() {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "Choose today or a future next visit date.",
        ));
    }
    let checklist: Vec<serde_json::Value> = input
        .checklist
        .into_iter()
        .map(|item| {
            Ok(serde_json::json!({
                "label": clean(&item.label, 120)?,
                "done": item.done
            }))
        })
        .collect::<ApiResult<_>>()?;
    let id = Uuid::new_v4().to_string();
    let token = random_token();
    let expires = Utc::now() + Duration::days(14);
    let completed_at = Utc::now().to_rfc3339();
    let checklist_json = serde_json::to_string(&checklist).unwrap();
    let photos_json = serde_json::to_string(&input.photos).unwrap();
    let token_hash = hash_token(&token);
    let expires_at = expires.to_rfc3339();
    let created_at = Utc::now().to_rfc3339();
    let inserted = sqlx::query("INSERT INTO visits (id, workspace_id, client_name, location_label, completed_at, next_visit_at, technician, checklist_json, notes, photos_json, proof_token_hash, proof_expires_at, created_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE EXISTS (
            SELECT 1 FROM workspaces AS workspace
            WHERE workspace.id = ? AND (
                workspace.is_demo = 1 OR
                (SELECT COUNT(*) FROM visits WHERE workspace_id = workspace.id) < 3
            )
        )")
        .bind(&id).bind(&workspace_id).bind(&client_name).bind(&location).bind(&completed_at).bind(next_date.to_string())
        .bind(&technician).bind(&checklist_json).bind(&notes).bind(&photos_json)
        .bind(&token_hash).bind(&expires_at).bind(&created_at).bind(&workspace_id)
        .execute(&state.pool).await.map_err(db_error)?;
    if inserted.rows_affected() == 0 {
        if !license_allows_more(&state, &headers).await {
            return Err(plan_required());
        }
        sqlx::query("INSERT INTO visits (id, workspace_id, client_name, location_label, completed_at, next_visit_at, technician, checklist_json, notes, photos_json, proof_token_hash, proof_expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&id).bind(&workspace_id).bind(&client_name).bind(&location).bind(&completed_at).bind(next_date.to_string())
            .bind(&technician).bind(&checklist_json).bind(&notes).bind(&photos_json)
            .bind(&token_hash).bind(&expires_at).bind(&created_at)
            .execute(&state.pool).await.map_err(db_error)?;
    }
    Ok((
        StatusCode::CREATED,
        Json(CreatedVisit {
            id,
            proof_token: token,
            proof_expires_at: expires.to_rfc3339(),
        }),
    ))
}

#[derive(Deserialize)]
struct LicenseVerdict {
    valid: bool,
}

async fn license_allows_more(state: &AppState, headers: &HeaderMap) -> bool {
    let Some(license) = headers
        .get("x-product-license")
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return false;
    };
    let Ok(response) = state
        .http
        .get(format!("{}/verify", state.billing_base_url))
        .query(&[("license", license)])
        .send()
        .await
    else {
        return false;
    };
    if !response.status().is_success() {
        return false;
    }
    response
        .json::<LicenseVerdict>()
        .await
        .map(|verdict| verdict.valid)
        .unwrap_or(false)
}

fn plan_required() -> (StatusCode, Json<ErrorBody>) {
    problem(
        StatusCode::PAYMENT_REQUIRED,
        "The free plan includes three visits. Add a valid business license to record more.",
    )
}

#[derive(Serialize)]
struct ExtraOption {
    id: String,
    name: String,
    detail: String,
    price_cents: i64,
}

async fn list_extras(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Json<Vec<ExtraOption>>> {
    let workspace_id = authenticate(&state.pool, &headers).await?;
    let extras = sqlx::query(
        "SELECT id, name, detail, price_cents FROM extras WHERE workspace_id = ? AND active = 1 ORDER BY price_cents",
    )
    .bind(workspace_id)
    .fetch_all(&state.pool)
    .await
    .map_err(db_error)?
    .into_iter()
    .map(|row| ExtraOption {
        id: row.get("id"),
        name: row.get("name"),
        detail: row.get("detail"),
        price_cents: row.get("price_cents"),
    })
    .collect();
    Ok(Json(extras))
}

#[derive(Deserialize)]
struct ExtraInput {
    name: String,
    detail: String,
    price_cents: i64,
}

async fn create_extra(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<ExtraInput>,
) -> ApiResult<(StatusCode, Json<ExtraOption>)> {
    let workspace_id = authenticate(&state.pool, &headers).await?;
    let name = clean(&input.name, 80)?;
    let detail = clean(&input.detail, 160)?;
    if !(0..=100_000).contains(&input.price_cents) {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "Set an extra price from $0 to $1,000.",
        ));
    }
    let item = ExtraOption {
        id: Uuid::new_v4().to_string(),
        name,
        detail,
        price_cents: input.price_cents,
    };
    sqlx::query(
        "INSERT INTO extras (id, workspace_id, name, detail, price_cents) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&item.id)
    .bind(workspace_id)
    .bind(&item.name)
    .bind(&item.detail)
    .bind(item.price_cents)
    .execute(&state.pool)
    .await
    .map_err(db_error)?;
    Ok((StatusCode::CREATED, Json(item)))
}
#[derive(Serialize)]
struct Proof {
    id: String,
    business_name: String,
    client_name: String,
    location_label: String,
    completed_at: String,
    next_visit_at: String,
    technician: String,
    checklist: serde_json::Value,
    notes: String,
    photos: serde_json::Value,
    response_status: Option<String>,
    rating: Option<i64>,
    client_comment: Option<String>,
    extras: Vec<ExtraOption>,
    requested_extras: Vec<RequestedExtra>,
    expires_at: String,
}

async fn get_proof(
    State(state): State<AppState>,
    Path(token): Path<String>,
) -> ApiResult<Json<Proof>> {
    let row = proof_row(&state.pool, &token).await?;
    let workspace_id: String = row.get("workspace_id");
    let extras = sqlx::query("SELECT id, name, detail, price_cents FROM extras WHERE workspace_id = ? AND active = 1 ORDER BY price_cents")
        .bind(&workspace_id).fetch_all(&state.pool).await.map_err(db_error)?.into_iter().map(|r| ExtraOption {
            id: r.get("id"), name: r.get("name"), detail: r.get("detail"), price_cents: r.get("price_cents")
        }).collect();
    let id: String = row.get("id");
    Ok(Json(Proof {
        id: id.clone(),
        business_name: row.get("business_name"),
        client_name: row.get("client_name"),
        location_label: row.get("location_label"),
        completed_at: row.get("completed_at"),
        next_visit_at: row.get("next_visit_at"),
        technician: row.get("technician"),
        checklist: serde_json::from_str(row.get("checklist_json")).unwrap_or_default(),
        notes: row.get("notes"),
        photos: serde_json::from_str(row.get("photos_json")).unwrap_or_default(),
        response_status: row.get("response_status"),
        rating: row.get("rating"),
        client_comment: row.get("client_comment"),
        extras,
        requested_extras: load_requested_extras(&state.pool, &id).await?,
        expires_at: row.get("proof_expires_at"),
    }))
}

async fn proof_row(pool: &SqlitePool, token: &str) -> ApiResult<sqlx::sqlite::SqliteRow> {
    if token.len() < 30 {
        return Err(problem(
            StatusCode::NOT_FOUND,
            "This proof link is not valid.",
        ));
    }
    let row = sqlx::query("SELECT v.*, w.name AS business_name FROM visits v JOIN workspaces w ON w.id = v.workspace_id WHERE v.proof_token_hash = ?")
        .bind(hash_token(token)).fetch_optional(pool).await.map_err(db_error)?
        .ok_or_else(|| problem(StatusCode::NOT_FOUND, "This proof link is not valid."))?;
    let expiry: String = row.get("proof_expires_at");
    if chrono::DateTime::parse_from_rfc3339(&expiry)
        .map(|d| d < Utc::now())
        .unwrap_or(true)
    {
        return Err(problem(
            StatusCode::GONE,
            "This proof link expired. Ask the service business for a new link.",
        ));
    }
    Ok(row)
}

#[derive(Deserialize)]
struct ResponseInput {
    status: String,
    rating: i64,
    comment: String,
    extra_ids: Vec<String>,
}

async fn respond_to_proof(
    State(state): State<AppState>,
    Path(token): Path<String>,
    Json(input): Json<ResponseInput>,
) -> ApiResult<Json<serde_json::Value>> {
    let row = proof_row(&state.pool, &token).await?;
    if input.status != "accepted" && input.status != "problem" {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "Choose accepted or report a problem.",
        ));
    }
    if !(1..=5).contains(&input.rating) {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "Choose a rating from 1 to 5.",
        ));
    }
    if input.extra_ids.len() > 6 {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "Choose no more than six extras.",
        ));
    }
    let comment = clean_optional(&input.comment, 600)?;
    let visit_id: String = row.get("id");
    let workspace_id: String = row.get("workspace_id");
    let mut tx = state.pool.begin().await.map_err(db_error)?;
    sqlx::query("UPDATE visits SET response_status = ?, rating = ?, client_comment = ?, responded_at = ? WHERE id = ?")
        .bind(&input.status).bind(input.rating).bind(comment).bind(Utc::now().to_rfc3339()).bind(&visit_id).execute(&mut *tx).await.map_err(db_error)?;
    sqlx::query("DELETE FROM requested_extras WHERE visit_id = ?")
        .bind(&visit_id)
        .execute(&mut *tx)
        .await
        .map_err(db_error)?;
    for extra_id in input.extra_ids {
        if let Some(extra) = sqlx::query("SELECT name, detail, price_cents FROM extras WHERE id = ? AND workspace_id = ? AND active = 1")
            .bind(extra_id).bind(&workspace_id).fetch_optional(&mut *tx).await.map_err(db_error)? {
            sqlx::query("INSERT INTO requested_extras (id, visit_id, name, detail, price_cents, created_at) VALUES (?, ?, ?, ?, ?, ?)")
                .bind(Uuid::new_v4().to_string()).bind(&visit_id).bind(extra.get::<String,_>("name")).bind(extra.get::<String,_>("detail"))
                .bind(extra.get::<i64,_>("price_cents")).bind(Utc::now().to_rfc3339()).execute(&mut *tx).await.map_err(db_error)?;
        }
    }
    tx.commit().await.map_err(db_error)?;
    Ok(Json(
        serde_json::json!({"saved":true, "next_visit_at": row.get::<String,_>("next_visit_at")}),
    ))
}

async fn export_visit(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> ApiResult<Response> {
    let workspace_id = authenticate(&state.pool, &headers).await?;
    let visit = sqlx::query("SELECT client_name, location_label, next_visit_at FROM visits WHERE id = ? AND workspace_id = ?")
        .bind(&id).bind(workspace_id).fetch_optional(&state.pool).await.map_err(db_error)?
        .ok_or_else(|| problem(StatusCode::NOT_FOUND, "That visit was not found."))?;
    let extras = load_requested_extras(&state.pool, &id).await?;
    let mut csv = "next_visit,client,location,extra,detail,price\n".to_string();
    if extras.is_empty() {
        csv.push_str(&format!(
            "{},{},{},,,\n",
            csv_field(visit.get("next_visit_at")),
            csv_field(visit.get("client_name")),
            csv_field(visit.get("location_label"))
        ));
    } else {
        for extra in extras {
            csv.push_str(&format!(
                "{},{},{},{},{},{:.2}\n",
                csv_field(visit.get("next_visit_at")),
                csv_field(visit.get("client_name")),
                csv_field(visit.get("location_label")),
                csv_field(&extra.name),
                csv_field(&extra.detail),
                extra.price_cents as f64 / 100.0
            ));
        }
    }
    let mut response = Response::new(Body::from(csv));
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/csv; charset=utf-8"),
    );
    response.headers_mut().insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_static("attachment; filename=next-visit.csv"),
    );
    Ok(response)
}

async fn authenticate(pool: &SqlitePool, headers: &HeaderMap) -> ApiResult<String> {
    let token = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(str::to_string)
        .ok_or_else(|| {
            problem(
                StatusCode::UNAUTHORIZED,
                "Open your workspace again to continue.",
            )
        })?;
    let row = sqlx::query("SELECT id, expires_at FROM workspaces WHERE token_hash = ?")
        .bind(hash_token(&token))
        .fetch_optional(pool)
        .await
        .map_err(db_error)?
        .ok_or_else(|| {
            problem(
                StatusCode::UNAUTHORIZED,
                "Your workspace access is not valid.",
            )
        })?;
    if let Some(expiry) = row.get::<Option<String>, _>("expires_at") {
        if chrono::DateTime::parse_from_rfc3339(&expiry)
            .map(|d| d < Utc::now())
            .unwrap_or(true)
        {
            return Err(problem(
                StatusCode::UNAUTHORIZED,
                "This demo expired. Start a fresh demo.",
            ));
        }
    }
    Ok(row.get("id"))
}

async fn load_requested_extras(
    pool: &SqlitePool,
    visit_id: &str,
) -> ApiResult<Vec<RequestedExtra>> {
    Ok(sqlx::query("SELECT name, detail, price_cents FROM requested_extras WHERE visit_id = ? ORDER BY created_at")
        .bind(visit_id).fetch_all(pool).await.map_err(db_error)?.into_iter().map(|r| RequestedExtra {
            name: r.get("name"), detail: r.get("detail"), price_cents: r.get("price_cents")
        }).collect())
}

fn clean(value: &str, max: usize) -> ApiResult<String> {
    let value = value.trim();
    if value.is_empty() || value.chars().count() > max {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            format!("Enter between 1 and {max} characters."),
        ));
    }
    Ok(value.to_string())
}
fn clean_optional(value: &str, max: usize) -> ApiResult<String> {
    let value = value.trim();
    if value.chars().count() > max {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            format!("Keep notes under {max} characters."),
        ));
    }
    Ok(value.to_string())
}
fn random_token() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}
fn hash_token(token: &str) -> String {
    format!("{:x}", Sha256::digest(token.as_bytes()))
}
fn db_error(error: sqlx::Error) -> (StatusCode, Json<ErrorBody>) {
    tracing::error!(%error, "database error");
    problem(
        StatusCode::INTERNAL_SERVER_ERROR,
        "The service could not save that. Try again.",
    )
}
fn csv_field(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}
