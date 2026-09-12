import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/identity";
import { getFollowedTeams } from "@/lib/followedTeams";
import { getTeamNews, type EspnArticle } from "@/lib/espn";
import { getLeague } from "@/lib/leagues";
import { TEAM_FILTER_COOKIE, teamKey, parseFilterCookie } from "@/lib/teamFilter";
import TeamLogoBadge from "@/components/TeamLogoBadge";

interface FeedArticle extends EspnArticle {
  league: string;
  teamAbbr: string;
  teamName: string;
  teamLogo?: string;
}

export default async function NewsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [followed, filterCookie] = await Promise.all([
    getFollowedTeams(user.id),
    cookies().then((s) => s.get(TEAM_FILTER_COOKIE)?.value),
  ]);
  const allKeys = followed.map((f) => teamKey(f.league, f.teamId));
  const selected = parseFilterCookie(filterCookie, allKeys);
  const visibleTeams = followed.filter((f) => selected.has(teamKey(f.league, f.teamId)));

  const perTeam = await Promise.all(
    visibleTeams.map(async (f): Promise<FeedArticle[]> => {
      const league = getLeague(f.league);
      const articles = await getTeamNews(league.sportPath, f.teamId, 8).catch(() => []);
      return articles.map((a) => ({
        ...a,
        league: f.league,
        teamAbbr: f.team.abbreviation,
        teamName: f.team.shortDisplayName ?? f.team.displayName,
        teamLogo: f.team.logos?.[0]?.href,
      }));
    })
  );

  // Different teams' news feeds often surface the same wire story — de-dupe
  // by article id, keeping the first (arbitrary) team tag it showed up under.
  const seen = new Set<number>();
  const articles = perTeam
    .flat()
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .sort((a, b) => +new Date(b.published) - +new Date(a.published));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase sm:text-4xl">
          <span className="mark-yellow">News</span>
        </h1>
        <p className="mt-2 text-muted">
          The latest for every team you follow, newest first. Use the filter bar below to change
          which teams show up here.
        </p>
      </div>

      {visibleTeams.length === 0 && (
        <p className="text-sm text-muted">
          No teams selected in the filter bar below — turn some on to see their news.
        </p>
      )}
      {articles.length === 0 && visibleTeams.length > 0 && (
        <p className="text-sm text-muted">Nothing new right now.</p>
      )}

      <div className="space-y-3">
        {articles.map((article) => (
          <a
            key={article.id}
            href={article.links.web.href}
            target="_blank"
            rel="noreferrer"
            className="flex gap-3 rounded-xl border-[3px] border-ink p-3 transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#111111]"
          >
            {article.images?.[0]?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.images[0].url}
                alt=""
                className="h-16 w-24 shrink-0 rounded-md border-2 border-ink object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
                <TeamLogoBadge src={article.teamLogo} size={16} />
                <span>{article.teamAbbr}</span>
                <span>· {getLeague(article.league).shortName}</span>
              </div>
              <div className="mt-1 text-sm font-medium leading-snug line-clamp-2">{article.headline}</div>
              <div className="mt-1 text-xs text-muted">
                {new Date(article.published).toLocaleDateString(undefined, {
                  timeZone: "America/New_York",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
