const store = require('./store');
const { parseChatMessage } = require('./parser');

function resolveChannelId(guildState) {
  return guildState.channelId || process.env.SCHEDULE_CHANNEL_ID || null;
}

async function fetchMessagesSince(channel, lastMessageId) {
  const collected = [];
  if (lastMessageId) {
    let batch = await channel.messages.fetch({ after: lastMessageId, limit: 100 });
    while (batch.size > 0) {
      collected.push(...batch.values());
      if (batch.size < 100) break;
      const newest = batch.first();
      batch = await channel.messages.fetch({ after: newest.id, limit: 100 });
    }
  } else {
    const batch = await channel.messages.fetch({ limit: 100 });
    collected.push(...batch.values());
  }

  return collected
    .filter((m) => !m.author.bot)
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

async function scanChannelForGuild(client, guildId) {
  const guildState = store.getGuild(guildId);
  const channelId = resolveChannelId(guildState);
  if (!channelId) {
    return { scanned: 0, added: 0, skipped: 'no_channel' };
  }

  let channel;
  try {
    channel = await client.channels.fetch(channelId);
  } catch {
    return { scanned: 0, added: 0, skipped: 'channel_fetch_failed' };
  }

  if (!channel?.isTextBased()) {
    return { scanned: 0, added: 0, skipped: 'not_text_channel' };
  }

  const messages = await fetchMessagesSince(channel, guildState.lastMessageId);
  let added = 0;

  for (const message of messages) {
    const parsed = parseChatMessage(message.content);
    if (!parsed) continue;
    const before = store.getGuild(guildId);
    if (store.hasSourceMessage(before, message.id)) continue;
    store.addParsedItem(guildId, parsed, message.id);
    added += 1;
  }

  if (messages.length > 0) {
    const newest = messages[messages.length - 1];
    store.setScanCursor(guildId, newest.id);
  }

  store.updateGuild(guildId, (g) => store.prunePastEvents(g));

  return { scanned: messages.length, added, skipped: null };
}

async function scanAllGuilds(client) {
  const guildIds = client.guilds.cache.map((g) => g.id);
  const results = [];
  for (const guildId of guildIds) {
    results.push({ guildId, ...(await scanChannelForGuild(client, guildId)) });
  }
  return results;
}

module.exports = { scanChannelForGuild, scanAllGuilds, resolveChannelId };
