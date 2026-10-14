const path = require('path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { activeTasks, formatDueTag, effectivePriority } = require('./tasks');

const MAX_LINES = 8;

function formatEventLine(e) {
  const when = new Date(e.at);
  const stamp = when.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `• ${e.text} — ${stamp}`;
}

function formatTaskLine(t) {
  const due = formatDueTag(t);
  return `• ${t.text}${due}`;
}

function formatReminderLine(r) {
  return `• ${r.text}`;
}

function sectionLines(items, formatter, emptyText) {
  if (!items.length) return emptyText;
  const slice = items.slice(0, MAX_LINES);
  const lines = slice.map(formatter);
  if (items.length > MAX_LINES) {
    lines.push(`_…and ${items.length - MAX_LINES} more_`);
  }
  return lines.join('\n');
}

// Like sectionLines, but puts consecutive items with the same label under a `###` heading.
// Items must already be sorted so that each label's items are adjacent.
function groupedSectionLines(items, formatter, labelFor, emptyText) {
  if (!items.length) return emptyText;
  const groups = [];
  for (const item of items.slice(0, MAX_LINES)) {
    const label = labelFor(item);
    let group = groups[groups.length - 1];
    if (!group || group.label !== label) {
      group = { label, lines: [] };
      groups.push(group);
    }
    group.lines.push(formatter(item));
  }
  const blocks = groups.map((g) => `### ${g.label}\n${g.lines.join('\n')}`);
  if (items.length > MAX_LINES) {
    blocks.push(`_…and ${items.length - MAX_LINES} more_`);
  }
  return blocks.join('\n');
}

function eventMonthLabel(e) {
  return new Date(e.at).toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

function taskPriorityLabel(t) {
  const ep = effectivePriority(t);
  return ep === -1 ? 'Due today' : `Priority ${ep}`;
}

function buildScheduleEmbed(guild, channelMention) {
  const now = new Date();
  const upcomingEvents = [...guild.events]
    .filter((e) => new Date(e.at).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.at) - new Date(b.at));

  const tasks = activeTasks(guild);
  const reminders = [...guild.reminders];

  // Everything goes in the description because Discord only renders `##` headings there,
  // not in embed field names.
  const intro = channelMention
    ? `Watching ${channelMention} — full refresh daily at **5:00 AM**.`
    : 'Set a watch channel with `/schedule channel` so the bot can read chat at 5:00 AM.';

  const sections = [
    [
      '1 · 🗓️ Important dates & events',
      groupedSectionLines(
        upcomingEvents,
        formatEventLine,
        eventMonthLabel,
        '_No upcoming events. Post something like “Team meeting Friday 3pm”._'
      ),
    ],
    [
      '2 · ✅ To-do tasks',
      groupedSectionLines(
        tasks,
        formatTaskLine,
        taskPriorityLabel,
        '_No open tasks. Post todos or use dates for due dates._'
      ),
    ],
    [
      '3 · 📌 Quick reminders',
      sectionLines(reminders, formatReminderLine, '_No reminders. Post “remember to …” style notes._'),
    ],
  ];

  // Discord collapses runs of blank lines, so a zero-width-space line forces extra
  // vertical space between sections.
  const SECTION_GAP = '\n\n​\n';
  const description = [intro, ...sections.map(([title, body]) => `## ${title}\n${body}`)].join(
    SECTION_GAP
  );

  const embed = new EmbedBuilder()
    .setTitle('📅 Scheduler')
    .setColor(0x5865f2)
    // Trailing zero-width-space line adds a gap above the footer (plain trailing newlines get trimmed).
    .setDescription(`${description}\n​`)
    .setFooter({
      text: 'Add: /event add · /task add · /reminder add · Priority: /task priority · Done: /task done',
    });

  return embed;
}

const BANNER_PATH = path.join(__dirname, '..', 'assets', 'banner.jpeg');

// Discord draws an embed's large image at the bottom, so the banner gets its own
// image-only embed placed before the schedule embed.
function buildScheduleMessage(guild, channelMention) {
  const banner = new AttachmentBuilder(BANNER_PATH, { name: 'banner.jpeg' });
  const bannerEmbed = new EmbedBuilder().setColor(0x5865f2).setImage('attachment://banner.jpeg');
  return {
    embeds: [bannerEmbed, buildScheduleEmbed(guild, channelMention)],
    files: [banner],
  };
}

function buildMorningPingContent(guild, { mentionEveryone = true } = {}) {
  const mention = mentionEveryone ? '@everyone ' : '';
  const top = activeTasks(guild).slice(0, 3);
  if (!top.length) {
    return `${mention}Good morning — no open tasks today.`;
  }

  const formatted = top.map((t, i) => `${i + 1}. ${t.text}${formatDueTag(t)}`);

  return `${mention}**Top 3 for today**\n${formatted.join('\n')}`;
}

module.exports = { buildScheduleEmbed, buildScheduleMessage, buildMorningPingContent };
