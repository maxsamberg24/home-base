import { getCurrentUser } from "@/lib/identity";
import { getTeams } from "@/lib/espn";
import { CURRENT_SEASON } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { submitSeasonPrediction, submitAwardPredictions } from "@/app/actions";

const AWARD_CATEGORIES: { key: string; label: string; kind: "team" | "text" }[] = [
  { key: "SB_WINNER", label: "Super Bowl champion", kind: "team" },
  { key: "MVP", label: "MVP", kind: "text" },
  { key: "OROY", label: "Offensive Rookie of the Year", kind: "text" },
  { key: "DROY", label: "Defensive Rookie of the Year", kind: "text" },
  { key: "COACH_OY", label: "Coach of the Year", kind: "text" },
];

export default async function PredictionsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [teams, seasonPrediction, awardPredictions] = await Promise.all([
    getTeams(),
    prisma.seasonPrediction.findUnique({
      where: { userId_season: { userId: user.id, season: CURRENT_SEASON } },
    }),
    prisma.awardPrediction.findMany({
      where: { userId: user.id, season: CURRENT_SEASON },
    }),
  ]);

  const winTotals: Record<string, number> = seasonPrediction
    ? JSON.parse(seasonPrediction.winTotals)
    : {};
  const awardsByCategory = Object.fromEntries(awardPredictions.map((a) => [a.category, a.value]));
  const sorted = [...teams].sort((a, b) => a.location!.localeCompare(b.location!));
  const totalWins = Object.values(winTotals).reduce((sum, w) => sum + (w || 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl uppercase sm:text-4xl">
          Your {CURRENT_SEASON} <span className="mark-yellow">predictions</span>
        </h1>
        <p className="mt-2 text-muted">
          Call every team&apos;s win total for the season, plus your award and Super Bowl futures.
        </p>
      </div>

      <section className="rounded-2xl border-[3px] border-ink p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display uppercase">Win totals</h2>
          <span className="text-xs text-muted">
            Total predicted wins: <strong className="text-ink">{totalWins}</strong> (league total is
            always 272)
          </span>
        </div>
        <form action={submitSeasonPrediction}>
          <input type="hidden" name="season" value={CURRENT_SEASON} />
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {sorted.map((team) => (
              <div key={team.id} className="flex items-center justify-between gap-3 py-1">
                <div className="flex items-center gap-2 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {team.logo && <img src={team.logo} alt="" className="h-6 w-6 shrink-0" />}
                  <span className="truncate text-sm">{team.displayName}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={17}
                  name={`wins_${team.id}`}
                  defaultValue={winTotals[team.id] ?? ""}
                  placeholder="—"
                  className="w-16 shrink-0 rounded-md border-2 border-ink bg-transparent px-2 py-1 text-right text-sm outline-none focus:bg-yellow-soft"
                />
              </div>
            ))}
          </div>
          <button
            type="submit"
            className="mt-5 rounded-full border-[3px] border-ink bg-ink px-5 py-2 font-display text-sm uppercase text-paper transition-colors hover:bg-yellow hover:text-ink"
          >
            Save win totals
          </button>
        </form>
      </section>

      <section className="rounded-2xl border-[3px] border-ink p-5">
        <h2 className="font-display uppercase mb-4">Futures & awards</h2>
        <form action={submitAwardPredictions} className="space-y-4">
          <input type="hidden" name="season" value={CURRENT_SEASON} />
          {AWARD_CATEGORIES.map((cat) => (
            <div key={cat.key} className="flex items-center justify-between gap-4">
              <label htmlFor={cat.key} className="text-sm font-medium">
                {cat.label}
              </label>
              {cat.kind === "team" ? (
                <select
                  id={cat.key}
                  name={cat.key}
                  defaultValue={awardsByCategory[cat.key] ?? ""}
                  className="w-56 rounded-md border-2 border-ink bg-transparent px-2 py-1.5 text-sm outline-none focus:bg-yellow-soft"
                >
                  <option value="">Select a team</option>
                  {sorted.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.displayName}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={cat.key}
                  name={cat.key}
                  defaultValue={awardsByCategory[cat.key] ?? ""}
                  placeholder="Player name"
                  className="w-56 rounded-md border-2 border-ink bg-transparent px-2 py-1.5 text-sm outline-none focus:bg-yellow-soft"
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            className="rounded-full border-[3px] border-ink bg-ink px-5 py-2 font-display text-sm uppercase text-paper transition-colors hover:bg-yellow hover:text-ink"
          >
            Save futures
          </button>
        </form>
      </section>
    </div>
  );
}
