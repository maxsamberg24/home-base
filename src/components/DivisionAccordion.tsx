import type { ReactNode } from "react";
import { DIVISIONS } from "@/lib/divisions";
import type { TeamCardData } from "@/components/TeamCard";

export default function DivisionAccordion({
  teams,
  openDivision,
  renderTeam,
}: {
  teams: TeamCardData[];
  openDivision?: string; // e.g. "AFC East" — expanded by default
  renderTeam: (team: TeamCardData) => ReactNode;
}) {
  const byAbbr = new Map(teams.map((t) => [t.abbreviation, t]));

  return (
    <div className="divide-y-[3px] divide-ink border-[3px] border-ink rounded-2xl overflow-hidden">
      {DIVISIONS.map((d) => {
        const key = `${d.conference} ${d.division}`;
        const divisionTeams = d.teams.map((abbr) => byAbbr.get(abbr)).filter(Boolean) as TeamCardData[];
        if (divisionTeams.length === 0) return null;

        return (
          <details key={key} className="division-toggle group bg-paper" open={key === openDivision}>
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 font-display text-sm uppercase tracking-wide hover:bg-yellow-soft">
              <span>{key}</span>
              <span className="chevron text-lg">▾</span>
            </summary>
            <div className="grid grid-cols-2 gap-3 border-t-[3px] border-ink bg-yellow-soft/40 p-4 sm:grid-cols-3 md:grid-cols-4">
              {divisionTeams.map((team) => (
                <div key={team.id}>{renderTeam(team)}</div>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
