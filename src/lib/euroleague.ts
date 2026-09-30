// Adapter for EuroLeague's own official live-data feed — used because ESPN's
// EuroLeague coverage is a bare team list with no real schedule, scores,
// standings, or news behind it (confirmed empty across a full week spanning
// the actual season start). api-live.euroleague.net is EuroLeague's own
// public, unauthenticated API. Shapes here match src/lib/espn.ts's types so
// every page that already renders an ESPN-backed league works unmodified —
// see src/lib/sports.ts for the dispatch layer that picks this adapter.
import type { EspnTeamRef, EspnTeamDetail, ScheduleEvent, StandingsGroup, EspnArticle, EspnRosterGroup } from "./espn";

const ROOT = "https://api-live.euroleague.net/v2";

type CacheEntry = { expires: number; value: unknown };
const cache = new Map<string, CacheEntry>();

async function cachedFetch<T>(url: string, ttlMs: number): Promise<T> {
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`EuroLeague request failed (${res.status}): ${url}`);
  const value = (await res.json()) as T;
  cache.set(url, { expires: Date.now() + ttlMs, value });
  return value;
}

const MIN = 60 * 1000;

// EuroLeague's season code is "E" + the year it starts (E2026 = 2026-27),
// running roughly Oct-May — same "label by starting year" idea as the NFL.
function currentSeasonCode(): string {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = month >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `E${year}`;
}

interface RawClub {
  code: string;
  name: string;
  abbreviatedName?: string;
  editorialName?: string;
  images?: { crest?: string };
}

function teamRef(c: RawClub): EspnTeamRef {
  return {
    id: c.code,
    abbreviation: c.code,
    displayName: c.name,
    shortDisplayName: c.abbreviatedName ?? c.editorialName ?? c.name,
    location: c.editorialName ?? c.name,
    name: c.name,
    logo: c.images?.crest,
  };
}

async function getClubs(): Promise<RawClub[]> {
  const data = await cachedFetch<{ data: RawClub[] }>(`${ROOT}/competitions/E/seasons/${currentSeasonCode()}/clubs`, 60 * MIN);
  return data.data ?? [];
}

export async function getTeams(): Promise<EspnTeamRef[]> {
  return (await getClubs()).map(teamRef);
}

export async function getTeam(_competitionId: string, teamId: string): Promise<EspnTeamDetail> {
  const clubs = await getClubs();
  const c = clubs.find((x) => x.code === teamId);
  if (!c) throw new Error(`EuroLeague team not found: ${teamId}`);
  const t = teamRef(c);
  return {
    id: t.id,
    location: t.location ?? t.displayName,
    name: t.name ?? t.displayName,
    abbreviation: t.abbreviation,
    displayName: t.displayName,
    shortDisplayName: t.shortDisplayName ?? t.displayName,
    logos: t.logo ? [{ href: t.logo }] : undefined,
  };
}

interface RawGameSide {
  club: { code: string; name: string; images?: { crest?: string } };
  score: number;
}

interface RawGame {
  id: string;
  utcDate: string;
  played: boolean;
  round: number;
  local: RawGameSide;
  road: RawGameSide;
}

async function getGames(): Promise<RawGame[]> {
  const data = await cachedFetch<{ data: RawGame[] }>(`${ROOT}/competitions/E/seasons/${currentSeasonCode()}/games`, 10 * MIN);
  return data.data ?? [];
}

function sideRef(s: RawGameSide): EspnTeamRef {
  return {
    id: s.club.code,
    abbreviation: s.club.code,
    displayName: s.club.name,
    shortDisplayName: s.club.name,
    logo: s.club.images?.crest,
  };
}

function toScheduleEvent(g: RawGame): ScheduleEvent {
  const winnerIsLocal = g.played ? g.local.score > g.road.score : undefined;
  return {
    id: g.id,
    date: g.utcDate,
    name: `${g.local.club.name} vs ${g.road.club.name}`,
    shortName: `${g.local.club.code} vs ${g.road.club.code}`,
    seasonType: { type: 2, name: "Regular Season" },
    competitions: [
      {
        id: g.id,
        status: {
          type: {
            state: g.played ? "post" : "pre",
            completed: g.played,
            description: g.played ? "Final" : "Scheduled",
            shortDetail: g.played ? "Final" : "Scheduled",
          },
        },
        competitors: [
          {
            id: g.local.club.code,
            homeAway: "home",
            winner: winnerIsLocal,
            team: sideRef(g.local),
            score: g.played ? { value: g.local.score, displayValue: String(g.local.score) } : undefined,
          },
          {
            id: g.road.club.code,
            homeAway: "away",
            winner: winnerIsLocal === undefined ? undefined : !winnerIsLocal,
            team: sideRef(g.road),
            score: g.played ? { value: g.road.score, displayValue: String(g.road.score) } : undefined,
          },
        ],
      },
    ],
  } as unknown as ScheduleEvent;
}

export async function getTeamSchedule(_competitionId: string, teamId: string): Promise<ScheduleEvent[]> {
  const games = await getGames();
  return games.filter((g) => g.local.club.code === teamId || g.road.club.code === teamId).map(toScheduleEvent);
}

// EuroLeague's live feed has no standalone standings endpoint, so the table
// is computed here from the full games list's played results.
export async function getStandings(): Promise<StandingsGroup[]> {
  const games = await getGames();
  const record = new Map<string, { team: EspnTeamRef; wins: number; losses: number }>();

  const bump = (side: RawGameSide, won: boolean) => {
    const key = side.club.code;
    const existing = record.get(key) ?? { team: sideRef(side), wins: 0, losses: 0 };
    if (won) existing.wins++;
    else existing.losses++;
    record.set(key, existing);
  };

  for (const g of games) {
    if (!g.played) continue;
    const localWon = g.local.score > g.road.score;
    bump(g.local, localWon);
    bump(g.road, !localWon);
  }

  const entries = [...record.values()].map(({ team, wins, losses }) => {
    const games2 = wins + losses;
    const pct = games2 > 0 ? wins / games2 : 0;
    return {
      team,
      stats: [
        { name: "wins", value: wins, displayValue: String(wins) },
        { name: "losses", value: losses, displayValue: String(losses) },
        { name: "winPercent", value: pct, displayValue: pct.toFixed(3) },
      ],
    };
  });

  return [{ name: "EuroLeague", standings: { entries } }];
}

// No clean per-team news or roster data found in the public feed — known
// gap, documented in the README.
export async function getTeamNews(): Promise<EspnArticle[]> {
  return [];
}

export async function getTeamRoster(): Promise<EspnRosterGroup[]> {
  return [];
}
