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

export type PendingVerification = {
  token: string;
  requested_by: number;
  channel_identifier: string;
  channel_id: number | null;
  channel_username: string | null;
  channel_title: string | null;
  expires_at: number;
  created_at: string;
};
