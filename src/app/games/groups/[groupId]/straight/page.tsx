import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/identity";
import { prisma } from "@/lib/prisma";
import { getScoreboard, getCurrentWeek } from "@/lib/espn";
import { loadGradedEvents } from "@/lib/grading";
import { submitStraightPick } from "@/app/actions";
import WeekSelector from "@/components/WeekSelector";

export default async function StraightPickPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ season?: string; seasonType?: string; week?: string }>;
}) {
  const { groupId } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: { include: { user: true } } },
  });
  if (!group) notFound();
  if (!group.members.some((m) => m.userId === user.id)) notFound();

  const defaults = sp.week ? null : await getCurrentWeek();
  const season = Number(sp.season) || defaults?.season || new Date().getFullYear();
  const seasonType = Number(sp.seasonType) || defaults?.seasonType || 2;
  const week = Number(sp.week) || defaults?.week || 1;

  const board = await getScoreboard({ season, seasonType, week });
  const memberIds = group.members.map((m) => m.userId);

  const [myPicks, weekRows] = await Promise.all([
    prisma.straightPick.findMany({ where: { groupId, userId: user.id, season, seasonType, week } }),
    prisma.straightPick.findMany({
      where: { groupId },
      distinct: ["season", "seasonType", "week"],
      select: { season: true, seasonType: true, week: true },
    }),
  ]);
  const myPickByEvent = Object.fromEntries(myPicks.map((p) => [p.eventId, p.pickedTeamId]));

  const graded = await loadGradedEvents(weekRows);
  const allPicksEver = await prisma.straightPick.findMany({ where: { groupId } });
  const leaderboard = memberIds.map((uid) => {
    const member = group.members.find((m) => m.userId === uid)!;
    const picks = allPicksEver.filter((p) => p.userId === uid);
    let correct = 0;
    let gradedCount = 0;
    for (const pick of picks) {
      const g = graded.get(pick.eventId);
      if (!g?.completed) continue;
      gradedCount++;
      if (g.winnerTeamId === pick.pickedTeamId) correct++;
    }
    return { name: member.user.name, correct, gradedCount };
  });
  leaderboard.sort((a, b) => b.correct - a.correct);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase sm:text-3xl">
          {group.name} · Straight-up pick&apos;em
        </h1>
        <p className="mt-1 text-sm text-muted">Pick the winner of every game. No spread.</p>
      </div>

      <WeekSelector
        basePath={`/games/groups/${groupId}/straight`}
        season={season}
        seasonType={seasonType}
        week={week}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-3">
          {board.events.length === 0 && (
            <p className="text-sm text-muted">No games scheduled for this week.</p>
          )}
          {board.events.map((event) => {
            const comp = event.competitions[0];
            const home = comp.competitors.find((c) => c.homeAway === "home")!;
            const away = comp.competitors.find((c) => c.homeAway === "away")!;
            const locked = comp.status.type.state !== "pre";
            const currentPick = myPickByEvent[event.id];
            const wasCompleted = comp.status.type.state === "post";

            return (
              <div key={event.id} className="rounded-xl border-[3px] border-ink p-4">
                <div className="mb-2 text-xs text-muted">
                  {comp.status.type.shortDetail}
                  {locked && !wasCompleted && " · picks locked"}
                </div>
                <form action={submitStraightPick} className="flex items-center gap-2">
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="season" value={season} />
                  <input type="hidden" name="week" value={week} />
                  <input type="hidden" name="seasonType" value={seasonType} />
                  {[away, home].map((c) => {
                    const isPicked = currentPick === c.team.id;
                    const isWinner = wasCompleted && c.winner === true;
                    return (
                      <button
                        key={c.team.id}
                        type="submit"
                        name="pickedTeamId"
                        value={c.team.id}
                        disabled={locked}
                        className={`flex flex-1 items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          isPicked ? "border-ink bg-yellow" : "border-hairline hover:bg-yellow-soft"
                        } ${isWinner ? "ring-2 ring-ink ring-offset-1" : ""}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {c.team.logo && <img src={c.team.logo} alt="" className="h-6 w-6" />}
                        <span className="truncate">{c.team.shortDisplayName ?? c.team.name}</span>
                        {c.score && wasCompleted && (
                          <span className="ml-auto font-medium">{c.score}</span>
                        )}
                      </button>
                    );
                  })}
                </form>
              </div>
            );
          })}
        </section>

        <aside className="rounded-2xl border-[3px] border-ink p-5 h-fit">
          <h2 className="font-display uppercase mb-3">Season leaderboard</h2>
          <ol className="space-y-2 text-sm">
            {leaderboard.map((row, i) => (
              <li key={row.name} className="flex items-center justify-between">
                <span>
                  {i + 1}. {row.name}
                </span>
                <span className="font-bold">
                  {row.correct}/{row.gradedCount}
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
