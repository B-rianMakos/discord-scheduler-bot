const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'schedule.json');

function emptyGuild() {
  return {
    nextId: 1,
    channelId: null,
    lastMessageId: null,
    lastScanAt: null,
    events: [],
    tasks: [],
    reminders: [],
  };
}

function loadAll() {
  if (!fs.existsSync(DATA_FILE)) return {};
  const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function saveAll(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getGuild(guildId) {
  const all = loadAll();
  if (!all[guildId]) {
    all[guildId] = emptyGuild();
    saveAll(all);
  }
  return all[guildId];
}

function updateGuild(guildId, mutator) {
  const all = loadAll();
  const guild = all[guildId] || emptyGuild();
  mutator(guild);
  all[guildId] = guild;
  saveAll(all);
  return guild;
}

function nextId(guild) {
  const id = guild.nextId;
  guild.nextId += 1;
  return id;
}

function hasSourceMessage(guild, messageId) {
  const inEvents = guild.events.some((e) => e.sourceMessageId === messageId);
  const inTasks = guild.tasks.some((t) => t.sourceMessageId === messageId);
  const inReminders = guild.reminders.some((r) => r.sourceMessageId === messageId);
  return inEvents || inTasks || inReminders;
}

function pushEvent(guild, { text, at, sourceMessageId }) {
  const id = nextId(guild);
  guild.events.push({
    id,
    text,
    at,
    sourceMessageId: sourceMessageId ?? null,
    createdAt: new Date().toISOString(),
  });
  return id;
}

function pushTask(guild, { text, priority, dueDate, sourceMessageId }) {
  const id = nextId(guild);
  guild.tasks.push({
    id,
    text,
    priority: priority ?? 3,
    dueDate: dueDate ?? null,
    done: false,
    sourceMessageId: sourceMessageId ?? null,
    createdAt: new Date().toISOString(),
  });
  return id;
}

function pushReminder(guild, { text, sourceMessageId }) {
  const id = nextId(guild);
  guild.reminders.push({
    id,
    text,
    sourceMessageId: sourceMessageId ?? null,
    createdAt: new Date().toISOString(),
  });
  return id;
}

function addParsedItem(guildId, item, sourceMessageId) {
  let newId;
  updateGuild(guildId, (guild) => {
    if (hasSourceMessage(guild, sourceMessageId)) return;

    if (item.type === 'event') {
      newId = pushEvent(guild, { text: item.text, at: item.at, sourceMessageId });
    } else if (item.type === 'task') {
      newId = pushTask(guild, {
        text: item.text,
        priority: item.priority,
        dueDate: item.dueDate,
        sourceMessageId,
      });
    } else if (item.type === 'reminder') {
      newId = pushReminder(guild, { text: item.text, sourceMessageId });
    }
  });
  return newId;
}

function addEventManual(guildId, text, atIso) {
  let newId;
  updateGuild(guildId, (guild) => {
    newId = pushEvent(guild, { text, at: atIso, sourceMessageId: null });
  });
  return newId;
}

function addTaskManual(guildId, text, priority, dueDate) {
  let newId;
  updateGuild(guildId, (guild) => {
    newId = pushTask(guild, { text, priority, dueDate, sourceMessageId: null });
  });
  return newId;
}

function addReminderManual(guildId, text) {
  let newId;
  updateGuild(guildId, (guild) => {
    newId = pushReminder(guild, { text, sourceMessageId: null });
  });
  return newId;
}

function setTaskPriority(guildId, taskId, priority) {
  return updateGuild(guildId, (guild) => {
    const task = guild.tasks.find((t) => t.id === taskId && !t.done);
    if (task) task.priority = priority;
  });
}

function setTaskDone(guildId, taskId) {
  return updateGuild(guildId, (guild) => {
    const task = guild.tasks.find((t) => t.id === taskId);
    if (task) task.done = true;
  });
}

// Deletes an item from 'events', 'tasks', or 'reminders'. Returns the removed item, or null.
function removeItem(guildId, list, id) {
  let removed = null;
  updateGuild(guildId, (guild) => {
    const index = guild[list].findIndex((item) => item.id === id);
    if (index !== -1) [removed] = guild[list].splice(index, 1);
  });
  return removed;
}

function setChannelId(guildId, channelId) {
  return updateGuild(guildId, (guild) => {
    guild.channelId = channelId;
  });
}

function setScanCursor(guildId, lastMessageId) {
  return updateGuild(guildId, (guild) => {
    guild.lastMessageId = lastMessageId;
    guild.lastScanAt = new Date().toISOString();
  });
}

function prunePastEvents(guild) {
  const now = Date.now();
  guild.events = guild.events.filter((e) => new Date(e.at).getTime() >= now - 24 * 60 * 60 * 1000);
}

module.exports = {
  getGuild,
  updateGuild,
  addParsedItem,
  addEventManual,
  addTaskManual,
  addReminderManual,
  setTaskPriority,
  setTaskDone,
  removeItem,
  setChannelId,
  setScanCursor,
  prunePastEvents,
  hasSourceMessage,
};
