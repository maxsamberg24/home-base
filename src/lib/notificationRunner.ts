// The "Locker Room agent": looks at everyone who turned on text alerts for a
// team they follow, checks that team's schedule, and texts about whatever
// just happened. Meant to be called every few minutes (see
// netlify/functions/send-text-updates.mts) — safe to call as often as you
// like since NotificationLog guarantees each text goes out once.
import { prisma } from "@/lib/prisma";
import { getLeague } from "@/lib/leagues";
import { getLeagueTeamSchedule } from "@/lib/sports";
import { formatGameTime } from "@/lib/dates";
import { sendTextUpdate } from "@/lib/notifications";
import type { ScheduleEvent } from "@/lib/espn";

const MIN = 60 * 1000;
const GAME_START_WINDOW = 30 * MIN; // text this long before the game starts
const FINAL_SCORE_WINDOW = 8 * 60 * MIN; // don't blast old results at someone who just enabled alerts
const SCORE_UPDATE_MIN_GAP = 10 * MIN; // at most one live-score text per game per 10 minutes

export interface PlannedText {
  user: string;
  to: string;
  kind: string;
  message: string;
  status?: "sent" | "failed";
  error?: string;
}

function describe(event: ScheduleEvent, teamId: string) {
  const comp = event.competitions[0];
  const self = comp?.competitors.find((c) => c.team.id === teamId);
  const opp = comp?.competitors.find((c) => c.team.id !== teamId);
  if (!comp || !self || !opp) return null;
  const selfName = self.team.shortDisplayName ?? self.team.displayName;
  const oppName = opp.team.shortDisplayName ?? opp.team.displayName;
  const selfScore = (self as { score?: { displayValue: string } }).score?.displayValue ?? "0";
  const oppScore = (opp as { score?: { displayValue: string } }).score?.displayValue ?? "0";
  return {
    state: comp.status.type.state,
    selfName,
    oppName,
    selfScore,
    oppScore,
    won: self.winner === true,
    lost: opp.winner === true,
    atOrVs: self.homeAway === "home" ? "vs" : "@",
  };
}

export async function runNotifications(opts: { dry?: boolean; now?: Date } = {}): Promise<PlannedText[]> {
  const now = opts.now ?? new Date();

  const favorites = await prisma.favoriteTeam.findMany({
    where: {
      OR: [{ notifyGameStart: true }, { notifyScoreUpdates: true }, { notifyFinalScore: true }],
      user: { phoneNumber: { not: null } },
    },
    include: { user: true },
  });
  if (favorites.length === 0) return [];

  const schedules = new Map<string, ScheduleEvent[]>();
  await Promise.all(
    [...new Set(favorites.map((f) => `${f.league}:${f.teamId}`))].map(async (key) => {
      const [league, teamId] = key.split(":");
      schedules.set(key, await getLeagueTeamSchedule(getLeague(league), teamId).catch(() => []));
    })
  );

  const results: PlannedText[] = [];

  for (const fav of favorites) {
    const to = fav.user.phoneNumber!;
    for (const event of schedules.get(`${fav.league}:${fav.teamId}`) ?? []) {
      const d = describe(event, fav.teamId);
      if (!d) continue;
      const startsAt = new Date(event.date);
      let plan: { kind: string; message: string } | null = null;

      if (fav.notifyGameStart && d.state === "pre") {
        const until = +startsAt - +now;
        if (until > 0 && until <= GAME_START_WINDOW) {
          plan = { kind: "GAMESTART", message: `🏟️ ${d.selfName} ${d.atOrVs} ${d.oppName} starts at ${formatGameTime(event.date)}.` };
        }
      } else if (fav.notifyScoreUpdates && d.state === "in") {
        plan = {
          kind: `SCORE:${d.selfScore}-${d.oppScore}`,
          message: `⏱️ Live: ${d.selfName} ${d.selfScore}, ${d.oppName} ${d.oppScore}.`,
        };
      } else if (fav.notifyFinalScore && d.state === "post") {
        if (+now - +startsAt <= FINAL_SCORE_WINDOW && +startsAt <= +now) {
          const outcome = d.won ? "W" : d.lost ? "L" : "D";
          plan = {
            kind: "FINAL",
            message: `🏁 Final: ${d.selfName} ${d.selfScore}, ${d.oppName} ${d.oppScore} (${outcome}).`,
          };
        }
      }
      if (!plan) continue;

      const entry: PlannedText = { user: fav.user.name, to, kind: plan.kind, message: plan.message };
      const key = { userId: fav.userId, league: fav.league, teamId: fav.teamId, eventId: event.id, kind: plan.kind };

      if (await prisma.notificationLog.findUnique({ where: { userId_league_teamId_eventId_kind: key } })) {
        continue;
      }
      if (plan.kind.startsWith("SCORE:")) {
        const recent = await prisma.notificationLog.findFirst({
          where: {
            userId: fav.userId,
            league: fav.league,
            teamId: fav.teamId,
            eventId: event.id,
            kind: { startsWith: "SCORE:" },
            sentAt: { gt: new Date(+now - SCORE_UPDATE_MIN_GAP) },
          },
        });
        if (recent) continue;
      }

      if (opts.dry) {
        results.push(entry);
        continue;
      }

      // Log first (unique constraint) so two overlapping runs can't both send.
      try {
        await prisma.notificationLog.create({ data: { ...key, sentAt: now } });
      } catch {
        continue;
      }
      try {
        await sendTextUpdate(to, plan.message);
        entry.status = "sent";
      } catch (e) {
        entry.status = "failed";
        entry.error = e instanceof Error ? e.message : String(e);
        await prisma.notificationLog.delete({ where: { userId_league_teamId_eventId_kind: key } }).catch(() => {});
      }
      results.push(entry);
    }
  }

  return results;
}
