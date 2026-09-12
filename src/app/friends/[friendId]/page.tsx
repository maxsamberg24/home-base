import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/identity";
import { getFriendIds } from "@/lib/friends";
import { getFollowedTeams } from "@/lib/followedTeams";
import { getTeams } from "@/lib/espn";
import { getLeague } from "@/lib/leagues";
import { CURRENT_SEASON } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import TeamCard from "@/components/TeamCard";

const AWARD_LABELS: Record<string, string> = {
  SB_WINNER: "Super Bowl champion",
  MVP: "MVP",
  OROY: "Offensive Rookie of the Year",
  DROY: "Defensive Rookie of the Year",
  COACH_OY: "Coach of the Year",
};

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ friendId: string }>;
}) {
  const { friendId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const friendIds = await getFriendIds(user.id);
  if (!friendIds.has(friendId)) notFound();

  const friend = await prisma.user.findUnique({ where: { id: friendId } });
  if (!friend) notFound();

  const [teams, wagers, openPosted, seasonPrediction, awardPredictions, nflTeams] = await Promise.all([
    getFollowedTeams(friend.id),
    prisma.wager.findMany({
      where: {
        OR: [
          { creatorId: user.id, opponentId: friendId },
          { creatorId: friendId, opponentId: user.id },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.wager.findMany({
      where: { creatorId: friendId, opponentId: null, status: "OPEN" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.seasonPrediction.findUnique({
      where: { userId_season: { userId: friendId, season: CURRENT_SEASON } },
    }),
    prisma.awardPrediction.findMany({ where: { userId: friendId, season: CURRENT_SEASON } }),
    getTeams(getLeague("nfl").sportPath).catch(() => []),
  ]);

  const winTotals: Record<string, number> = seasonPrediction ? JSON.parse(seasonPrediction.winTotals) : {};
  const topPicks = Object.entries(winTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([teamId, wins]) => ({ team: nflTeams.find((t) => t.id === teamId), wins }))
    .filter((p) => p.team);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl uppercase sm:text-4xl">{friend.name}</h1>
        <Link href="/friends" className="text-sm font-display uppercase underline decoration-yellow decoration-4 underline-offset-4">
          ← Friends
        </Link>
      </div>

      {friend.venmoHandle && (
        <p className="text-sm text-muted">
          Venmo: <span className="font-medium text-ink">{friend.venmoHandle}</span>
        </p>
      )}

      <section>
        <h2 className="font-display text-xl uppercase mb-3">Teams they follow</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-muted">No teams followed yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {teams.map((t) => (
              <Link key={`${t.league}:${t.teamId}`} href={`/teams/${t.league}/${t.teamId}`}>
                <TeamCard team={t.team} league={t.league} size="sm" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl uppercase mb-3">{CURRENT_SEASON} predictions</h2>
        {topPicks.length === 0 && awardPredictions.length === 0 ? (
          <p className="text-sm text-muted">No predictions made yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {topPicks.length > 0 && (
              <div className="rounded-xl border-2 border-hairline p-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                  Top predicted win totals
                </h3>
                <ul className="space-y-1.5 text-sm">
                  {topPicks.map(({ team, wins }) => (
                    <li key={team!.id} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        {team!.logo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={team!.logo} alt="" className="h-4 w-4" />
                        )}
                        {team!.displayName}
                      </span>
                      <span className="font-bold">{wins}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {awardPredictions.length > 0 && (
              <div className="rounded-xl border-2 border-hairline p-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Futures</h3>
                <ul className="space-y-1.5 text-sm">
                  {awardPredictions.map((a) => (
                    <li key={a.category} className="flex items-center justify-between gap-2">
                      <span className="text-muted">{AWARD_LABELS[a.category] ?? a.category}</span>
                      <span className="font-bold">
                        {a.category === "SB_WINNER" ? nflTeams.find((t) => t.id === a.value)?.displayName ?? a.value : a.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl uppercase mb-3">Posted picks</h2>
        {openPosted.length === 0 ? (
          <p className="text-sm text-muted">No open picks posted right now.</p>
        ) : (
          <div className="space-y-2">
            {openPosted.map((w) => (
              <div key={w.id} className="rounded-xl border-2 border-hairline p-3 text-sm">
                <span className="font-medium">{w.description}</span>{" "}
                <span className="text-muted">
                  {w.line ? `(${w.line}) · ` : ""}${w.stake} · open to any friend
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl uppercase mb-3">Bets with {friend.name}</h2>
        {wagers.length === 0 ? (
          <p className="text-sm text-muted">No history yet — head to Games to post a pick.</p>
        ) : (
          <div className="space-y-2">
            {wagers.map((w) => {
              const iAmCreator = w.creatorId === user.id;
              return (
                <div key={w.id} className="rounded-xl border-[3px] border-ink p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{w.description}</span>
                    <span className="rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-bold uppercase">
                      {w.status}
                    </span>
                  </div>
                  <div className="mt-1 text-muted">
                    {w.line ? `${w.line} · ` : ""}${w.stake} · posted by {iAmCreator ? "you" : friend.name}
                    {w.status === "SETTLED" && w.result && (
                      <>
                        {" "}
                        ·{" "}
                        {w.result === "PUSH"
                          ? "push"
                          : (w.result === "CREATOR_WON") === iAmCreator
                            ? "you won"
                            : "you lost"}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
