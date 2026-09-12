// We don't have real per-user location, so every date/time in the app is
// shown in US Eastern time (labeled "ET") rather than the server's own
// timezone (Netlify's build/runtime servers run in UTC, which silently
// shifted both the day and the hour of every game time before this fix).
const ET_TZ = "America/New_York";

// YYYY-MM-DD for a given instant, as a calendar day *in Eastern time* — used
// for "is this the same day" comparisons instead of the server's local date.
export function etDateKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: ET_TZ });
}

// Y/M/D as plain numbers, read in Eastern time — for comparing a calendar
// cell (which has no time component) against "today" without any UTC drift.
export function etDateParts(d: Date): { year: number; month: number; day: number } {
  const [year, month, day] = etDateKey(d).split("-").map(Number);
  return { year, month, day };
}

export function relativeDayLabel(iso: string): string | null {
  const target = new Date(iso);
  const now = new Date();
  const todayKey = etDateKey(now);
  const targetKey = etDateKey(target);
  if (targetKey === todayKey) return "Today";
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (targetKey === etDateKey(tomorrow)) return "Tomorrow";
  return null;
}

export function formatGameDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: ET_TZ,
  });
}

export function formatGameTime(iso: string): string {
  return (
    new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: ET_TZ,
    }) + " ET"
  );
}

export function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}
