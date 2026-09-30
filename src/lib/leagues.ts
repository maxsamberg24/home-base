// Registry of supported leagues. `slug` is our own short id (used in URLs,
// DB rows). Most leagues are backed by ESPN's public API, where `sportPath`
// is ESPN's own path segment (site.api.espn.com/apis/site/v2/sports/{sportPath}/...).
// A couple of leagues ESPN doesn't carry real data for are backed by their
// own official feeds instead (see src/lib/sports.ts, src/lib/lnb.ts,
// src/lib/euroleague.ts) — for those, `providerCompetitionId` holds
// whatever id that provider's API needs instead of an ESPN sportPath.
export type LeagueProvider = "espn" | "lnb" | "euroleague";

export interface LeagueDef {
  slug: string;
  sportPath: string; // ESPN-backed leagues only; unused for other providers
  name: string;
  shortName: string;
  hasDivisions: boolean; // NFL-style conference/division grouping
  hasDepthChart: boolean; // football-only concept
  espnBoxscoreSlug: string; // espn.com/{slug}/boxscore/_/gameId/{id} — ESPN-backed only
  provider: LeagueProvider;
  providerCompetitionId?: string;
}

export const LEAGUES: LeagueDef[] = [
  {
    slug: "nfl",
    sportPath: "football/nfl",
    name: "NFL",
    shortName: "NFL",
    hasDivisions: true,
    hasDepthChart: true,
    espnBoxscoreSlug: "nfl",
    provider: "espn",
  },
  {
    slug: "nba",
    sportPath: "basketball/nba",
    name: "NBA",
    shortName: "NBA",
    // NBA has its own conference/division structure, but src/lib/divisions.ts
    // only maps NFL abbreviations (and some collide, e.g. DAL/PHI/WSH exist
    // in both leagues) — browse teams as a flat grid until NBA divisions are
    // added there. Standings still show real ESPN groupings regardless.
    hasDivisions: false,
    hasDepthChart: false,
    espnBoxscoreSlug: "nba",
    provider: "espn",
  },
  {
    slug: "mlb",
    sportPath: "baseball/mlb",
    name: "MLB",
    shortName: "MLB",
    hasDivisions: false,
    hasDepthChart: false,
    espnBoxscoreSlug: "mlb",
    provider: "espn",
  },
  {
    slug: "college-football",
    sportPath: "football/college-football",
    name: "College Football",
    shortName: "NCAAF",
    hasDivisions: false,
    hasDepthChart: false,
    espnBoxscoreSlug: "college-football",
    provider: "espn",
  },
  {
    slug: "mens-college-basketball",
    sportPath: "basketball/mens-college-basketball",
    name: "Men's College Basketball",
    shortName: "NCAAMB",
    hasDivisions: false,
    hasDepthChart: false,
    espnBoxscoreSlug: "mens-college-basketball",
    provider: "espn",
  },
  {
    slug: "nhl",
    sportPath: "hockey/nhl",
    name: "NHL",
    shortName: "NHL",
    hasDivisions: false,
    hasDepthChart: false,
    espnBoxscoreSlug: "nhl",
    provider: "espn",
  },
  {
    slug: "soccer.eng.1",
    sportPath: "soccer/eng.1",
    name: "Premier League",
    shortName: "Soccer",
    hasDivisions: false,
    hasDepthChart: false,
    espnBoxscoreSlug: "soccer/match",
    provider: "espn",
  },
  {
    // France's actual second-division basketball league (Élite 2 / "Pro B").
    // ESPN carries no French basketball at all, so this is backed directly
    // by the French federation's own public API (api-prod.lnb.fr) — see
    // src/lib/lnb.ts. No roster/news data is available there (known gap).
    slug: "fra-elite2",
    sportPath: "",
    name: "Élite 2 (France)",
    shortName: "Élite 2",
    hasDivisions: false,
    hasDepthChart: false,
    espnBoxscoreSlug: "",
    provider: "lnb",
    providerCompetitionId: "318",
  },
  {
    // ESPN's EuroLeague coverage is a bare team list with no real
    // schedule/scores/standings/news/roster data at all, so this is backed
    // by EuroLeague's own official live-data feed instead — see
    // src/lib/euroleague.ts. No roster/news data there either.
    slug: "euroleague",
    sportPath: "",
    name: "EuroLeague",
    shortName: "EuroLeague",
    hasDivisions: false,
    hasDepthChart: false,
    espnBoxscoreSlug: "",
    provider: "euroleague",
    providerCompetitionId: "E",
  },
];

export function getLeague(slug: string): LeagueDef {
  const league = LEAGUES.find((l) => l.slug === slug);
  if (!league) throw new Error(`Unknown league: ${slug}`);
  return league;
}
