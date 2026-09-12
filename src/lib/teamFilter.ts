export const TEAM_FILTER_COOKIE = "team_filter"; // "ALL" or "league:teamId,league:teamId"

export function teamKey(league: string, teamId: string) {
  return `${league}:${teamId}`;
}

export function parseFilterCookie(value: string | undefined, allKeys: string[]): Set<string> {
  if (!value || value === "ALL") return new Set(allKeys);
  if (value === "NONE") return new Set();
  return new Set(value.split(",").filter(Boolean));
}
