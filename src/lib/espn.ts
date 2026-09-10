// Thin wrapper around ESPN's public (unofficial, undocumented) NFL endpoints.
// Two hosts are involved: the "site" API (site.api.espn.com) for most
// consumer-facing data, and the "core" API (sports.core.api.espn.com) for a
// few things — like depth charts — that aren't exposed on the site API.

const SITE_BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";
const CORE_BASE = "https://sports.core.api.espn.com/v3/sports/football/nfl";
const STANDINGS_BASE = "https://site.api.espn.com/apis/v2/sports/football/nfl";

type CacheEntry = { expires: number; value: unknown };
const cache = new Map<string, CacheEntry>();

async function cachedFetch<T>(url: string, ttlMs: number): Promise<T> {
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) {
    return hit.value as T;
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`ESPN request failed (${res.status}): ${url}`);
  }
  const value = (await res.json()) as T;
  cache.set(url, { expires: Date.now() + ttlMs, value });
  return value;
}

const MIN = 60 * 1000;

export const SEASON_TYPE = {
  PRESEASON: 1,
  REGULAR: 2,
  POSTSEASON: 3,
} as const;

export interface EspnTeamRef {
  id: string;
  uid?: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName?: string;
  name?: string;
  location?: string;
  logo?: string;
  color?: string;
  alternateColor?: string;
}

export interface EspnOdds {
  provider: { id: string; name: string; displayName: string };
  details: string;
  overUnder?: number;
  spread?: number;
  awayTeamOdds: { favorite: boolean; underdog: boolean; team: EspnTeamRef };
  homeTeamOdds: { favorite: boolean; underdog: boolean; team: EspnTeamRef };
}

export interface EspnCompetitor {
  id: string;
  homeAway: "home" | "away";
  winner?: boolean;
  score?: string;
  team: EspnTeamRef;
  records?: { name: string; summary: string }[];
}

export interface EspnEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  week?: { number: number };
  season: { year: number; type: number };
  competitions: {
    id: string;
    date: string;
    competitors: EspnCompetitor[];
    odds?: EspnOdds[];
    status: {
      type: {
        state: "pre" | "in" | "post";
        completed: boolean;
        description: string;
        shortDetail: string;
      };
    };
    broadcasts?: { names: string[] }[];
  }[];
  status: {
    type: {
      state: "pre" | "in" | "post";
      completed: boolean;
      description: string;
      shortDetail: string;
    };
  };
}

export interface ScoreboardResponse {
  events: EspnEvent[];
  week?: { number: number };
  season: { year: number; type: number };
}

export async function getScoreboard(opts: {
  season?: number;
  seasonType?: number;
  week?: number;
} = {}): Promise<ScoreboardResponse> {
  const params = new URLSearchParams();
  if (opts.season) params.set("year", String(opts.season));
  if (opts.seasonType) params.set("seasontype", String(opts.seasonType));
  if (opts.week) params.set("week", String(opts.week));
  const url = `${SITE_BASE}/scoreboard${params.toString() ? `?${params}` : ""}`;
  return cachedFetch<ScoreboardResponse>(url, 1 * MIN);
}

export interface EspnTeamDetail {
  id: string;
  location: string;
  name: string;
  nickname?: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  color?: string;
  alternateColor?: string;
  logos?: { href: string }[];
  record?: {
    items: { type: string; summary: string; stats: { name: string; value: number }[] }[];
  };
  nextEvent?: EspnEvent[];
}

export async function getTeams(): Promise<EspnTeamRef[]> {
  const url = `${SITE_BASE}/teams?limit=40`;
  const data = await cachedFetch<{
    sports: { leagues: { teams: { team: EspnTeamDetail }[] }[] }[];
  }>(url, 60 * MIN);
  return data.sports[0].leagues[0].teams.map((t) => ({
    id: t.team.id,
    abbreviation: t.team.abbreviation,
    displayName: t.team.displayName,
    shortDisplayName: t.team.shortDisplayName,
    location: t.team.location,
    name: t.team.name,
    logo: t.team.logos?.[0]?.href,
    color: t.team.color,
    alternateColor: t.team.alternateColor,
  }));
}

export async function getTeam(teamId: string): Promise<EspnTeamDetail> {
  const url = `${SITE_BASE}/teams/${teamId}`;
  const data = await cachedFetch<{ team: EspnTeamDetail }>(url, 5 * MIN);
  return data.team;
}

export interface EspnArticle {
  id: number;
  headline: string;
  description: string;
  published: string;
  images?: { url: string; caption?: string }[];
  links: { web: { href: string } };
}

export async function getTeamNews(teamId: string, limit = 10): Promise<EspnArticle[]> {
  const url = `${SITE_BASE}/news?team=${teamId}&limit=${limit}`;
  const data = await cachedFetch<{ articles: EspnArticle[] }>(url, 5 * MIN);
  return data.articles ?? [];
}

export interface EspnRosterAthlete {
  id: string;
  fullName: string;
  displayName: string;
  jersey?: string;
  position?: { abbreviation: string };
  age?: number;
  height?: number;
  weight?: number;
  experience?: { years: number };
  headshot?: { href: string };
}

export interface EspnRosterGroup {
  position: string;
  items: EspnRosterAthlete[];
}

export async function getTeamRoster(teamId: string): Promise<EspnRosterGroup[]> {
  const url = `${SITE_BASE}/teams/${teamId}/roster`;
  const data = await cachedFetch<{ athletes: EspnRosterGroup[] }>(url, 15 * MIN);
  return data.athletes ?? [];
}

export interface DepthChartAthlete {
  id: string;
  fullName: string;
  displayName: string;
  jersey?: string;
}

export interface DepthChartSlot {
  slot: number;
  athlete?: DepthChartAthlete;
}

export interface DepthChartPosition {
  position: {
    abbreviation: string;
    displayName: string;
  };
  athleteSlots?: DepthChartSlot[];
}

export interface DepthChartFormation {
  id: string;
  name: string;
  positions: Record<string, DepthChartPosition>;
}

export async function getDepthChart(
  teamId: string,
  season = new Date().getFullYear()
): Promise<DepthChartFormation[]> {
  const url = `${CORE_BASE}/seasons/${season}/teams/${teamId}/depthcharts`;
  const data = await cachedFetch<{ items: DepthChartFormation[] }>(url, 30 * MIN);
  return data.items ?? [];
}

export interface StandingsEntry {
  team: EspnTeamRef;
  stats: { name: string; value: number; displayValue: string }[];
}

export interface StandingsGroup {
  name: string;
  standings?: { entries: StandingsEntry[] };
  children?: StandingsGroup[];
}

export async function getStandings(season = new Date().getFullYear()): Promise<StandingsGroup[]> {
  const url = `${STANDINGS_BASE}/standings?season=${season}`;
  const data = await cachedFetch<{ children: StandingsGroup[] }>(url, 10 * MIN);
  return data.children ?? [];
}

export function flattenStandings(groups: StandingsGroup[]): StandingsEntry[] {
  const out: StandingsEntry[] = [];
  for (const g of groups) {
    if (g.standings?.entries) out.push(...g.standings.entries);
    if (g.children) out.push(...flattenStandings(g.children));
  }
  return out;
}

export function statValue(entry: StandingsEntry, name: string): number | undefined {
  return entry.stats.find((s) => s.name === name)?.value;
}

export interface ScheduleEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  week?: { number: number };
  seasonType: { type: number; name: string };
  competitions: {
    id: string;
    status: EspnEvent["status"];
    competitors: (EspnCompetitor & { score?: { value: number; displayValue: string } })[];
  }[];
}

export async function getTeamSchedule(
  teamId: string,
  season = new Date().getFullYear()
): Promise<ScheduleEvent[]> {
  const url = `${SITE_BASE}/teams/${teamId}/schedule?season=${season}`;
  const data = await cachedFetch<{ events: ScheduleEvent[] }>(url, 2 * MIN);
  return data.events ?? [];
}

// NFL regular season is 18 weeks; ESPN calendar weeks generally line up 1:1.
export const REGULAR_SEASON_WEEKS = 18;

export async function getCurrentWeek(): Promise<{ season: number; seasonType: number; week: number }> {
  const board = await getScoreboard();
  return {
    season: board.season.year,
    seasonType: board.season.type,
    week: board.week?.number ?? 1,
  };
}
