import { getScoreboard, type EspnEvent } from "@/lib/espn";
import { getLeague } from "@/lib/leagues";

// Group pick'em games (spread guess / straight-up / survivor) are NFL-only for now.
const NFL_PATH = getLeague("nfl").sportPath;

export interface GradedEvent {
  eventId: string;
  completed: boolean;
  winnerTeamId?: string;
  homeTeamId: string;
  awayTeamId: string;
  homeSpread?: number; // home-team-perspective; negative = home favored
}

// Fetches every (season, seasonType, week) combo present in `weeks` and
// returns a flat map of eventId -> graded result. One fetch per distinct
// week, deduped and cached by the underlying ESPN client.
export async function loadGradedEvents(
  weeks: { season: number; seasonType: number; week: number }[]
): Promise<Map<string, GradedEvent>> {
  const unique = new Map<string, { season: number; seasonType: number; week: number }>();
  for (const w of weeks) unique.set(`${w.season}-${w.seasonType}-${w.week}`, w);

  const boards = await Promise.all(
    [...unique.values()].map((w) =>
      getScoreboard(NFL_PATH, { season: w.season, seasonType: w.seasonType, week: w.week }).catch(
        () => ({ events: [] as EspnEvent[] })
      )
    )
  );

  const out = new Map<string, GradedEvent>();
  for (const board of boards) {
    for (const event of board.events) {
      const comp = event.competitions[0];
      const home = comp.competitors.find((c) => c.homeAway === "home");
      const away = comp.competitors.find((c) => c.homeAway === "away");
      if (!home || !away) continue;
      const completed = comp.status.type.state === "post";
      const winner = comp.competitors.find((c) => c.winner === true);
      out.set(event.id, {
        eventId: event.id,
        completed,
        winnerTeamId: winner?.team.id,
        homeTeamId: home.team.id,
        awayTeamId: away.team.id,
        homeSpread: comp.odds?.[0]?.spread,
      });
    }
  }
  return out;
}
