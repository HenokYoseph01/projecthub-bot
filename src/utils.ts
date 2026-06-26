import type { TelegramChat, TelegramMessage } from "./types";

const PROJECT_TAG = /(^|[^\p{L}\p{N}_])#project\b/iu;

export function hasProjectTag(value: string | undefined): boolean {
  return Boolean(value && PROJECT_TAG.test(value));
}

export function messageText(message: TelegramMessage): string | undefined {
  return message.text ?? message.caption;
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

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers
    }
  });
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  return `VERIFY-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
