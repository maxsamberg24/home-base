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

// Converts a wall-clock instant in Eastern time into the actual UTC instant
// it represents. ET is either UTC-4 (EDT) or UTC-5 (EST); rather than a full
// tz database, try both candidate offsets and keep whichever one, when
// formatted back through Intl in America/New_York, reproduces the requested
// wall time — there are only ever two possibilities.
function etWallTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, second = 0): Date {
  for (const offsetHours of [4, 5]) {
    const candidate = new Date(Date.UTC(year, month - 1, day, hour + offsetHours, minute, second));
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: ET_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(candidate);
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    if (
      Number(map.year) === year &&
      Number(map.month) === month &&
      Number(map.day) === day &&
      Number(map.hour) % 24 === hour &&
      Number(map.minute) === minute
    ) {
      return candidate;
    }
  }
  return new Date(Date.UTC(year, month - 1, day, hour + 5, minute, second));
}

// NFL weeks run Tuesday-through-Monday. Given a week's games, finds the
// Tuesday (in ET) on/before the week's first kickoff — the natural anchor
// for "due before the week's slate starts" deadlines.
function nflWeekStartTuesday(events: { date: string }[]): { year: number; month: number; day: number } | null {
  if (events.length === 0) return null;
  const first = events.reduce((min, e) => (+new Date(e.date) < +new Date(min.date) ? e : min));
  const { year, month, day } = etDateParts(new Date(first.date));
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0=Sun..6=Sat
  const daysBack = (dow - 2 + 7) % 7;
  const tuesdayUtc = new Date(Date.UTC(year, month - 1, day - daysBack));
  return { year: tuesdayUtc.getUTCFullYear(), month: tuesdayUtc.getUTCMonth() + 1, day: tuesdayUtc.getUTCDate() };
}

// A deadline expressed as N days after that week's starting Tuesday, at a
// specific ET wall-clock time — e.g. weekDeadline(events, 0, 23, 59, 59) is
// "Tuesday night", weekDeadline(events, 5, 13, 0) is "Sunday at 1pm ET".
export function weekDeadline(
  events: { date: string }[],
  dayOffsetFromTuesday: number,
  hour: number,
  minute: number,
  second = 0
): Date | null {
  const tue = nflWeekStartTuesday(events);
  if (!tue) return null;
  const d = new Date(Date.UTC(tue.year, tue.month - 1, tue.day + dayOffsetFromTuesday));
  return etWallTimeToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hour, minute, second);
}

// Wraps the impure "now" check in its own function — calling Date.now()
// directly inside a Server Component body trips the react-hooks/purity lint
// rule, but hiding it behind a plain helper (same pattern as etDateKey(new
// Date()) elsewhere in this file) satisfies it.
export function isPast(d: Date | null): boolean {
  return !!d && Date.now() > d.getTime();
}

export function formatDeadline(d: Date): string {
  return (
    d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", timeZone: ET_TZ }) +
    " at " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: ET_TZ }) +
    " ET"
  );
}
