import type { TelegramChat, TelegramMessage } from "./types";

const PROJECT_TAG = /(^|[^\p{L}\p{N}_])#projects?\b/u;

export function hasProjectTag(value: string | undefined): boolean {
  return Boolean(value && PROJECT_TAG.test(value.toLocaleLowerCase()));
}

export function messageText(message: TelegramMessage): string | undefined {
  return message.text ?? message.caption;
}

export function isForwardedMessage(message: TelegramMessage): boolean {
  return Boolean(
    message.forward_origin ||
    message.forward_date ||
    message.forward_from ||
    message.forward_from_chat ||
    message.forward_sender_name ||
    message.is_automatic_forward
  );
}

export function normalizeIdentifier(identifier: string): string {
  return identifier.trim().replace(/^@/, "").toLowerCase();
}

export function parseChatId(value: string): number | string {
  return /^-?\d+$/.test(value) ? Number(value) : value;
}

export function formatChannelName(chat: TelegramChat): string {
  if (chat.username) return `@${chat.username}`;
  return chat.title ?? String(chat.id);
}

export function formatRepost(text: string, chat: TelegramChat): string {
  const channel = escapeHtml(formatChannelName(chat));
  const body = escapeHtml(text);
  return `<b>${channel}</b>\n\n${body}`;
}

export function formatProjectArchive(project: {
  channel_username: string | null;
  channel_title: string | null;
  content: string;
  source_url: string | null;
  posted_at: string;
}): string {
  const channel = escapeHtml(project.channel_username ? `@${project.channel_username}` : project.channel_title ?? "Unknown channel");
  const body = escapeHtml(project.content);
  const source = project.source_url ? `\n\n<a href="${escapeHtml(project.source_url)}">Open original post</a>` : "";
  return `<b>${channel}</b>\n${formatDate(project.posted_at)}\n\n${body}${source}`;
}

export function sourceUrl(chat: TelegramChat, messageId: number): string | null {
  if (chat.username) return `https://t.me/${chat.username}/${messageId}`;
  const internalId = String(chat.id).replace(/^-100/, "");
  return internalId ? `https://t.me/c/${internalId}/${messageId}` : null;
}

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers
    }
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}
