import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/identity";
import { prisma } from "@/lib/prisma";
import { ensureMedalsForGroup } from "@/lib/medals";
import { postToGroup } from "@/app/actions";
import LockerPreview from "@/components/LockerPreview";

const MODES = [
  {
    href: "lines",
    emoji: "📈",
    title: "Guess the spread",
    body: "Guess the closing point spread for each game, due Tuesday night ET — honor system, don't peek first.",
  },
  {
    href: "straight",
    emoji: "✅",
    title: "Straight-up pick'em",
    body: "Pick the winner of every game, no spread involved. Most correct picks wins.",
  },
  {
    href: "survivor",
    emoji: "💀",
    title: "Survivor pool",
    body: "Pick one winner each week. Lose and you're out. Can't reuse a team all season.",
  },
  {
    href: "fantasy",
    emoji: "🏈",
    title: "Fantasy lineup",
    body: "Build the best weekly PPR lineup: QB/RB/RB/WR/WR/TE/K/DEF. Resets every week.",
  },
];

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: true }, orderBy: { joinedAt: "asc" } },
      posts: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!group) notFound();

  const isMember = group.members.some((m) => m.userId === user.id);
  if (!isMember) {
    return (
      <div className="rounded-2xl border-[3px] border-ink p-6 text-center">
        <p className="text-muted">
          You&apos;re not a member of {group.name}. Use invite code{" "}
          <span className="font-mono font-bold text-ink">{group.inviteCode}</span> from the Games
          page to join.
        </p>
      </div>
    );
  }

  await ensureMedalsForGroup(groupId);

  const memberIds = group.members.map((m) => m.userId);
  const [allPhotos, allTrophies, groupMedals] = await Promise.all([
    prisma.photo.findMany({ where: { userId: { in: memberIds }, publicSlot: { not: null } } }),
    prisma.trophy.findMany({ where: { userId: { in: memberIds } } }),
    prisma.medal.findMany({ where: { groupId } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl uppercase sm:text-4xl">{group.name}</h1>
        <p className="mt-2 text-sm text-muted">
          Invite code:{" "}
          <span className="rounded-full border-2 border-ink bg-yellow-soft px-2 py-0.5 font-mono font-bold text-ink">
            {group.inviteCode}
          </span>{" "}
          · share it with friends to join
        </p>
      </div>

      <section>
        <h2 className="font-display uppercase mb-3">Members ({group.members.length})</h2>
        <div className="flex flex-wrap gap-2">
          {group.members.map((m) => (
            <span key={m.id} className="rounded-full border-2 border-ink px-3 py-1 text-sm font-medium">
              {m.user.name}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display uppercase mb-1">Lockers</h2>
        <p className="mb-3 text-sm text-muted">Everyone&apos;s door photos, trophies, and medals earned in this group.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {group.members.map((m) => {
            const memberSlots = [1, 2, 3].map(
              (slot) => allPhotos.find((p) => p.userId === m.userId && p.publicSlot === slot) ?? null
            );
            const memberTrophies = allTrophies.filter((t) => t.userId === m.userId);
            const memberMedals = groupMedals.filter((med) => med.userId === m.userId);
            return (
              <div key={m.id}>
                <div className="mb-2 text-center font-display text-sm uppercase">
                  {m.user.name}
                  {m.userId === user.id && " (you)"}
                </div>
                <LockerPreview
                  name={m.user.name}
                  photos={memberSlots}
                  note={m.user.lockerNote}
                  trophies={memberTrophies}
                  medals={memberMedals}
                  compact
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODES.map((mode) => (
          <Link
            key={mode.href}
            href={`/games/groups/${group.id}/${mode.href}`}
            className="rounded-2xl border-[3px] border-ink p-5 transition-transform hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#111111]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border-[3px] border-ink bg-yellow text-xl">
              {mode.emoji}
            </span>
            <div className="mt-3 font-display uppercase">{mode.title}</div>
            <div className="mt-1 text-sm text-muted">{mode.body}</div>
          </Link>
        ))}
      </section>

      <section>
        <h2 className="font-display uppercase mb-3">Group board</h2>
        <p className="mb-3 text-sm text-muted">
          Post here — like sharing a game&apos;s ticket price and asking who&apos;s in.
        </p>
        <form action={postToGroup} className="mb-4 flex gap-2">
          <input type="hidden" name="groupId" value={group.id} />
          <input
            name="message"
            required
            placeholder="e.g. Anyone wanna rip the Rams game?"
            className="flex-1 rounded-md border-2 border-ink bg-transparent px-3 py-2 text-sm outline-none focus:bg-yellow-soft"
          />
          <button
            type="submit"
            className="rounded-full border-[3px] border-ink bg-ink px-4 py-2 font-display text-sm uppercase text-paper hover:bg-yellow hover:text-ink transition-colors"
          >
            Post
          </button>
        </form>
        {group.posts.length === 0 ? (
          <p className="text-sm text-muted">No posts yet.</p>
        ) : (
          <div className="space-y-2">
            {group.posts.map((post) => (
              <div key={post.id} className="rounded-xl border-2 border-hairline p-3 text-sm">
                <span className="font-bold">{post.user.name}:</span> {post.message}
                <div className="mt-1 text-[10px] uppercase text-muted">
                  {new Date(post.createdAt).toLocaleString(undefined, {
                    timeZone: "America/New_York",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
