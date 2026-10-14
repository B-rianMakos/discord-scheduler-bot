# Discord Scheduler Bot

A Discord bot that keeps a shared schedule of **events**, **to-do tasks**, and **quick reminders** for your server. Add items with slash commands, or just chat in a watch channel. Every morning at 5:00 AM the bot reads new messages, picks out dates, todos, and "remember to…" notes, and posts the day's top 3 tasks.

## Features

- **Important dates & events**: upcoming events, grouped by month.
- **To-do tasks**: grouped by priority (1 = most important). Tasks due today or overdue go to the top.
- **Quick reminders**: short notes that don't have a date.
- **Reads your chat**: understands plain language like "Team meeting Friday 3pm" or "remember to send the invoice", using [chrono-node](https://github.com/wanasit/chrono).
- **Morning summary**: every day at 5:00 AM it scans the watch channel and posts a "Top 3 for today" message (optionally pinging @everyone).
- **Private confirmations**: adding items doesn't fill the channel. The full schedule only appears when someone runs `/schedule show`.

## Commands

| Command | What it does |
| --- | --- |
| `/schedule show` | Post the full schedule with the banner image |
| `/schedule channel <channel>` | Choose the channel the bot reads for new items |
| `/schedule refresh` | Scan the watch channel now (same as the 5 AM job) |
| `/event add <description> <when>` | Add an event, e.g. `when: next Friday 3pm` |
| `/task add <description> [priority] [due]` | Add a task with priority 1–5 (default 3) and an optional due date |
| `/task priority <task> <priority>` | Change a task's priority |
| `/task done <task>` | Mark a task complete |
| `/reminder add <text>` | Add a quick reminder |

## Setup

1. Create an application and bot in the [Discord Developer Portal](https://discord.com/developers/applications), and turn on the **Message Content** intent.
2. Invite the bot to your server with the `bot` and `applications.commands` scopes.
3. Install dependencies:
   ```sh
   npm install
   ```
4. Copy `.env.example` to `.env` and fill it in:
   | Variable | Description |
   | --- | --- |
   | `DISCORD_TOKEN` | Your bot token |
   | `CLIENT_ID` | Your application's client ID |
   | `SCHEDULE_CHANNEL_ID` | (Optional) Default watch channel. Can also be set with `/schedule channel` |
   | `CRON_TIMEZONE` | Timezone for the 5 AM job, e.g. `America/New_York` |
   | `NOTIFY_EVERYONE` | `true` to @everyone in the morning summary, `false` to skip the mention |
5. Register the slash commands (needed once, and again whenever the commands change):
   ```sh
   npm run deploy
   ```
6. Start the bot:
   ```sh
   npm start
   ```

The schedule is saved to the `data/` folder, which git ignores. To change the banner, replace `assets/banner.jpeg`.

## Hosting

The repo includes a `discloud.config` for hosting on [Discloud](https://discloud.com/).
