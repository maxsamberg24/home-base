import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/identity";
import { getFriendIds } from "@/lib/friends";
import { getFollowedTeams } from "@/lib/followedTeams";
import { prisma } from "@/lib/prisma";
import TeamCard from "@/components/TeamCard";

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

  const [teams, wagers] = await Promise.all([
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
  ]);

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
