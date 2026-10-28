export const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected', 'Accepted', 'Declined'];
export const FINAL_STATUSES = ['Rejected', 'Accepted', 'Declined'];
export const ACTIVE_STATUSES = ['Applied', 'Interview', 'Offer'];

export const TRANSITIONS = {
  Applied: ['Interview', 'Rejected'],
  Interview: ['Offer', 'Rejected'],
  Offer: ['Accepted', 'Declined'],
  Rejected: [],
  Accepted: [],
  Declined: []
};

/**
 * Normalizes company name: trims surrounding whitespace, collapses internal whitespace, converts to lowercase.
 */
export function normalizeCompany(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Normalizes job role: trims surrounding whitespace, collapses internal whitespace, converts to lowercase.
 */
export function normalizeRole(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Adds exact calendar days to a given date in UTC.
 */
export function addCalendarDays(date, days = 7) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Checks whether an applied date is strictly in the future.
 * Uses end of current UTC day so submitting today's date is always valid.
 */
export function isFutureDate(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return true;
  const now = new Date();
  const endOfTodayUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23, 59, 59, 999
  ));
  return parsed.getTime() > endOfTodayUTC.getTime();
}

/**
 * Dynamically computes isOverdue and serializes the application document.
 * isOverdue is true ONLY when status === 'Applied' AND current date > followUpDate.
 */
export function serializeApplication(doc) {
  const item = doc?.toObject ? doc.toObject() : { ...doc };
  const now = new Date();
  const followUpTime = item.followUpDate ? new Date(item.followUpDate).getTime() : 0;
  const isOverdue = item.status === 'Applied' && Boolean(followUpTime) && now.getTime() > followUpTime;
  return {
    ...item,
    isOverdue
  };
}
