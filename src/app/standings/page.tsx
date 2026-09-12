import { getCurrentUser } from "@/lib/identity";
import { getFollowedTeams } from "@/lib/followedTeams";
import { getStandings, statValue, type StandingsGroup } from "@/lib/espn";
import { getLeague } from "@/lib/leagues";

function StandingsTable({
  group,
  followedIds,
  depth = 0,
}: {
  group: StandingsGroup;
  followedIds: Set<string>;
  depth?: number;
}) {
  const entries = group.standings?.entries;

  return (
    <div className={depth > 0 ? "mt-4" : ""}>
      {depth > 0 && <h4 className="mb-2 font-display text-sm uppercase text-muted">{group.name}</h4>}
      {entries && (
        <div className="overflow-x-auto rounded-xl border-[3px] border-ink">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-[3px] border-ink text-left text-[10px] uppercase text-muted">
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2 text-right">W</th>
                <th className="px-3 py-2 text-right">L</th>
                <th className="px-3 py-2 text-right">PCT</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isMine = followedIds.has(entry.team.id);
                return (
                  <tr
                    key={entry.team.id}
                    className={`border-b border-hairline last:border-0 ${isMine ? "bg-yellow-soft" : ""}`}
                  >
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
      )}
      {group.children?.map((child) => (
        <StandingsTable key={child.name} group={child} followedIds={followedIds} depth={depth + 1} />
      ))}
    </div>
  );
}

export default async function StandingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const followed = await getFollowedTeams(user.id);
  const leaguesFollowed = [...new Set(followed.map((f) => f.league))];

  const standingsByLeague = await Promise.all(
    leaguesFollowed.map(async (slug) => {
      const league = getLeague(slug);
      const groups = await getStandings(league.sportPath).catch(() => []);
      return { league, groups };
    })
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl uppercase sm:text-4xl">
          <span className="mark-yellow">Standings</span>
        </h1>
        <p className="mt-2 text-muted">Your followed teams are highlighted.</p>
      </div>

      {leaguesFollowed.length === 0 && (
        <p className="text-sm text-muted">Follow a team from the home page to see its league standings.</p>
      )}

      {standingsByLeague.map(({ league, groups }) => {
        const followedIds = new Set(
          followed.filter((f) => f.league === league.slug).map((f) => f.teamId)
        );
        return (
          <section key={league.slug}>
            <h2 className="font-display text-2xl uppercase mb-3">{league.name}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {groups.map((group) => (
                <StandingsTable key={group.name} group={group} followedIds={followedIds} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
