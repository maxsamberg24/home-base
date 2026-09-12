// Thin wrapper around ESPN's public (unofficial, undocumented) sports
// endpoints, parameterized by `sportPath` (e.g. "football/nfl",
// "basketball/nba" — see src/lib/leagues.ts). Two hosts are involved: the
// "site" API (site.api.espn.com) for most consumer-facing data, and the
// "core" API (sports.core.api.espn.com) for a few things — like NFL depth
// charts — that aren't exposed on the site API.

const SITE_ROOT = "https://site.api.espn.com/apis/site/v2/sports";
const CORE_ROOT = "https://sports.core.api.espn.com/v3/sports";
const STANDINGS_ROOT = "https://site.api.espn.com/apis/v2/sports";

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

export async function getScoreboard(
  sportPath: string,
  opts: { season?: number; seasonType?: number; week?: number } = {}
): Promise<ScoreboardResponse> {
  const params = new URLSearchParams();
  if (opts.season) params.set("year", String(opts.season));
  if (opts.seasonType) params.set("seasontype", String(opts.seasonType));
  if (opts.week) params.set("week", String(opts.week));
  const url = `${SITE_ROOT}/${sportPath}/scoreboard${params.toString() ? `?${params}` : ""}`;
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

export async function getTeams(sportPath: string): Promise<EspnTeamRef[]> {
  const url = `${SITE_ROOT}/${sportPath}/teams?limit=200`;
  const data = await cachedFetch<{
    sports: { leagues: { teams: { team: EspnTeamDetail }[] }[] }[];
  }>(url, 60 * MIN);
  const teams = data.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return teams.map((t) => ({
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

export async function getTeam(sportPath: string, teamId: string): Promise<EspnTeamDetail> {
  const url = `${SITE_ROOT}/${sportPath}/teams/${teamId}`;
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

export async function getTeamNews(
  sportPath: string,
  teamId: string,
  limit = 10
): Promise<EspnArticle[]> {
  const url = `${SITE_ROOT}/${sportPath}/news?team=${teamId}&limit=${limit}`;
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

// ESPN's roster shape differs by sport: NFL returns pre-grouped
// {position, items[]}[]; NBA/MLB/soccer return a flat athlete[] instead.
// Normalize both into the grouped shape, grouping the flat case by each
// athlete's own position abbreviation.
function normalizeRoster(athletes: unknown[]): EspnRosterGroup[] {
  if (athletes.length === 0) return [];
  const first = athletes[0] as Record<string, unknown>;
  if (Array.isArray(first?.items)) return athletes as EspnRosterGroup[];

  const groups = new Map<string, EspnRosterAthlete[]>();
  for (const raw of athletes as EspnRosterAthlete[]) {
    const label = raw.position?.abbreviation ?? "Other";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(raw);
  }
  return [...groups.entries()].map(([position, items]) => ({ position, items }));
}

export async function getTeamRoster(
  sportPath: string,
  teamId: string
): Promise<EspnRosterGroup[]> {
  const url = `${SITE_ROOT}/${sportPath}/teams/${teamId}/roster`;
  const data = await cachedFetch<{ athletes: unknown[] }>(url, 15 * MIN);
  return normalizeRoster(data.athletes ?? []);
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

// Football-only concept on ESPN's core API.
export async function getDepthChart(
  sportPath: string,
  teamId: string,
  season = new Date().getFullYear()
): Promise<DepthChartFormation[]> {
  const url = `${CORE_ROOT}/${sportPath}/seasons/${season}/teams/${teamId}/depthcharts`;
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

// No `season` param by default: ESPN's own default correctly resolves to
// whichever season is "current" for that sport right now (including
// upcoming, not-yet-started seasons showing all-zero records) — sports
// label season years differently (NBA/NCAAMB by the year the season ends,
// NFL/MLB by the year it starts), so hardcoding "this calendar year" was
// silently showing last season's *completed* standings for some leagues.
export async function getStandings(sportPath: string, season?: number): Promise<StandingsGroup[]> {
  const url = `${STANDINGS_ROOT}/${sportPath}/standings${season ? `?season=${season}` : ""}`;
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
  sportPath: string,
  teamId: string,
  season = new Date().getFullYear()
): Promise<ScheduleEvent[]> {
  const url = `${SITE_ROOT}/${sportPath}/teams/${teamId}/schedule?season=${season}`;
  const data = await cachedFetch<{ events: ScheduleEvent[] }>(url, 2 * MIN);
  return data.events ?? [];
}

// NFL regular season is 18 weeks; ESPN calendar weeks generally line up 1:1.
// Other leagues (NBA/MLB/soccer) don't use "week" the same way, but ESPN's
// scoreboard endpoint still accepts a `dates=YYYYMMDD` filter, used by
// getScoreboardByDate below for those sports.
export const REGULAR_SEASON_WEEKS = 18;

export async function getCurrentWeek(
  sportPath: string
): Promise<{ season: number; seasonType: number; week: number }> {
  const board = await getScoreboard(sportPath);
  return {
    season: board.season.year,
    seasonType: board.season.type,
    week: board.week?.number ?? 1,
  };
}

// Date-based scoreboard, for leagues that play daily rather than in weeks
// (NBA, MLB, soccer). `date` is YYYY-MM-DD.
export async function getScoreboardByDate(
  sportPath: string,
  date: string
): Promise<ScoreboardResponse> {
  const compact = date.replaceAll("-", "");
  const url = `${SITE_ROOT}/${sportPath}/scoreboard?dates=${compact}`;
  return cachedFetch<ScoreboardResponse>(url, 1 * MIN);
}
