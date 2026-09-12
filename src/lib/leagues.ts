// Registry of supported leagues. `slug` is our own short id (used in URLs,
// DB rows); `sportPath` is ESPN's own path segment used to build API URLs
// (site.api.espn.com/apis/site/v2/sports/{sportPath}/...).
export interface LeagueDef {
  slug: string;
  sportPath: string;
  name: string;
  shortName: string;
  hasDivisions: boolean; // NFL-style conference/division grouping
  hasDepthChart: boolean; // football-only concept
  espnBoxscoreSlug: string; // espn.com/{slug}/boxscore/_/gameId/{id}
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
  },
  {
    slug: "mlb",
    sportPath: "baseball/mlb",
    name: "MLB",
    shortName: "MLB",
    hasDivisions: false,
    hasDepthChart: false,
    espnBoxscoreSlug: "mlb",
  },
  {
    slug: "college-football",
    sportPath: "football/college-football",
    name: "College Football",
    shortName: "NCAAF",
    hasDivisions: false,
    hasDepthChart: false,
    espnBoxscoreSlug: "college-football",
  },
  {
    slug: "mens-college-basketball",
    sportPath: "basketball/mens-college-basketball",
    name: "Men's College Basketball",
    shortName: "NCAAMB",
    hasDivisions: false,
    hasDepthChart: false,
    espnBoxscoreSlug: "mens-college-basketball",
  },
  {
    slug: "soccer.eng.1",
    sportPath: "soccer/eng.1",
    name: "Premier League",
    shortName: "Soccer",
    hasDivisions: false,
    hasDepthChart: false,
    espnBoxscoreSlug: "soccer/match",
  },
];

export function getLeague(slug: string): LeagueDef {
  const league = LEAGUES.find((l) => l.slug === slug);
  if (!league) throw new Error(`Unknown league: ${slug}`);
  return league;
}
