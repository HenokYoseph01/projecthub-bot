CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY,
  username TEXT,
  title TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  added_by INTEGER,
  added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at TEXT
);

CREATE TABLE IF NOT EXISTS pending_verifications (
  token TEXT PRIMARY KEY,
  requested_by INTEGER NOT NULL,
  channel_identifier TEXT NOT NULL,
  channel_id INTEGER,
  channel_username TEXT,
  channel_title TEXT,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posted_messages (
  channel_id INTEGER NOT NULL,
  message_id INTEGER NOT NULL,
  posted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (channel_id, message_id)
);

CREATE TABLE IF NOT EXISTS subscribers (
  user_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  subscribed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_notified_at TEXT
);
