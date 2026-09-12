import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/identity";
import { getFollowedTeams } from "@/lib/followedTeams";
import { getStandings, statValue, type StandingsGroup } from "@/lib/espn";
import { getLeague } from "@/lib/leagues";
import { TEAM_FILTER_COOKIE, teamKey, parseFilterCookie } from "@/lib/teamFilter";

function StandingsNode({
  group,
  highlightIds,
}: {
  group: StandingsGroup;
  highlightIds: Set<string>;
}) {
  if (group.children && group.children.length > 0) {
    return (
      <details className="division-toggle group rounded-xl border-2 border-hairline overflow-hidden">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5 font-display text-sm uppercase hover:bg-yellow-soft">
          <span>{group.name}</span>
          <span className="chevron text-base">▾</span>
        </summary>
        <div className="space-y-3 border-t-2 border-hairline p-3">
          {group.children.map((child) => (
            <StandingsNode key={child.name} group={child} highlightIds={highlightIds} />
          ))}
        </div>
      </details>
    );
  }

  const entries = group.standings?.entries;
  if (!entries) return null;

  return (
    <div className="overflow-x-auto rounded-xl border-2 border-hairline">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-hairline text-left text-[10px] uppercase text-muted">
            <th className="px-3 py-2">Team</th>
            <th className="px-3 py-2 text-right">W</th>
            <th className="px-3 py-2 text-right">L</th>
            <th className="px-3 py-2 text-right">PCT</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isMine = highlightIds.has(entry.team.id);
            return (
              <tr key={entry.team.id} className={`border-b border-hairline last:border-0 ${isMine ? "bg-yellow-soft" : ""}`}>
                <td className="flex items-center gap-2 px-3 py-2 font-medium">
                  {entry.team.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.team.logo} alt="" className="h-5 w-5" />
                  )}
                  {entry.team.displayName}
                </td>
                <td className="px-3 py-2 text-right">{statValue(entry, "wins") ?? "—"}</td>
                <td className="px-3 py-2 text-right">{statValue(entry, "losses") ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  {entry.stats.find((s) => s.name === "winPercent")?.displayValue ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function StandingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [followed, filterCookie] = await Promise.all([
    getFollowedTeams(user.id),
    cookies().then((s) => s.get(TEAM_FILTER_COOKIE)?.value),
  ]);
  const allKeys = followed.map((f) => teamKey(f.league, f.teamId));
  const selected = parseFilterCookie(filterCookie, allKeys);
  const visibleFollowed = followed.filter((f) => selected.has(teamKey(f.league, f.teamId)));
  const leaguesToShow = [...new Set(visibleFollowed.map((f) => f.league))];

  const standingsByLeague = await Promise.all(
    leaguesToShow.map(async (slug) => {
      const league = getLeague(slug);
      const groups = await getStandings(league.sportPath).catch(() => []);
      return { league, groups };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase sm:text-4xl">
          <span className="mark-yellow">Standings</span>
        </h1>
        <p className="mt-2 text-muted">
          Your teams are highlighted. Click a league, then a division, to open it.
        </p>
      </div>

      {leaguesToShow.length === 0 && (
        <p className="text-sm text-muted">
          No teams selected in the filter bar below — turn some on to see their league standings.
        </p>
      )}

      <div className="space-y-4">
        {standingsByLeague.map(({ league, groups }) => {
          const highlightIds = new Set(
            visibleFollowed.filter((f) => f.league === league.slug).map((f) => f.teamId)
          );
          return (
            <details key={league.slug} className="division-toggle group rounded-2xl border-[3px] border-ink overflow-hidden">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 font-display text-lg uppercase hover:bg-yellow-soft">
                <span>{league.name}</span>
                <span className="chevron text-lg">▾</span>
              </summary>
              <div className="space-y-3 border-t-[3px] border-ink p-4">
                {groups.map((group) => (
                  <StandingsNode key={group.name} group={group} highlightIds={highlightIds} />
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
