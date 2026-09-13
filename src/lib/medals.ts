// Medal detection for group games with a clear, computable winner: the
// survivor pool (last one alive) and the weekly fantasy game (top score once
// every game in that week is final). Season-long leaderboards for the spread
// and straight-up pick'em games don't have a clean "season over" signal, so
// they're left out for now (known simplification).
import { prisma } from "@/lib/prisma";
import { getScoreboard } from "@/lib/espn";
import { getLeague } from "@/lib/leagues";
import { loadGradedEvents } from "@/lib/grading";
import { scoreFantasyRoster, type FantasyRoster } from "@/lib/fantasy";

const NFL_PATH = getLeague("nfl").sportPath;

async function ensureSurvivorMedal(groupId: string): Promise<void> {
  const group = await prisma.group.findUnique({ where: { id: groupId }, include: { members: true } });
  if (!group || !group.survivorLocked || group.members.length <= 1) return;

  const picks = await prisma.survivorPick.findMany({ where: { groupId } });
  if (picks.length === 0) return;
  const season = picks[0].season;

  const weekRows = [...new Map(picks.map((p) => [`${p.season}-${p.seasonType}-${p.week}`, p])).values()];
  const graded = await loadGradedEvents(weekRows);

  const status = group.members.map((m) => {
    const userPicks = picks.filter((p) => p.userId === m.userId).sort((a, b) => a.week - b.week);
    let eliminated = false;
    for (const pick of userPicks) {
      const g = graded.get(pick.eventId);
      if (!g?.completed) continue;
      if (g.winnerTeamId !== pick.pickedTeamId) {
        eliminated = true;
        break;
      }
    }
    return { userId: m.userId, eliminated };
  });
  const alive = status.filter((s) => !s.eliminated);
  if (alive.length !== 1) return;

  const winnerId = alive[0].userId;
  const existing = await prisma.medal.findUnique({
    where: { userId_groupId_gameMode_season_week: { userId: winnerId, groupId, gameMode: "SURVIVOR", season, week: 0 } },
  });
  if (existing) return;

  await prisma.medal.create({
    data: { userId: winnerId, groupId, gameMode: "SURVIVOR", season, week: 0, title: `${group.name} Survivor Pool Winner` },
  });
}

async function ensureFantasyWeekMedal(groupId: string, groupName: string, season: number, seasonType: number, week: number): Promise<void> {
  const existing = await prisma.medal.findFirst({
    where: { groupId, gameMode: "FANTASY_WEEK", season, week },
  });
  if (existing) return;

  const lineups = await prisma.fantasyLineup.findMany({ where: { groupId, season, seasonType, week } });
  if (lineups.length === 0) return;

  const board = await getScoreboard(NFL_PATH, { season, seasonType, week }).catch(() => null);
  if (!board || board.events.length === 0) return;
  const allFinal = board.events.every((e) => e.competitions[0].status.type.state === "post");
  if (!allFinal) return;

  const scored = await Promise.all(
    lineups.map(async (l) => {
      const roster: FantasyRoster = JSON.parse(l.roster);
      const result = await scoreFantasyRoster(NFL_PATH, roster, season, seasonType, week);
      return { userId: l.userId, total: result.total };
    })
  );
  scored.sort((a, b) => b.total - a.total);
  const winner = scored[0];
  if (!winner) return;

  await prisma.medal.create({
    data: {
      userId: winner.userId,
      groupId,
      gameMode: "FANTASY_WEEK",
      season,
      week,
      title: `${groupName} Week ${week} Fantasy Winner`,
    },
  });
}

// Call whenever a group's page is viewed — cheap, idempotent, and catches up
// any weeks/seasons nobody happened to check back in on right when they wrapped.
export async function ensureMedalsForGroup(groupId: string): Promise<void> {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return;

  const fantasyWeeks = await prisma.fantasyLineup.findMany({
    where: { groupId },
    distinct: ["season", "seasonType", "week"],
    select: { season: true, seasonType: true, week: true },
  });

  await Promise.all([
    ensureSurvivorMedal(groupId),
    ...fantasyWeeks.map((w) => ensureFantasyWeekMedal(groupId, group.name, w.season, w.seasonType, w.week)),
  ]);
}
