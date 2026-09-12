import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/identity";
import { getLeague } from "@/lib/leagues";
import { getFriendIds } from "@/lib/friends";
import { prisma } from "@/lib/prisma";
import {
  getTeam,
  getTeamNews,
  getTeamSchedule,
  getTeamRoster,
  getDepthChart,
  type ScheduleEvent,
} from "@/lib/espn";
import { divisionForAbbreviation } from "@/lib/divisions";
import { followTeam, unfollowTeam, saveTeamNote } from "@/app/actions";

function GameRow({
  event,
  teamId,
  boxscoreSlug,
}: {
  event: ScheduleEvent;
  teamId: string;
  boxscoreSlug: string;
}) {
  const comp = event.competitions[0];
  const self = comp.competitors.find((c) => c.team.id === teamId);
  const opp = comp.competitors.find((c) => c.team.id !== teamId);
  if (!self || !opp) return null;
  const isFinal = comp.status.type.state === "post";
  const selfScore = (self as { score?: { displayValue: string } }).score?.displayValue;
  const oppScore = (opp as { score?: { displayValue: string } }).score?.displayValue;
  const won = self.winner === true;
  const lost = isFinal && self.winner === false;

  return (
    <div className="flex items-center justify-between rounded-lg border-2 border-hairline px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {opp.team.logo && <img src={opp.team.logo} alt="" className="h-5 w-5" />}
        <span>
          {self.homeAway === "home" ? "vs" : "@"} {opp.team.shortDisplayName ?? opp.team.name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {isFinal ? (
          <>
            <span className={won ? "font-bold" : lost ? "font-bold text-muted" : ""}>
              {won ? "W" : lost ? "L" : ""} {selfScore}-{oppScore}
            </span>
            <a
              href={`https://www.espn.com/${boxscoreSlug}/boxscore/_/gameId/${event.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted underline"
            >
              box score
            </a>
          </>
        ) : (
          <span className="text-muted">
            {new Date(event.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
}

export default async function TeamProfilePage({
  params,
}: {
  params: Promise<{ league: string; teamId: string }>;
}) {
  const { league, teamId } = await params;
  let leagueDef;
  try {
    leagueDef = getLeague(league);
  } catch {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) return null;

  const [team, news, schedule, roster, depthChart, favorite, note, friendIds] = await Promise.all([
    getTeam(leagueDef.sportPath, teamId).catch(() => null),
    getTeamNews(leagueDef.sportPath, teamId, 6).catch(() => []),
    getTeamSchedule(leagueDef.sportPath, teamId).catch(() => []),
    getTeamRoster(leagueDef.sportPath, teamId).catch(() => []),
    leagueDef.hasDepthChart ? getDepthChart(leagueDef.sportPath, teamId).catch(() => []) : Promise.resolve([]),
    prisma.favoriteTeam.findUnique({
      where: { userId_league_teamId: { userId: user.id, league, teamId } },
    }),
    prisma.teamNote.findUnique({
      where: { userId_league_teamId: { userId: user.id, league, teamId } },
    }),
    getFriendIds(user.id),
  ]);

  if (!team) notFound();

  const isFollowing = !!favorite;

  const friendsWithTeam =
    friendIds.size > 0
      ? await prisma.favoriteTeam.findMany({
          where: { league, teamId, userId: { in: [...friendIds] } },
          include: { user: true },
        })
      : [];

  const completed = schedule
    .filter((e) => e.competitions[0]?.status.type.state === "post")
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 5);
  const upcoming = schedule
    .filter((e) => e.competitions[0]?.status.type.state === "pre")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, 5);

  const specialTeams = depthChart.find((f) => f.positions["k"] && f.positions["p"]);
  const offense = depthChart.find((f) => f.positions["qb"]);
  const defense = depthChart.find((f) => f !== offense && f !== specialTeams);

  const record = team.record?.items?.find((i) => i.type === "total") ?? team.record?.items?.[0];
  const div = leagueDef.hasDivisions ? divisionForAbbreviation(team.abbreviation) : undefined;
  const bg = team.color ? `#${team.color}` : "#111111";

  return (
    <div className="space-y-8">
      {/* Trading-card style team header */}
      <div className="overflow-hidden rounded-2xl border-[3px] border-ink">
        <div className="flex items-center justify-between bg-ink px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-paper">
          <span>{leagueDef.shortName}</span>
          <span>{div ? `${div.conference} ${div.division}` : ""}</span>
        </div>
        <div className="flex flex-col items-center gap-6 p-6 sm:flex-row" style={{ backgroundColor: bg }}>
          {team.logos?.[0]?.href && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logos[0].href} alt="" className="h-28 w-28 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]" />
          )}
          <div className="text-center text-paper sm:text-left">
            <h1 className="font-display text-3xl uppercase sm:text-4xl">{team.displayName}</h1>
            {record?.summary && <p className="mt-1 opacity-90">{record.summary}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between border-t-[3px] border-ink bg-paper px-4 py-2">
          <span className="text-xs text-muted">{team.abbreviation}</span>
          <form action={isFollowing ? unfollowTeam : followTeam}>
            <input type="hidden" name="league" value={league} />
            <input type="hidden" name="teamId" value={teamId} />
            <button
              type="submit"
              className={`font-display text-xs uppercase underline decoration-4 underline-offset-4 ${
                isFollowing ? "decoration-hairline" : "decoration-yellow"
              }`}
            >
              {isFollowing ? "Unfollow" : "Follow this team"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border-[3px] border-ink p-5">
          <h2 className="font-display uppercase mb-3">Upcoming</h2>
          {upcoming.length === 0 && <p className="text-sm text-muted">No upcoming games scheduled yet.</p>}
          <div className="space-y-2">
            {upcoming.map((e) => (
              <GameRow key={e.id} event={e} teamId={teamId} boxscoreSlug={leagueDef.espnBoxscoreSlug} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border-[3px] border-ink p-5">
          <h2 className="font-display uppercase mb-3">Recent results</h2>
          {completed.length === 0 && <p className="text-sm text-muted">No completed games yet this season.</p>}
          <div className="space-y-2">
            {completed.map((e) => (
              <GameRow key={e.id} event={e} teamId={teamId} boxscoreSlug={leagueDef.espnBoxscoreSlug} />
            ))}
          </div>
        </section>
      </div>

      {record && (
        <section className="rounded-2xl border-[3px] border-ink p-5">
          <h2 className="font-display uppercase mb-3">Team stats</h2>
          <div className="flex flex-wrap gap-6 text-sm">
            {team.record?.items?.map((item) => (
              <div key={item.type}>
                <div className="text-muted text-xs uppercase">{item.type}</div>
                <div className="font-bold">{item.summary}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {leagueDef.hasDepthChart && (offense || defense || specialTeams) && (
        <section className="rounded-2xl border-[3px] border-ink p-5">
          <h2 className="font-display uppercase mb-4">Depth chart</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { label: "Offense", formation: offense },
              { label: "Defense", formation: defense },
              { label: "Special teams", formation: specialTeams },
            ].map(({ label, formation }) => (
              <div key={label}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted mb-2">{label}</h3>
                {!formation && <p className="text-sm text-muted">Not available yet.</p>}
                <ul className="space-y-1.5 text-sm">
                  {formation &&
                    Object.entries(formation.positions).map(([key, pos]) => {
                      const starter = pos.athleteSlots?.find((s) => s.slot === 1)?.athlete;
                      return (
                        <li key={key} className="flex justify-between gap-2">
                          <span className="text-muted">{pos.position.abbreviation}</span>
                          <span className="font-medium truncate">{starter?.displayName ?? "—"}</span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border-[3px] border-ink p-5">
        <h2 className="font-display uppercase mb-4">Player stats</h2>
        <p className="mb-3 text-xs text-muted">
          Live season stat leaders aren&apos;t available yet — here&apos;s the current roster.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roster.map((group) => (
            <div key={group.position}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted mb-2">
                {group.position}
              </h3>
              <ul className="space-y-1 text-sm">
                {group.items.slice(0, 6).map((athlete) => (
                  <li key={athlete.id} className="flex justify-between gap-2">
                    <span className="truncate">{athlete.displayName}</span>
                    {athlete.jersey && <span className="text-muted">#{athlete.jersey}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border-[3px] border-ink p-5">
        <h2 className="font-display uppercase mb-4">Latest news</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {news.map((article) => (
            <a
              key={article.id}
              href={article.links.web.href}
              target="_blank"
              rel="noreferrer"
              className="flex gap-3 rounded-lg hover:bg-yellow-soft p-2 -m-2 transition-colors"
            >
              {article.images?.[0]?.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={article.images[0].url}
                  alt=""
                  className="h-16 w-24 shrink-0 rounded-md object-cover border-2 border-ink"
                />
              )}
              <div>
                <div className="text-sm font-medium leading-snug line-clamp-2">{article.headline}</div>
                <div className="mt-1 text-xs text-muted">
                  {new Date(article.published).toLocaleDateString()}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border-[3px] border-ink p-5">
        <h2 className="font-display uppercase mb-3">Friends who follow this team</h2>
        {friendsWithTeam.length === 0 ? (
          <p className="text-sm text-muted">None of your friends follow this team (yet).</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {friendsWithTeam.map((f) => (
              <span key={f.id} className="rounded-full border-2 border-ink px-3 py-1 text-sm font-medium">
                {f.user.name}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border-[3px] border-ink p-5">
        <h2 className="font-display uppercase mb-3">Notes</h2>
        <p className="mb-3 text-xs text-muted">
          Ticket info, rivalry games, who to watch — just for you.
        </p>
        <form action={saveTeamNote} className="space-y-3">
          <input type="hidden" name="league" value={league} />
          <input type="hidden" name="teamId" value={teamId} />
          <textarea
            name="content"
            rows={4}
            defaultValue={note?.content ?? ""}
            placeholder="e.g. Section 112, row F. Rivalry: Cowboys. Watch: rookie WR."
            className="w-full rounded-lg border-2 border-ink bg-transparent px-3 py-2 text-sm outline-none focus:bg-yellow-soft"
          />
          <button
            type="submit"
            className="rounded-full border-[3px] border-ink bg-ink px-4 py-2 font-display text-xs uppercase text-paper hover:bg-yellow hover:text-ink transition-colors"
          >
            Save note
          </button>
        </form>
      </section>
    </div>
  );
}
