import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/identity";
import { prisma } from "@/lib/prisma";
import { getScoreboard, getCurrentWeek } from "@/lib/espn";
import { loadGradedEvents } from "@/lib/grading";
import { submitLinePick } from "@/app/actions";
import WeekSelector from "@/components/WeekSelector";

export default async function LinesPage({
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

  const [myPicks, weekRows, allPicksEver] = await Promise.all([
    prisma.linePick.findMany({ where: { groupId, userId: user.id, season, seasonType, week } }),
    prisma.linePick.findMany({
      where: { groupId },
      distinct: ["season", "seasonType", "week"],
      select: { season: true, seasonType: true, week: true },
    }),
    prisma.linePick.findMany({ where: { groupId } }),
  ]);
  const myGuessByEvent = Object.fromEntries(myPicks.map((p) => [p.eventId, p.guessedSpread]));

  const graded = await loadGradedEvents(weekRows);
  const leaderboard = memberIds.map((uid) => {
    const member = group.members.find((m) => m.userId === uid)!;
    const picks = allPicksEver.filter((p) => p.userId === uid);
    let totalError = 0;
    let gradedCount = 0;
    for (const pick of picks) {
      const g = graded.get(pick.eventId);
      if (!g?.completed || g.homeSpread === undefined) continue;
      gradedCount++;
      totalError += Math.abs(pick.guessedSpread - g.homeSpread);
    }
    return { name: member.user.name, totalError, gradedCount };
  });
  leaderboard.sort((a, b) => {
    if (a.gradedCount === 0 && b.gradedCount === 0) return 0;
    if (a.gradedCount === 0) return 1;
    if (b.gradedCount === 0) return -1;
    return a.totalError - b.totalError;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase sm:text-3xl">
          {group.name} · Guess the spread
        </h1>
        <p className="mt-1 text-sm text-muted">
          Enter your guess for the home-team spread before kickoff. Closest to the actual closing
          line wins — lower total error is better.
        </p>
      </div>

      <WeekSelector
        basePath={`/games/groups/${groupId}/lines`}
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
            const actualSpread = comp.odds?.[0]?.spread;
            const myGuess = myGuessByEvent[event.id];

            return (
              <div key={event.id} className="rounded-xl border-[3px] border-ink p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-muted">
                  <span>
                    {comp.status.type.shortDetail}
                    {locked && " · picks locked"}
                  </span>
                  {actualSpread !== undefined && (
                    <span>
                      Line: {home.team.abbreviation} {actualSpread > 0 ? "+" : ""}
                      {actualSpread}
                    </span>
                  )}
                </div>
                <div className="mb-3 flex items-center gap-2 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {away.team.logo && <img src={away.team.logo} alt="" className="h-6 w-6" />}
                  <span className="font-medium">{away.team.shortDisplayName}</span>
                  <span className="text-muted">@</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {home.team.logo && <img src={home.team.logo} alt="" className="h-6 w-6" />}
                  <span className="font-medium">{home.team.shortDisplayName}</span>
                </div>
                <form action={submitLinePick} className="flex items-center gap-2">
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="season" value={season} />
                  <input type="hidden" name="week" value={week} />
                  <input type="hidden" name="seasonType" value={seasonType} />
                  <span className="text-xs text-muted">{home.team.abbreviation} spread</span>
                  <input
                    type="number"
                    step={0.5}
                    name="guessedSpread"
                    defaultValue={myGuess ?? ""}
                    disabled={locked}
                    placeholder="e.g. -3.5"
                    className="w-24 rounded-md border-2 border-ink bg-transparent px-2 py-1 text-sm outline-none focus:bg-yellow-soft disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={locked}
                    className="rounded-full border-[3px] border-ink bg-ink px-4 py-1 font-display text-xs uppercase text-paper transition-colors hover:bg-yellow hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {myGuess !== undefined ? "Update" : "Guess"}
                  </button>
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
                  {row.gradedCount > 0 ? `${row.totalError.toFixed(1)} pts off` : "—"}
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
