import Link from "next/link";
import { getCurrentUser } from "@/lib/identity";
import { getTeams } from "@/lib/espn";
import { getLeague } from "@/lib/leagues";
import { getFollowedTeams } from "@/lib/followedTeams";
import { followTeam, unfollowTeam } from "@/app/actions";
import { relativeDayLabel, formatGameDate, formatGameTime } from "@/lib/dates";
import TeamCard from "@/components/TeamCard";
import SportTabs from "@/components/SportTabs";
import DivisionAccordion from "@/components/DivisionAccordion";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { league: activeLeague = "nfl" } = await searchParams;
  const leagueDef = getLeague(activeLeague);

  const [followed, browseTeams] = await Promise.all([
    getFollowedTeams(user.id),
    getTeams(leagueDef.sportPath).catch(() => []),
  ]);

  const followedKeySet = new Set(followed.map((f) => `${f.league}:${f.teamId}`));

  const nextUp = followed
    .map((f) => ({ ...f, next: f.team.nextEvent?.[0] }))
    .filter((f) => f.next)
    .sort((a, b) => +new Date(a.next!.date) - +new Date(b.next!.date));

  return (
    <div className="space-y-14">
      <section>
        <h1 className="font-display text-4xl uppercase leading-[0.95] sm:text-6xl">
          Welcome back,
          <br />
          <span className="mark-yellow">{user.name}.</span>
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted">
          {followed.length === 0
            ? "Add your teams below to build your hub."
            : `Following ${followed.length} team${followed.length === 1 ? "" : "s"} across ${new Set(followed.map((f) => f.league)).size} league${new Set(followed.map((f) => f.league)).size === 1 ? "" : "s"}.`}
        </p>
      </section>

      {nextUp.length > 0 && (
        <section>
          <h2 className="font-display text-2xl uppercase mb-1">Next up</h2>
          <p className="text-muted mb-4">One card per team, soonest first.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nextUp.map(({ league, teamId, team, next }) => {
              const comp = next!.competitions[0];
              const self = comp.competitors.find((c) => c.team.id === teamId);
              const opp = comp.competitors.find((c) => c.team.id !== teamId);
              const dayLabel = relativeDayLabel(next!.date);
              const record = team.record?.items?.find((i) => i.type === "total") ?? team.record?.items?.[0];

              return (
                <Link
                  key={`${league}:${teamId}`}
                  href={`/teams/${league}/${teamId}`}
                  className="rounded-2xl border-[3px] border-ink p-4 transition-transform hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#111111]"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted">
                    <span>{getLeague(league).shortName}</span>
                    {record?.summary && <span>{record.summary}</span>}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {team.logos?.[0]?.href && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={team.logos[0].href} alt="" className="h-8 w-8 object-contain" />
                    )}
                    <span className="font-display uppercase">{team.displayName}</span>
                  </div>
                  <div className="mt-3 text-sm">
                    {self?.homeAway === "home" ? "vs" : "@"} {opp?.team.shortDisplayName ?? opp?.team.name}
                  </div>
                  <div className="mt-1 text-sm font-bold text-ink">
                    {dayLabel ?? formatGameDate(next!.date)} · {formatGameTime(next!.date)}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {followed.length > 0 && (
        <section>
          <h2 className="font-display text-2xl uppercase mb-4">Your teams</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {followed.map((f) => (
              <div key={`${f.league}:${f.teamId}`} className="relative">
                <Link href={`/teams/${f.league}/${f.teamId}`}>
                  <TeamCard team={f.team} league={f.league} size="sm" />
                </Link>
                <form action={unfollowTeam} className="absolute -right-1.5 -bottom-1.5">
                  <input type="hidden" name="league" value={f.league} />
                  <input type="hidden" name="teamId" value={f.teamId} />
                  <button
                    type="submit"
                    title="Unfollow"
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-paper text-xs font-black hover:bg-yellow"
                  >
                    ×
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-2xl uppercase">Add teams</h2>
        <p className="mt-1 text-muted">Pick a sport, then a division, to add a team.</p>
        <div className="mt-4">
          <SportTabs basePath="/" active={activeLeague} />
        </div>
        <div className="mt-4">
          <DivisionAccordion
            teams={browseTeams}
            league={activeLeague}
            renderTeam={(team) => {
              const key = `${activeLeague}:${team.id}`;
              const isFollowed = followedKeySet.has(key);
              return (
                <form action={isFollowed ? unfollowTeam : followTeam}>
                  <input type="hidden" name="league" value={activeLeague} />
                  <input type="hidden" name="teamId" value={team.id} />
                  <button type="submit" className="relative block w-full text-left">
                    <TeamCard team={team} league={activeLeague} size="sm" />
                    {isFollowed && (
                      <span className="absolute left-1.5 top-7 rounded-full border-2 border-ink bg-yellow px-2 py-0.5 text-[9px] font-black uppercase">
                        Following
                      </span>
                    )}
                  </button>
                </form>
              );
            }}
          />
        </div>
      </section>
    </div>
  );
}
