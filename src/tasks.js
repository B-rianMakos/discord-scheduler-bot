function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Lower sort value = more important. Due today or overdue beats manual priority 1. */
function effectivePriority(task, now = new Date()) {
  if (task.done) return Number.POSITIVE_INFINITY;
  const today = startOfDay(now);
  if (task.dueDate) {
    const due = startOfDay(task.dueDate);
    if (due <= today) return -1;
  }
  const p = Number(task.priority);
  if (p >= 1 && p <= 5) return p;
  return 3;
}

function compareTasks(a, b, now = new Date()) {
  const pa = effectivePriority(a, now);
  const pb = effectivePriority(b, now);
  if (pa !== pb) return pa - pb;
  if (a.dueDate && b.dueDate) {
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  }
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return a.id - b.id;
}

function activeTasks(guild) {
  return guild.tasks.filter((t) => !t.done).sort((a, b) => compareTasks(a, b));
}

function topTasksForPing(guild, limit = 3) {
  return activeTasks(guild).slice(0, limit);
}

function formatDueTag(task, now = new Date()) {
  if (!task.dueDate) return '';
  const today = startOfDay(now);
  const due = startOfDay(task.dueDate);
  if (due <= today) return ' **DUE TODAY**';
  return ` (due ${new Date(task.dueDate).toLocaleDateString()})`;
}

module.exports = {
  effectivePriority,
  activeTasks,
  topTasksForPing,
  formatDueTag,
};
