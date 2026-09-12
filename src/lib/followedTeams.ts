import { prisma } from "@/lib/prisma";
import { getTeam, type EspnTeamDetail } from "@/lib/espn";
import { getLeague } from "@/lib/leagues";

export interface FollowedTeam {
  league: string; // our slug
  teamId: string;
  team: EspnTeamDetail;
}

// Fetches full ESPN team detail (record, next event, logos) for everything a
// user follows. Fetches run in parallel; a team whose ESPN call fails is
// silently dropped rather than failing the whole page.
export async function getFollowedTeams(userId: string): Promise<FollowedTeam[]> {
  const favorites = await prisma.favoriteTeam.findMany({
    where: { userId },
    orderBy: { addedAt: "asc" },
  });

  const results = await Promise.all(
    favorites.map(async (f): Promise<FollowedTeam | null> => {
      try {
        const league = getLeague(f.league);
        const team = await getTeam(league.sportPath, f.teamId);
        return { league: f.league, teamId: f.teamId, team };
      } catch {
        return null;
      }
    })
  );

  return results.filter((r): r is FollowedTeam => r !== null);
}
