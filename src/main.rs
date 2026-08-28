use service_proof_loop::app::{build_app, AppConfig};
use sqlx::sqlite::SqlitePoolOptions;
use std::{env, net::SocketAddr, path::Path};
use tokio::signal;
use tracing::info;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(8080);
    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
        std::fs::create_dir_all("/data").ok();
        "sqlite:///data/service-proof-loop.db?mode=rwc".into()
    });
    let data_dir = if Path::new("/data").is_dir() {
        "/data"
    } else {
        "."
    };
    info!(database = %database_url, data_dir, "configuration loaded; no external secrets required");

    let pool = SqlitePoolOptions::new()
        .max_connections(8)
        .connect(&database_url)
        .await
        .expect("open database");
    sqlx::migrate!().run(&pool).await.expect("run migrations");
    let app = build_app(pool, AppConfig::default());
    let address = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(address)
        .await
        .expect("bind port");
    info!(%address, "service started");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown())
        .await
        .expect("serve");
}

async fn shutdown() {
    let ctrl_c = async { signal::ctrl_c().await.expect("install ctrl-c handler") };
    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("install signal handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
}
