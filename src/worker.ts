import {
  createPendingVerification,
  addSubscriber,
  deleteExpiredPendingVerifications,
  deletePendingVerification,
  getPendingVerification,
  getVerifiedChannel,
  listChannels,
  listSubscribers,
  markMessagePosted,
  markSubscriberNotified,
  messageAlreadyPosted,
  removeSubscriber,
  removeChannelByIdentifier,
  upsertChannel
} from "./db";
import { TelegramApi } from "./telegram";
import type { Env, TelegramMessage, TelegramUpdate } from "./types";
import {
  formatRepost,
  hasProjectTag,
  json,
  messageText,
  normalizeIdentifier,
  randomToken
} from "./utils";

const FIVE_MINUTES = 5 * 60 * 1000;
const TOKEN_PATTERN = /\bVERIFY-[A-Z0-9]{6}\b/i;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const telegram = new TelegramApi(env.BOT_TOKEN);

    if (request.method === "GET" && url.pathname === "/") {
      return json({ ok: true, service: "telehub" });
    }

    if (request.method === "POST" && url.pathname === "/setup-webhook") {
      if (!validSetupSecret(request, env)) return new Response("Unauthorized", { status: 401 });
      const webhookUrl = `${url.origin}/webhook`;
      await telegram.setWebhook(webhookUrl, env.WEBHOOK_SECRET);
      return json({ ok: true, webhookUrl });
    }

    if (request.method !== "POST" || url.pathname !== "/webhook") {
      return new Response("Not found", { status: 404 });
    }

    if (request.headers.get("x-telegram-bot-api-secret-token") !== env.WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const update = await request.json<TelegramUpdate>();
    ctx.waitUntil(handleUpdate(update, env, telegram));
    return json({ ok: true });
  }
};

async function handleUpdate(update: TelegramUpdate, env: Env, telegram: TelegramApi): Promise<void> {
  if (update.message) {
    await handlePrivateMessage(update.message, env, telegram);
  }

  if (update.channel_post) {
    await handleChannelPost(update.channel_post, env, telegram);
  }
}

async function handlePrivateMessage(message: TelegramMessage, env: Env, telegram: TelegramApi): Promise<void> {
  if (message.chat.type !== "private" || !message.text || !message.from) return;

  const [command, arg] = message.text.trim().split(/\s+/, 2);

  if (command === "/start") {
    await telegram.sendMessage(message.chat.id, [
      "TeleHub is running.",
      "",
      "Use /register @yourchannel to connect a channel.",
      "Use /unregister @yourchannel to remove it.",
      "Use /subscribe to get project notifications here.",
      "Use /unsubscribe to stop notifications.",
      "Use /status to see registered channels and subscribers."
    ].join("\n"));
    return;
  }

  if (command === "/subscribe") {
    await subscribeUser(message, env, telegram);
    return;
  }

  if (command === "/unsubscribe") {
    await unsubscribeUser(message, env, telegram);
    return;
  }

  if (command === "/register") {
    await registerChannel(message, arg, env, telegram);
    return;
  }

  if (command === "/unregister") {
    await unregisterChannel(message, arg, env, telegram);
    return;
  }

  if (command === "/status") {
    await sendStatus(message, env, telegram);
  }
}

async function registerChannel(
  message: TelegramMessage,
  channelIdentifier: string | undefined,
  env: Env,
  telegram: TelegramApi
): Promise<void> {
  const user = message.from;
  if (!user) return;

  if (!channelIdentifier) {
    await telegram.sendMessage(message.chat.id, "Usage: /register @yourchannel");
    return;
  }

  const chatInfo = await telegram.getChat(channelIdentifier);
  if (chatInfo && chatInfo.type !== "channel") {
    await telegram.sendMessage(message.chat.id, "That chat is not a Telegram channel. Please provide a channel username or ID.");
    return;
  }

  if (chatInfo) {
    const admins = await telegram.getChatAdministrators(chatInfo.id);
    const isCreator = admins.some((admin) => admin.status === "creator" && admin.user.id === user.id);

    if (isCreator) {
      await upsertChannel(env.DB, {
        id: chatInfo.id,
        username: chatInfo.username,
        title: chatInfo.title,
        addedBy: user.id,
        verified: true
      });
      await telegram.sendMessage(message.chat.id, `Verified ${chatInfo.username ? `@${chatInfo.username}` : chatInfo.title}.`);
      return;
    }
  }

  const token = randomToken();
  await createPendingVerification(env.DB, {
    token,
    requestedBy: user.id,
    channelIdentifier,
    channelId: chatInfo?.id,
    channelUsername: chatInfo?.username,
    channelTitle: chatInfo?.title,
    expiresAt: Date.now() + FIVE_MINUTES
  });

  await telegram.sendMessage(message.chat.id, [
    `Post this code in ${channelIdentifier} within 5 minutes:`,
    "",
    token,
    "",
    "The bot must be an admin in that channel so it can see and delete the verification message."
  ].join("\n"));
}

async function unregisterChannel(
  message: TelegramMessage,
  identifier: string | undefined,
  env: Env,
  telegram: TelegramApi
): Promise<void> {
  if (!message.from) return;

  if (!identifier) {
    await telegram.sendMessage(message.chat.id, "Usage: /unregister @yourchannel");
    return;
  }

  const changes = await removeChannelByIdentifier(env.DB, identifier, message.from.id);
  await telegram.sendMessage(
    message.chat.id,
    changes > 0 ? `Unregistered ${identifier}.` : `No channel registered by you matched ${identifier}.`
  );
}

async function sendStatus(message: TelegramMessage, env: Env, telegram: TelegramApi): Promise<void> {
  const channels = await listChannels(env.DB);
  const subscribers = await listSubscribers(env.DB);
  const channelLines = channels.length === 0
    ? ["No channels registered yet."]
    : channels.map((channel) => {
      const name = channel.username ? `@${channel.username}` : channel.title ?? String(channel.id);
      return `${channel.verified ? "verified" : "pending"} - ${name} (${channel.id})`;
    });

  await telegram.sendMessage(
    message.chat.id,
    [
      "Channels:",
      ...channelLines,
      "",
      `Subscribers: ${subscribers.length}`
    ].join("\n")
  );
}

async function subscribeUser(message: TelegramMessage, env: Env, telegram: TelegramApi): Promise<void> {
  if (!message.from) return;
  await addSubscriber(env.DB, message.from);
  await telegram.sendMessage(message.chat.id, "Subscribed. I will DM you when a verified channel posts a new #project.");
}

async function unsubscribeUser(message: TelegramMessage, env: Env, telegram: TelegramApi): Promise<void> {
  if (!message.from) return;
  const changes = await removeSubscriber(env.DB, message.from.id);
  await telegram.sendMessage(message.chat.id, changes > 0 ? "Unsubscribed." : "You were not subscribed.");
}

async function handleChannelPost(message: TelegramMessage, env: Env, telegram: TelegramApi): Promise<void> {
  if (message.chat.type !== "channel") return;

  await maybeVerifyToken(message, env, telegram);

  const text = messageText(message);
  if (!text || !hasProjectTag(text)) return;
  if (!await getVerifiedChannel(env.DB, message.chat.id)) return;
  if (await messageAlreadyPosted(env.DB, message.chat.id, message.message_id)) return;

  await notifySubscribers(message, text, env, telegram);

  await markMessagePosted(env.DB, message.chat.id, message.message_id);
}

async function notifySubscribers(
  message: TelegramMessage,
  text: string,
  env: Env,
  telegram: TelegramApi
): Promise<void> {
  const subscribers = await listSubscribers(env.DB);
  const formatted = formatRepost(message.text ?? text, message.chat);

  for (const subscriber of subscribers) {
    try {
      if (message.text) {
        await telegram.sendMessage(subscriber.user_id, formatted, {
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true }
        });
      } else {
        await telegram.copyMessage(subscriber.user_id, message.chat.id, message.message_id, {
          caption: formatted,
          parse_mode: "HTML"
        });
      }

      await markSubscriberNotified(env.DB, subscriber.user_id);
    } catch (error) {
      console.warn(`Could not notify subscriber ${subscriber.user_id}`, error);
    }
  }
}

async function maybeVerifyToken(message: TelegramMessage, env: Env, telegram: TelegramApi): Promise<void> {
  await deleteExpiredPendingVerifications(env.DB);

  const token = messageText(message)?.match(TOKEN_PATTERN)?.[0]?.toUpperCase();
  if (!token) return;

  const pending = await getPendingVerification(env.DB, token);
  if (!pending || pending.expires_at < Date.now()) {
    if (pending) await deletePendingVerification(env.DB, token);
    return;
  }

  const chatUsername = message.chat.username ? normalizeIdentifier(message.chat.username) : null;
  const expected = normalizeIdentifier(pending.channel_identifier);
  const matchesExpectedChannel =
    expected === String(message.chat.id) ||
    (chatUsername !== null && expected === chatUsername) ||
    (pending.channel_id !== null && pending.channel_id === message.chat.id);

  if (!matchesExpectedChannel) return;

  await upsertChannel(env.DB, {
    id: message.chat.id,
    username: message.chat.username ?? pending.channel_username,
    title: message.chat.title ?? pending.channel_title,
    addedBy: pending.requested_by,
    verified: true
  });
  await deletePendingVerification(env.DB, token);

  try {
    await telegram.deleteMessage(message.chat.id, message.message_id);
  } catch (error) {
    console.warn("Could not delete verification token message", error);
  }

  await telegram.sendMessage(
    pending.requested_by,
    `Verified ${message.chat.username ? `@${message.chat.username}` : message.chat.title}. #project posts will now be sent to bot subscribers.`
  );
}

function validSetupSecret(request: Request, env: Env): boolean {
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(provided && provided === env.WEBHOOK_SECRET);
}
