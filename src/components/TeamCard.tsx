import { divisionForAbbreviation } from "@/lib/divisions";
import { getLeague } from "@/lib/leagues";
import { pickCardBackground } from "@/lib/color";
import TeamLogoBadge from "@/components/TeamLogoBadge";

export interface TeamCardData {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName?: string;
  logo?: string;
  logos?: { href: string }[];
  color?: string;
  alternateColor?: string;
}

export default function TeamCard({
  team,
  league,
  size = "md",
}: {
  team: TeamCardData;
  league: string;
  size?: "sm" | "md";
}) {
  const leagueDef = getLeague(league);
  const div = leagueDef.hasDivisions ? divisionForAbbreviation(team.abbreviation) : undefined;
  const bg = pickCardBackground(team.color, team.alternateColor);
  const logoUrl = team.logo ?? team.logos?.[0]?.href;
  const panelHeight = size === "sm" ? "h-24" : "h-32";

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border-[3px] border-ink bg-paper transition-transform duration-150 hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#111111]">
      <div className="flex items-center justify-between bg-ink px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-paper">
        <span>{leagueDef.shortName}</span>
        <span>{div ? `${div.conference} ${div.division}` : ""}</span>
      </div>

      <div className={`relative flex ${panelHeight} items-center justify-center`} style={{ backgroundColor: bg }}>
        <TeamLogoBadge src={logoUrl} size={size === "sm" ? 56 : 72} />
        <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-yellow text-[10px] font-black text-ink">
          {team.abbreviation}
        </span>
      </div>

      <div className="border-t-[3px] border-ink px-2.5 py-2">
        <div className="truncate font-display text-sm uppercase leading-none">
          {team.shortDisplayName ?? team.displayName}
        </div>
      </div>
    </div>
  );
}
