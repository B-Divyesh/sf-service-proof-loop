CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  is_demo INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE visits (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  location_label TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  next_visit_at TEXT NOT NULL,
  technician TEXT NOT NULL,
  checklist_json TEXT NOT NULL,
  notes TEXT NOT NULL,
  photos_json TEXT NOT NULL,
  proof_token_hash TEXT NOT NULL UNIQUE,
  proof_token_demo TEXT,
  proof_expires_at TEXT NOT NULL,
  response_status TEXT,
  rating INTEGER,
  client_comment TEXT,
  responded_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE extras (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  detail TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE requested_extras (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  detail TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX visits_workspace ON visits(workspace_id, completed_at DESC);
CREATE INDEX extras_workspace ON extras(workspace_id, active);

