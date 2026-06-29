export type Env = {
  BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
  DB: D1Database;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
};

export type TelegramChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
};

export type TelegramUser = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
};

export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  caption?: string;
  forward_origin?: unknown;
  forward_date?: number;
  forward_from?: TelegramUser;
  forward_from_chat?: TelegramChat;
  forward_sender_name?: string;
  is_automatic_forward?: boolean;
};

export type TelegramAdmin = {
  status: "creator" | "administrator" | "member" | "restricted" | "left" | "kicked";
  user: TelegramUser;
};

export type RegisteredChannel = {
  id: number;
  username: string | null;
  title: string | null;
  verified: 0 | 1;
  added_by: number | null;
  added_at: string;
  verified_at: string | null;
};

export type Subscriber = {
  user_id: number;
  username: string | null;
  first_name: string | null;
  subscribed_at: string;
  last_notified_at: string | null;
};

export type Project = {
  id: number;
  channel_id: number;
  channel_username: string | null;
  channel_title: string | null;
  message_id: number;
  content: string;
  source_url: string | null;
  posted_at: string;
};
