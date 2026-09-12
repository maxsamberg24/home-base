import Link from "next/link";
import { getCurrentUser } from "@/lib/identity";
import { prisma } from "@/lib/prisma";
import { getFriends } from "@/lib/friends";
import {
  createGroup,
  joinGroup,
  postWager,
  acceptWager,
  declineWager,
  counterWager,
  settleWager,
} from "@/app/actions";

const MODES = [
  {
    href: "predictions",
    emoji: "🔮",
    title: "Predictions",
    body: "Call every team's win total for the season, plus your Super Bowl and MVP futures.",
  },
];

const GROUP_MODES = [
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
  {
    href: "fantasy",
    emoji: "🏈",
    title: "Fantasy lineup",
    body: "Build the best QB/RB/RB/WR/WR/TE/K/DEF lineup for the week. Standard PPR, resets weekly.",
  },
];

export default async function GamesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [memberships, friends, myWagers] = await Promise.all([
    prisma.groupMember.findMany({
      where: { userId: user.id },
      include: { group: { include: { _count: { select: { members: true } } } } },
      orderBy: { joinedAt: "desc" },
    }),
    getFriends(user.id),
    prisma.wager.findMany({
      where: { OR: [{ creatorId: user.id }, { opponentId: user.id }] },
      include: { creator: true, opponent: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const nameOf = (id: string) => (id === user.id ? "you" : friends.find((f) => f.id === id)?.name ?? "someone");

  const settled = myWagers.filter((w) => w.status === "SETTLED");
  const wins = settled.filter(
    (w) => (w.result === "CREATOR_WON" && w.creatorId === user.id) || (w.result === "OPPONENT_WON" && w.opponentId === user.id)
  );
  const losses = settled.filter(
    (w) => (w.result === "CREATOR_WON" && w.opponentId === user.id) || (w.result === "OPPONENT_WON" && w.creatorId === user.id)
  );
  const net = wins.reduce((s, w) => s + w.stake, 0) - losses.reduce((s, w) => s + w.stake, 0);
  const liveWagers = myWagers.filter((w) => w.status === "ACCEPTED");
  const atRisk = liveWagers.reduce((s, w) => s + w.stake, 0);
  const myOpenPicks = myWagers.filter((w) => w.status === "OPEN" && w.creatorId === user.id);
  const friendHub = myWagers.filter(
    (w) => w.status === "OPEN" && w.creatorId !== user.id && (w.opponentId === user.id || w.opponentId === null)
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl uppercase sm:text-4xl">
          <span className="mark-yellow">Games</span>
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Predictions, group pick&apos;em pools, and friend-to-friend picks — all in one place.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-y-6 border-y-[3px] border-ink py-5 sm:grid-cols-4">
        {[
          { label: "Settled record", value: `${wins.length}-${losses.length}` },
          { label: "Net", value: `${net >= 0 ? "+" : ""}$${net.toFixed(0)}` },
          { label: "At risk", value: `$${atRisk.toFixed(0)}` },
          { label: "Looking for action", value: myOpenPicks.length },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`px-4 border-ink ${i % 2 === 1 ? "border-l-[3px]" : "border-l-0"} sm:border-l-[3px] ${
              i === 0 ? "sm:border-l-0" : ""
            }`}
          >
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted">{s.label}</div>
            <div className="font-display text-2xl uppercase">{s.value}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-display text-xl uppercase mb-3">Live wagers</h2>
        {liveWagers.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-hairline p-4 text-sm text-muted">
            Nothing riding right now.
          </p>
        ) : (
          <div className="space-y-2">
            {liveWagers.map((w) => (
              <div key={w.id} className="rounded-xl border-[3px] border-ink p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {w.description} {w.line ? `(${w.line})` : ""} · ${w.stake} vs{" "}
                    {nameOf(w.creatorId === user.id ? (w.opponentId ?? "") : w.creatorId)}
                  </span>
                  <form action={settleWager} className="flex gap-1">
                    <input type="hidden" name="wagerId" value={w.id} />
                    <button name="result" value="CREATOR_WON" className="rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-bold uppercase hover:bg-yellow-soft">
                      {nameOf(w.creatorId)} won
                    </button>
                    <button name="result" value="OPPONENT_WON" className="rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-bold uppercase hover:bg-yellow-soft">
                      {nameOf(w.opponentId ?? "")} won
                    </button>
                    <button name="result" value="PUSH" className="rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-bold uppercase hover:bg-yellow-soft">
                      Push
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl uppercase mb-3">Open picks</h2>
        {myOpenPicks.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-hairline p-4 text-sm text-muted">
            No open picks. Post one below and see who bites.
          </p>
        ) : (
          <div className="space-y-2">
            {myOpenPicks.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-xl border-[3px] border-ink p-3 text-sm">
                <span>
                  {w.description} {w.line ? `(${w.line})` : ""} · ${w.stake}{" "}
                  {w.opponentId ? `· to ${nameOf(w.opponentId)}` : "· open to any friend"}
                </span>
                <form action={declineWager}>
                  <input type="hidden" name="wagerId" value={w.id} />
                  <button className="text-xs text-muted underline hover:text-ink">cancel</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl uppercase mb-3">Friends&apos; open picks</h2>
        {friendHub.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-hairline p-4 text-sm text-muted">
            No open picks from friends right now.
          </p>
        ) : (
          <div className="space-y-2">
            {friendHub.map((w) => (
              <div key={w.id} className="rounded-xl border-[3px] border-ink p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {nameOf(w.creatorId)}: {w.description} {w.line ? `(${w.line})` : ""} · ${w.stake}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={acceptWager}>
                      <input type="hidden" name="wagerId" value={w.id} />
                      <button className="rounded-full border-2 border-ink bg-yellow px-3 py-1 text-[10px] font-bold uppercase">
                        Accept
                      </button>
                    </form>
                    <form action={declineWager}>
                      <input type="hidden" name="wagerId" value={w.id} />
                      <button className="rounded-full border-2 border-ink px-3 py-1 text-[10px] font-bold uppercase hover:bg-yellow-soft">
                        Decline
                      </button>
                    </form>
                    <details className="relative">
                      <summary className="cursor-pointer list-none rounded-full border-2 border-ink px-3 py-1 text-[10px] font-bold uppercase hover:bg-yellow-soft">
                        Counter
                      </summary>
                      <form
                        action={counterWager}
                        className="absolute right-0 z-10 mt-2 flex w-56 flex-col gap-2 rounded-xl border-[3px] border-ink bg-paper p-3 shadow-[4px_4px_0_0_#111111]"
                      >
                        <input type="hidden" name="wagerId" value={w.id} />
                        <input
                          name="line"
                          defaultValue={w.line ?? ""}
                          placeholder="New line"
                          className="rounded-md border-2 border-ink bg-transparent px-2 py-1 text-xs outline-none"
                        />
                        <input
                          name="stake"
                          type="number"
                          step="0.01"
                          defaultValue={w.stake}
                          placeholder="Stake"
                          className="rounded-md border-2 border-ink bg-transparent px-2 py-1 text-xs outline-none"
                        />
                        <button className="rounded-full border-2 border-ink bg-ink px-3 py-1 text-[10px] font-bold uppercase text-paper">
                          Send counter
                        </button>
                      </form>
                    </details>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border-[3px] border-ink p-5">
        <h2 className="font-display uppercase mb-3">Post a pick</h2>
        <p className="mb-3 text-xs text-muted">Your call, your line — nothing is priced for you.</p>
        {friends.length === 0 ? (
          <p className="text-sm text-muted">Add a friend on the Friends tab before posting a pick.</p>
        ) : (
          <form action={postWager} className="grid gap-3 sm:grid-cols-5">
            <input
              name="description"
              required
              placeholder="e.g. Giants +3.5 vs Cowboys"
              className="rounded-md border-2 border-ink bg-transparent px-3 py-2 text-sm outline-none focus:bg-yellow-soft sm:col-span-2"
            />
            <select name="type" className="rounded-md border-2 border-ink bg-transparent px-2 py-2 text-sm outline-none">
              <option value="SPREAD">Spread</option>
              <option value="MONEYLINE">Moneyline</option>
              <option value="PROP">Prop</option>
              <option value="CUSTOM">Custom</option>
            </select>
            <input
              name="line"
              placeholder="Line / number"
              className="rounded-md border-2 border-ink bg-transparent px-3 py-2 text-sm outline-none focus:bg-yellow-soft"
            />
            <input
              name="stake"
              type="number"
              step="0.01"
              required
              placeholder="Stake ($)"
              className="rounded-md border-2 border-ink bg-transparent px-3 py-2 text-sm outline-none focus:bg-yellow-soft"
            />
            <select
              name="opponentId"
              className="rounded-md border-2 border-ink bg-transparent px-2 py-2 text-sm outline-none sm:col-span-2"
            >
              <option value="">Open to any friend</option>
              {friends.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-full border-[3px] border-ink bg-ink px-4 py-2 font-display text-sm uppercase text-paper hover:bg-yellow hover:text-ink transition-colors sm:col-span-3"
            >
              Post pick
            </button>
          </form>
        )}
      </section>

      <section className="rounded-2xl border-[3px] border-ink p-5">
        <h2 className="font-display uppercase mb-2">Connect your accounts</h2>
        <p className="mb-3 text-sm text-muted">
          Link a sportsbook or fantasy league so bets and rosters sync automatically. Coming soon.
        </p>
        <div className="flex flex-wrap gap-3">
          {["DraftKings", "Fantasy Football"].map((name) => (
            <button
              key={name}
              disabled
              title="Coming soon"
              className="flex cursor-not-allowed items-center gap-2 rounded-full border-[3px] border-hairline px-4 py-2 text-sm font-medium text-muted"
            >
              Connect {name}
              <span className="rounded-full bg-hairline px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                Soon
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {MODES.map((mode) => (
          <Link
            key={mode.href}
            href={`/games/${mode.href}`}
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
        <h2 className="font-display text-2xl uppercase mb-3">Group pools</h2>
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
          <div className="space-y-6">
            {memberships.map((m) => (
              <div key={m.group.id} className="rounded-2xl border-[3px] border-ink p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display uppercase">{m.group.name}</div>
                    <div className="mt-1 text-xs text-muted">
                      {m.group._count.members} member{m.group._count.members === 1 ? "" : "s"} · invite
                      code {m.group.inviteCode}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {GROUP_MODES.map((mode) => (
                    <Link
                      key={mode.href}
                      href={`/games/groups/${m.group.id}/${mode.href}`}
                      className="rounded-lg border-2 border-hairline p-2 text-center text-xs font-display uppercase hover:border-ink hover:bg-yellow-soft transition-colors"
                    >
                      {mode.emoji} {mode.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
