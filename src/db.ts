import type { RegisteredChannel, Subscriber, TelegramUser } from "./types";
import { normalizeIdentifier } from "./utils";

export async function upsertChannel(db: D1Database, input: {
  id: number;
  username?: string | null;
  title?: string | null;
  addedBy?: number | null;
  verified: boolean;
}): Promise<void> {
  await db.prepare(`
    INSERT INTO channels (id, username, title, added_by, verified, verified_at)
    VALUES (?1, ?2, ?3, ?4, ?5, CASE WHEN ?5 = 1 THEN CURRENT_TIMESTAMP ELSE NULL END)
    ON CONFLICT(id) DO UPDATE SET
      username = excluded.username,
      title = excluded.title,
      added_by = COALESCE(excluded.added_by, channels.added_by),
      verified = excluded.verified,
      verified_at = CASE WHEN excluded.verified = 1 THEN CURRENT_TIMESTAMP ELSE channels.verified_at END
  `).bind(
    input.id,
    input.username ?? null,
    input.title ?? null,
    input.addedBy ?? null,
    input.verified ? 1 : 0
  ).run();
}

export async function removeChannelByIdentifier(db: D1Database, identifier: string, addedBy: number): Promise<number> {
  const normalized = normalizeIdentifier(identifier);
  const result = await db.prepare(`
    DELETE FROM channels
    WHERE added_by = ?1
      AND (CAST(id AS TEXT) = ?2 OR lower(username) = ?2)
  `).bind(addedBy, normalized).run();
  return result.meta.changes ?? 0;
}

export async function getVerifiedChannel(db: D1Database, channelId: number): Promise<RegisteredChannel | null> {
  return db.prepare("SELECT * FROM channels WHERE id = ?1 AND verified = 1")
    .bind(channelId)
    .first<RegisteredChannel>();
}

export async function listChannels(db: D1Database): Promise<RegisteredChannel[]> {
  const result = await db.prepare("SELECT * FROM channels ORDER BY added_at DESC").all<RegisteredChannel>();
  return result.results ?? [];
}

export async function messageAlreadyPosted(db: D1Database, channelId: number, messageId: number): Promise<boolean> {
  const row = await db.prepare(`
    SELECT 1 FROM posted_messages WHERE channel_id = ?1 AND message_id = ?2
  `).bind(channelId, messageId).first();
  return Boolean(row);
}

export async function markMessagePosted(db: D1Database, channelId: number, messageId: number): Promise<void> {
  await db.prepare(`
    INSERT OR IGNORE INTO posted_messages (channel_id, message_id) VALUES (?1, ?2)
  `).bind(channelId, messageId).run();
}

export async function addSubscriber(db: D1Database, user: TelegramUser): Promise<void> {
  await db.prepare(`
    INSERT INTO subscribers (user_id, username, first_name)
    VALUES (?1, ?2, ?3)
    ON CONFLICT(user_id) DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name
  `).bind(user.id, user.username ?? null, user.first_name ?? null).run();
}

export async function removeSubscriber(db: D1Database, userId: number): Promise<number> {
  const result = await db.prepare("DELETE FROM subscribers WHERE user_id = ?1").bind(userId).run();
  return result.meta.changes ?? 0;
}

export async function listSubscribers(db: D1Database): Promise<Subscriber[]> {
  const result = await db.prepare("SELECT * FROM subscribers ORDER BY subscribed_at ASC").all<Subscriber>();
  return result.results ?? [];
}

export async function markSubscriberNotified(db: D1Database, userId: number): Promise<void> {
  await db.prepare("UPDATE subscribers SET last_notified_at = CURRENT_TIMESTAMP WHERE user_id = ?1")
    .bind(userId)
    .run();
}
