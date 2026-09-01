CREATE TABLE license_bindings (
  license_hash TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  bound_at TEXT NOT NULL
);

CREATE INDEX license_bindings_workspace ON license_bindings(workspace_id);
