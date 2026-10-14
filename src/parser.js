const chrono = require('chrono-node');

function stripParsedDates(text, results) {
  if (!results.length) return text.trim();
  let out = text;
  for (const r of results) {
    out = out.replace(r.text, ' ');
  }
  return out.replace(/\s+/g, ' ').trim() || text.trim();
}

function startOfDayIso(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function hasCertainTime(result) {
  if (!result?.start) return false;
  return result.start.isCertain('hour') || result.start.isCertain('minute');
}

/**
 * Classify a chat line into event, task, or reminder.
 */
function parseChatMessage(content) {
  const trimmed = content.trim();
  if (!trimmed || trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('<@')) return null;

  const lower = trimmed.toLowerCase();
  const results = chrono.parse(trimmed, new Date(), { forwardDate: true });
  const first = results[0];
  const at = first?.start.date();
  const timed = first && hasCertainTime(first);

  const isReminder = /\b(remind(er|ers|ed|ing)?|remember|don't forget|dont forget|note to self)\b/i.test(
    trimmed
  );
  const isTask =
    /\b(todo|to-do|task|need to|must|should|finish|complete|due|deadline)\b/i.test(trimmed) ||
    /\bdue\b/i.test(trimmed);
  const isEvent = /\b(event|meeting|appointment|birthday|anniversary|party|concert|flight|interview)\b/i.test(
    trimmed
  );

  const displayText = stripParsedDates(trimmed, results);

  if (isReminder && !isTask && !isEvent && !timed) {
    return { type: 'reminder', text: displayText };
  }

  if (isEvent || (first && timed && !isReminder)) {
    if (!at) return null;
    return { type: 'event', text: displayText, at: at.toISOString() };
  }

  if (isTask || (first && !timed)) {
    return {
      type: 'task',
      text: displayText,
      priority: 3,
      dueDate: first ? startOfDayIso(at) : null,
    };
  }

  if (first && timed) {
    return { type: 'event', text: displayText, at: at.toISOString() };
  }

  if (first) {
    return {
      type: 'task',
      text: displayText,
      priority: 3,
      dueDate: startOfDayIso(at),
    };
  }

  if (trimmed.length <= 120) {
    return { type: 'reminder', text: displayText };
  }

  return { type: 'task', text: displayText, priority: 3, dueDate: null };
}

module.exports = { parseChatMessage };
