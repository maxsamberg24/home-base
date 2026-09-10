// NFL division alignment is effectively static domain knowledge (unlike
// scores/rosters), so it's hardcoded rather than derived from an extra
// ESPN standings call.
export const DIVISIONS: { conference: "AFC" | "NFC"; division: string; teams: string[] }[] = [
  { conference: "AFC", division: "East", teams: ["BUF", "MIA", "NE", "NYJ"] },
  { conference: "AFC", division: "North", teams: ["BAL", "CIN", "CLE", "PIT"] },
  { conference: "AFC", division: "South", teams: ["HOU", "IND", "JAX", "TEN"] },
  { conference: "AFC", division: "West", teams: ["DEN", "KC", "LV", "LAC"] },
  { conference: "NFC", division: "East", teams: ["DAL", "NYG", "PHI", "WSH"] },
  { conference: "NFC", division: "North", teams: ["CHI", "DET", "GB", "MIN"] },
  { conference: "NFC", division: "South", teams: ["ATL", "CAR", "NO", "TB"] },
  { conference: "NFC", division: "West", teams: ["ARI", "LAR", "SF", "SEA"] },
];

export function divisionForAbbreviation(abbr: string) {
  return DIVISIONS.find((d) => d.teams.includes(abbr));
}
