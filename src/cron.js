const cron = require('node-cron');
const store = require('./store');
const { scanAllGuilds, resolveChannelId } = require('./scan');
const { buildScheduleEmbed, buildMorningPingContent } = require('./scheduleView');

function startDailyJobs(client) {
  const tz = process.env.CRON_TIMEZONE || 'America/New_York';
  const mentionEveryone = process.env.NOTIFY_EVERYONE !== 'false';

  cron.schedule(
    '0 5 * * *',
    async () => {
      console.log(`[cron] 5:00 AM scan (${tz})`);
      try {
        await scanAllGuilds(client);

        for (const [guildId, discordGuild] of client.guilds.cache) {
          const guildState = store.getGuild(guildId);
          const channelId = resolveChannelId(guildState);
          if (!channelId) continue;

          let channel;
          try {
            channel = await client.channels.fetch(channelId);
          } catch {
            continue;
          }
          if (!channel?.isTextBased()) continue;

          const mention = `<#${channelId}>`;
          const embed = buildScheduleEmbed(guildState, mention);
          await channel.send({ embeds: [embed] });

          const ping = buildMorningPingContent(guildState, { mentionEveryone });
          await channel.send({
            content: ping,
            allowedMentions: mentionEveryone ? { parse: ['everyone'] } : {},
          });
        }
      } catch (err) {
        console.error('[cron] daily job failed:', err);
      }
    },
    { timezone: tz }
  );

  console.log(`Daily scheduler registered for 5:00 AM (${tz})`);
}

module.exports = { startDailyJobs };
