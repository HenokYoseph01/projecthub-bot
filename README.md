# TeleHub

Telegram bot that watches verified source channels for posts containing `#project` and sends those posts directly to users who subscribed to the bot.

This version is built for Cloudflare Workers + D1. Telegram sends updates to `/webhook`; no always-running server and no separate hub channel are needed.

## How It Works

Channel owners:

1. Add the bot as an admin to their source channel.
2. DM the bot `/register @theirchannel`.
3. Complete the verification token flow.

Normal users:

1. Start the bot in Telegram.
2. Send `/subscribe`.
3. Receive a DM whenever a verified source channel posts a new `#project`.

Telegram only lets a bot DM users who have started or messaged it first, so users must opt in before notifications can work.

## What You Need To Provide

- `BOT_TOKEN`: your Telegram bot token. Keep this as a Cloudflare Worker secret.
- `WEBHOOK_SECRET`: any long random string. Telegram sends it back in a header so random internet requests cannot trigger the bot.
- A Cloudflare D1 database ID, created with Wrangler.

## Local Files

`.env` can stay as your private local note, but Cloudflare deploys do not read it.

For local Wrangler development, create `.dev.vars` from `.dev.vars.example`:

```bash
cp .dev.vars.example .dev.vars
```

Then fill in the real values.

## Cloudflare Setup

Log in:

```bash
npx wrangler login
```

Create the D1 database:

```bash
npm run db:create
```

Copy the `database_id` printed by Wrangler into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "telehub"
database_id = "your-real-d1-database-id"
```

Set `WEBHOOK_SECRET` in `wrangler.toml`.

Store the bot token as a Worker secret:

```bash
npx wrangler secret put BOT_TOKEN
```

Apply the database migrations:

```bash
npm run db:migrate:remote
```

Deploy:

```bash
npm run deploy
```

After deploy, register the Telegram webhook. Replace the URL with your deployed Worker URL and use your `WEBHOOK_SECRET`:

```bash
curl -X POST https://telehub.YOUR_SUBDOMAIN.workers.dev/setup-webhook \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET"
```

The response should include:

```json
{"ok":true,"webhookUrl":"https://telehub.YOUR_SUBDOMAIN.workers.dev/webhook"}
```

## Local Development

Apply migrations locally:

```bash
npm run db:migrate:local
```

Run the Worker locally:

```bash
npm run dev
```

For true Telegram webhook testing, deploy to Cloudflare first. Telegram needs a public HTTPS endpoint.

## Bot Commands

- `/start` opens the onboarding guide and shows the action menu.
- `/help` shows the onboarding guide again.
- `/subscribe` opts the user into project notifications.
- `/unsubscribe` stops project notifications.
- `/register @yourchannel` starts source-channel verification.
- `/unregister @yourchannel` removes a source channel you registered.
- `/status` lists registered channels and subscriber count.

The `/setup-webhook` endpoint also registers the persistent Telegram command menu, so users can tap commands from the bot UI instead of memorizing them.

## Channel Verification

`/register` first tries to verify that the requesting user is the channel creator via Telegram admin data. If that is not conclusive, the bot creates a `VERIFY-XXXXXX` token. Post that token in the channel within 5 minutes. The bot verifies the channel and deletes the token message when it has delete permission.

For source channels, the bot must be an admin so it can receive `channel_post` updates. Give it read access and, optionally, delete-message permission for cleanup.

## Scale Note

The current Worker sends notifications directly inside the webhook job. That is fine for a small early audience. If subscriber count grows into the hundreds or thousands, move notification fanout to Cloudflare Queues so Telegram rate limits and Worker execution time do not become the bottleneck.
