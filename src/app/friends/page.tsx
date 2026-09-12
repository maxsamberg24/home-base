import Link from "next/link";
import { getCurrentUser } from "@/lib/identity";
import { prisma } from "@/lib/prisma";
import { getFriends } from "@/lib/friends";
import { getFollowedTeams } from "@/lib/followedTeams";
import { addFriend, setFriendCode, setVenmoHandle, createGroup, joinGroup } from "@/app/actions";
import CopyInviteButton from "@/components/CopyInviteButton";

export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [friends, memberships] = await Promise.all([
    getFriends(user.id),
    prisma.groupMember.findMany({
      where: { userId: user.id },
      include: { group: { include: { _count: { select: { members: true } } } } },
      orderBy: { joinedAt: "desc" },
    }),
  ]);

  const friendCards = await Promise.all(
    friends.map(async (friend) => {
      const [teams, wagers] = await Promise.all([
        getFollowedTeams(friend.id),
        prisma.wager.findMany({
          where: {
            status: { in: ["OPEN", "ACCEPTED", "COUNTERED"] },
            OR: [
              { creatorId: user.id, opponentId: friend.id },
              { creatorId: friend.id, opponentId: user.id },
            ],
          },
        }),
      ]);
      return { friend, teams, openWagerCount: wagers.length };
    })
  );

  const inviteMessage = user.friendCode
    ? `${user.name} wants to be friends on The Locker Room! Use this code to add them: ${user.friendCode}`
    : "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl uppercase sm:text-4xl">
          <span className="mark-yellow">Friends</span>
        </h1>
        <p className="mt-2 text-muted">Connect to see their teams and challenge them to picks.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border-[3px] border-ink p-5">
          <h2 className="font-display uppercase mb-3">Your friend code</h2>
          {user.friendCode ? (
            <>
              <div className="rounded-full border-2 border-ink bg-yellow-soft px-4 py-2 text-center font-mono text-lg font-bold tracking-widest">
                {user.friendCode}
              </div>
              <div className="mt-3">
                <CopyInviteButton message={inviteMessage} />
              </div>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted">
                Create a code to share with your friends. You can only set this once, so pick
                something you&apos;ll remember.
              </p>
              <form action={setFriendCode} className="flex gap-2">
                <input
                  name="friendCode"
                  required
                  placeholder="e.g. MAXSPORTS"
                  maxLength={12}
                  className="flex-1 rounded-md border-2 border-ink bg-transparent px-3 py-2 text-sm uppercase tracking-widest outline-none focus:bg-yellow-soft"
                />
                <button
                  type="submit"
                  className="rounded-full border-[3px] border-ink bg-ink px-4 py-2 font-display text-sm uppercase text-paper hover:bg-yellow hover:text-ink transition-colors"
                >
                  Create
                </button>
              </form>
            </>
          )}
        </section>

        <section className="rounded-2xl border-[3px] border-ink p-5">
          <h2 className="font-display uppercase mb-3">Add a friend</h2>
          <form action={addFriend} className="flex gap-2">
            <input
              name="friendCode"
              required
              placeholder="Their friend code"
              maxLength={12}
              className="flex-1 rounded-md border-2 border-ink bg-transparent px-3 py-2 text-sm uppercase tracking-widest outline-none focus:bg-yellow-soft"
            />
            <button
              type="submit"
              className="rounded-full border-[3px] border-ink bg-ink px-4 py-2 font-display text-sm uppercase text-paper hover:bg-yellow hover:text-ink transition-colors"
            >
              Add
            </button>
          </form>
        </section>
      </div>

      <section className="rounded-2xl border-[3px] border-ink p-5">
        <h2 className="font-display uppercase mb-2">Venmo</h2>
        <p className="mb-3 text-xs text-muted">
          Add your handle so friends know where to send winnings. Direct in-app payment is coming soon.
        </p>
        <form action={setVenmoHandle} className="flex gap-2">
          <input
            name="venmoHandle"
            defaultValue={user.venmoHandle ?? ""}
            placeholder="@your-venmo"
            className="flex-1 rounded-md border-2 border-ink bg-transparent px-3 py-2 text-sm outline-none focus:bg-yellow-soft"
          />
          <button
            type="submit"
            className="rounded-full border-[3px] border-ink px-4 py-2 font-display text-sm uppercase hover:bg-yellow-soft transition-colors"
          >
            Save
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-2xl uppercase mb-3">Your friends ({friends.length})</h2>
        {friendCards.length === 0 ? (
          <p className="text-sm text-muted">No friends connected yet — share your code above.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {friendCards.map(({ friend, teams, openWagerCount }) => (
              <Link
                key={friend.id}
                href={`/friends/${friend.id}`}
                className="rounded-2xl border-[3px] border-ink p-4 transition-transform hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#111111]"
              >
                <div className="flex items-center justify-between">
                  <div className="font-display uppercase">{friend.name}</div>
                  {openWagerCount > 0 && (
                    <span className="rounded-full border-2 border-ink bg-yellow px-2 py-0.5 text-[10px] font-black uppercase">
                      {openWagerCount} open bet{openWagerCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {teams.slice(0, 8).map((t) => (
                    <span key={`${t.league}:${t.teamId}`} className="flex items-center gap-1 rounded-full border-2 border-hairline px-2 py-0.5 text-xs">
                      {t.team.logos?.[0]?.href && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.team.logos[0].href} alt="" className="h-3.5 w-3.5" />
                      )}
                      {t.team.abbreviation}
                    </span>
                  ))}
                  {teams.length === 0 && <span className="text-xs text-muted">No teams followed yet</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl uppercase mb-3">Groups</h2>
        <p className="mb-4 text-sm text-muted">
          Make a group with your friends, then play the group games and pools on the Games page
          together.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          <div className="rounded-2xl border-[3px] border-ink p-5">
            <h3 className="font-display uppercase mb-3">Create a group</h3>
            <form action={createGroup} className="flex gap-2">
              <input
                name="name"
                required
                placeholder="e.g. Office Pool"
                className="flex-1 rounded-md border-2 border-ink bg-transparent px-3 py-2 text-sm outline-none focus:bg-yellow-soft"
              />
              <button
                type="submit"
                className="rounded-full border-[3px] border-ink bg-ink px-4 py-2 font-display text-sm uppercase text-paper hover:bg-yellow hover:text-ink transition-colors"
              >
                Create
              </button>
            </form>
          </div>
          <div className="rounded-2xl border-[3px] border-ink p-5">
            <h3 className="font-display uppercase mb-3">Join a group</h3>
            <form action={joinGroup} className="flex gap-2">
              <input
                name="inviteCode"
                required
                placeholder="Invite code"
                maxLength={6}
                className="flex-1 rounded-md border-2 border-ink bg-transparent px-3 py-2 text-sm uppercase tracking-widest outline-none focus:bg-yellow-soft"
              />
              <button
                type="submit"
                className="rounded-full border-[3px] border-ink bg-yellow px-4 py-2 font-display text-sm uppercase text-ink hover:bg-ink hover:text-paper transition-colors"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        {memberships.length === 0 ? (
          <p className="text-sm text-muted">You&apos;re not in any groups yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {memberships.map((m) => (
              <Link
                key={m.group.id}
                href={`/games/groups/${m.group.id}`}
                className="rounded-xl border-[3px] border-ink p-4 transition-transform hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#111111]"
              >
                <div className="font-display uppercase">{m.group.name}</div>
                <div className="mt-1 text-xs text-muted">
                  {m.group._count.members} member{m.group._count.members === 1 ? "" : "s"} · invite
                  code {m.group.inviteCode} · open in Games →
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
