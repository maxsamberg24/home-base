"use client";

import { useTransition } from "react";
import { toggleTeamFilterKey, setTeamFilterAll } from "@/app/actions";
import { teamKey } from "@/lib/teamFilter";

export interface FilterableTeam {
  league: string;
  teamId: string;
  abbreviation: string;
  logo?: string;
}

export default function TeamFilterBar({
  teams,
  selected,
}: {
  teams: FilterableTeam[];
  selected: Set<string>;
}) {
  const [isPending, startTransition] = useTransition();
  if (teams.length === 0) return null;

  const allSelected = teams.every((t) => selected.has(teamKey(t.league, t.teamId)));

  return (
    <div className="sticky bottom-0 z-20 border-t-[3px] border-ink bg-paper">
      <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted">
          Showing
        </span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => setTeamFilterAll())}
          className={`shrink-0 rounded-full border-2 px-3 py-1 text-xs font-bold uppercase transition-colors ${
            allSelected ? "border-ink bg-yellow" : "border-hairline text-muted hover:border-ink"
          }`}
        >
          All
        </button>
        {teams.map((t) => {
          const key = teamKey(t.league, t.teamId);
          const isSelected = selected.has(key);
          return (
            <button
              key={key}
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => toggleTeamFilterKey(key))}
              title={t.abbreviation}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-bold transition-colors ${
                isSelected ? "border-ink bg-yellow-soft" : "border-hairline text-muted opacity-50 hover:border-ink hover:opacity-100"
              }`}
            >
              {t.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.logo} alt="" className="h-4 w-4" />
              )}
              {t.abbreviation}
            </button>
          );
        })}
      </div>
    </div>
  );
}
