use service_proof_loop::app::{build_app, AppConfig};
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};
use std::{env, net::SocketAddr, path::Path, str::FromStr, time::Duration};
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
    let (database_url, database_source) = match env::var("DATABASE_URL") {
        Ok(value) => (value, "supplied"),
        Err(_) => {
            std::fs::create_dir_all("/data").ok();
            (
                "sqlite:///data/service-proof-loop.db?mode=rwc".into(),
                "generated default",
            )
        }
    };
    let data_dir = if Path::new("/data").is_dir() {
        "/data"
    } else {
        "."
    };
    info!(
        database_source,
        data_dir, "configuration loaded; no external secrets required"
    );

    let mut database_options = SqliteConnectOptions::from_str(&database_url)
        .expect("valid SQLite database URL")
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Delete)
        .synchronous(SqliteSynchronous::Full)
        .busy_timeout(Duration::from_secs(30))
        .pragma("temp_store", "MEMORY");
    let sqlite_locking = if database_source == "generated default" {
        database_options = database_options.vfs("unix-none");
        "single-process VFS; deployment drains writers"
    } else {
        "filesystem locks"
    };
    info!(sqlite_locking, "SQLite locking configured");
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(database_options)
        .await
        .expect("open database");
    sqlx::migrate!().run(&pool).await.expect("run migrations");
    let app = build_app(pool, AppConfig::default());
    let address = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(address)
        .await
        .expect("bind port");
    info!(%address, "service started");
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
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
