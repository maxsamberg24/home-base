import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/identity";
import { getFollowedTeams } from "@/lib/followedTeams";
import { getTeamSchedule, type ScheduleEvent } from "@/lib/espn";
import { getLeague } from "@/lib/leagues";
import { TEAM_FILTER_COOKIE, teamKey, parseFilterCookie } from "@/lib/teamFilter";
import { etDateKey, etDateParts, formatGameTime } from "@/lib/dates";
import TeamLogoBadge from "@/components/TeamLogoBadge";

interface EnrichedGame {
  id: string;
  date: string;
  league: string;
  teamId: string;
  teamAbbr: string;
  teamLogo?: string;
  teamColor?: string;
  opponentAbbr: string;
  opponentLogo?: string;
  homeAway: "home" | "away";
  state: "pre" | "in" | "post";
  selfScore?: string;
  oppScore?: string;
  won?: boolean;
  oppWon?: boolean;
}

function enrich(league: string, teamId: string, teamAbbr: string, teamLogo: string | undefined, teamColor: string | undefined, events: ScheduleEvent[]): EnrichedGame[] {
  const out: EnrichedGame[] = [];
  for (const event of events) {
    const comp = event.competitions[0];
    const self = comp?.competitors.find((c) => c.team.id === teamId);
    const opp = comp?.competitors.find((c) => c.team.id !== teamId);
    if (!self || !opp) continue;
    out.push({
      id: event.id,
      date: event.date,
      league,
      teamId,
      teamAbbr,
      teamLogo,
      teamColor,
      opponentAbbr: opp.team.abbreviation,
      opponentLogo: opp.team.logo,
      homeAway: self.homeAway,
      state: comp.status.type.state,
      selfScore: (self as { score?: { displayValue: string } }).score?.displayValue,
      oppScore: (opp as { score?: { displayValue: string } }).score?.displayValue,
      won: self.winner,
      oppWon: opp.winner,
    });
  }
  return out;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; tab?: string; month?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const sp = await searchParams;
  const view = sp.view === "calendar" ? "calendar" : "list";
  const tab = sp.tab === "results" ? "results" : "upcoming";

  const [followed, filterCookie] = await Promise.all([
    getFollowedTeams(user.id),
    cookies().then((s) => s.get(TEAM_FILTER_COOKIE)?.value),
  ]);
  const allKeys = followed.map((f) => teamKey(f.league, f.teamId));
  const selected = parseFilterCookie(filterCookie, allKeys);
  const visibleTeams = followed.filter((f) => selected.has(teamKey(f.league, f.teamId)));

  const schedules = await Promise.all(
    visibleTeams.map(async (f) => {
      const league = getLeague(f.league);
      const events = await getTeamSchedule(league.sportPath, f.teamId).catch(() => []);
      return enrich(f.league, f.teamId, f.team.abbreviation, f.team.logos?.[0]?.href, f.team.color, events);
    })
  );
  const allGames = schedules.flat();

  if (view === "calendar") {
    const monthParam = sp.month ?? etDateKey(new Date()).slice(0, 7);
    const [y, m] = monthParam.split("-").map(Number);
    const firstOfMonth = new Date(y, m - 1, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const prevMonth = new Date(y, m - 2, 1).toISOString().slice(0, 7);
    const nextMonth = new Date(y, m, 1).toISOString().slice(0, 7);
    const today = etDateParts(new Date());

    const gamesByDay = new Map<number, EnrichedGame[]>();
    for (const g of allGames) {
      const parts = etDateParts(new Date(g.date));
      if (parts.year === y && parts.month === m) {
        const list = gamesByDay.get(parts.day) ?? [];
        list.push(g);
        gamesByDay.set(parts.day, list);
      }
    }

    const cells: (number | null)[] = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

    return (
      <div className="space-y-6">
        <ScheduleHeader view={view} tab={tab} />
        <div className="flex items-center justify-between">
          <Link href={`/schedule?view=calendar&month=${prevMonth}`} className="rounded-full border-[3px] border-ink px-3 py-1 font-bold hover:bg-yellow-soft">
            ←
          </Link>
          <h2 className="font-display text-xl uppercase">
            {firstOfMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h2>
          <Link href={`/schedule?view=calendar&month=${nextMonth}`} className="rounded-full border-[3px] border-ink px-3 py-1 font-bold hover:bg-yellow-soft">
            →
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-muted">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            const cellState =
              day === null
                ? null
                : day === today.day && m === today.month && y === today.year
                  ? "today"
                  : y < today.year || (y === today.year && (m < today.month || (m === today.month && day! < today.day)))
                    ? "past"
                    : "future";
            return (
              <div
                key={i}
                className={`min-h-24 rounded-lg border-2 p-1 ${
                  cellState === "today"
                    ? "border-ink bg-emerald-100"
                    : cellState === "past"
                      ? "border-hairline bg-neutral-100"
                      : "border-hairline bg-paper"
                }`}
              >
                {day && (
                  <>
                    <div className="text-xs font-bold text-muted">{day}</div>
                    <div className="space-y-1">
                      {(gamesByDay.get(day) ?? []).slice(0, 3).map((g) => (
                        <div key={g.id + g.teamId} className="truncate rounded bg-yellow-soft px-1 text-[10px] font-medium">
                          {g.teamAbbr} {g.homeAway === "home" ? "vs" : "@"} {g.opponentAbbr}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const filtered = allGames
    .filter((g) => (tab === "upcoming" ? g.state === "pre" : g.state === "post"))
    .sort((a, b) => (tab === "upcoming" ? +new Date(a.date) - +new Date(b.date) : +new Date(b.date) - +new Date(a.date)))
    .slice(0, 40); // a full NBA/MLB season is 80+ games — cap so the page stays scannable

  const groups: { key: string; label: string; games: EnrichedGame[] }[] = [];
  for (const g of filtered) {
    const key = etDateKey(new Date(g.date));
    let group = groups.find((gr) => gr.key === key);
    if (!group) {
      group = {
        key,
        label: new Date(g.date).toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "America/New_York",
        }),
        games: [],
      };
      groups.push(group);
    }
    group.games.push(g);
  }

  return (
    <div className="space-y-6">
      <ScheduleHeader view={view} tab={tab} />
      {visibleTeams.length === 0 && (
        <p className="text-sm text-muted">
          No teams selected in the filter bar below — turn some on to see their schedule.
        </p>
      )}
      {groups.length === 0 && visibleTeams.length > 0 && (
        <p className="text-sm text-muted">Nothing here yet.</p>
      )}
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.key}>
            <h3 className="mb-2 font-display text-sm uppercase text-muted">{group.label}</h3>
            <div className="space-y-2">
              {group.games.map((g) => {
                const isDraw = g.state === "post" && !g.won && !g.oppWon;
                return (
                <div
                  key={g.id + g.teamId}
                  className={`flex items-center justify-between rounded-xl border-[3px] p-3 ${
                    g.state === "post"
                      ? isDraw
                        ? "border-ink bg-neutral-100"
                        : g.won
                          ? "border-ink bg-emerald-50"
                          : "border-ink bg-red-50"
                      : "border-ink"
                  }`}
                  style={{ borderLeftWidth: 8, borderLeftColor: g.teamColor ? `#${g.teamColor}` : "#111111" }}
                >
                  <div className="flex items-center gap-3">
                    <TeamLogoBadge src={g.teamLogo} size={28} />
                    <div>
                      <div className="font-display text-sm uppercase">
                        {g.teamAbbr} {g.homeAway === "home" ? "vs" : "@"} {g.opponentAbbr}
                      </div>
                      <div className="text-xs text-muted uppercase">
                        {getLeague(g.league).shortName}
                        {g.state === "pre" && ` · ${formatGameTime(g.date)}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {g.state === "post" ? (
                      <>
                        <span className="font-bold">
                          {isDraw ? "D" : g.won ? "W" : "L"} {g.selfScore}-{g.oppScore}
                        </span>
                        <a
                          href={`https://www.espn.com/${getLeague(g.league).espnBoxscoreSlug}/boxscore/_/gameId/${g.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-display text-xs uppercase text-ink underline decoration-yellow decoration-4 underline-offset-4"
                        >
                          Box score →
                        </a>
                      </>
                    ) : (
                      <Link
                        href={`/teams/${g.league}/${g.teamId}`}
                        className="font-display text-xs uppercase text-ink underline decoration-yellow decoration-4 underline-offset-4"
                      >
                        Preview →
                      </Link>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleHeader({ view, tab }: { view: string; tab: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl uppercase sm:text-4xl">
          <span className="mark-yellow">Schedule</span>
        </h1>
        <p className="mt-1 text-muted">
          Times shown in Eastern (ET). Use the bar below to filter which teams show up here.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-full border-[3px] border-ink p-1 text-xs">
          <Link
            href={`/schedule?view=${view}&tab=upcoming`}
            className={`rounded-full px-3 py-1 font-display uppercase ${tab === "upcoming" ? "bg-yellow" : "text-muted"}`}
          >
            Upcoming
          </Link>
          <Link
            href={`/schedule?view=${view}&tab=results`}
            className={`rounded-full px-3 py-1 font-display uppercase ${tab === "results" ? "bg-yellow" : "text-muted"}`}
          >
            Results
          </Link>
        </div>
        <div className="flex rounded-full border-[3px] border-ink p-1 text-xs">
          <Link
            href={`/schedule?view=list&tab=${tab}`}
            className={`rounded-full px-3 py-1 font-display uppercase ${view === "list" ? "bg-yellow" : "text-muted"}`}
          >
            List
          </Link>
          <Link
            href={`/schedule?view=calendar&tab=${tab}`}
            className={`rounded-full px-3 py-1 font-display uppercase ${view === "calendar" ? "bg-yellow" : "text-muted"}`}
          >
            Calendar
          </Link>
        </div>
      </div>
    </div>
  );
}
