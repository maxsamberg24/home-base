// Standard PPR scoring, computed from ESPN's per-game boxscore stats.
// Known simplifications (consistent with the rest of the app): kicker
// scoring is flat per-make (3 pts/FG, 1 pt/XP) since ESPN's boxscore doesn't
// expose individual kick distances here, and DEF doesn't get fumble-recovery
// points since the boxscore doesn't cleanly attribute which team recovered.
import { getScoreboard, getBoxscore, type BoxscoreTeamStats } from "./espn";

export const FANTASY_SLOTS = ["QB", "RB1", "RB2", "WR1", "WR2", "TE", "K", "DEF"] as const;
export type FantasySlot = (typeof FANTASY_SLOTS)[number];

export interface FantasyRosterPlayer {
  id: string; // ESPN athlete id (DEF uses its own team id here)
  name: string;
  teamId: string;
  teamAbbr: string;
}

export type FantasyRoster = Partial<Record<FantasySlot, FantasyRosterPlayer>>;

export interface ScoredSlot {
  slot: FantasySlot;
  player: FantasyRosterPlayer;
  points: number;
  completed: boolean;
}

function num(stats: string[] | undefined, idx: number): number {
  const raw = stats?.[idx];
  if (!raw) return 0;
  const [made] = raw.split("/");
  const n = Number(made);
  return Number.isNaN(n) ? 0 : n;
}

function athleteStats(team: BoxscoreTeamStats | undefined, category: string, athleteId: string): string[] | undefined {
  return team?.categories.find((c) => c.name === category)?.athletes.find((a) => a.athleteId === athleteId)?.stats;
}

function scoreSkillPlayer(team: BoxscoreTeamStats | undefined, athleteId: string, isKicker: boolean): number {
  if (isKicker) {
    const kicking = athleteStats(team, "kicking", athleteId);
    return num(kicking, 0) * 3 + num(kicking, 3) * 1; // FG makes, XP makes
  }
  let pts = 0;
  const passing = athleteStats(team, "passing", athleteId);
  if (passing) {
    pts += num(passing, 1) / 25; // pass yds
    pts += num(passing, 3) * 4; // pass TD
    pts -= num(passing, 4) * 2; // INT
  }
  const rushing = athleteStats(team, "rushing", athleteId);
  if (rushing) {
    pts += num(rushing, 1) / 10; // rush yds
    pts += num(rushing, 3) * 6; // rush TD
  }
  const receiving = athleteStats(team, "receiving", athleteId);
  if (receiving) {
    pts += num(receiving, 0) * 1; // receptions (PPR)
    pts += num(receiving, 1) / 10; // rec yds
    pts += num(receiving, 3) * 6; // rec TD
  }
  const fumbles = athleteStats(team, "fumbles", athleteId);
  if (fumbles) pts -= num(fumbles, 1) * 2; // fumbles lost
  return pts;
}

function scoreDefense(team: BoxscoreTeamStats | undefined, opponentScore: number | undefined): number {
  let pts = 0;
  const defCat = team?.categories.find((c) => c.name === "defensive");
  for (const a of defCat?.athletes ?? []) {
    pts += num(a.stats, 2) * 1; // sacks
    pts += num(a.stats, 6) * 6; // defensive TD
  }
  const intCat = team?.categories.find((c) => c.name === "interceptions");
  for (const a of intCat?.athletes ?? []) {
    pts += num(a.stats, 0) * 2; // INT
    pts += num(a.stats, 2) * 6; // pick-six
  }
  for (const catName of ["kickReturns", "puntReturns"]) {
    const cat = team?.categories.find((c) => c.name === catName);
    for (const a of cat?.athletes ?? []) pts += num(a.stats, 4) * 6; // return TD
  }
  if (opponentScore !== undefined) {
    if (opponentScore === 0) pts += 10;
    else if (opponentScore <= 6) pts += 7;
    else if (opponentScore <= 13) pts += 4;
    else if (opponentScore <= 20) pts += 1;
    else if (opponentScore <= 27) pts += 0;
    else if (opponentScore <= 34) pts -= 1;
    else pts -= 4;
  }
  return pts;
}

export async function scoreFantasyRoster(
  sportPath: string,
  roster: FantasyRoster,
  season: number,
  seasonType: number,
  week: number
): Promise<{ slots: ScoredSlot[]; total: number; allGraded: boolean }> {
  const board = await getScoreboard(sportPath, { season, seasonType, week });
  const eventByTeam = new Map<string, { eventId: string; completed: boolean; opponentScore?: number }>();
  for (const event of board.events) {
    const comp = event.competitions[0];
    for (const c of comp.competitors) {
      const opp = comp.competitors.find((o) => o.team.id !== c.team.id);
      eventByTeam.set(c.team.id, {
        eventId: event.id,
        completed: comp.status.type.state === "post",
        opponentScore: opp ? Number((opp as unknown as { score?: string }).score) : undefined,
      });
    }
  }

  const boxCache = new Map<string, Promise<BoxscoreTeamStats[] | null>>();
  function boxscoreFor(eventId: string) {
    if (!boxCache.has(eventId)) boxCache.set(eventId, getBoxscore(sportPath, eventId));
    return boxCache.get(eventId)!;
  }

  const slots: ScoredSlot[] = [];
  let allGraded = true;

  for (const slotKey of FANTASY_SLOTS) {
    const player = roster[slotKey];
    if (!player) {
      allGraded = false;
      continue;
    }
    const meta = eventByTeam.get(player.teamId);
    if (!meta || !meta.completed) {
      slots.push({ slot: slotKey, player, points: 0, completed: false });
      allGraded = false;
      continue;
    }
    const teams = await boxscoreFor(meta.eventId);
    const team = teams?.find((t) => t.teamId === player.teamId);
    const points = slotKey === "DEF" ? scoreDefense(team, meta.opponentScore) : scoreSkillPlayer(team, player.id, slotKey === "K");
    slots.push({ slot: slotKey, player, points, completed: true });
  }

  return { slots, total: slots.reduce((s, x) => s + x.points, 0), allGraded };
}
