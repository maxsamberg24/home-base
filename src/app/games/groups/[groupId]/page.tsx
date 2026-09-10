import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/identity";
import { prisma } from "@/lib/prisma";

const MODES = [
  {
    href: "lines",
    emoji: "📈",
    title: "Guess the spread",
    body: "Before kickoff, guess the closing point spread for each game. Closest guess wins the week.",
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
    include: { members: { include: { user: true }, orderBy: { joinedAt: "asc" } } },
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

      <section className="grid gap-4 sm:grid-cols-3">
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
    </div>
  );
}
