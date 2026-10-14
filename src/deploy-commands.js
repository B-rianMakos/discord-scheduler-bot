require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('View and configure your scheduler lists')
    .addSubcommand((sub) =>
      sub.setName('show').setDescription('Show events, tasks, and reminders')
    )
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set which channel the bot reads at 5:00 AM')
        .addChannelOption((opt) =>
          opt.setName('target').setDescription('Scheduling channel').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('refresh').setDescription('Run the chat scan now (same as the 5 AM job)')
    ),
  new SlashCommandBuilder()
    .setName('event')
    .setDescription('Important dates and events')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add an event manually')
        .addStringOption((opt) =>
          opt.setName('description').setDescription('What is happening').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('when')
            .setDescription('Date and time (e.g. April 12 3pm, next Friday 9:00 AM)')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Delete an event')
        .addIntegerOption((opt) =>
          opt.setName('event').setDescription('Pick an event').setRequired(true).setAutocomplete(true)
        )
    ),
  new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Quick reminders')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a reminder manually')
        .addStringOption((opt) =>
          opt.setName('text').setDescription('What to remember').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Delete a reminder')
        .addIntegerOption((opt) =>
          opt.setName('reminder').setDescription('Pick a reminder').setRequired(true).setAutocomplete(true)
        )
    ),
  new SlashCommandBuilder()
    .setName('task')
    .setDescription('Manage to-do tasks')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a task manually')
        .addStringOption((opt) =>
          opt.setName('description').setDescription('What you need to do').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('priority')
            .setDescription('1 = most important, 5 = least (default 3)')
            .setMinValue(1)
            .setMaxValue(5)
        )
        .addStringOption((opt) =>
          opt
            .setName('due')
            .setDescription('Due date (e.g. tomorrow, March 1)')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('priority')
        .setDescription('Set task priority from 1 (highest) to 5 (lowest)')
        .addIntegerOption((opt) =>
          opt.setName('task').setDescription('Pick a task').setRequired(true).setAutocomplete(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('priority')
            .setDescription('1 = most important, 5 = least')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(5)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('done')
        .setDescription('Mark a task complete')
        .addIntegerOption((opt) =>
          opt.setName('task').setDescription('Pick a task').setRequired(true).setAutocomplete(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Delete a task')
        .addIntegerOption((opt) =>
          opt.setName('task').setDescription('Pick a task').setRequired(true).setAutocomplete(true)
        )
    ),
].map((c) => c.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('Slash commands registered successfully.');
  } catch (err) {
    console.error('Failed to register commands:', err);
    process.exitCode = 1;
  }
})();
