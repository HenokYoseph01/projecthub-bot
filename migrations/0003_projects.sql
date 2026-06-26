CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL,
  channel_username TEXT,
  channel_title TEXT,
  message_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  posted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(channel_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_projects_posted_at ON projects(posted_at DESC);
