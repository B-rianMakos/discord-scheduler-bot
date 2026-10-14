const store = require('./store');
const { scanChannelForGuild, resolveChannelId } = require('./scan');
const { buildScheduleMessage } = require('./scheduleView');
const { parseDateTime, parseDueDate } = require('./dates');

// The full schedule is only posted by /schedule show; other commands just confirm privately.
async function replyConfirmation(interaction, content) {
  await interaction.reply({ content, ephemeral: true });
}

// Suggests open tasks by name for the `task` option of /task priority and /task done.
async function handleTaskAutocomplete(interaction) {
  const typed = interaction.options.getFocused().toLowerCase();
  const guild = store.getGuild(interaction.guildId);
  const choices = guild.tasks
    .filter((t) => !t.done && t.text.toLowerCase().includes(typed))
    .slice(0, 25)
    .map((t) => ({ name: `[P${t.priority}] ${t.text}`.slice(0, 100), value: t.id }));
  await interaction.respond(choices);
}

async function handleInteraction(interaction) {
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === 'task') await handleTaskAutocomplete(interaction);
    return;
  }
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'schedule') {
    const sub = interaction.options.getSubcommand();

    if (sub === 'show') {
      const guild = store.getGuild(interaction.guildId);
      const channelId = resolveChannelId(guild);
      const mention = channelId ? `<#${channelId}>` : null;
      await interaction.reply(buildScheduleMessage(guild, mention));
      return;
    }

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('target');
      if (!channel?.isTextBased()) {
        await interaction.reply({ content: 'Pick a text channel.', ephemeral: true });
        return;
      }
      store.setChannelId(interaction.guildId, channel.id);
      await interaction.reply({
        content: `Got it — I'll read new messages in ${channel} during the **5:00 AM** refresh.`,
        ephemeral: true,
      });
      return;
    }

    if (sub === 'refresh') {
      await interaction.deferReply();
      const result = await scanChannelForGuild(interaction.client, interaction.guildId);
      const summary =
        result.skipped === 'no_channel'
          ? 'No watch channel set. Use `/schedule channel`.'
          : `Scanned **${result.scanned}** message(s), added **${result.added}** item(s).`;
      await interaction.editReply({ content: `${summary} Use \`/schedule show\` to see the schedule.` });
      return;
    }
  }

  if (commandName === 'event') {
    const sub = interaction.options.getSubcommand();
    if (sub === 'add') {
      const description = interaction.options.getString('description', true).trim();
      const whenText = interaction.options.getString('when', true).trim();
      const when = parseDateTime(whenText);
      if (!when) {
        await interaction.reply({
          content: 'Could not understand **when**. Try something like `April 12 3pm` or `next Friday 9:00 AM`.',
          ephemeral: true,
        });
        return;
      }
      store.addEventManual(interaction.guildId, description, when.toISOString());
      await replyConfirmation(interaction, `Added event **${description}**.`);
      return;
    }
  }

  if (commandName === 'reminder') {
    const sub = interaction.options.getSubcommand();
    if (sub === 'add') {
      const text = interaction.options.getString('text', true).trim();
      if (!text) {
        await interaction.reply({ content: 'Reminder text cannot be empty.', ephemeral: true });
        return;
      }
      store.addReminderManual(interaction.guildId, text);
      await replyConfirmation(interaction, `Added reminder **${text}**.`);
      return;
    }
  }

  if (commandName === 'task') {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const description = interaction.options.getString('description', true).trim();
      const priority = interaction.options.getInteger('priority') ?? 3;
      const dueText = interaction.options.getString('due');
      let dueDate = null;
      if (dueText?.trim()) {
        dueDate = parseDueDate(dueText);
        if (!dueDate) {
          await interaction.reply({
            content: 'Could not understand **due**. Try `tomorrow`, `March 1`, or `next Monday`.',
            ephemeral: true,
          });
          return;
        }
      }
      store.addTaskManual(interaction.guildId, description, priority, dueDate);
      const dueNote = dueDate ? ` (due ${new Date(dueDate).toLocaleDateString()})` : '';
      await replyConfirmation(
        interaction,
        `Added task **${description}** at priority **${priority}**${dueNote}.`
      );
      return;
    }

    if (sub === 'priority') {
      const taskId = interaction.options.getInteger('task');
      const priority = interaction.options.getInteger('priority');
      const guild = store.getGuild(interaction.guildId);
      const task = guild.tasks.find((t) => t.id === taskId && !t.done);
      if (!task) {
        await interaction.reply({ content: 'That task is no longer open. Pick one from the list.', ephemeral: true });
        return;
      }
      store.setTaskPriority(interaction.guildId, taskId, priority);
      await interaction.reply({
        content: `**${task.text}** is now priority **${priority}** (1 = most important).`,
        ephemeral: true,
      });
      return;
    }

    if (sub === 'done') {
      const taskId = interaction.options.getInteger('task');
      const guild = store.getGuild(interaction.guildId);
      const task = guild.tasks.find((t) => t.id === taskId && !t.done);
      if (!task) {
        await interaction.reply({ content: 'That task is no longer open. Pick one from the list.', ephemeral: true });
        return;
      }
      store.setTaskDone(interaction.guildId, taskId);
      await interaction.reply({ content: `Marked **${task.text}** as done.`, ephemeral: true });
    }
  }
}

module.exports = { handleInteraction };
