CREATE TABLE IF NOT EXISTS subscribers (
  user_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  subscribed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_notified_at TEXT
);
