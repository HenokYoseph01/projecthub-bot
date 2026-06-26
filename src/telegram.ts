import type { TelegramAdmin, TelegramChat } from "./types";

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export class TelegramApi {
  private readonly baseUrl: string;

  constructor(token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async sendMessage(chatId: number | string, text: string, options: Record<string, unknown> = {}): Promise<unknown> {
    return this.call("sendMessage", { chat_id: chatId, text, ...options });
  }

  async setMyCommands(commands: Array<{ command: string; description: string }>): Promise<unknown> {
    return this.call("setMyCommands", { commands });
  }

  async setMyDescription(description: string): Promise<unknown> {
    return this.call("setMyDescription", { description });
  }

  async setMyShortDescription(shortDescription: string): Promise<unknown> {
    return this.call("setMyShortDescription", { short_description: shortDescription });
  }

  async getMyDescription(): Promise<unknown> {
    return this.call("getMyDescription", {});
  }

  async getMyShortDescription(): Promise<unknown> {
    return this.call("getMyShortDescription", {});
  }

  async copyMessage(
    chatId: number | string,
    fromChatId: number | string,
    messageId: number,
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    return this.call("copyMessage", {
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_id: messageId,
      ...options
    });
  }

  async deleteMessage(chatId: number | string, messageId: number): Promise<unknown> {
    return this.call("deleteMessage", { chat_id: chatId, message_id: messageId });
  }

  async getChat(chatId: number | string): Promise<TelegramChat | undefined> {
    try {
      return await this.call<TelegramChat>("getChat", { chat_id: chatId });
    } catch {
      return undefined;
    }
  }

  async getChatAdministrators(chatId: number | string): Promise<TelegramAdmin[]> {
    try {
      return await this.call<TelegramAdmin[]>("getChatAdministrators", { chat_id: chatId });
    } catch {
      return [];
    }
  }

  async setWebhook(url: string, secretToken: string): Promise<unknown> {
    return this.call("setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["message", "channel_post"],
      drop_pending_updates: false
    });
  }

  private async call<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json<TelegramResponse<T>>();

    if (!response.ok || !data.ok) {
      throw new Error(`Telegram ${method} failed: ${data.description ?? response.statusText}`);
    }

    return data.result as T;
  }
}
