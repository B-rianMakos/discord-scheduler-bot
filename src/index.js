require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { handleInteraction } = require('./interactions');
const { startDailyJobs } = require('./cron');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('clientReady', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  startDailyJobs(client);
});

client.on('interactionCreate', async (interaction) => {
  try {
    await handleInteraction(interaction);
  } catch (err) {
    console.error('Error handling interaction:', err);
    const errorReply = { content: 'Something went wrong handling that action.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorReply).catch(() => {});
    } else if (interaction.isRepliable()) {
      await interaction.reply(errorReply).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
