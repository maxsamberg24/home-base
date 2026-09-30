// Adapter for the LNB (French basketball federation)'s own public API —
// used for Élite 2 (the actual second division; ESPN carries no French
// basketball at all). Confirmed live and unauthenticated at api-prod.lnb.fr.
// Shapes returned here match src/lib/espn.ts's types exactly so every page
// that already knows how to render an ESPN-backed league works unmodified —
// see src/lib/sports.ts for the dispatch layer that picks this adapter.
import type { EspnTeamRef, EspnTeamDetail, ScheduleEvent, StandingsGroup, EspnArticle, EspnRosterGroup } from "./espn";

const ROOT = "https://api-prod.lnb.fr";

type CacheEntry = { expires: number; value: unknown };
const cache = new Map<string, CacheEntry>();

async function cachedFetch<T>(url: string, ttlMs: number, init?: RequestInit): Promise<T> {
  const key = `${url}::${init?.body ?? ""}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const res = await fetch(url, { ...init, cache: "no-store" });
  if (!res.ok) throw new Error(`LNB request failed (${res.status}): ${url}`);
  const value = (await res.json()) as T;
  cache.set(key, { expires: Date.now() + ttlMs, value });
  return value;
}

const MIN = 60 * 1000;

// LNB's standings endpoint wants a human competition name, not the numeric
// id used everywhere else — confirmed by trial against the live API.
const FILTER_NAME_BY_COMPETITION: Record<string, string> = {
  "318": "ELITE 2",
};

function currentSeasonYear(): number {
  // LNB's season runs roughly Sept-June; label by the year it starts, same
  // convention as NFL. Before September, still show the prior season.
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  return month >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

interface RawImage {
  lg?: string | null;
  md?: string | null;
  or?: string | null;
  sm?: string | null;
}

interface RawTeam {
  external_id: number;
  team_name: string;
  team_code: string;
  colour_primary?: string;
  colour_secondary?: string;
  logo_black?: RawImage;
  logo_white?: RawImage;
}

function teamRef(t: RawTeam): EspnTeamRef {
  const logo = t.logo_black?.lg ?? t.logo_white?.lg ?? undefined;
  return {
    id: String(t.external_id),
    abbreviation: t.team_code,
    displayName: t.team_name,
    shortDisplayName: t.team_name,
    location: t.team_name,
    name: t.team_name,
    logo,
    color: t.colour_primary,
    alternateColor: t.colour_secondary,
  };
}

export async function getTeams(competitionId: string): Promise<EspnTeamRef[]> {
  const data = await cachedFetch<{ data: RawTeam[] }>(
    `${ROOT}/competition/getCompetitionTeams?competition_external_id=${competitionId}`,
    60 * MIN
  );
  return (data.data ?? []).map(teamRef);
}

export async function getTeam(competitionId: string, teamId: string): Promise<EspnTeamDetail> {
  const teams = await getTeams(competitionId);
  const t = teams.find((x) => x.id === teamId);
  if (!t) throw new Error(`LNB team not found: ${teamId}`);
  return {
    id: t.id,
    location: t.location ?? t.displayName,
    name: t.name ?? t.displayName,
    abbreviation: t.abbreviation,
    displayName: t.displayName,
    shortDisplayName: t.shortDisplayName ?? t.displayName,
    color: t.color,
    alternateColor: t.alternateColor,
    logos: t.logo ? [{ href: t.logo }] : undefined,
  };
}

interface RawMatchTeam {
  external_id: number;
  team_name: string;
  team_code: string;
  logo_black?: RawImage;
  score_string?: string;
}

interface RawMatch {
  match_id: string;
  match_time_utc: string;
  match_date: string;
  match_status: string;
  teams: RawMatchTeam[];
}

// LNB's match endpoint is round-scoped with no "give me the whole season"
// option, so a team's full schedule means sweeping every round and keeping
// the ones that team played in. A French basketball season runs ~34 rounds
// (double round-robin over ~18 teams) — 38 covers it with margin, and rounds
// that don't exist yet just come back with an empty match list.
const MAX_ROUNDS = 38;

async function fetchRound(competitionId: string, year: number, round: number): Promise<RawMatch[]> {
  const data = await cachedFetch<{ data: { matches: RawMatch[] } }>(
    `${ROOT}/match/getMatchesByCompetitionAndRound`,
    10 * MIN,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        competition_external_id: Number(competitionId),
        year,
        round_numbers: [round],
        round_number: round,
      }),
    }
  ).catch(() => ({ data: { matches: [] } }));
  return data.data?.matches ?? [];
}

function toScheduleEvent(m: RawMatch): ScheduleEvent | null {
  const [t0, t1] = m.teams;
  if (!t0 || !t1) return null;
  const completed = m.match_status === "COMPLETE";
  const score0 = t0.score_string ? Number(t0.score_string) : undefined;
  const score1 = t1.score_string ? Number(t1.score_string) : undefined;
  const winner0 = completed && score0 !== undefined && score1 !== undefined ? score0 > score1 : undefined;

  const toCompetitor = (t: RawMatchTeam, homeAway: "home" | "away", winner: boolean | undefined) => ({
    id: String(t.external_id),
    homeAway,
    winner,
    team: {
      id: String(t.external_id),
      abbreviation: t.team_code,
      displayName: t.team_name,
      shortDisplayName: t.team_name,
      logo: t.logo_black?.lg ?? undefined,
    },
    score: t.score_string ? { value: Number(t.score_string), displayValue: t.score_string } : undefined,
  });

  return {
    id: m.match_id,
    date: m.match_time_utc,
    name: `${t0.team_name} vs ${t1.team_name}`,
    shortName: `${t0.team_code} vs ${t1.team_code}`,
    seasonType: { type: 2, name: "Regular Season" },
    competitions: [
      {
        id: m.match_id,
        status: {
          type: {
            state: completed ? "post" : "pre",
            completed,
            description: m.match_status,
            shortDetail: m.match_status,
          },
        },
        competitors: [
          toCompetitor(t0, "home", winner0),
          toCompetitor(t1, "away", winner0 === undefined ? undefined : !winner0),
        ],
      },
    ],
  } as unknown as ScheduleEvent;
}

export async function getTeamSchedule(competitionId: string, teamId: string): Promise<ScheduleEvent[]> {
  const year = currentSeasonYear();
  const rounds = await Promise.all(
    Array.from({ length: MAX_ROUNDS }, (_, i) => i + 1).map((r) => fetchRound(competitionId, year, r))
  );
  const events: ScheduleEvent[] = [];
  for (const matches of rounds) {
    for (const m of matches) {
      if (!m.teams.some((t) => String(t.external_id) === teamId)) continue;
      const ev = toScheduleEvent(m);
      if (ev) events.push(ev);
    }
  }
  return events;
}

interface RawStandingRow {
  rank: number;
  s_wins: number;
  s_losses: number;
  s_games: number;
  team: RawTeam & { team_id?: string };
}

interface RawStandingPool {
  title: string;
  pool_number: number;
  data: RawStandingRow[];
}

export async function getStandings(competitionId: string): Promise<StandingsGroup[]> {
  const filterName = FILTER_NAME_BY_COMPETITION[competitionId] ?? "";
  const year = currentSeasonYear();
  const data = await cachedFetch<{ data: RawStandingPool[] }>(`${ROOT}/altrstats/getStandingByCompetition`, 10 * MIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      competition_external_id: Number(competitionId),
      year,
      competition_filter_name: filterName,
      round_numbers: [],
    }),
  }).catch(() => ({ data: [] }));

  return (data.data ?? []).map((pool) => ({
    name: pool.title,
    standings: {
      entries: pool.data.map((row) => {
        const games = row.s_wins + row.s_losses;
        const pct = games > 0 ? row.s_wins / games : 0;
        return {
          team: teamRef(row.team),
          stats: [
            { name: "wins", value: row.s_wins, displayValue: String(row.s_wins) },
            { name: "losses", value: row.s_losses, displayValue: String(row.s_losses) },
            { name: "winPercent", value: pct, displayValue: pct.toFixed(3) },
          ],
        };
      }),
    },
  }));
}

// LNB doesn't expose a clean per-team news feed or roster endpoint we could
// find — known gap, documented in the README.
export async function getTeamNews(): Promise<EspnArticle[]> {
  return [];
}

export async function getTeamRoster(): Promise<EspnRosterGroup[]> {
  return [];
}
