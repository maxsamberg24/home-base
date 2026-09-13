// Championship detection for the trophy shelf. Only the four major pro
// leagues have a single, unambiguous championship game we can reliably spot
// (soccer's title is decided by a season-long table, not one game; college
// football/basketball's playoff formats are out of scope) — confirmed live
// against ESPN that the season's finale always carries a branded headline in
// competition.notes, e.g. "Super Bowl LX", "NBA Finals - Game 4",
// "World Series - Game 7", "Stanley Cup Final - Game 6".
import { prisma } from "@/lib/prisma";
import { getScoreboard } from "@/lib/espn";
import { getLeague } from "@/lib/leagues";

const CHAMPIONSHIP: Record<string, { headline: string; title: string }> = {
  nfl: { headline: "Super Bowl", title: "Super Bowl Champions" },
  nba: { headline: "NBA Finals", title: "NBA Champions" },
  mlb: { headline: "World Series", title: "World Series Champions" },
  nhl: { headline: "Stanley Cup Final", title: "Stanley Cup Champions" },
};

interface RawScheduleEvent {
  date: string;
  competitions: {
    notes?: { headline?: string }[];
    competitors: { team: { id: string }; winner?: boolean }[];
  }[];
}

async function fetchPostseasonEvents(sportPath: string, teamId: string, season: number): Promise<RawScheduleEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/teams/${teamId}/schedule?season=${season}&seasontype=3`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: RawScheduleEvent[] };
    return data.events ?? [];
  } catch {
    return [];
  }
}

// Checks whether `teamId` won the championship in the given season, using
// the last completed championship-round game — a series ends immediately on
// the clinching win, so the most recent one chronologically is always it.
async function wonChampionship(sportPath: string, teamId: string, season: number, headlineMatch: string): Promise<boolean> {
  const events = await fetchPostseasonEvents(sportPath, teamId, season);
  const finals = events
    .filter((e) => e.competitions[0]?.notes?.some((n) => n.headline?.includes(headlineMatch)))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const last = finals[0];
  if (!last) return false;
  return last.competitions[0].competitors.find((c) => c.team.id === teamId)?.winner === true;
}

// Ensures a Trophy row exists for every championship a user's followed teams
// (in the four bracket leagues) have won recently — idempotent via the
// unique constraint, safe to call on every locker page load. Checks both the
// season ESPN currently defaults to and the one before it, since right after
// a championship the "current" season label can be either depending on
// whether the next season has kicked off yet.
export async function ensureTrophiesForUser(userId: string): Promise<void> {
  const favorites = await prisma.favoriteTeam.findMany({
    where: { userId, league: { in: Object.keys(CHAMPIONSHIP) } },
  });
  if (favorites.length === 0) return;

  const leaguesNeeded = [...new Set(favorites.map((f) => f.league))];
  const defaultSeasons = new Map<string, number>();
  await Promise.all(
    leaguesNeeded.map(async (league) => {
      const sportPath = getLeague(league).sportPath;
      const board = await getScoreboard(sportPath).catch(() => null);
      if (board) defaultSeasons.set(league, board.season.year);
    })
  );

  await Promise.all(
    favorites.map(async (f) => {
      const champ = CHAMPIONSHIP[f.league];
      const defaultSeason = defaultSeasons.get(f.league);
      if (!champ || !defaultSeason) return;
      const sportPath = getLeague(f.league).sportPath;

      for (const season of [defaultSeason - 1, defaultSeason]) {
        const existing = await prisma.trophy.findUnique({
          where: { userId_league_teamId_season: { userId, league: f.league, teamId: f.teamId, season } },
        });
        if (existing) continue;

        const won = await wonChampionship(sportPath, f.teamId, season, champ.headline);
        if (won) {
          await prisma.trophy.create({
            data: { userId, league: f.league, teamId: f.teamId, season, title: champ.title },
          });
        }
      }
    })
  );
}
