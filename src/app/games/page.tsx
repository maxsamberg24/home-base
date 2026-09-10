import Link from "next/link";
import { getCurrentUser } from "@/lib/identity";
import { prisma } from "@/lib/prisma";
import { createGroup, joinGroup } from "@/app/actions";

export default async function GamesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: { group: { include: { _count: { select: { members: true } } } } },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl uppercase sm:text-4xl">
          <span className="mark-yellow">Games</span>
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Three ways to compete with friends each week: guess the spread, straight-up pick&apos;em,
          and survivor. Create or join a group to get started.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border-[3px] border-ink p-5">
          <h2 className="font-display uppercase mb-3">Create a group</h2>
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
        </section>

        <section className="rounded-2xl border-[3px] border-ink p-5">
          <h2 className="font-display uppercase mb-3">Join a group</h2>
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
        </section>
      </div>

      <section>
        <h2 className="font-display uppercase mb-3">Your groups</h2>
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
                  code {m.group.inviteCode}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
