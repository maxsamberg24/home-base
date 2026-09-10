import Link from "next/link";
import { getCurrentUser } from "@/lib/identity";
import {
  getTeam,
  getTeamNews,
  getTeamSchedule,
  getDepthChart,
  type ScheduleEvent,
} from "@/lib/espn";
import { CURRENT_SEASON } from "@/lib/constants";
import { divisionForAbbreviation } from "@/lib/divisions";
import TeamPicker from "@/components/TeamPicker";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function GameRow({ event, teamId }: { event: ScheduleEvent; teamId: string }) {
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
        <span className="text-muted">· Wk {event.week?.number ?? "-"}</span>
      </div>
      <div className="flex items-center gap-2">
        {isFinal ? (
          <span className={won ? "font-bold" : lost ? "font-bold text-muted" : ""}>
            {won ? "W" : lost ? "L" : ""} {selfScore}-{oppScore}
          </span>
        ) : (
          <span className="text-muted">{formatDate(event.date)}</span>
        )}
      </div>
    </div>
  );
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ change?: string }>;
}) {
  const { change } = await searchParams;
  const user = await getCurrentUser();

  if (!user?.favoriteTeamId || change) {
    return <TeamPicker />;
  }

  const teamId = user.favoriteTeamId;
  const [team, news, schedule, depthChart] = await Promise.all([
    getTeam(teamId),
    getTeamNews(teamId, 6),
    getTeamSchedule(teamId, CURRENT_SEASON).catch(() => []),
    getDepthChart(teamId, CURRENT_SEASON).catch(() => []),
  ]);

  const completed = schedule
    .filter((e) => e.competitions[0]?.status.type.state === "post")
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 5);
  const upcoming = schedule
    .filter((e) => e.competitions[0]?.status.type.state === "pre")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, 3);

  const specialTeams = depthChart.find((f) => f.positions["k"] && f.positions["p"]);
  const offense = depthChart.find((f) => f.positions["qb"]);
  const defense = depthChart.find((f) => f !== offense && f !== specialTeams);

  const record = team.record?.items?.find((i) => i.type === "total") ?? team.record?.items?.[0];
  const div = divisionForAbbreviation(team.abbreviation);
  const bg = team.color ? `#${team.color}` : "#111111";

  return (
    <div className="space-y-8">
      {/* Trading-card style team header */}
      <div className="overflow-hidden rounded-2xl border-[3px] border-ink">
        <div className="flex items-center justify-between bg-ink px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-paper">
          <span>NFL</span>
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
          <Link href="/team?change=1" className="font-display text-xs uppercase underline decoration-yellow decoration-4 underline-offset-4">
            Change team
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border-[3px] border-ink p-5">
          <h2 className="font-display uppercase mb-3">Upcoming</h2>
          {upcoming.length === 0 && <p className="text-sm text-muted">No upcoming games scheduled yet.</p>}
          <div className="space-y-2">
            {upcoming.map((e) => (
              <GameRow key={e.id} event={e} teamId={teamId} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border-[3px] border-ink p-5">
          <h2 className="font-display uppercase mb-3">Recent results</h2>
          {completed.length === 0 && <p className="text-sm text-muted">No completed games yet this season.</p>}
          <div className="space-y-2">
            {completed.map((e) => (
              <GameRow key={e.id} event={e} teamId={teamId} />
            ))}
          </div>
        </section>
      </div>

      {record && (
        <section className="rounded-2xl border-[3px] border-ink p-5">
          <h2 className="font-display uppercase mb-3">Stats</h2>
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
    </div>
  );
}
