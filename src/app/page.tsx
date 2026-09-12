import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/identity";
import { getTeams, getTeamSchedule, type ScheduleEvent } from "@/lib/espn";
import { getLeague } from "@/lib/leagues";
import { getFollowedTeams, type FollowedTeam } from "@/lib/followedTeams";
import { followTeam, unfollowTeam } from "@/app/actions";
import { formatGameDate, formatGameTime, etDateKey } from "@/lib/dates";
import { TEAM_FILTER_COOKIE, teamKey, parseFilterCookie } from "@/lib/teamFilter";
import TeamCard from "@/components/TeamCard";
import TeamLogoBadge from "@/components/TeamLogoBadge";
import SportTabs from "@/components/SportTabs";
import DivisionAccordion from "@/components/DivisionAccordion";

interface FeedItem {
  league: string;
  teamId: string;
  team: FollowedTeam["team"];
  event: ScheduleEvent;
  isToday: boolean;
  state: "pre" | "in" | "post";
}

async function buildFeed(visibleFollowed: FollowedTeam[]): Promise<FeedItem[]> {
  const todayKey = etDateKey(new Date());

  const items = await Promise.all(
    visibleFollowed.map(async (f): Promise<FeedItem | null> => {
      const league = getLeague(f.league);
      const schedule = await getTeamSchedule(league.sportPath, f.teamId).catch(() => []);
      const todayEvent = schedule.find((e) => etDateKey(new Date(e.date)) === todayKey);
      const nextUpcoming = schedule
        .filter((e) => e.competitions[0]?.status.type.state === "pre")
        .sort((a, b) => +new Date(a.date) - +new Date(b.date))[0];
      const event = todayEvent ?? nextUpcoming;
      if (!event) return null;
      return {
        league: f.league,
        teamId: f.teamId,
        team: f.team,
        event,
        isToday: !!todayEvent,
        state: event.competitions[0].status.type.state,
      };
    })
  );

  const priority = (item: FeedItem) => {
    if (item.state === "in") return 0;
    if (item.isToday && item.state === "pre") return 1;
    if (item.isToday && item.state === "post") return 2;
    return 3;
  };

  return items
    .filter((i): i is FeedItem => i !== null)
    .sort((a, b) => priority(a) - priority(b) || +new Date(a.event.date) - +new Date(b.event.date));
}

function FeedCard({ item }: { item: FeedItem }) {
  const comp = item.event.competitions[0];
  const self = comp.competitors.find((c) => c.team.id === item.teamId);
  const opp = comp.competitors.find((c) => c.team.id !== item.teamId);
  if (!self || !opp) return null;

  const selfScore = (self as { score?: { displayValue: string } }).score?.displayValue;
  const oppScore = (opp as { score?: { displayValue: string } }).score?.displayValue;
  const won = self.winner === true;
  const lost = item.state === "post" && self.winner === false && opp.winner === true;
  const draw = item.state === "post" && !won && !lost;
  const isLive = item.state === "in";

  const cardClass = isLive
    ? "border-ink bg-emerald-200 animate-pulse"
    : item.isToday && item.state === "pre"
      ? "border-ink bg-emerald-50"
      : item.isToday && item.state === "post"
        ? draw
          ? "border-ink bg-neutral-100"
          : won
            ? "border-ink bg-emerald-50"
            : "border-ink bg-red-50"
        : "border-ink bg-neutral-100";

  const espnSlug = getLeague(item.league).espnBoxscoreSlug;
  const espnUrl = `https://www.espn.com/${espnSlug}/game/_/gameId/${item.event.id}`;

  return (
    <div className={`rounded-2xl border-[3px] p-4 ${cardClass}`}>
      <Link href={`/teams/${item.league}/${item.teamId}`} className="block">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted">
          <span>{getLeague(item.league).shortName}</span>
          {isLive && <span className="text-ink">● Live</span>}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <TeamLogoBadge src={item.team.logos?.[0]?.href} size={32} />
          <span className="font-display uppercase">{item.team.displayName}</span>
        </div>
        <div className="mt-3 text-sm">
          {self.homeAway === "home" ? "vs" : "@"} {opp.team.shortDisplayName ?? opp.team.name}
        </div>
      </Link>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-sm font-bold text-ink">
          {item.state === "in" && `Live · ${selfScore}-${oppScore}`}
          {item.state === "post" && `${draw ? "D" : won ? "W" : "L"} ${selfScore}-${oppScore}`}
          {item.state === "pre" &&
            (item.isToday ? `Today · ${formatGameTime(item.event.date)}` : `${formatGameDate(item.event.date)} · ${formatGameTime(item.event.date)}`)}
        </span>
        {item.state !== "pre" && (
          <a
            href={espnUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-display uppercase underline decoration-yellow decoration-4 underline-offset-4"
          >
            ESPN →
          </a>
        )}
      </div>
    </div>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { league: activeLeague = "nfl" } = await searchParams;
  const leagueDef = getLeague(activeLeague);

  const [followed, browseTeams, filterCookie] = await Promise.all([
    getFollowedTeams(user.id),
    getTeams(leagueDef.sportPath).catch(() => []),
    cookies().then((s) => s.get(TEAM_FILTER_COOKIE)?.value),
  ]);

  const followedKeySet = new Set(followed.map((f) => `${f.league}:${f.teamId}`));
  const allKeys = [...followedKeySet];
  const selected = parseFilterCookie(filterCookie, allKeys);
  const visibleFollowed = followed.filter((f) => selected.has(teamKey(f.league, f.teamId)));

  const feed = await buildFeed(visibleFollowed);

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

      {feed.length > 0 && (
        <section>
          <h2 className="font-display text-2xl uppercase mb-1">Next up</h2>
          <p className="text-muted mb-4">Live games first, then today&apos;s, then what&apos;s coming up.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {feed.map((item) => (
              <FeedCard key={`${item.league}:${item.teamId}`} item={item} />
            ))}
          </div>
        </section>
      )}

      {visibleFollowed.length > 0 && (
        <section>
          <h2 className="font-display text-2xl uppercase mb-4">Your teams</h2>
          {visibleFollowed.length < followed.length && (
            <p className="mb-3 text-xs text-muted">
              {followed.length - visibleFollowed.length} more hidden by the filter below.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {visibleFollowed.map((f) => (
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
