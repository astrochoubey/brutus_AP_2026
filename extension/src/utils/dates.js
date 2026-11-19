// Future responsibility:
// Date formatting, duration parsing, and timestamp utilities.

export function formatIsoTimestamp(date = new Date()) {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) throw new TypeError('Invalid date value provided');
  return parsed.toISOString();
}

export function calculateDaysBetween(startDate, endDate = new Date()) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return parseFloat((Math.abs(end - start) / (1000 * 60 * 60 * 24)).toFixed(2));
}

export function isSnapshotWithinWindow(timestamp, windowDays = 30) {
  const elapsed = calculateDaysBetween(timestamp, new Date());
  return elapsed !== null && elapsed <= windowDays;
}
