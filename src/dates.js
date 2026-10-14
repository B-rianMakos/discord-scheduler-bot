const chrono = require('chrono-node');

function parseDateTime(text) {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const results = chrono.parse(trimmed, new Date(), { forwardDate: true });
  if (!results.length) return null;
  return results[0].start.date();
}

function parseDueDate(text) {
  const date = parseDateTime(text);
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

module.exports = { parseDateTime, parseDueDate };
