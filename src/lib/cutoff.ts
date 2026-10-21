// Weekly cutoff rules: Saturday -> Friday, payout the following Wednesday (Friday + 5 days).
const DAY = 86_400_000;

function toUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Accepts a Date or a "YYYY-MM-DD" string and returns the cutoff week containing it. */
export function cutoffWeekFor(input: Date | string) {
  const date = typeof input === "string" ? new Date(`${input}T00:00:00Z`) : toUtcDay(input);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  const daysSinceSaturday = (date.getUTCDay() + 1) % 7; // Sat=0 ... Fri=6
  const periodStart = new Date(date.getTime() - daysSinceSaturday * DAY);
  const periodEnd = new Date(periodStart.getTime() + 6 * DAY);
  const payoutDate = new Date(periodEnd.getTime() + 5 * DAY);
  return { periodStart, periodEnd, payoutDate };
}

/** The cutoff week for "today" in Manila time. */
export function currentCutoffWeek(now = new Date()) {
  const manila = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return cutoffWeekFor(toUtcDay(manila));
}

export function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Today's date in Manila as YYYY-MM-DD. */
export function manilaToday(now = new Date()) {
  return toDateInput(new Date(now.getTime() + 8 * 60 * 60 * 1000));
}
