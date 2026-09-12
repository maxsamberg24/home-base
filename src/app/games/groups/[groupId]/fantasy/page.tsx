import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/identity";
import { prisma } from "@/lib/prisma";
import { getScoreboard, getCurrentWeek, getAllNflPlayersByPosition } from "@/lib/espn";
import { getLeague } from "@/lib/leagues";
import { weekDeadline, formatDeadline, isPast } from "@/lib/dates";
import { FANTASY_SLOTS, scoreFantasyRoster, type FantasyRoster } from "@/lib/fantasy";
import { submitFantasyLineup } from "@/app/actions";
import WeekSelector from "@/components/WeekSelector";
import TeamLogoBadge from "@/components/TeamLogoBadge";

const NFL_PATH = getLeague("nfl").sportPath;

const SLOT_LABELS: Record<string, string> = {
  QB: "Quarterback",
  RB1: "Running back",
  RB2: "Running back",
  WR1: "Wide receiver",
  WR2: "Wide receiver",
  TE: "Tight end",
  K: "Kicker",
  DEF: "Defense / ST",
};

export default async function FantasyPage({
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

  const defaults = sp.week ? null : await getCurrentWeek(NFL_PATH);
  const season = Number(sp.season) || defaults?.season || new Date().getFullYear();
  const seasonType = Number(sp.seasonType) || defaults?.seasonType || 2;
  const week = Number(sp.week) || defaults?.week || 1;

  const board = await getScoreboard(NFL_PATH, { season, seasonType, week });
  const deadline = weekDeadline(board.events, 5, 13, 0, 0);
  const locked = isPast(deadline);

  const allLineups = await prisma.fantasyLineup.findMany({ where: { groupId, season, week } });
  const myLineupRow = allLineups.find((l) => l.userId === user.id);
  const myRoster: FantasyRoster | null = myLineupRow ? JSON.parse(myLineupRow.roster) : null;

  const teamsByTeamId = new Map(board.events.flatMap((e) => e.competitions[0].competitors.map((c) => [c.team.id, c.team])));

  if (!locked) {
    const players = await getAllNflPlayersByPosition(NFL_PATH);
    const defenseOptions = [...teamsByTeamId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));

    return (
      <div className="space-y-6">
        <FantasyHeader group={group.name} deadline={deadline} locked={false} />
        <WeekSelector basePath={`/games/groups/${groupId}/fantasy`} season={season} seasonType={seasonType} week={week} />

        <form action={submitFantasyLineup} className="space-y-4 rounded-2xl border-[3px] border-ink p-5">
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="season" value={season} />
          <input type="hidden" name="week" value={week} />
          <input type="hidden" name="seasonType" value={seasonType} />
          <p className="text-xs text-muted">
            1 QB · 2 RB · 2 WR · 1 TE · 1 K · 1 DEF. Standard PPR scoring. Resets every week —
            lineups lock {deadline ? formatDeadline(deadline) : "before kickoff"}.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {FANTASY_SLOTS.map((slot) => {
              const current = myRoster?.[slot];
              if (slot === "DEF") {
                return (
                  <label key={slot} className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-bold uppercase text-muted">{SLOT_LABELS[slot]}</span>
                    <select
                      name={slot}
                      required
                      defaultValue={current ? `${current.id}|${current.name}|${current.teamId}|${current.teamAbbr}` : ""}
                      className="rounded-md border-2 border-ink bg-transparent px-2 py-1.5 outline-none focus:bg-yellow-soft"
                    >
                      <option value="" disabled>
                        Choose a team defense
                      </option>
                      {defenseOptions.map((t) => (
                        <option key={t.id} value={`${t.id}|${t.displayName}|${t.id}|${t.abbreviation}`}>
                          {t.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }
              const position = slot.replace(/[12]$/, "") as "QB" | "RB" | "WR" | "TE" | "K";
              const options = players[position] ?? [];
              return (
                <label key={slot} className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-bold uppercase text-muted">{SLOT_LABELS[slot]}</span>
                  <select
                    name={slot}
                    required
                    defaultValue={current ? `${current.id}|${current.name}|${current.teamId}|${current.teamAbbr}` : ""}
                    className="rounded-md border-2 border-ink bg-transparent px-2 py-1.5 outline-none focus:bg-yellow-soft"
                  >
                    <option value="" disabled>
                      Choose a {position}
                    </option>
                    {options.map((p) => (
                      <option key={p.id} value={`${p.id}|${p.name}|${p.teamId}|${p.teamAbbr}`}>
                        {p.name} ({p.teamAbbr})
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          <button
            type="submit"
            className="rounded-full border-[3px] border-ink bg-ink px-4 py-2 font-display text-sm uppercase text-paper transition-colors hover:bg-yellow hover:text-ink"
          >
            {myRoster ? "Update lineup" : "Save lineup"}
          </button>
        </form>
      </div>
    );
  }

  // Locked: show every submitted lineup, scored live.
  const scored = await Promise.all(
    allLineups.map(async (l) => {
      const roster: FantasyRoster = JSON.parse(l.roster);
      const member = group.members.find((m) => m.userId === l.userId);
      const result = await scoreFantasyRoster(NFL_PATH, roster, season, seasonType, week);
      return { name: member?.user.name ?? "Someone", roster, ...result };
    })
  );
  scored.sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <FantasyHeader group={group.name} deadline={deadline} locked />
      <WeekSelector basePath={`/games/groups/${groupId}/fantasy`} season={season} seasonType={seasonType} week={week} />

      {scored.length === 0 ? (
        <p className="text-sm text-muted">Nobody submitted a lineup this week.</p>
      ) : (
        <div className="space-y-4">
          {scored.map((row, i) => (
            <div key={row.name} className="rounded-2xl border-[3px] border-ink p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-display uppercase">
                  {i + 1}. {row.name}
                  {row.name === user.name && " (you)"}
                </div>
                <div className="font-display text-lg">
                  {row.total.toFixed(1)} pts{!row.allGraded && " · in progress"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4">
                {row.slots.map((s) => (
                  <div key={s.slot} className="flex items-center gap-1.5 rounded-md border-2 border-hairline px-2 py-1">
                    <TeamLogoBadge src={teamsByTeamId.get(s.player.teamId)?.logo} size={16} />
                    <span className="truncate flex-1">{s.player.name}</span>
                    <span className="font-bold">{s.completed ? s.points.toFixed(1) : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FantasyHeader({ group, deadline, locked }: { group: string; deadline: Date | null; locked: boolean }) {
  return (
    <div>
      <h1 className="font-display text-2xl uppercase sm:text-3xl">{group} · Fantasy lineup</h1>
      <p className="mt-1 text-sm text-muted">
        1 QB, 2 RB, 2 WR, 1 TE, 1 K, 1 DEF — best PPR lineup wins the week.{" "}
        {locked
          ? "Lineups are locked for this week — scores below update as games finish."
          : deadline
            ? `Due ${formatDeadline(deadline)}.`
            : ""}
      </p>
    </div>
  );
}
